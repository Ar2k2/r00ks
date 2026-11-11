// Checks for the stronghold finder. Run: node tools/test_stronghold.js
const assert = require('assert');
const { cross, ring, stretch, parse } = require('../site/stronghold/stronghold.js');
const near = (p, x, z) => assert.ok(Math.abs(p.x - x) < 1e-6 && Math.abs(p.z - z) < 1e-6, JSON.stringify(p));

// Yaw -45 faces +X +Z (south-east), yaw 45 faces -X +Z (south-west): they meet at 50, 50.
near(cross({ x: 0, z: 0, yaw: -45 }, { x: 100, z: 0, yaw: 45 }), 50, 50);
// Yaw 180 faces north (-Z), yaw 90 faces west (-X).
near(cross({ x: 0, z: 0, yaw: 180 }, { x: 300, z: -200, yaw: 90 }), 0, -200);
assert.strictEqual(cross({ x: 0, z: 0, yaw: 10 }, { x: 50, z: 0, yaw: 10.5 }).error, 'parallel');
assert.strictEqual(cross({ x: 0, z: 0, yaw: -45 }, { x: 100, z: 0, yaw: -135 }).error, 'behind');

assert.deepStrictEqual([0, 2000, 3000, 5000, 30000].map(ring), [0, 0, 0, 1, 7]);
const [a, b] = stretch({ x: 0, z: 0, yaw: 0 }); // straight south from spawn
assert.ok(Math.abs(a[1] - 1280) < 1e-6 && Math.abs(b[1] - 2816) < 1e-6);
assert.strictEqual(stretch({ x: 2000, z: 0, yaw: 0 }), null);

assert.deepStrictEqual(parse('/execute in minecraft:overworld run tp @s 100.50 64.00 -200.30 -45.3 12.0'), { x: 100.5, z: -200.3, yaw: -45.3 });
assert.strictEqual(parse('100 64 -200'), null);
console.log('stronghold: all checks passed');
