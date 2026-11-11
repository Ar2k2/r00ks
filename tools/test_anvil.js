// Checks for the anvil optimizer. Run: node tools/test_anvil.js
const assert = require('assert');
const { ENCH, ITEMS, plan } = require('../site/anvil/anvil.js');

assert.deepStrictEqual(plan([]), { total: 0, work: 0, steps: [] });
// One book: level x book multiplier, no penalties yet.
assert.strictEqual(plan([{ id: 'sharpness', level: 5 }]).total, 5);
// Mending (2) then Unbreaking III (3 + 1 penalty) = 6, cheaper than merging the books first (9).
assert.strictEqual(plan([{ id: 'mending', level: 1 }, { id: 'unbreaking', level: 3 }]).total, 6);
// Every item's enchantments exist and every step stays under the limit for a full sword.
for (const [, list] of Object.values(ITEMS)) for (const id of list) assert.ok(ENCH[id], id);
const sword = ['sharpness', 'looting', 'sweeping_edge', 'fire_aspect', 'knockback', 'unbreaking', 'mending']
  .map(id => ({ id, level: ENCH[id][1] }));
const p = plan(sword);
assert.ok(p && p.steps.every(s => s.cost <= 39), 'full sword fits');
assert.strictEqual(p.steps.length, sword.length);
assert.strictEqual(p.total, p.steps.reduce((a, s) => a + s.cost, 0));
// An item already worked 6 times cannot take anything (63 levels of penalty).
assert.strictEqual(plan([{ id: 'mending', level: 1 }], 6), null);
// Existing enchantments: Sharpness IV + a Sharpness IV book makes V, charged at V (5) + 1 penalty.
assert.strictEqual(plan([{ id: 'sharpness', level: 4 }], 1, { sharpness: 4 }).total, 6);
// A lower book onto a higher existing level is still charged at the level that stays.
assert.strictEqual(plan([{ id: 'sharpness', level: 2 }], 0, { sharpness: 4 }).total, 4);
// Unrelated existing enchantments cost nothing extra.
assert.strictEqual(plan([{ id: 'mending', level: 1 }], 0, { unbreaking: 3 }).total, 2);
console.log('anvil: all checks passed', p.total, p.work);
