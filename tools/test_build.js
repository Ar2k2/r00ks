// Checks for build commands (gradient, palette, mosaic). Run: node tools/test_build.js
const assert = require('assert');
const { block, rects, commands, pack, LIMIT } = require('../site/shared/build.js');
const blocks = require('../site/gradient/blocks.json').blocks;
const find = (id, tex) => blocks.find(b => b.id === id && b.tex === `block/${tex}`);

// Faces turn toward the viewer: up on a floor ('t'), south on a wall ('s').
assert.strictEqual(block(find('oak_log', 'oak_log_top'), 't'), 'oak_log[axis=y]');
assert.strictEqual(block(find('oak_log', 'oak_log_top'), 's'), 'oak_log[axis=z]');
assert.strictEqual(block(find('oak_log', 'oak_log'), 't'), 'oak_log[axis=x]');
assert.strictEqual(block(find('oak_log', 'oak_log'), 's'), 'oak_log[axis=y]');
assert.strictEqual(block(find('barrel', 'barrel_top'), 's'), 'barrel[facing=south]');
assert.strictEqual(block(find('barrel', 'barrel_bottom'), 't'), 'barrel[facing=down]');
assert.strictEqual(block(find('barrel', 'barrel_side'), 't'), 'barrel[facing=north]');
assert.strictEqual(block(find('piston', 'piston_top'), 't'), 'piston[facing=up]');
assert.strictEqual(block(find('dispenser', 'dispenser_front_vertical'), 't'), 'dispenser[facing=up]');
assert.strictEqual(block(find('observer', 'observer_back'), 's'), 'observer[facing=north]');
assert.strictEqual(block(find('quartz_block', 'quartz_block_top'), 't'), 'quartz_block');
assert.strictEqual(block(blocks.find(b => b.id === 'white_concrete'), 's'), 'white_concrete');
// Every block in the data gets a state string Minecraft can parse (id plus optional [k=v,...]).
for (const b of blocks) for (const v of b.views) assert.match(block(b, v), /^[a-z_]+(\[[a-z_]+=[a-z_]+(,[a-z_]+=[a-z_]+)*\])?$/);

// Rectangles cover every non-empty cell exactly once.
const A = 'a', B = 'b', grid = [A, A, B, A, A, B, null, B, B], cover = new Array(9).fill(0);
const rs = rects(grid, 3, 3);
for (const r of rs) for (let y = r.r; y < r.r + r.h; y++) for (let x = r.c; x < r.c + r.w; x++) {
  assert.strictEqual(grid[y * 3 + x], r.block); cover[y * 3 + x]++;
}
assert.deepStrictEqual(cover, [1, 1, 1, 1, 1, 1, 0, 1, 1]);
assert.strictEqual(rs.length, 3); // a 2x2, the b column, the lone b; nothing for the gap
assert.ok(rects(new Array(256 * 256).fill(A), 256, 256).every(r => r.w * r.h <= 32768));

// Coordinates: minecarts sit on the rail 1 above the command block; builds start 2 south.
assert.deepStrictEqual(commands([A], 1, 1, 's'), ['setblock ~ ~-1 ~2 a']);
assert.deepStrictEqual(commands([A, A, A], 3, 1, 't'), ['fill ~ ~-1 ~2 ~2 ~-1 ~2 a']);
assert.deepStrictEqual(commands([A, B], 1, 2, 's'), ['setblock ~ ~ ~2 a', 'setblock ~ ~-1 ~2 b']); // top row is higher
assert.deepStrictEqual(commands([A, B], 1, 2, 't'), ['setblock ~ ~-1 ~2 a', 'setblock ~ ~-1 ~3 b']); // top row is north

// Packing: every command lands in exactly one part, and no part is too long.
const many = Array.from({ length: 3000 }, (_, i) => `setblock ~${i} ~-1 ~2 white_concrete`);
const parts = pack(many);
assert.ok(parts.length > 1 && parts.every(p => p.length <= LIMIT));
assert.strictEqual(parts.join('').match(/setblock ~\d+ ~-1 ~2 white_concrete/g).length, 3000);
assert.ok(parts.every(p => p.startsWith('summon area_effect_cloud ~ ~1 ~ {Duration:1,Radius:0f,Passengers:[') && p.endsWith('distance=..2]"}]}')));
assert.ok(!parts[0].includes('falling_block')); // their block field differs between versions; a wrong one drops sand
assert.throws(() => pack(['say "hi"']));

console.log('build: all checks passed');
