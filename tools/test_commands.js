// Checks for the command builder. Run: node tools/test_commands.js
const assert = require('assert');
const { give, summon, fill, setblock, volume, str } = require('../site/commands/commands.js');

assert.strictEqual(str('say "hi" \\o/'), '"say \\"hi\\" \\\\o/"');

assert.strictEqual(give({ item: 'minecraft:Diamond_Sword' }), '/give @p diamond_sword');
assert.strictEqual(give({ item: 'diamond_sword', count: 3, name: 'Blade', style: { color: 'gold', bold: true },
  lore: ['Sharp', ''], ench: { sharpness: 5, looting: 0 }, unbreakable: true, glint: true }),
  '/give @p diamond_sword[custom_name={text:"Blade",color:"gold",bold:true,italic:false},'
  + 'lore=[{text:"Sharp",color:"gray",italic:false}],enchantments={sharpness:5},unbreakable={},enchantment_glint_override=true] 3');

assert.strictEqual(summon({ entity: 'zombie', pos: ['', '~1', ''] }), '/summon zombie ~ ~1 ~');
assert.strictEqual(summon({ entity: 'zombie', pos: ['~', '~', '~'], name: 'Bob', flags: { NoAI: true, Silent: false },
  effects: [{ id: 'speed', level: 2, seconds: 0 }, { id: 'glowing', level: 1, seconds: 30 }], mainhand: 'iron_sword', head: ' ' }),
  '/summon zombie ~ ~ ~ {CustomName:{text:"Bob"},NoAI:1b,active_effects:[{id:"speed",amplifier:1b,duration:-1},'
  + '{id:"glowing",amplifier:0b,duration:600}],equipment:{mainhand:{id:"iron_sword",count:1}}}');

assert.strictEqual(fill({ from: ['~', '~', '~'], to: ['~4', '~2', '~4'], block: 'glass', mode: 'hollow' }), '/fill ~ ~ ~ ~4 ~2 ~4 glass hollow');
assert.strictEqual(fill({ from: [0, 64, 0], to: [9, 64, 9], block: 'stone', mode: 'replace', filter: 'dirt' }), '/fill 0 64 0 9 64 9 stone replace dirt');
assert.strictEqual(setblock({ pos: ['~', '~-1', '~'], block: 'oak_log[axis=x]', mode: 'destroy' }), '/setblock ~ ~-1 ~ oak_log[axis=x] destroy');

assert.strictEqual(volume(['~', '~', '~'], ['~4', '~2', '~4']), 75);
assert.strictEqual(volume([0, 0, 0], [99, 99, 99]), 1e6);
assert.strictEqual(volume(['~', '~', '~'], [5, 5, 5]), null);

console.log('commands: all checks passed');
