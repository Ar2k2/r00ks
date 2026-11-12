// Circle, sphere and dome math. Plain script for the browser (window.Shapes) and Node (module.exports) for tests.
(() => {
  // A block is in the shape when its center is within d/2 of the shape's center.
  // Even diameters center on a block corner, odd ones on a block center.
  const solid = (d, x, y, z) => {
    const c = d / 2, a = x + .5 - c, b = y === null ? 0 : y + .5 - c, e = z + .5 - c;
    return a * a + b * b + e * e <= c * c;
  };

  // Number of horizontal layers: a dome is the top half of a sphere, middle layer included.
  const layers = (d, kind) => kind === 'circle' ? 1 : kind === 'dome' ? Math.ceil(d / 2) : d;

  // One layer (i = 0 is the bottom) as a d*d array of 0/1, row by row.
  // Hollow keeps only blocks touching the outside on a face, so walls are one block thick with no gaps.
  const layer = (d, kind, i, filled) => {
    const y = kind === 'circle' ? null : kind === 'dome' ? Math.floor(d / 2) + i : i;
    const at = (x, yy, z) => solid(d, x, yy, z);
    const out = new Uint8Array(d * d);
    for (let z = 0; z < d; z++) for (let x = 0; x < d; x++) {
      if (!at(x, y, z)) continue;
      const buried = at(x - 1, y, z) && at(x + 1, y, z) && at(x, y, z - 1) && at(x, y, z + 1) &&
        (y === null || (at(x, y - 1, z) && at(x, y + 1, z)));
      out[z * d + x] = filled || !buried ? 1 : 0;
    }
    return out;
  };

  const count = g => g.reduce((s, v) => s + v, 0);

  const api = { layers, layer, count };
  if (typeof module !== 'undefined') module.exports = api;
  else window.Shapes = api;
})();
