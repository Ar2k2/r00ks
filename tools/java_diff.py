#!/usr/bin/env python3
"""Diff two Minecraft Java versions straight from the local launcher folder.

Usage: python3 tools/java_diff.py [OLD] [NEW]
  NEW defaults to the latest snapshot, OLD to the version just before it that is
  installed locally. Pass OLD=release to compare against the latest release.

Prints a markdown report and writes the full diff to tools/work/diff/OLD__NEW.json.
Reads jars locally; nothing is uploaded, and the output (names, keys, paths)
stays in tools/work/, which is git-ignored. Stdlib only.

Registries are inferred from files, not by running game code:
  blocks = blockstates/*.json, items = items/*.json, entities = entity.minecraft.* lang keys,
  sounds = keys of sounds.json from the launcher's asset index.
"""
import gzip, hashlib, json, os, re, struct, sys, zipfile

MC = os.path.expanduser('~/Library/Application Support/minecraft')
VERSIONS = os.path.join(MC, 'versions')
OUT = os.path.join(os.path.dirname(__file__), 'work', 'diff')


# ---------- loading ----------

def manifest():
    with open(os.path.join(VERSIONS, 'version_manifest_v2.json')) as f:
        return json.load(f)


def installed(vid):
    return os.path.exists(os.path.join(VERSIONS, vid, vid + '.jar'))


def resolve(old, new):
    m = manifest()
    new = new or m['latest']['snapshot']
    if old == 'release':
        return m['latest']['release'], new
    if old:
        return old, new
    ids = [v['id'] for v in m['versions']]  # newest first
    for vid in ids[ids.index(new) + 1:]:
        if installed(vid):
            return vid, new
    sys.exit(f'No installed version older than {new}.')


def class_members(data):
    """Field and method names of a .class file, from its constant pool. None if unreadable."""
    try:
        n = struct.unpack_from('>H', data, 8)[0]
        utf8, p, i = {}, 10, 1
        while i < n:
            tag = data[p]
            if tag == 1:
                ln = struct.unpack_from('>H', data, p + 1)[0]
                utf8[i] = data[p + 3:p + 3 + ln].decode('utf-8', 'replace')
                p += 3 + ln
            elif tag in (7, 8, 16, 19, 20):
                p += 3
            elif tag == 15:
                p += 4
            elif tag in (3, 4, 9, 10, 11, 12, 17, 18):
                p += 5
            elif tag in (5, 6):
                p += 9
                i += 1  # long and double take two slots
            else:
                return None
            i += 1
        p += 6  # access, this, super
        p += 2 + 2 * struct.unpack_from('>H', data, p)[0]  # interfaces
        out = []
        for kind in ('field', 'method'):
            count = struct.unpack_from('>H', data, p)[0]
            p += 2
            for _ in range(count):
                name = utf8[struct.unpack_from('>H', data, p + 2)[0]]
                p += 6
                for _ in range(struct.unpack_from('>H', data, p)[0]):  # attributes
                    p += 6 + struct.unpack_from('>I', data, p + 2)[0]
                p += 2
                if kind == 'field' or name not in ('<init>', '<clinit>'):
                    out.append(f'{kind}:{name}')
        return sorted(set(out))
    except (struct.error, KeyError, IndexError):
        return None


DATA_VERSION = b'\x03\x00\x0bDataVersion'


def content_hash(name, data):
    """Hash a file, ignoring the DataVersion stamp every structure .nbt gets each version."""
    if name.endswith('.nbt'):
        try:
            raw = bytearray(gzip.decompress(data))
            i = raw.find(DATA_VERSION)
            if i >= 0:
                raw[i + 14:i + 18] = b'\0\0\0\0'
            data = bytes(raw)
        except OSError:
            pass
    return hashlib.sha1(data).hexdigest()


