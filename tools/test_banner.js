// Checks for the banner designer. Run: node tools/test_banner.js
const assert = require('assert');
const { PATTERNS, give, shield, steps, needs } = require('../site/banner/banner.js');
const { DYES, byId } = require('../site/shared/dyes.js');

// 42 loom patterns (the jar's 43 minus base), each with a drawing.
assert.strictEqual(PATTERNS.length, 42);
for (const p of PATTERNS) assert.ok(p.shape && (p.shape.grad || p.shape.length), p.id);
// Exactly the 10 pattern_item tags need an item.
assert.deepStrictEqual(PATTERNS.filter(p => p.item).map(p => p.id).sort(),
  ['bricks', 'creeper', 'curly_border', 'flow', 'flower', 'globe', 'guster', 'mojang', 'piglin', 'skull']);
assert.strictEqual(DYES.length, 16);
assert.strictEqual(byId('white').hex, '#f9fffe');
assert.strictEqual(byId('red').firework, 11743532);

const d = { base: 'red', layers: [{ pattern: 'stripe_top', color: 'blue' }, { pattern: 'bricks', color: 'light_gray' }] };
assert.strictEqual(give(d), 'give @p red_banner[banner_patterns=[{pattern:"stripe_top",color:"blue"},{pattern:"bricks",color:"light_gray"}]]');
assert.strictEqual(shield(d), 'give @p shield[base_color="red",banner_patterns=[{pattern:"stripe_top",color:"blue"},{pattern:"bricks",color:"light_gray"}]]');
assert.strictEqual(give({ base: 'white', layers: [] }), 'give @p white_banner');
const name = id => byId(id).name;
assert.deepStrictEqual(steps(d, name), ['Craft a Red Banner from 6 Red Wool and a Stick.',
  'In the loom: Blue Dye, then pick Blue Chief.',
  'In the loom: Light Gray Dye and the Field Masoned Banner Pattern, then pick Light Gray Field Masoned.']);
const n = needs(d);
assert.deepStrictEqual([...n.dyes], [['blue', 1], ['light_gray', 1]]);
assert.strictEqual(n.items[0][1], 'Field Masoned Banner Pattern');
console.log('banner: ok');
