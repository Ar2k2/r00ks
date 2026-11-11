// Checks for the Nether converter. Run: node tools/test_nether.js
const assert = require('assert');
const { toNether, toOverworld, parse } = require('../site/utilities/nether.js');

assert.deepStrictEqual([800, 807, 808, 0, -1, -8, -9, 12.9].map(toNether), [100, 100, 101, 0, -1, -1, -2, 1]);
assert.deepStrictEqual([100, -1, 0, 1.5].map(toOverworld), [800, -8, 0, 8]);

assert.deepStrictEqual(parse('/execute in minecraft:the_nether run tp @s 12.30 70.00 -45.70 -90.0 12.5'),
  { dim: 'nether', x: 12.3, y: 70, z: -45.7 });
assert.deepStrictEqual(parse('/execute in minecraft:overworld run tp @s -1 64 2 0 0'), { dim: 'overworld', x: -1, y: 64, z: 2 });
assert.deepStrictEqual(parse('100, 64, -200'), { dim: null, x: 100, y: 64, z: -200 });
assert.deepStrictEqual(parse('x 100 z -200'), { dim: null, x: 100, y: null, z: -200 });
assert.strictEqual(parse('42'), null);
assert.strictEqual(parse('hello'), null);

console.log('nether: all checks passed');