def load(vid):
    """Everything the diff needs from one version, keyed by section."""
    with zipfile.ZipFile(os.path.join(VERSIONS, vid, vid + '.jar')) as z:
        files, classes = {}, {}
        for info in z.infolist():
            n = info.filename
            if n.endswith('/'):
                continue
            data = z.read(n)
            if n.endswith('.class'):
                if n.startswith(('net/minecraft/', 'com/mojang/')):
                    classes[n[:-6].replace('/', '.')] = data
            elif n.startswith(('assets/', 'data/')):
                files[n] = data
    lang = json.loads(files['assets/minecraft/lang/en_us.json'])
    stem = lambda folder: sorted(n[len(folder):-5] for n in files if n.startswith(folder) and n.endswith('.json'))
    sounds = []
    with open(os.path.join(VERSIONS, vid, vid + '.json')) as f:
        index_id = json.load(f)['assetIndex']['id']
    try:
        with open(os.path.join(MC, 'assets', 'indexes', index_id + '.json')) as f:
            h = json.load(f)['objects']['minecraft/sounds.json']['hash']
        with open(os.path.join(MC, 'assets', 'objects', h[:2], h)) as f:
            sounds = sorted(json.load(f))
    except (OSError, KeyError):
        pass  # assets not downloaded: sounds section stays empty
    return {
        'lang': lang,
        'registries': {
            'block': stem('assets/minecraft/blockstates/'),
            'item': stem('assets/minecraft/items/'),
            'entity': sorted(k.split('.')[2] for k in lang if re.fullmatch(r'entity\.minecraft\.[a-z0-9_]+', k)),
            'sound': sounds,
        },
        'files': {n: content_hash(n, d) for n, d in files.items()},
        'json': {n: d for n, d in files.items() if n.startswith('data/minecraft/tags/')},
        'classes': {n: hashlib.sha1(d).hexdigest() for n, d in classes.items()},
        'class_bytes': classes,
    }


# ---------- diffing ----------

def set_diff(a, b):
    a, b = set(a), set(b)
    return {'added': sorted(b - a), 'removed': sorted(a - b)}


def group(paths, depth):
    out = {}
    for p in paths:
        out.setdefault('/'.join(p.split('/')[:depth]), []).append(p)
    return out


def tag_values(raw):
    try:
        return {v if isinstance(v, str) else v.get('id', '') for v in json.loads(raw).get('values', [])}
    except (ValueError, AttributeError):
        return set()


def diff(a, b):
    la, lb = a['lang'], b['lang']
    lang = {
        'added': {k: lb[k] for k in sorted(set(lb) - set(la))},
        'removed': sorted(set(la) - set(lb)),
        'changed': {k: [la[k], lb[k]] for k in sorted(set(la) & set(lb)) if la[k] != lb[k]},
    }
    registries = {k: set_diff(a['registries'][k], b['registries'][k]) for k in a['registries']}

    fa, fb = a['files'], b['files']
    paths = set_diff(fa, fb)
    changed = sorted(n for n in set(fa) & set(fb) if fa[n] != fb[n])
    is_data = lambda n: n.startswith('data/')
    data = {
        'added': group([n for n in paths['added'] if is_data(n)], 3),
        'removed': group([n for n in paths['removed'] if is_data(n)], 3),
        'changed': group([n for n in changed if is_data(n)], 3),
    }
    tags = {}
    for n in data['changed'].get('data/minecraft/tags', []):
        va, vb = tag_values(a['json'][n]), tag_values(b['json'][n])
        if va != vb:
            tags[n] = {'added': sorted(vb - va), 'removed': sorted(va - vb)}
    not_lang = lambda n: n.startswith('assets/') and '/lang/' not in n
    assets = {
        'added': group([n for n in paths['added'] if not_lang(n)], 3),
        'removed': group([n for n in paths['removed'] if not_lang(n)], 3),
        'changed': {k: len(v) for k, v in group([n for n in changed if not_lang(n)], 3).items()},
    }

    ca, cb = a['classes'], b['classes']
    members = {}
    for n in sorted(set(ca) & set(cb)):
        if ca[n] == cb[n]:
            continue
        ma, mb = class_members(a['class_bytes'][n]), class_members(b['class_bytes'][n])
        if ma is not None and mb is not None:
            d = set_diff(ma, mb)
            if d['added'] or d['removed']:
                members[n] = d
    code = {**set_diff(ca, cb), 'members': members,
            'changed_count': sum(ca[n] != cb[n] for n in set(ca) & set(cb))}
    return {'lang': lang, 'registries': registries, 'data': data, 'tags': tags, 'assets': assets, 'code': code}


