"""Gabungkan index.html + assets + physics.py menjadi satu file dist/index.html (siap unggah ke hosting).

Jalankan dari folder proyek:  python tools/build_dist.py
"""
import base64
import io
import pathlib
import re

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[1]


def read(p):
    return (ROOT / p).read_text(encoding="utf-8")


def photo(p):
    im = Image.open(ROOT / p).convert("RGB")
    im.thumbnail((360, 360))
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=85)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


html = read("index.html")
html = html.replace('<link rel="stylesheet" href="assets/style.css">', "<style>\n" + read("assets/style.css") + "\n</style>")
for name in ("physics", "app", "learn"):
    html = html.replace(f'<script src="assets/{name}.js"></script>', "<script>\n" + read(f"assets/{name}.js") + "\n</script>")
py = read("server/physics.py").replace("</script", "<\\/script")
html = html.replace('<script type="text/x-python" id="pySrc" data-src="server/physics.py"></script>',
                    '<script type="text/x-python" id="pySrc">\n' + py + "\n</script>")
html = re.sub(r"assets/team/(\w+\.jpg)", lambda m: photo("assets/team/" + m.group(1)), html)

assert "assets/" not in html, "masih ada rujukan ke folder assets/"
out = ROOT / "dist" / "index.html"
out.parent.mkdir(exist_ok=True)
out.write_text(html, encoding="utf-8")
print(f"{out} ({len(html) // 1024} KB)")
