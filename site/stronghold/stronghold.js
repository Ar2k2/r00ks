// Stronghold finder: triangulate Eye of Ender throws (Java Edition).
// Plain script for the browser (window.Stronghold) and Node (module.exports) for tests.
(() => {
  // Rings of strongholds around 0,0: [inner, outer] distance in blocks, and how many each holds.
  const RINGS = [[1280, 2816, 3], [4352, 5888, 6], [7424, 8960, 10], [10496, 12032, 15],
    [13568, 15104, 21], [16640, 18176, 28], [19712, 21248, 36], [22784, 24320, 9]];

  // Facing angle (yaw, from F3) to a unit vector. Yaw 0 faces +Z (south), 90 faces -X (west).
  const dir = yaw => { const r = yaw * Math.PI / 180; return [-Math.sin(r), Math.cos(r)]; };

  // Where two throws cross: { x, z, angle (degrees between the lines) } or { error }.
  function cross(a, b) {
    const [ax, az] = dir(a.yaw), [bx, bz] = dir(b.yaw);
    const det = ax * bz - az * bx, angle = Math.asin(Math.min(1, Math.abs(det))) * 180 / Math.PI;
    if (angle < 1) return { error: 'parallel', angle };
    const dx = b.x - a.x, dz = b.z - a.z;
    const t = (dx * bz - dz * bx) / det, s = (dx * az - dz * ax) / det;
    if (t < 0 || s < 0) return { error: 'behind', angle };
    return { x: a.x + t * ax, z: a.z + t * az, angle };
  }

  // Ring index (0-based) whose band holds this distance from 0,0, else the nearest band.
  const gap = (d, [lo, hi]) => Math.max(lo - d, d - hi, 0);
  const ring = d => RINGS.reduce((best, r, i) => gap(d, r) < gap(d, RINGS[best]) ? i : best, 0);

  // One throw from inside the first ring: the stretch of the line that lies in that ring.
  // Returns [[x, z], [x, z]] (near, far) or null.
  function stretch(a) {
    const [dx, dz] = dir(a.yaw), [lo, hi] = RINGS[0];
    if (Math.hypot(a.x, a.z) >= lo) return null;
    // Ray p + t d meets the circle |p + t d| = r at the far root (we start inside it).
    const far = r => { const b = a.x * dx + a.z * dz, c = a.x ** 2 + a.z ** 2 - r * r; return -b + Math.sqrt(b * b - c); };
    return [far(lo), far(hi)].map(t => [a.x + t * dx, a.z + t * dz]);
  }

  // F3 + C: "/execute in minecraft:overworld run tp @s x y z yaw pitch". Returns { x, z, yaw } or null.
  const parse = text => {
    const n = text.split('tp @s')[1]?.match(/-?\d+(?:\.\d+)?/g)?.map(Number);
    return n && n.length >= 4 ? { x: n[0], z: n[2], yaw: n[3] } : null;
  };

  const api = { RINGS, cross, ring, stretch, parse };
  if (typeof module !== 'undefined') module.exports = api;
  else window.Stronghold = api;
})();
