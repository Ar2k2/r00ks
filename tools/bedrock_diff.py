#!/usr/bin/env python3
"""Diff two Minecraft Bedrock versions using Mojang's official bedrock-samples repo.

Usage: python3 tools/bedrock_diff.py [OLD] [NEW]
  Versions are bedrock-samples tags (v1.26.70.23-preview) or bare numbers (1.26.70.23).
  NEW defaults to the newest preview, OLD to the preview before it.
  Pass OLD=release to compare against the newest full release.

The repo is cached in tools/work/bedrock-samples (git-ignored; cloned on first run,
fetched each run). Prints a markdown report and writes tools/work/diff/OLD__NEW.json.
Only names, keys and paths leave this script; nothing is published from it directly.
"""
import json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.join(HERE, 'work', 'bedrock-samples')
OUT = os.path.join(HERE, 'work', 'diff')
URL = 'https://github.com/Mojang/bedrock-samples.git'
# metadata/vanilladata_modules/mojang-<name>.json, each with a data_items list of {name}.
REGISTRIES = ['blocks', 'items', 'entities', 'biomes', 'effects', 'enchantments', 'features',
              'potion-effects', 'potion-types', 'dimensions', 'camera-presets', 'cooldown-category']


def git(*args):
    return subprocess.run(['git', '-C', REPO, *args], check=True, capture_output=True).stdout


def sync():
    if not os.path.isdir(REPO):
        # Blobless clone: history and trees now, file contents on demand.
        subprocess.run(['git', 'clone', '-q', '--filter=blob:none', URL, REPO], check=True)
    else:
        git('fetch', '-q', '--tags', 'origin')


def tags():
    """Version tags, newest first."""
    out = git('tag', '--list', 'v*').decode().split()
    key = lambda t: tuple(int(x) for x in re.findall(r'\d+', t.split('-')[0]))
    return sorted(out, key=key, reverse=True)


def resolve(old, new):
    t = tags()
    previews = [x for x in t if x.endswith('-preview')]
    releases = [x for x in t if not x.endswith('-preview')]
    norm = lambda v: v if v in t else next((x for x in t if x.lstrip('v').split('-')[0] == v.lstrip('v')), None)
    new = norm(new) if new else previews[0]
    if not new:
        sys.exit('Unknown NEW version.')
    if old == 'release':
        return releases[0], new
    if old:
        old = norm(old)
        return old or sys.exit('Unknown OLD version.'), new
    later = previews if new in previews else releases
    i = later.index(new)
    return (later[i + 1] if i + 1 < len(later) else sys.exit('No older version.')), new


def show(ref, path):
    try:
        return git('show', f'{ref}:{path}').decode('utf-8', 'replace')
    except subprocess.CalledProcessError:
        return None


def lang(ref):
    out = {}
    for line in (show(ref, 'resource_pack/texts/en_US.lang') or '').splitlines():
        line = line.split('\t#', 1)[0].strip()  # trailing tab comments
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            out[k] = v
    return out


def registries(ref):
    out = {}
    for name in REGISTRIES:
        raw = show(ref, f'metadata/vanilladata_modules/mojang-{name}.json')
        if raw:
            out[name] = sorted({e['name'] for e in json.loads(raw).get('data_items', [])})
    raw = show(ref, 'metadata/command_modules/mojang-commands.json')
    if raw:
        out['commands'] = sorted({c['name'] for c in json.loads(raw)['commands']})
    return out


def set_diff(a, b):
    a, b = set(a), set(b)
    return {'added': sorted(b - a), 'removed': sorted(a - b)}


def group(paths):
    out = {}
    for p in paths:
        parts = p.split('/')
        out.setdefault('/'.join(parts[:2]) if len(parts) > 2 else parts[0], []).append(p)
    return out


def diff(old, new):
    la, lb = lang(old), lang(new)
    ra, rb = registries(old), registries(new)
    files = {'A': [], 'D': [], 'M': []}
    for line in git('diff', '--name-status', '--no-renames', old, new).decode().splitlines():
        status, path = line.split('\t', 1)
        files.setdefault(status[0], []).append(path)
    return {
        'lang': {
            'added': {k: lb[k] for k in sorted(set(lb) - set(la))},
            'removed': sorted(set(la) - set(lb)),
            'changed': {k: [la[k], lb[k]] for k in sorted(set(la) & set(lb)) if la[k] != lb[k]},
        },
        'registries': {k: set_diff(ra.get(k, []), rb.get(k, [])) for k in sorted(set(ra) | set(rb))},
        'files': {'added': group(files['A']), 'removed': group(files['D']), 'changed': group(files['M'])},
    }


def features(d):
    """Added registry names grouped with lang keys and files that share the name."""
    ids = {n.split(':')[-1] for k in ('blocks', 'items', 'entities') for n in d['registries'].get(k, {}).get('added', [])}
    paths = [p for v in d['files']['added'].values() for p in v]
    out = {}
    for i in sorted(ids, key=len, reverse=True):
        out[i] = {
            'registries': [k for k in ('blocks', 'items', 'entities')
                           if any(n.split(':')[-1] == i for n in d['registries'].get(k, {}).get('added', []))],
            'lang': [k for k in d['lang']['added'] if re.search(rf'(^|[.:]){re.escape(i)}([.:]|$)', k)],
            'files': [p for p in paths if re.search(rf'(^|/){re.escape(i)}(_|\.|/|$)', p)],
        }
    return out


def report(old, new, d):
    L = [f'# Bedrock {old} → {new}', '']
    lg = d['lang']
    L += [f'## Lang ({len(lg["added"])} added, {len(lg["removed"])} removed, {len(lg["changed"])} changed)']
    L += [f'- + `{k}`: {v}' for k, v in lg['added'].items()]
    L += [f'- − `{k}`' for k in lg['removed']]
    L += [f'- ~ `{k}`: {a!r} → {b!r}' for k, (a, b) in lg['changed'].items()]
    L += ['', '## Registries']
    for k, v in d['registries'].items():
        if v['added'] or v['removed']:
            L.append(f'- **{k}**: ' + ', '.join([f'+{x}' for x in v['added']] + [f'−{x}' for x in v['removed']]))
    L += ['', '## Files']
    for kind in ('added', 'removed', 'changed'):
        for g, paths in sorted(d['files'][kind].items()):
            shown = ', '.join(p.split('/', 2)[-1] for p in paths[:12]) + (' …' if len(paths) > 12 else '')
            L.append(f'- {kind} {g} ({len(paths)}): {shown}')
    f = {k: v for k, v in features(d).items() if any(v.values())}
    if f:
        L += ['', '## Likely features (things sharing a name)']
        for i, v in f.items():
            parts = [f'{len(v[k])} {k}' for k in ('lang', 'files') if v[k]]
            L.append(f'- **{i}** ({"/".join(v["registries"])}): ' + ', '.join(parts))
    return '\n'.join(L)


if __name__ == '__main__':
    sync()
    old, new = resolve(*(sys.argv[1:3] + [None, None])[:2])
    d = diff(old, new)
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, f'{old}__{new}.json'), 'w') as f:
        json.dump({'edition': 'bedrock', 'old': old, 'new': new, **d, 'features': features(d)}, f, indent=1)
    print(report(old, new, d))
