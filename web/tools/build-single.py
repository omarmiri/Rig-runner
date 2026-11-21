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
APP_TAGS = ('rel="manifest"', 'rel="apple-touch-icon"', 'rel="icon"', 'apple-mobile-web-app', 'mobile-web-app-capable', 'name="theme-color"')
if fragment:
    # an embedded preview can't be installed as an app: leave the app tags out
    head = html.split("<head>", 1)[1].split("</head>", 1)[0]
    head = "\n".join(l for l in head.split("\n") if 'charset=' not in l and 'name="viewport"' not in l and not any(t in l for t in APP_TAGS))
    body = html.split("<body>", 1)[1].rsplit("</body>", 1)[0]
    html = head.strip() + "\n" + body.strip() + "\n"
os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
with open(out, "w", encoding="utf-8") as f:
    f.write(html)
print(f"wrote {out} ({os.path.getsize(out) // 1024} KB)")
if not fragment:
    # a standalone single file is still a Home Screen app: copy the manifest and icons next to it,
    # and write a service worker whose offline list matches the single file
    import shutil
    dest = os.path.dirname(os.path.abspath(out))
    shutil.copy(os.path.join(ROOT, "manifest.webmanifest"), dest)
    shutil.copytree(os.path.join(ROOT, "icons"), os.path.join(dest, "icons"), dirs_exist_ok=True)
    page = os.path.basename(out)
    shell = ["./", page, "manifest.webmanifest"] + ["icons/" + f for f in sorted(os.listdir(os.path.join(ROOT, "icons")))]
    sw = re.sub(r"const SHELL = \[.*?\];", "const SHELL = " + str(shell).replace("'", '"') + ";", read("sw.js"), flags=re.S)
    with open(os.path.join(dest, "sw.js"), "w", encoding="utf-8") as f:
        f.write(sw)
    print("wrote manifest.webmanifest, icons/ and sw.js next to it")
