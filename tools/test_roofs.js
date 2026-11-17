// Checks for the roof and arch generator. Run: node tools/test_roofs.js
const assert = require('assert');
const { inset, roofLayers, roofLayer, roofParts, design, arch, count, boxes, STAIR_BLOCKS, PROFILES, STAIR, SLAB, BLOCK, LIP } = require('../site/roofs/roofs.js');
const rows = (g, w) => [...Array(g.length / w)].map((_, z) => [...g.slice(z * w, z * w + w)].join(''));

// Layer counts: a 7-wide 45° roof has 4 layers, shallow 2, steep 8; a hip closes over the narrow side.
assert.deepStrictEqual([roofLayers(7, 9, 'gable', 'normal'), roofLayers(7, 9, 'gable', 'shallow'), roofLayers(7, 9, 'gable', 'steep')], [4, 2, 8]);
assert.strictEqual(roofLayers(9, 5, 'hip', 'normal'), 3);
assert.strictEqual(roofLayers(9, 5, 'gable', 'normal'), 5);

// Gable, 5 wide, hollow: two slope rows per layer, the ridge on top.
assert.deepStrictEqual(rows(roofLayer(5, 2, 'gable', 'normal', 0, false), 5), ['10001', '10001']);
assert.deepStrictEqual(rows(roofLayer(5, 2, 'gable', 'normal', 2, false), 5), ['00100', '00100']);
assert.deepStrictEqual(rows(roofLayer(5, 2, 'gable', 'normal', 0, true), 5), ['11111', '11111']);
// Steep rises two blocks per step, so both layers of a step keep the edge.
assert.deepStrictEqual(rows(roofLayer(5, 1, 'gable', 'steep', 0, false), 5), ['10001']);
assert.deepStrictEqual(rows(roofLayer(5, 1, 'gable', 'steep', 1, false), 5), ['10001']);
assert.deepStrictEqual(rows(roofLayer(5, 1, 'gable', 'steep', 2, false), 5), ['01010']);
// Hip, 5x5: a ring, then a ring, then the peak.
assert.deepStrictEqual(rows(roofLayer(5, 5, 'hip', 'normal', 1, false), 5), ['00000', '01110', '01010', '01110', '00000']);
// Stairs and slabs (2 stair, 3 slab, 1 block): 45° edges are stairs and a one-wide ridge is a block;
// steep alternates a covered block and a stair; shallow puts a slab on the edge and a block behind it.
const kinds = (w, l, type, pitch, i) => rows(roofParts(w, l, type, pitch, i, false).kind, w);
assert.deepStrictEqual([0, 1, 2, 3].map(i => kinds(7, 1, 'gable', 'normal', i)[0]), ['2000002', '0200020', '0020200', '0001000']);
assert.deepStrictEqual(kinds(6, 1, 'gable', 'normal', 2), ['002200']);
assert.deepStrictEqual([0, 1].map(i => kinds(7, 1, 'gable', 'steep', i)[0]), ['1000001', '2000002']);
assert.deepStrictEqual(kinds(9, 1, 'gable', 'shallow', 0), ['310000013']);
// Hip corners sit on two sides (corner stairs); stairs on the west edge face west.
const hp = roofParts(5, 5, 'hip', 'normal', 0, false);
assert.deepStrictEqual([hp.side[0], hp.side[4], hp.side[2 * 5], hp.side[24]], [5, 6, 1, 10]);
// Every block of a hollow roof is covered by the filled one, and the layers of a hollow roof don't overlap from above.
for (const [type, pitch] of [['gable', 'shallow'], ['hip', 'steep'], ['hip', 'normal']]) {
  const n = roofLayers(12, 9, type, pitch), seen = new Uint8Array(12 * 9);
  for (let i = 0; i < n; i++) {
    const h = roofLayer(12, 9, type, pitch, i, false), f = roofLayer(12, 9, type, pitch, i, true);
    assert.ok(h.every((v, k) => !v || f[k]));
    h.forEach((v, k) => { if (v) { assert.ok(!seen[k] || pitch === 'steep'); seen[k] = 1; } });
  }
  assert.ok(seen.every(Boolean)); // the shell covers the whole footprint
}

