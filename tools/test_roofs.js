// Checks for the roof and arch generator. Run: node tools/test_roofs.js
const assert = require('assert');
const { roofLayers, roofLayer, arch, count } = require('../site/roofs/roofs.js');
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
