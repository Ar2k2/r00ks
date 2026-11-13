// Sanity checks for the gradient engine. Run: node tools/test_gradient.js
const assert = require('assert');
const { hexToLab, labToHex, pick } = require('../site/gradient/engine.js');
const { blocks } = require('../site/gradient/blocks.json');

for (const hex of ['#000000', '#ffffff', '#f472b6', '#2ee6c5']) assert.strictEqual(labToHex(hexToLab(hex)), hex);

const ids = (...a) => pick(...a).map(b => b.id);
const byId = id => blocks.find(b => b.id === id);

// Pure white: snow block is the whitest texture (white concrete averages #cfd5d6, noticeably grey).
assert.deepStrictEqual(ids(blocks, '#ffffff', '#ffffff', 1), ['snow_block']);
// A smooth block's own average color gives that block back (noisy ones lose to smoother lookalikes).
for (const id of ['black_concrete', 'red_wool', 'white_concrete', 'lime_terracotta'])
  assert.deepStrictEqual(ids(blocks, byId(id).hex, byId(id).hex, 1), [id]);
// Avoid repeats: no block twice anywhere in the row, whichever face shows. Brown to gray used to
// alternate stripped spruce log with planks and barrels.
for (const [from, to, n] of [['#202020', '#303030', 12], ['#6b4a2f', '#808080', 32], ['#7a5230', '#9a9a9a', 9]]) {
  const row = ids(blocks, from, to, n, { avoidRepeats: true });
  assert.strictEqual(row.length, n);
  assert.strictEqual(new Set(row).size, n, row.join(' '));
}
// More steps than blocks: the row still fills, repeating as little as it can.
assert.strictEqual(pick(blocks.slice(0, 3), '#000000', '#ffffff', 9, { avoidRepeats: true }).length, 9);
// Black to white runs dark to light.
const L = pick(blocks, '#000000', '#ffffff', 9).map(b => b.lab[0]);
assert.ok(L.every((v, i) => !i || v > L[i - 1]), 'lightness should rise: ' + L);
assert.deepStrictEqual(pick([], '#000000', '#ffffff', 5), []);
// Live coral blocks die out of water, so the data leaves them out (dead coral stays).
assert.ok(!blocks.some(b => /^(tube|brain|bubble|fire|horn)_coral_block$/.test(b.id)), 'live coral in blocks.json');

console.log('gradient engine: all checks passed');

// Top/side views: smithing table top is floor-only, its sides wall-only, its bottom never shown.
const smith = blocks.filter(b => b.id === 'smithing_table').map(b => b.face + ':' + b.views).sort();
assert.deepStrictEqual(smith, ['front:s', 'side:s', 'top:t']);
assert.ok(blocks.every(b => /^s?t?$/.test(b.views) && b.views), 'every face is visible somewhere');
// A shared texture is credited per view to a block that really shows it that way.
const furnaceTop = blocks.filter(b => b.tex === 'block/furnace_top').map(b => b.id + ':' + b.views).sort();
assert.deepStrictEqual(furnaceTop, ['dropper:s', 'furnace:t']);
console.log('views: ok');
