#!/usr/bin/env python3
"""Pack the web/ folder into one self-contained HTML file (CSS, scripts and images inlined).

Usage:  python3 tools/build-single.py [output.html] [--fragment]     (default: dist/rig-runner.html)
        --fragment  leave out the <html>/<head>/<body> wrapper, for hosts that add their own
Useful for hosts that only take a single file, or for sharing the game as one download.
"""
import base64, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = [a for a in sys.argv[1:] if not a.startswith("--")]
fragment = "--fragment" in sys.argv
out = args[0] if args else os.path.join(ROOT, "dist", "rig-runner.html")

def read(rel):
    with open(os.path.join(ROOT, rel), encoding="utf-8") as f:
        return f.read()

def data_uri(match):
    rel = match.group(1)
    with open(os.path.join(ROOT, rel), "rb") as f:
        return '"data:image/png;base64,' + base64.b64encode(f.read()).decode() + '"'

html = read("index.html")
html = re.sub(r'<link rel="stylesheet" href="(css/[^"]+)">', lambda m: "<style>\n" + read(m.group(1)) + "</style>", html)
def inline_script(m):
    js = re.sub(r'"(assets/[^"]+\.png)"', data_uri, read(m.group(1)))
    return "<script>\n" + js.replace("</script", "<\\/script") + "</script>"
html = re.sub(r'<script src="(js/[^"]+)"></script>', inline_script, html)
assert 'src="js/' not in html and '"assets/' not in html, "something was not inlined"
if fragment:
    head = html.split("<head>", 1)[1].split("</head>", 1)[0]
    head = "\n".join(l for l in head.split("\n") if 'charset=' not in l and 'name="viewport"' not in l)
    body = html.split("<body>", 1)[1].rsplit("</body>", 1)[0]
    html = head.strip() + "\n" + body.strip() + "\n"
os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
with open(out, "w", encoding="utf-8") as f:
    f.write(html)
print(f"wrote {out} ({os.path.getsize(out) // 1024} KB)")
