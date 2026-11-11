#!/usr/bin/env python3
"""Build site/gradient/blocks.json from a local Minecraft client jar.

Usage: python3 tools/gradient_blocks.py [path/to/client.jar]
Default jar: the newest release in ~/Library/Application Support/minecraft/versions.

Reads textures only to compute numbers (average color, noise). The output holds
IDs, names, texture paths and numbers. No Mojang files are copied.
Stdlib only: zipfile + zlib, with a small PNG decoder below.
"""
import json, math, os, re, struct, sys, zipfile, zlib

VERSIONS = os.path.expanduser('~/Library/Application Support/minecraft/versions')
OUT = os.path.join(os.path.dirname(__file__), '..', 'site', 'gradient', 'blocks.json')

# Behaviour that lives in game code, not data files, so it is listed by hand.
# shortcut: hand lists, re-check them each major update.
GRAVITY = {'sand', 'red_sand', 'gravel', 'suspicious_sand', 'suspicious_gravel', 'dragon_egg'}
LIGHT = {'glowstone', 'sea_lantern', 'shroomlight', 'jack_o_lantern', 'magma_block', 'crying_obsidian',
         'ochre_froglight', 'verdant_froglight', 'pearlescent_froglight', 'sculk_catalyst', 'beacon',
         'respawn_anchor', 'end_gateway', 'lava'}
UNOBTAINABLE = {'bedrock', 'barrier', 'light', 'command_block', 'chain_command_block', 'repeating_command_block',
                'structure_block', 'structure_void', 'jigsaw', 'test_block', 'test_instance_block',
                'end_portal_frame', 'budding_amethyst', 'reinforced_deepslate', 'spawner', 'trial_spawner',
                'vault', 'frosted_ice', 'petrified_oak_slab', 'farmland', 'dirt_path'}
FACE = {'up': 'top', 'down': 'bottom', 'north': 'front', 'south': 'side', 'east': 'side', 'west': 'side'}
# Blockstate "x" rotation turns the model about the east-west axis (observer facing=down is x=90
# and its north front ends up pointing down). Which model face ends up on top for each x:
UP_AFTER_X = {0: 'up', 90: 'south', 180: 'down', 270: 'north'}


def view_of(side, x):
    """'t' if this model face ends up facing up, 's' if sideways, '' if down. "y" rotation never changes this."""
    if side == UP_AFTER_X[x]: return 't'
    if side in ('east', 'west') or (side in ('up', 'down')) == (x in (90, 270)): return 's'
    return ''


SKIP = re.compile(r'^(infested_|waxed_)|^snow$')  # same look as another block (snow at 8 layers = snow_block)


