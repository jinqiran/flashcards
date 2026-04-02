from __future__ import annotations
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent
if ROOT.name != 'flashcards-mobile-app-auto-update':
    # allow running after file is moved into repo/scripts
    ROOT = ROOT.parent
else:
    ROOT = ROOT

REPO_ROOT = ROOT
if (REPO_ROOT / 'images').exists():
    pass
elif (REPO_ROOT.parent / 'images').exists():
    REPO_ROOT = REPO_ROOT.parent
else:
    raise SystemExit('Cannot find repo root with images/ directory.')

IMAGES_DIR = REPO_ROOT / 'images'
CARDS_JSON = REPO_ROOT / 'cards.json'
SW_FILE = REPO_ROOT / 'sw.js'
BUILD_META = REPO_ROOT / 'build-meta.json'

IMAGE_EXTS = {'.png', '.jpg', '.jpeg', '.webp', '.gif'}
HEX_TOKEN_RE = re.compile(r'#U([0-9a-fA-F]{4,6})')
PREFIX_NUM_RE = re.compile(r'^\s*(\d+)')


def decode_hash_u(text: str) -> str:
    def repl(match: re.Match[str]) -> str:
        try:
            return chr(int(match.group(1), 16))
        except Exception:
            return match.group(0)
    return HEX_TOKEN_RE.sub(repl, text)


def slug_title_from_name(filename: str) -> str:
    stem = Path(filename).stem
    title = decode_hash_u(stem)
    # Strip stray color tokens like #L0268fb that can appear after OCR/screenshot export.
    title = re.sub(r'#L[0-9a-fA-F]{6}', '', title)
    title = title.replace('_', ' ')
    title = re.sub(r'\s+', ' ', title).strip()
    return title or stem


def parse_prefix_num(filename: str) -> int | None:
    m = PREFIX_NUM_RE.match(filename)
    return int(m.group(1)) if m else None


def sort_key(path: Path):
    num = parse_prefix_num(path.name)
    has_num = num is not None
    return (0 if has_num else 1, -(num or 0), path.name.lower())


def read_existing_cards() -> dict[str, dict]:
    if not CARDS_JSON.exists():
        return {}
    try:
        cards = json.loads(CARDS_JSON.read_text(encoding='utf-8'))
    except Exception:
        return {}
    existing = {}
    for card in cards:
        name = card.get('name')
        if name:
            existing[name] = card
    return existing


def build_cards() -> list[dict]:
    existing = read_existing_cards()
    files = sorted(
        [p for p in IMAGES_DIR.iterdir() if p.is_file() and p.suffix.lower() in IMAGE_EXTS],
        key=sort_key,
    )
    cards = []
    used_ids = set()
    next_id = 1

    # Pre-reserve explicit numeric prefix ids to keep them stable.
    for path in files:
        num = parse_prefix_num(path.name)
        if num is not None:
            used_ids.add(num)

    def get_next_id() -> int:
        nonlocal next_id
        while next_id in used_ids:
            next_id += 1
        used_ids.add(next_id)
        value = next_id
        next_id += 1
        return value

    for path in files:
        prev = existing.get(path.name, {})
        explicit_id = parse_prefix_num(path.name)
        prev_id = prev.get('id') if isinstance(prev.get('id'), int) else None
        card_id = explicit_id if explicit_id is not None else (prev_id if prev_id is not None and prev_id not in used_ids else get_next_id())
        used_ids.add(card_id)
        title = prev.get('title') or slug_title_from_name(path.name)
        cards.append({
            'id': card_id,
            'name': path.name,
            'title': title,
            'src': f"images/{quote(path.name)}",
        })
    return cards


def write_cards(cards: list[dict]) -> None:
    CARDS_JSON.write_text(json.dumps(cards, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def write_build_meta(cards: list[dict], version: str) -> None:
    payload = {
        'version': version,
        'updated_at_utc': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
        'card_count': len(cards),
    }
    BUILD_META.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def write_sw(version: str) -> None:
    sw = f"""const CACHE_NAME = 'flashcards-mobile-{version}';
const CORE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './cards.json',
  './build-meta.json',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-192.png',
  './icons/maskable-512.png'
];

self.addEventListener('install', event => {{
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
}});

self.addEventListener('activate', event => {{
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(key => key !== CACHE_NAME ? caches.delete(key) : Promise.resolve())))
  );
  self.clients.claim();
}});

function isAppShell(pathname) {{
  return pathname === '/' || pathname.endsWith('/index.html') || pathname.endsWith('/app.js') || pathname.endsWith('/styles.css') || pathname.endsWith('/manifest.webmanifest') || pathname.endsWith('/cards.json') || pathname.endsWith('/build-meta.json') || pathname.endsWith('/sw.js');
}}

self.addEventListener('fetch', event => {{
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const navigationRequest = event.request.mode === 'navigate';
  const appShellRequest = navigationRequest || isAppShell(url.pathname);

  if (appShellRequest) {{
    event.respondWith((async () => {{
      try {{
        const fresh = await fetch(event.request, {{ cache: 'no-store' }});
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, fresh.clone());
        return fresh;
      }} catch (error) {{
        const cached = await caches.match(event.request);
        if (cached) return cached;
        const fallback = await caches.match('./index.html');
        if (fallback) return fallback;
        throw error;
      }}
    }})());
    return;
  }}

  event.respondWith((async () => {{
    const cached = await caches.match(event.request);
    if (cached) return cached;
    try {{
      const response = await fetch(event.request);
      if (response.ok) {{
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, response.clone());
      }}
      return response;
    }} catch (error) {{
      const fallback = await caches.match('./index.html');
      if (fallback) return fallback;
      throw error;
    }}
  }})());
}});
"""
    SW_FILE.write_text(sw, encoding='utf-8')


def main() -> None:
    cards = build_cards()
    version = datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')
    write_cards(cards)
    write_build_meta(cards, version)
    write_sw(version)
    print(f'Generated {len(cards)} cards. Version: {version}')


if __name__ == '__main__':
    main()
