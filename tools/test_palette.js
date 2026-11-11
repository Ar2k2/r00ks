// Sanity checks for the palette builder. Run: node tools/test_palette.js
const assert = require('assert');
const { hexToLab } = require('../site/gradient/engine.js');
const { SCHEMES, build } = require('../site/palette/palette.js');
const { blocks } = require('../site/gradient/blocks.json');

const byId = id => blocks.find(b => b.id === id);
for (const scheme of Object.keys(SCHEMES)) {
  const groups = build(blocks, byId('oxidized_copper'), scheme);
  const all = groups.flatMap(g => g.blocks);
  assert.strictEqual(all[0].id, 'oxidized_copper', 'a picked base block leads the palette');
  assert.strictEqual(new Set(all.map(b => b.id)).size, all.length, scheme + ': no block twice');
  assert.strictEqual(all.length, 1 + SCHEMES[scheme].flatMap(s => s[1]).length, scheme + ': one block per target');
}
// Tonal from a color: the tonal group runs dark to light.
const L = build(blocks, hexToLab('#3b6fd1'), 'tonal')[1].blocks.map(b => b.lab[0]);
assert.ok(L.every((v, i) => !i || v >= L[i - 1]), 'tonal sorted: ' + L);
// Complementary of a warm orange lands on cool blocks (negative OKLab b).
const comp = build(blocks, hexToLab('#d07a2a'), 'complementary')[2].blocks;
assert.ok(comp.every(b => b.lab[2] < 0), 'complement should be blue-ish: ' + comp.map(b => b.id));
assert.deepStrictEqual(build([], hexToLab('#000000'), 'triad'), []);
console.log('palette: all checks passed');
