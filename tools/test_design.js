// Checks for the 3D designer's dome and arch geometry. Run: node tools/test_design.js
const assert = require('assert');
const K = require('../site/design/kinds.js');
const Shapes = require('../site/shapes/shapes.js');
const Roofs = require('../site/roofs/roofs.js');
const round = K.sample(K.DOMES.round.f);

// A round dome at its own height is the circle generator's dome, layer for layer, hollow or filled.
for (const d of [5, 8, 13, 20]) for (const filled of [true, false]) {
  const D = K.dome(d, Math.ceil(d / 2), round, !filled);
  assert.strictEqual(D.size, d);
  D.layers.forEach((l, i) => assert.deepStrictEqual([...l], [...Shapes.layer(d, 'dome', i, filled)], `d ${d} layer ${i}`));
}
// The onion swells past its base, so its footprint grows; every shape narrows to the top.
const onion = K.dome(15, 14, K.sample(K.DOMES.onion.f), true);
assert.ok(onion.size > 15, 'onion should be wider than its base');
for (const k of Object.keys(K.DOMES)) {
  const D = K.dome(11, 8, K.sample(K.DOMES[k].f), false), n = l => l.reduce((s, v) => s + v, 0);
  assert.ok(n(D.layers[0]) > n(D.layers.at(-1)), k);
}
// The wall ring under a dome is one block thick and matches the dome's bottom outline.
const ring = K.ring(9, 9), base = K.dome(9, 5, round, true).layers[0];
assert.ok([...ring].every((v, i) => !v || base[i]));
// Bending pushes one height out and leaves far ones alone.
const b = K.bend(round, .5, .3, .08);
assert.ok(b[16] > round[16] + .29 && Math.abs(b[0] - round[0]) < 1e-6);

// A round arch with no legs is the roofs page's arch (its row 0 is the top, ours the bottom).
for (const [w, h, t] of [[5, 3, 1], [7, 4, 2], [9, 5, 1]]) {
  const A = K.arch(w, h, 0, t, K.sample(K.ARCHES.round.f)), R = Roofs.arch(w, h, 'round', t);
  assert.strictEqual(A.cols, R.cols); assert.strictEqual(A.rows, R.rows);
  for (let r = 0; r < A.rows; r++) for (let c = 0; c < A.cols; c++)
    assert.strictEqual(A.arch[r * A.cols + c], R.arch[(R.rows - 1 - r) * R.cols + c], `arch ${w}x${h} at ${c},${r}`);
}
// Legs: the opening runs straight up, framed on both sides, before the curve starts.
const L = K.arch(5, 3, 4, 1, K.sample(K.ARCHES.round.f));
for (let r = 0; r < 4; r++) assert.deepStrictEqual([...L.arch.slice(r * 7, r * 7 + 7)], [1, 0, 0, 0, 0, 0, 1]);
// A flat arch is a doorway: a rectangle opening with a lintel.
const F = K.arch(4, 2, 1, 1, K.sample(K.ARCHES.flat.f));
assert.strictEqual(F.open.reduce((s, v) => s + v, 0), 4 * 3);
// Share-link profiles round-trip and reject junk.
assert.deepStrictEqual(K.unpack(K.pack(round)), round.map(v => Math.round(v * 100) / 100));
assert.strictEqual(K.unpack('1.2.3'), null); assert.strictEqual(K.unpack('<script>'), null);
console.log('design: all checks passed');
