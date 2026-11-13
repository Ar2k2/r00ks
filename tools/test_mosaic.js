// Checks for the image mosaic. Run: node tools/test_mosaic.js
const assert = require('assert');
const { build, count, stacks } = require('../site/mosaic/mosaic.js');
const { blocks } = require('../site/gradient/blocks.json');

// Pure white gives snow block (the whitest texture, as in test_gradient.js); transparent pixels are air; one color is matched once.
const px = new Uint8ClampedArray([255, 255, 255, 255, 255, 255, 255, 255, 0, 0, 0, 0, 20, 20, 22, 255]);
const cells = build(px, blocks);
assert.strictEqual(blocks[cells[0]].id, 'snow_block');
assert.strictEqual(cells[1], cells[0]);
assert.strictEqual(cells[2], -1);
assert.ok(blocks[cells[3]].lab[0] < 0.3, 'near-black maps to a dark block: ' + blocks[cells[3]].id);
assert.deepStrictEqual(count(cells, blocks).map(r => r.count), [2, 1]);
assert.deepStrictEqual([5, 64, 76, 128].map(stacks), ['5', '1 stack', '1 stack + 12', '2 stacks']);
// A limit caps the block types; a limit of one paints every solid pixel with the same block.
const many = new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 255, 0, 200, 0, 255, 255, 255, 255, 255, 250, 10, 10, 255]);
assert.strictEqual(count(build(many, blocks), blocks).length, 4);
assert.strictEqual(count(build(many, blocks, 2), blocks).length, 2);
const one = build(many, blocks, 1);
assert.ok(one.every(k => k === one[0]));
assert.strictEqual(build(many, blocks, 2)[4], build(many, blocks, 2)[0], 'both reds share the kept red block');
// A tiny distinct area keeps its own block: 30 grey-ish pixels and one red one, limit 2.
const grey = [];
for (let i = 0; i < 30; i++) grey.push(120 + i, 120 + i, 120 + i, 255);
const spot = build(new Uint8ClampedArray([...grey, 230, 20, 20, 255]), blocks, 2);
assert.ok(blocks[spot[30]].lab[1] > 0.1, 'red pixel keeps a red block: ' + blocks[spot[30]].id);
console.log('mosaic: all checks passed');
