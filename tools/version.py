"""Stamp every local .js/.css link in site/ with ?v=<now>, so browsers fetch fresh copies after a publish.

Without it a returning visitor can get new HTML with an old cached shell.css or shell.js (Pages caches
for about 10 minutes), which breaks styles or scripts. Run before publishing when any .js or .css changed:

    python3 tools/version.py
"""
import glob, os, re, time

V = time.strftime('%Y%m%d%H%M')
LINK = re.compile(r'((?:src|href)=")((?!https?:|//)[^"?]+\.(?:js|css))(\?v=[^"]*)?(")')

root = os.path.join(os.path.dirname(__file__), '..', 'site')
total = 0
for f in sorted(glob.glob(os.path.join(root, '**', '*.html'), recursive=True)):
    with open(f) as fh:
        s = fh.read()
    t, n = LINK.subn(lambda m: f'{m[1]}{m[2]}?v={V}{m[4]}', s)
    if t != s:
        with open(f, 'w') as fh:
            fh.write(t)
    total += n
print(f'{total} links stamped ?v={V}')
