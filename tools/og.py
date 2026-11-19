"""Render the link preview images from tools/og-image.html with headless Chrome:
site/shared/og.png for home and hubs, and site/<tool>/og.png for each built tool (its icon, name and
description from shared/shell.js). Then point each tool page's og:image at its own image.

    python3 tools/og.py
"""
import os, re, subprocess, urllib.parse

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SITE = os.path.join(ROOT, 'site')
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
TEMPLATE = 'file://' + os.path.join(ROOT, 'tools', 'og-image.html')
BASE = 'https://rooks.rookstudio.net/'

shell = open(os.path.join(SITE, 'shared/shell.js')).read()
icons = dict(re.findall(r"^\s*(\w+): '(<[^']*)',$", shell, re.M))
tools = re.findall(r"\{ id: '(\w+)', name: '([^']+)', path: '([^']+)', cat: '\w+', built: true,\s*desc: '([^']+)'", shell)
assert tools and all(t[0] in icons for t in tools), 'tool list or icons in shell.js not found'

def render(out, query=''):
    subprocess.run([CHROME, '--headless', '--hide-scrollbars', '--window-size=1200,630', '--virtual-time-budget=3000',
                    f'--screenshot={out}', TEMPLATE + query], check=True, capture_output=True)
    assert os.path.getsize(out) > 10000, f'{out} looks empty'

render(os.path.join(SITE, 'shared/og.png'))
for id, name, path, desc in tools:
    render(os.path.join(SITE, path, 'og.png'), '?' + urllib.parse.urlencode({'name': name, 'desc': desc, 'icon': icons[id]}))
    f = os.path.join(SITE, path, 'index.html')
    s = open(f).read()
    t = re.sub(r'(property="og:image" content=")[^"]*', rf'\g<1>{BASE}{path}og.png', s)
    assert 'og:image' in t, f
    if t != s:
        open(f, 'w').write(t)
print(f'og.png rendered for the site and {len(tools)} tools')
