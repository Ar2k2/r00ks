// Checks for the beacon helper. Run: node tools/test_beacon.js
const assert = require('assert');
const { layers, total, range, seconds } = require('../site/beacon/beacon.js');

assert.deepStrictEqual(layers(4), [9, 25, 49, 81]);
assert.deepStrictEqual([1, 2, 3, 4].map(total), [9, 34, 83, 164]);
assert.deepStrictEqual([1, 2, 3, 4].map(range), [20, 30, 40, 50]);
assert.deepStrictEqual([1, 2, 3, 4].map(seconds), [11, 13, 15, 17]);
console.log('beacon ok');
