from __future__ import annotations
from pathlib import Path
import json, re, time
<<<<<<< Updated upstream
from urllib.parse import quote
=======
>>>>>>> Stashed changes

ROOT = Path(__file__).resolve().parents[1]
IMAGES = ROOT / "images"
CARDS = ROOT / "cards.json"
INDEX = ROOT / "index.html"
BUILD_META = ROOT / "build-meta.json"
SW = ROOT / "sw.js"

IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp"}

UNI_RE = re.compile(r"#U([0-9A-Fa-f]{4,6})")
<<<<<<< Updated upstream
=======
DATE_RE = re.compile(r"(\d{4}\.\d{1,2}\.\d{1,2})")
>>>>>>> Stashed changes

def decode_hash_unicode(text: str) -> str:
    def repl(m):
        try:
            return chr(int(m.group(1), 16))
        except Exception:
            return m.group(0)
    return UNI_RE.sub(repl, text)

def clean_title(stem: str) -> str:
<<<<<<< Updated upstream
    s = decode_hash_unicode(stem).strip()
    s = s.replace("_", " ")
=======
    s = decode_hash_unicode(stem)
    s = s.replace("_", " ").strip()
>>>>>>> Stashed changes
    s = re.sub(r"\s+", " ", s)
    s = s.replace("（", "(").replace("）", ")")
    s = re.sub(r"\s*\(\s*", "（", s)
    s = re.sub(r"\s*\)\s*", "）", s)
    s = re.sub(r"\s+", "", s)
    return s

def infer_id(title: str, fallback: int) -> int:
    m = re.match(r"(\d+)", title)
    return int(m.group(1)) if m else fallback

<<<<<<< Updated upstream
=======
def url_escape_filename(name: str) -> str:
    from urllib.parse import quote
    return quote(name)

>>>>>>> Stashed changes
files = []
for p in IMAGES.iterdir():
    if p.is_file() and p.suffix.lower() in IMAGE_EXTS:
        title = clean_title(p.stem)
        files.append({
            "filename": p.name,
            "title": title,
            "id": infer_id(title, 0),
        })

<<<<<<< Updated upstream
files.sort(key=lambda x: (x["id"], x["filename"]), reverse=True)

=======
# Stable sort: id desc, then filename desc
files.sort(key=lambda x: (x["id"], x["filename"]), reverse=True)

# Assign fallback ids when missing or duplicated
>>>>>>> Stashed changes
seen = set()
next_id = max([f["id"] for f in files] + [0])
for f in files:
    if f["id"] <= 0 or f["id"] in seen:
        next_id += 1
        f["id"] = next_id
    seen.add(f["id"])

<<<<<<< Updated upstream
cards = [{
    "id": f["id"],
    "name": f["filename"],
    "title": f["title"],
    "src": f"images/{quote(f['filename'])}",
} for f in files]
=======
cards = []
for f in files:
    cards.append({
        "id": f["id"],
        "name": f["filename"],
        "title": f["title"],
        "src": f"images/{url_escape_filename(f['filename'])}",
    })
>>>>>>> Stashed changes

CARDS.write_text(json.dumps(cards, ensure_ascii=False, indent=2), encoding="utf-8")

stamp = time.strftime("%Y%m%d%H%M%S")
<<<<<<< Updated upstream
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

=======
BUILD_META.write_text(json.dumps({"updated_at": stamp, "card_count": len(cards)}, ensure_ascii=False, indent=2), encoding="utf-8")

# Refresh embedded data in index.html if present
html = INDEX.read_text(encoding="utf-8")
start = html.find("window.__FLASHCARDO_CARDS__ = ")
if start != -1:
    end = html.find(";</script>", start)
    if end != -1:
        prefix = html[:start]
        suffix = html[end:]
        html = prefix + "window.__FLASHCARDO_CARDS__ = " + json.dumps(cards, ensure_ascii=False) + suffix
        INDEX.write_text(html, encoding="utf-8")

# bump service worker cache
>>>>>>> Stashed changes
sw = SW.read_text(encoding="utf-8")
sw = re.sub(r"const CACHE_NAME = 'flashcardo-[^']+';", f"const CACHE_NAME = 'flashcardo-{stamp}';", sw)
SW.write_text(sw, encoding="utf-8")