def png_rgba(data):
    """Decode a non-interlaced PNG to (w, h, flat RGBA bytes)."""
    assert data[:8] == b'\x89PNG\r\n\x1a\n', 'not a png'
    pos, idat, plte, trns = 8, b'', None, None
    while pos < len(data):
        n, kind = struct.unpack('>I4s', data[pos:pos + 8])
        body = data[pos + 8:pos + 8 + n]
        pos += 12 + n
        if kind == b'IHDR':
            w, h, depth, ctype, _, _, interlace = struct.unpack('>IIBBBBB', body)
        elif kind == b'PLTE': plte = body
        elif kind == b'tRNS': trns = body
        elif kind == b'IDAT': idat += body
    if interlace: raise ValueError('interlaced png')
    chans = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[ctype]
    bpp = max(1, chans * depth // 8)
    stride = (w * chans * depth + 7) // 8
    raw, out, prev = zlib.decompress(idat), bytearray(), bytearray(stride)
    for y in range(h):
        f, line = raw[y * (stride + 1)], bytearray(raw[y * (stride + 1) + 1:(y + 1) * (stride + 1)])
        for i in range(stride):
            a = line[i - bpp] if i >= bpp else 0
            b = prev[i]
            c = prev[i - bpp] if i >= bpp else 0
            if f == 1: line[i] = (line[i] + a) & 255
            elif f == 2: line[i] = (line[i] + b) & 255
            elif f == 3: line[i] = (line[i] + (a + b) // 2) & 255
            elif f == 4:
                p = a + b - c; pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                line[i] = (line[i] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        prev = line
        # Unpack samples to 8-bit values.
        if depth == 8: s = line
        elif depth == 16: s = line[0::2]
        else:
            m = (1 << depth) - 1
            s = [(line[k * depth // 8] >> (8 - depth - k * depth % 8)) & m for k in range(w * chans)]
            if ctype != 3: s = [v * 255 // m for v in s]
        for x in range(w):
            if ctype == 6: out += bytes(s[x * 4:x * 4 + 4])
            elif ctype == 2: out += bytes(s[x * 3:x * 3 + 3]) + b'\xff'
            elif ctype == 0: out += bytes([s[x]] * 3) + b'\xff'
            elif ctype == 4: out += bytes([s[x * 2]] * 3) + bytes([s[x * 2 + 1]])
            else:
                k = s[x]
                out += plte[k * 3:k * 3 + 3] + bytes([trns[k] if trns and k < len(trns) else 255])
    return w, h, bytes(out)


def lin(c):
    c /= 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def srgb(c):
    c = c * 12.92 if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055
    return round(min(1, max(0, c)) * 255)


def oklab(r, g, b):
    l = (0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b) ** (1 / 3)
    m = (0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b) ** (1 / 3)
    s = (0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b) ** (1 / 3)
    return (0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
            1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
            0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s)


def measure(png):
    """Average color in linear light, plus noise (RMS OKLab distance from it). None if any pixel is see-through."""
    w, h, px = png_rgba(png)
    h = min(h, w)  # animated strips: first frame only
    pixels = []
    for i in range(0, w * h * 4, 4):
        if px[i + 3] < 255: return None
        pixels.append((lin(px[i]), lin(px[i + 1]), lin(px[i + 2])))
    avg = [sum(p[k] for p in pixels) / len(pixels) for k in range(3)]
    mean = oklab(*avg)
    noise = math.sqrt(sum(sum((a - b) ** 2 for a, b in zip(oklab(*p), mean)) for p in pixels) / len(pixels))
    return mean, noise, '#%02x%02x%02x' % tuple(srgb(c) for c in avg)


def strip(ref):
    return ref.split(':', 1)[-1]


def main():
    jar = sys.argv[1] if len(sys.argv) > 1 else newest_release()
    z = zipfile.ZipFile(jar)
    read = lambda p: json.loads(z.read('assets/minecraft/' + p))
    lang = read('lang/en_us.json')

    def model(name):
        """Merge a model with its parents: (textures, elements)."""
        textures, elements = {}, None
        while name and not name.startswith('builtin/'):
            m = read(f'models/{strip(name)}.json')
            textures = {**m.get('textures', {}), **textures}
            elements = elements or m.get('elements')
            name = m.get('parent')
        return textures, elements

    options = []
    for path in sorted(n for n in z.namelist() if n.startswith('assets/minecraft/blockstates/') and n.endswith('.json')):
        block = path.rsplit('/', 1)[1][:-5]
        variants = json.loads(z.read(path)).get('variants')
        if SKIP.match(block) or not variants: continue
        # Lit/powered/snowy states are not the block's normal look; skip "=true" states unless that is all there is.
        states = [k for k in variants if '=true' not in k] or list(variants)
        faces = {}  # texture -> [label, views] where views is a subset of 'ts' (can face up / sideways)
        for key in states:
            for v in variants[key] if isinstance(variants[key], list) else [variants[key]]:
                textures, elements = model(v['model'])
                if not elements or len(elements) != 1: continue
                el = elements[0]
                if el['from'] != [0, 0, 0] or el['to'] != [16, 16, 16] or len(el['faces']) != 6: continue
                x = v.get('x', 0) % 360
                for side, face in el['faces'].items():
                    if 'tintindex' in face: faces = None; break  # biome tinted: excluded
                    ref, label = face['texture'], None
                    while isinstance(ref, str) and ref.startswith('#'):
                        label = ref[1:]
                        ref = textures.get(label, '')
                    if isinstance(ref, dict):  # {"sprite": ..., "force_translucent": ...}
                        if ref.get('force_translucent'): faces = None; break
                        ref = ref['sprite']
                    entry = faces.setdefault(strip(ref), [label, ''])
                    view = view_of(side, x)
                    if view and not entry[1]: entry[0] = label  # name it after a face you can see
                    if view and view not in entry[1]: entry[1] = ''.join(sorted(entry[1] + view))
                if faces is None: break
            if faces is None: break
        if not faces: continue
        for tex, (label, views) in faces.items():
            if not views: continue  # only ever faces down (smithing table bottom)
            try:
                m = measure(z.read(f'assets/minecraft/textures/{tex}.png'))
            except KeyError:
                continue
            if not m: continue
            (L, a, b), noise, hexc = m
            lab = [round(L, 4), round(a, 4), round(b, 4)]
            # Two textures that look identical (quartz top/side) are one option.
            twin = next((o for o in options if o['id'] == block and o['lab'] == lab), None)
            if twin:
                twin['views'] = ''.join(sorted(set(twin['views'] + views)))
                continue
            opt = {'id': block, 'name': lang.get(f'block.minecraft.{block}', block),
                   'face': None if label in ('all', None) or len(faces) == 1 else FACE.get(label, label),
                   'tex': tex, 'hex': hexc, 'lab': lab, 'noise': round(noise, 4), 'views': views}
            flags = ''
            if block in GRAVITY or block.endswith('concrete_powder'): flags += 'g'
            if block in LIGHT: flags += 'l'
            if block in UNOBTAINABLE: flags += 'u'
            if flags: opt['flags'] = flags
            options.append(opt)

    # A texture shared by several blocks becomes one option per view, credited to the block named
    # after it, else the shortest name: oak_planks over bookshelf, furnace_top to furnace, not dropper.
    # A dropper facing up shows furnace_top on its sides, so the wall option for that texture is the dropper.
    rank = lambda o: (not o['tex'].rsplit('/', 1)[1].startswith(o['id']), len(o['id']))
    picked = {}
    for v in 'ts':
        for o in sorted((o for o in options if v in o['views']), key=rank):
            picked.setdefault((o['tex'], v), o)
    views = {}
    for (_, v), o in sorted(picked.items()):
        views[id(o)] = views.get(id(o), '') + v
    options = [dict(o, views=''.join(sorted(views[id(o)]))) for o in options if id(o) in views]

    version = os.path.basename(jar)[:-4]
    with open(OUT, 'w') as f:
        json.dump({'version': version, 'blocks': options}, f, separators=(',', ':'))
    print(f'{len(options)} block faces from {version} -> {os.path.normpath(OUT)}')


def newest_release():
    rel = [d for d in os.listdir(VERSIONS) if re.fullmatch(r'\d+(\.\d+)+', d)]
    best = max(rel, key=lambda d: tuple(map(int, d.split('.'))))
    return os.path.join(VERSIONS, best, best + '.jar')


if __name__ == '__main__':
    # Self-check: OKLab of pure white is L=1, a=b=0.
    assert all(abs(x - y) < 1e-3 for x, y in zip(oklab(1, 1, 1), (1, 0, 0)))
    assert [view_of(f, 0) for f in ('up', 'down', 'north')] == ['t', '', 's']
    assert [view_of(f, 90) for f in ('south', 'north', 'up', 'east')] == ['t', '', 's', 's']
    main()
