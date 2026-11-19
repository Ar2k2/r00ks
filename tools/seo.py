"""Search extras: JSON-LD structured data on every page in sitemap.xml, and <lastmod> dates in the sitemap.

Pages get breadcrumbs (Home > category > tool) plus WebSite (home), CollectionPage (hubs) or WebApplication
(tools), built from each page's own title/description and the tool list in shared/shell.js. lastmod is the
last commit that changed the page's folder beyond ?v= restamps (now if it has such uncommitted changes), as a full time so
same-day publishes still change the sitemap (the deploy pings IndexNow with changed sitemap lines).
Tool pages also get a "Related tools" section (plain links, from RELATED below) before </main>.
Idempotent. Run before publishing, after version.py:

    python3 tools/seo.py
"""
import datetime, json, os, re, subprocess

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SITE = os.path.join(ROOT, 'site')
BASE = 'https://rooks.rookstudio.net/'
STAMP = r'\?v=[0-9]{12}'

shell = open(os.path.join(SITE, 'shared/shell.js')).read()
cats = {m[1]: (m[2], m[3]) for m in re.finditer(r"\{ id: '(\w+)', name: '([^']+)', path: '([^']+)' \}", shell)}
tools = {m[2]: (m[1], m[3]) for m in re.finditer(r"name: '([^']+)', path: '([^']+)', cat: '(\w+)'", shell)}
descs = {m[1]: m[2] for m in re.finditer(r"path: '([^']+)', cat: [^\n]*\n\s*desc: '([^']+)'", shell)}
RELATED = {  # each tool's closest neighbours, by tool folder
    'gradient': 'palette mosaic mapart', 'palette': 'gradient house mosaic', 'mosaic': 'mapart gradient palette',
    'mapart': 'mosaic gradient commands', 'banner': 'fireworks commands palette', 'fireworks': 'banner commands',
    'nether': 'stronghold slime', 'stronghold': 'nether slime', 'slime': 'nether stronghold',
    'shapes': 'roofs house beacon', 'roofs': 'house shapes', 'house': 'roofs palette shapes',
    'beacon': 'shapes commands', 'anvil': 'commands beacon', 'commands': 'anvil banner fireworks',
}
assert cats and tools and len(descs) == len(tools), 'tool list in shell.js not found'

def git(*a):
    return subprocess.run(['git', *a], cwd=ROOT, capture_output=True, text=True)

def lastmod(path):
    spec = f':(glob)site/{path}*' if path else ':(glob)site/*.html'  # not sitemap.xml, which this script writes  # files directly in the folder, not sub-pages
    if git('diff', '--quiet', '-I', STAMP, 'HEAD', '--', spec).returncode:
        return datetime.datetime.now().astimezone().isoformat(timespec='seconds')
    for line in git('log', '--format=%H %cI', '--', spec).stdout.splitlines():
        h, d = line.split()
        if git('diff', '--quiet', '-I', STAMP, f'{h}^', h, '--', spec).returncode:
            return d
    return datetime.datetime.now().astimezone().isoformat(timespec='seconds')

def meta(s, prop):
    return re.search(rf'(?:name|property)="{prop}" content="([^"]*)"', s)[1]

def crumbs(path):
    items = [('R00K’s', '')]
    if path in tools:
        cname, cpath = cats[tools[path][1]]
        items += [(cname, cpath), (tools[path][0], path)]
    elif path.endswith('guide/') and path[:-6] in tools:
        items += crumbs(path[:-6])[1:] + [('Guide', path)]
        return items
    elif any(c[1] == path for c in cats.values()):
        items += [(next(n for n, p in cats.values() if p == path), path)]
    return items

def ld(path, s):
    title = re.search(r'<title>([^<]*)', s)[1].replace(' · R00K’s', '').replace('&amp;', '&')
    url, desc = BASE + path, meta(s, 'description')
    if path == '':
        main = {'@type': 'WebSite', 'name': 'R00K’s', 'url': url, 'description': desc}
    elif path in tools:
        main = {'@type': 'WebApplication', 'name': title, 'url': url, 'description': desc,
                'applicationCategory': 'UtilitiesApplication', 'operatingSystem': 'Any', 'isAccessibleForFree': True,
                'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'USD'}}
    elif path.endswith('guide/'):
        main = {'@type': 'Article', 'headline': title, 'url': url, 'description': desc}
    else:
        main = {'@type': 'CollectionPage', 'name': title, 'url': url, 'description': desc}
    graph = [main]
    if path:
        graph.append({'@type': 'BreadcrumbList', 'itemListElement': [
            {'@type': 'ListItem', 'position': i + 1, 'name': n, 'item': BASE + p} for i, (n, p) in enumerate(crumbs(path))]})
    return json.dumps({'@context': 'https://schema.org', '@graph': graph}, ensure_ascii=False)

sm_file = os.path.join(SITE, 'sitemap.xml')
sm = open(sm_file).read()
paths = [m[1] for m in re.finditer(rf'<loc>{BASE}([^<]*)</loc>', sm)]
for path in paths:
    f = os.path.join(SITE, path, 'index.html')
    s = open(f).read()
    block = f'<script type="application/ld+json">{ld(path, s)}</script>\n'
    t = re.sub(r'<script type="application/ld\+json">.*?</script>\n', '', s, flags=re.S)
    t = t.replace('<link rel="icon"', block + '<link rel="icon"', 1)
    t = re.sub(r'  <section class="about[^"]*" aria-labelledby="related-h">.*?</section>\n', '', t, flags=re.S)
    if path in tools:
        ids = RELATED[path[:-1]]  # shell.js turns these plain links into tool cards
        links = ''.join(f'<a href="../{r}/">{tools[r + "/"][0]}: {descs[r + "/"]}</a>' for r in ids.split())
        rel = (f'  <section class="about related" aria-labelledby="related-h">\n    <h2 id="related-h">Related tools</h2>\n'
               f'    <nav class="tools cards" data-related="{ids}" aria-label="Related tools">{links}</nav>\n  </section>\n')
        t = t.replace('</main>', rel + '</main>', 1)
        assert rel in t, f'no </main> in {f}'
    assert block in t, f'no icon link to anchor JSON-LD in {f}'
    if t != s:
        open(f, 'w').write(t)
for path in paths:
    sm = re.sub(rf'<url><loc>{BASE}{re.escape(path)}</loc>(?:<lastmod>[^<]*</lastmod>)?</url>',
                f'<url><loc>{BASE}{path}</loc><lastmod>{lastmod(path)}</lastmod></url>', sm)
open(sm_file, 'w').write(sm)
print(f'{len(paths)} pages: JSON-LD and lastmod updated')