// Design: overhang grows the footprint and drops the roof below the wall top (45° by 1 per block,
// steep by 2, shallow by 0 or 1); trim is the outer ring; the lip is upside-down stairs under the eaves only.
const d = design(7, 9, 'gable', 'normal', false, 2, false);
assert.deepStrictEqual([d.W, d.L, d.hang], [11, 13, 2]);
assert.deepStrictEqual([0, 1, 2].map(o => design(7, 9, 'gable', 'steep', false, o, false).hang), [0, 2, 4]);
assert.deepStrictEqual([0, 1, 2].map(o => design(7, 9, 'gable', 'shallow', false, o, false).hang), [0, 0, 1]);
assert.deepStrictEqual(rows(d.layers[2].trim, 11)[0], '00100000100'); // the gable end rake
assert.deepStrictEqual(rows(d.layers[2].trim, 11)[5], '00000000000');
const g = design(5, 3, 'gable', 'normal', false, 0, true), h = design(5, 5, 'hip', 'normal', false, 1, true);
assert.strictEqual(g.layers.length, roofLayers(5, 3, 'gable', 'normal') + 1);
assert.deepStrictEqual(rows(g.layers[0].kind, 5), ['40004', '40004', '40004']);
assert.deepStrictEqual([h.layers[0].side[0], h.layers[0].side[3], h.layers[0].kind[8]], [5, 4, 0]);
assert.ok(h.layers[0].kind.every((k, i) => !k || (k === LIP && h.layers[0].trim[i])));

// Shapes: a full block is a cube, a slab the bottom half, a west-edge stair's high half is on the east.
assert.deepStrictEqual([boxes(BLOCK, 0), boxes(SLAB, 1)], [null, [[0, 1, 0, .5, 0, 1]]]);
assert.deepStrictEqual(boxes(STAIR, 1)[1], [.5, 1, .5, 1, 0, 1]);
assert.ok(STAIR_BLOCKS.every(([n, id]) => n && /^[a-z_]+$/.test(id)));

// Profiles: the named slopes as profiles build exactly the same roofs.
for (const name of ['normal', 'shallow', 'steep']) for (const [w, l, type] of [[7, 9, 'gable'], [12, 9, 'hip'], [6, 6, 'hip']]) {
  assert.strictEqual(roofLayers(w, l, type, PROFILES[name]), roofLayers(w, l, type, name), name);
  for (let i = 0; i < roofLayers(w, l, type, name); i++) for (const f of [false, true]) {
    const a = roofParts(w, l, type, name, i, f), b = roofParts(w, l, type, PROFILES[name], i, f);
    assert.deepStrictEqual([[...a.kind], [...a.side]], [[...b.kind], [...b.side]], `${name} ${w}x${l} ${type} layer ${i}`);
  }
}
// Past its end a profile repeats its last step; a short profile [0, 3] steps in 3 per layer, so slabs.
assert.deepStrictEqual([0, 1, 2, 3].map(i => inset({ ins: [0, 3] }, i)), [0, 3, 6, 9]);
assert.deepStrictEqual(kinds(13, 1, 'gable', { ins: [0, 3] }, 0), ['3110000000113']);
// A cap stops the roof with a flat top of full blocks; a flat roof is one solid layer.
const mans = { ins: [0, 0, 1, 1], cap: 3 };
assert.strictEqual(roofLayers(9, 9, 'gable', mans), 3);
assert.deepStrictEqual(kinds(9, 1, 'gable', mans, 2), ['011111110']);
assert.deepStrictEqual(kinds(5, 2, 'gable', PROFILES.flat, 0), ['11111', '11111']);
// Every preset's insets never go down, and the house sits on them without errors.
for (const p of Object.values(PROFILES)) {
  for (let i = 1; i < 40; i++) assert.ok(inset(p, i) >= inset(p, i - 1));
  assert.ok(design(9, 13, 'gable', p, false, 1, true).layers.length > 0);
}

// Round arch, 5 wide and 3 tall (a semicircle-ish), 1 thick: opening is symmetric, arch hugs it.
const a = arch(5, 3, 'round', 1);
assert.deepStrictEqual([a.cols, a.rows], [7, 4]);
assert.deepStrictEqual(rows(a.opening, 7), ['0000000', '0011100', '0111110', '0111110']);
assert.deepStrictEqual(rows(a.arch, 7), ['0011100', '0100010', '1000001', '1000001']);
// Pointed arches are symmetric and taller in the middle than at the sides; short heights are raised to half the width.
const p = arch(8, 8, 'pointed', 2);
for (let r = 0; r < p.rows; r++) for (let c = 0; c < p.cols; c++)
  assert.strictEqual(p.arch[r * p.cols + c], p.arch[r * p.cols + p.cols - 1 - c]);
assert.strictEqual(arch(10, 2, 'pointed', 1).rows, 6);
assert.ok(count(p.arch) > 0 && p.arch.every((v, k) => !(v && p.opening[k])));

console.log('roofs: all checks passed');
