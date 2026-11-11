// Nether coordinate math. Plain script for the browser (window.Nether) and Node (module.exports) for tests.
(() => {
  // Block coordinates: 1 Nether block = 8 Overworld blocks. Floor, so -1 maps to -1, not 0.
  const toNether = n => Math.floor(Math.floor(n) / 8);
  const toOverworld = n => Math.floor(n) * 8;

  // Reads "x y z", "x, z", or an F3+C line: "/execute in minecraft:the_nether run tp @s x y z yaw pitch".
  // Returns { dim: 'overworld' | 'nether' | null, x, y (null if only two numbers), z } or null.
  const parse = text => {
    const dim = /minecraft:the_nether/.test(text) ? 'nether' : /minecraft:overworld/.test(text) ? 'overworld' : null;
    const nums = (text.split('tp @s')[1] ?? text).match(/-?\d+(?:\.\d+)?/g)?.map(Number);
    if (!nums || nums.length < 2) return null;
    return nums.length === 2 ? { dim, x: nums[0], y: null, z: nums[1] } : { dim, x: nums[0], y: nums[1], z: nums[2] };
  };

  const api = { toNether, toOverworld, parse };
  if (typeof module !== 'undefined') module.exports = api;
  else window.Nether = api;
})();
