// Checks for slime chunks. Run: node tools/test_slime.js
// Reference rows came from java.util.Random on Java 21 with the game's formula.
const assert = require('assert');
const { parseSeed, isSlime, nearest } = require('../site/slime/slime.js');
const row = (seed, cx) => Array.from({ length: 20 }, (_, cz) => isSlime(seed, cx, cz) ? 1 : 0).join('');

// Chunk x 0, chunk z 0 to 19.
assert.strictEqual(row(12345n, 0), '00000001010000010000');
assert.strictEqual(row(-4172144997902289642n, 0), '00000000010000000000');

// Seeds: numbers in long range as is, everything else hashed like Java's String.hashCode.
assert.strictEqual(parseSeed(' 42 '), 42n);
assert.strictEqual(parseSeed('hello world'), 1794106052n);
assert.strictEqual(parseSeed('9223372036854775808'), -1773151197n); // one past long max: hashed
assert.strictEqual(parseSeed(''), null);

// Nearest: for 12345 chunk 0, 7 is a slime chunk, and it should beat anything further out.
const n = nearest(12345n, 8, 7 * 16 + 8);
assert.deepStrictEqual([n.cx, n.cz, n.dist], [0, 7, 0]);
const m = nearest(12345n, 0, 0);
assert.ok(isSlime(12345n, m.cx, m.cz) && m.dist < 16 * 8);

console.log('slime: ok');