def features(d):
    """Group added things that share a name: a registry id, its lang keys, assets, data files and classes."""
    ids = set()
    for k in ('block', 'item', 'entity'):
        ids.update(d['registries'][k]['added'])
    camel = lambda s: ''.join(w.title() for w in s.split('_'))
    flat_paths = [p for g in (d['data']['added'], d['assets']['added']) for v in g.values() for p in v]
    out = {}
    for i in sorted(ids, key=len, reverse=True):
        hits = {
            'registries': [k for k in ('block', 'item', 'entity') if i in d['registries'][k]['added']],
            'lang': [k for k in d['lang']['added'] if k.endswith('.' + i) or f'.{i}.' in k],
            'files': [p for p in flat_paths if re.search(rf'(^|/){re.escape(i)}(_|\.|/|$)', p)],
            'classes': [c for c in d['code']['added'] if camel(i) in c],
        }
        out[i] = hits
    return out


# ---------- report ----------

def report(old, new, d):
    L = [f'# Java {old} → {new}', '']
    lang = d['lang']
    L += [f'## Lang ({len(lang["added"])} added, {len(lang["removed"])} removed, {len(lang["changed"])} changed)']
    L += [f'- + `{k}`: {v}' for k, v in lang['added'].items()]
    L += [f'- − `{k}`' for k in lang['removed']]
    L += [f'- ~ `{k}`: {a!r} → {b!r}' for k, (a, b) in lang['changed'].items()]
    L += ['', '## Registries']
    for k, v in d['registries'].items():
        if v['added'] or v['removed']:
            L.append(f'- **{k}**: ' + ', '.join([f'+{x}' for x in v['added']] + [f'−{x}' for x in v['removed']]))
    L += ['', '## Data']
    for kind in ('added', 'removed', 'changed'):
        for g, paths in d['data'][kind].items():
            shown = ', '.join(p.split('/', 3)[-1] for p in paths[:12]) + (' …' if len(paths) > 12 else '')
            L.append(f'- {kind} {g.split("/", 2)[-1]} ({len(paths)}): {shown}')
    if d['tags']:
        L += ['', '## Tag membership']
        L += [f'- `{n[len("data/minecraft/tags/"):-5]}`: ' + ', '.join([f'+{x}' for x in v['added']] + [f'−{x}' for x in v['removed']])
              for n, v in d['tags'].items()]
    L += ['', '## Assets']
    for kind in ('added', 'removed'):
        for g, paths in d['assets'][kind].items():
            shown = ', '.join(p.split('/', 3)[-1] for p in paths[:12]) + (' …' if len(paths) > 12 else '')
            L.append(f'- {kind} {g.split("/", 2)[-1]} ({len(paths)}): {shown}')
    if d['assets']['changed']:
        L.append('- changed: ' + ', '.join(f'{g.split("/", 2)[-1]} {n}' for g, n in d['assets']['changed'].items()))
    c = d['code']
    L += ['', f'## Code ({len(c["added"])} classes added, {len(c["removed"])} removed, {c["changed_count"]} changed)']
    L += [f'- + {x}' for x in c['added'][:60]] + ([f'- … {len(c["added"]) - 60} more'] if len(c['added']) > 60 else [])
    L += [f'- − {x}' for x in c['removed'][:30]]
    if c['members']:
        L += ['', '### Changed members (first 40 classes)']
        for n, v in list(c['members'].items())[:40]:
            L.append(f'- {n}: ' + ', '.join([f'+{x}' for x in v['added'][:8]] + [f'−{x}' for x in v['removed'][:8]]))
    f = {k: v for k, v in features(d).items() if any(v.values())}
    if f:
        L += ['', '## Likely features (things sharing a name)']
        for i, v in f.items():
            parts = [f'{len(v[k])} {k}' for k in ('lang', 'files', 'classes') if v[k]]
            L.append(f'- **{i}** ({"/".join(v["registries"])}): ' + ', '.join(parts))
    return '\n'.join(L)


if __name__ == '__main__':
    old, new = resolve(*(sys.argv[1:3] + [None, None])[:2])
    for v in (old, new):
        if not installed(v):
            sys.exit(f'{v} is not installed. Launch it once in the Minecraft launcher.')
    d = diff(load(old), load(new))
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, f'{old}__{new}.json'), 'w') as f:
        json.dump({'edition': 'java', 'old': old, 'new': new, **d, 'features': features(d)}, f, indent=1)
    print(report(old, new, d))
