// Slime chunks (Java Edition): the game seeds java.util.Random from the world seed and
// chunk coordinates, and a chunk is a slime chunk when nextInt(10) is 0.
// Plain script for the browser (window.Slime) and Node (module.exports) for tests.
(() => {
  const MASK48 = (1n << 48n) - 1n, MUL = 0x5DEECE66Dn;
  const long = n => BigInt.asIntN(64, n);

  // World seed text to a 64-bit seed the way the game does: a whole number in long range
  // is used as is, anything else becomes its Java String.hashCode. Empty gives null.
  function parseSeed(text) {
    const s = text.trim();
    if (!s) return null;
    if (/^[+-]?\d+$/.test(s)) {
      const n = BigInt(s);
      if (n === long(n)) return n;
    }
    let h = 0;
    for (const c of s) for (let i = 0; i < c.length; i++) h = (Math.imul(h, 31) + c.charCodeAt(i)) | 0;
    return BigInt(h);
  }

  // The int products overflow like Java ints; z * z is widened before the long multiply.
  function isSlime(seed, cx, cz) {
    const im = Math.imul;
    const mix = long(seed + BigInt(im(im(cx, cx), 0x4c1906)) + BigInt(im(cx, 0x5ac0db))
      + BigInt(im(cz, cz)) * 0x4307a7n + BigInt(im(cz, 0x5f24f))) ^ 0x3ad8025fn;
    let s = (mix ^ MUL) & MASK48, bits, val;
    do { // Random.nextInt(10)
      s = (s * MUL + 0xBn) & MASK48;
      bits = Number(s >> 17n);
      val = bits % 10;
    } while (((bits - val + 9) | 0) < 0);
    return val === 0;
  }

  // Nearest slime chunk to block x, z (by chunk center), searching outward ring by ring.
  // Returns { cx, cz, dist } or null if none within `max` chunks.
  function nearest(seed, x, z, max = 64) {
    const px = Math.floor(x / 16), pz = Math.floor(z / 16);
    let best = null;
    for (let r = 0; r <= max; r++) {
      // A chunk r rings out is at least (r - 1) * 16 blocks away, so stop once that beats the best.
      if (best && (r - 1) * 16 > best.dist) break;
      for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r || !isSlime(seed, px + dx, pz + dz)) continue;
        const cx = px + dx, cz = pz + dz, dist = Math.hypot(cx * 16 + 8 - x, cz * 16 + 8 - z);
        if (!best || dist < best.dist) best = { cx, cz, dist };
      }
    }
    return best;
  }

  const api = { parseSeed, isSlime, nearest };
  if (typeof module !== 'undefined') module.exports = api;
  else window.Slime = api;
})();
