// Checks for the circle / sphere / dome generator. Run: node tools/test_shapes.js
const assert = require('assert');
const { layers, layer, count } = require('../site/shapes/shapes.js');
const rows = g => { const d = Math.sqrt(g.length); return [...Array(d)].map((_, z) => [...g.slice(z * d, z * d + d)].join('')); };

assert.deepStrictEqual(rows(layer(1, 'circle', 0, true)), ['1']);
assert.deepStrictEqual(rows(layer(5, 'circle', 0, true)), ['01110', '11111', '11111', '11111', '01110']);
assert.deepStrictEqual(rows(layer(5, 'circle', 0, false)), ['01110', '10001', '10001', '10001', '01110']);
assert.deepStrictEqual(rows(layer(4, 'circle', 0, true)), ['0110', '1111', '1111', '0110']);

assert.deepStrictEqual([layers(7, 'circle'), layers(7, 'sphere'), layers(7, 'dome'), layers(8, 'dome')], [1, 7, 4, 4]);

// A sphere is symmetric top to bottom, and a dome is its top half.
for (const d of [6, 9, 16]) for (let i = 0; i < d; i++)
  assert.deepStrictEqual(layer(d, 'sphere', i, false), layer(d, 'sphere', d - 1 - i, false));
for (let i = 0; i < 5; i++) assert.deepStrictEqual(layer(9, 'dome', i, true), layer(9, 'sphere', 4 + i, true));

// Hollow is a subset of filled, and the middle of a big hollow sphere is a thin ring.
const d = 21, mid = 10, f = layer(d, 'sphere', mid, true), h = layer(d, 'sphere', mid, false);
assert.ok(h.every((v, i) => !v || f[i]));
assert.strictEqual(h[mid * d + mid], 0);
assert.ok(count(h) < count(f) / 3);

console.log('shapes: all checks passed');
