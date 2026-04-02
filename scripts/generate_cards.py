from __future__ import annotations
from pathlib import Path
import json, re, time
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
IMAGES = ROOT / "images"
CARDS = ROOT / "cards.json"
INDEX = ROOT / "index.html"
BUILD_META = ROOT / "build-meta.json"
SW = ROOT / "sw.js"

IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp"}
UNI_RE = re.compile(r"#U([0-9A-Fa-f]{4,6})")

def decode_hash_unicode(text: str) -> str:
    def repl(m):
        try:
            return chr(int(m.group(1), 16))
        except Exception:
            return m.group(0)
    return UNI_RE.sub(repl, text)

def normalize_title(stem: str) -> str:
    s = stem.strip()
    s = s.replace("#Uff08", "（").replace("#UFF08", "（")
    s = s.replace("#Uff09", "）").replace("#UFF09", "）")
    s = decode_hash_unicode(s)
    s = s.replace("_", " ")
    s = re.sub(r"\s+", "", s)
    return s

def infer_id(title: str, fallback: int) -> int:
    m = re.match(r"(\d+)", title)
    return int(m.group(1)) if m else fallback

def is_encoded_filename(name: str) -> bool:
    return "#U" in name

files = []
for p in IMAGES.iterdir():
    if p.is_file() and p.suffix.lower() in IMAGE_EXTS:
        title = normalize_title(p.stem)
        files.append({
            "filename": p.name,
            "title": title,
            "id": infer_id(title, 0),
            "encoded": is_encoded_filename(p.name),
        })

# Deduplicate by normalized title; prefer human-readable names
best_by_title = {}
for f in files:
    existing = best_by_title.get(f["title"])
    if existing is None:
        best_by_title[f["title"]] = f
    else:
        if existing["encoded"] and not f["encoded"]:
            best_by_title[f["title"]] = f
        elif existing["encoded"] == f["encoded"] and f["filename"] > existing["filename"]:
            best_by_title[f["title"]] = f

files = list(best_by_title.values())
files.sort(key=lambda x: (x["id"], x["filename"]), reverse=True)

seen_ids = set()
next_id = max([f["id"] for f in files] + [0])
for f in files:
    if f["id"] <= 0 or f["id"] in seen_ids:
        next_id += 1
        f["id"] = next_id
    seen_ids.add(f["id"])

cards = [{
    "id": f["id"],
    "name": f["filename"],
    "title": f["title"],
    "src": f"images/{quote(f['filename'])}",
} for f in files]

CARDS.write_text(json.dumps(cards, ensure_ascii=False, indent=2), encoding="utf-8")

stamp = time.strftime("%Y%m%d%H%M%S")
BUILD_META.write_text(json.dumps({
    "version": f"auto-{stamp}",
    "updated_at": stamp,
    "card_count": len(cards)
}, ensure_ascii=False, indent=2), encoding="utf-8")

html = INDEX.read_text(encoding="utf-8")
html = re.sub(
    r"window\.__FLASHCARDO_CARDS__ = .*?;</script>",
    "window.__FLASHCARDO_CARDS__ = " + json.dumps(cards, ensure_ascii=False) + ";</script>",
    html,
    flags=re.S,
)
INDEX.write_text(html, encoding="utf-8")

sw = SW.read_text(encoding="utf-8")
sw = re.sub(r"const CACHE_NAME = 'flashcardo-[^']+';", f"const CACHE_NAME = 'flashcardo-{stamp}';", sw)
SW.write_text(sw, encoding="utf-8")
