// Checks for map art. Run: node tools/test_mapart.js
const assert = require('assert');
const MapArt = require('../site/mapart/mapart.js'), { BASES, colors, convert, heights } = MapArt;
const { commands } = require('../site/shared/build.js');

// 60 base colors (water left out), each a block id Minecraft can parse.
assert.strictEqual(BASES.length, 60);
assert.strictEqual(new Set(BASES.map(b => b.base)).size, 60);
for (const b of BASES) assert.match(b.id, /^[a-z_]+(\[[a-z_]+=[a-z_]+\])?$/);

const flat = colors(false), stairs = colors(true);
assert.strictEqual(flat.length, 60);
assert.strictEqual(stairs.length, 180);
// Shades: grass 127,178,56 at x220 and x180, floored.
assert.deepStrictEqual(flat[0].rgb, [109, 153, 48]);
assert.deepStrictEqual(stairs[0].rgb, [89, 125, 39]);

// A pixel exactly a palette color maps to it, dithered or not.
const px = (...rgbs) => Uint8ClampedArray.from(rgbs.flatMap(c => [...c, 255]));
const red = stairs.findIndex(c => c.block === BASES.findIndex(b => b.id === 'red_concrete') && c.shade === 2);
for (const d of [false, true]) assert.strictEqual(convert(px(stairs[red].rgb), 1, 1, stairs, d)[0], red);
// Pure white on a flat map: the brightest level color is white concrete at x220.
assert.strictEqual(BASES[flat[convert(px([255, 255, 255]), 1, 1, flat, false)[0]].block].id, 'white_concrete');

// Heights: one column, shades higher, higher, level, lower, lower, lower -> 0 (north line), 1, 2, 2, 1, 0, -1, lifted by 1.
const pal = [0, 1, 2].map(shade => ({ shade }));
assert.deepStrictEqual([...heights([2, 2, 1, 0, 0, 0], 1, 6, pal)], [1, 2, 3, 3, 2, 1, 0]);

// Staircase build: rectangles only merge cells at the same height.
const cmds = commands(['a', 'a', 'a', 'a'], 2, 2, 't', [0, 0, 1, 1]);
assert.deepStrictEqual(cmds, ['fill ~ ~-1 ~2 ~1 ~-1 ~2 a', 'fill ~ ~ ~3 ~1 ~ ~3 a']);

console.log('mapart: ok');

// Swap: red pixels become blue in the same shade; flat palettes only hold the level shade.
const ri = BASES.findIndex(b => b.id === 'red_concrete'), bi = BASES.findIndex(b => b.id === 'blue_concrete');
const at = (pal, blk, sh) => pal.findIndex(c => c.block === blk && c.shade === sh);
assert.deepStrictEqual([...MapArt.swap(Int32Array.of(at(stairs, ri, 0), at(stairs, ri, 2)), stairs, new Map([[ri, bi]]))],
  [at(stairs, bi, 0), at(stairs, bi, 2)]);
assert.deepStrictEqual([...MapArt.swap(Int32Array.of(at(flat, ri, 1)), flat, new Map([[ri, bi]]))], [at(flat, bi, 1)]);
console.log('mapart swap: ok');
