// Checks for the firework designer. Run: node tools/test_fireworks.js
const assert = require('assert');
const { maxColors, maxStars, give, crafts, gather } = require('../site/fireworks/fireworks.js');

// Slots: a plain small ball takes 8 dyes; large ball + trail + twinkle leaves 5.
assert.strictEqual(maxColors({ shape: 'small_ball' }), 8);
assert.strictEqual(maxColors({ shape: 'large_ball', trail: true, twinkle: true }), 5);
assert.deepStrictEqual([1, 2, 3].map(maxStars), [7, 6, 5]);

const star = { shape: 'large_ball', colors: ['red', 'yellow'], fades: ['white'], trail: true, twinkle: false };
const rocket = { flight: 2, stars: [star] };
assert.strictEqual(give(rocket),
  'give @p firework_rocket[fireworks={flight_duration:2,explosions:[{shape:"large_ball",colors:[I;11743532,14602026],fade_colors:[I;15790320],has_trail:true}]}] 64');
assert.strictEqual(give({ flight: 1, stars: [] }, 3), 'give @p firework_rocket[fireworks={flight_duration:1}] 3');

assert.deepStrictEqual(crafts(rocket), [
  { make: 'Firework Star', from: ['Gunpowder', 'Fire Charge', 'Diamond', 'Red Dye', 'Yellow Dye'] },
  { make: 'Firework Star with fade', from: ['Firework Star', 'White Dye'] },
  { make: '3 Firework Rockets', from: ['Paper', 'Gunpowder', 'Gunpowder', 'Firework Star'] },
]);
assert.deepStrictEqual([...gather(rocket)], [['Gunpowder', 3], ['Fire Charge', 1], ['Diamond', 1], ['Red Dye', 1],
  ['Yellow Dye', 1], ['White Dye', 1], ['Paper', 1]]);
// Every craft fits a 3 x 3 grid at the limits.
const full = { shape: 'creeper', colors: Array(maxColors({ shape: 'creeper', trail: true, twinkle: true })).fill('red'), fades: Array(8).fill('blue'), trail: true, twinkle: true };
for (const c of crafts({ flight: 3, stars: Array(maxStars(3)).fill(full) })) assert.ok(c.from.length <= 9, c.make);
console.log('fireworks: ok');
