// Roof and arch math. Plain script for the browser (window.Roofs) and Node (module.exports) for tests.
// Grids are Uint8Arrays read row by row.
(() => {
  // How far each roof layer steps in from the edge: shallow rises 1 per 2 blocks, steep 2 per 1.
  const inset = (pitch, i) => pitch === 'shallow' ? 2 * i : pitch === 'steep' ? Math.floor(i / 2) : i;

  // Layers until the roof closes over the narrower side it slopes on.
  const roofLayers = (w, l, type, pitch) => {
    const side = type === 'hip' ? Math.min(w, l) : w;
    let n = 0;
    while (side - 2 * inset(pitch, n) >= 1) n++;
    return n;
  };

  // Layer i (0 = the bottom, on the walls) seen from above: w across (x), l long (z).
  // A gable slopes on the two long sides only; a hip slopes on all four.
  // Hollow keeps the blocks with nothing on top of them, so the roof is a shell you can stand under.
  const roofLayer = (w, l, type, pitch, i, filled) => {
    const n = roofLayers(w, l, type, pitch);
    const inside = (k, x, z) => k < n && x >= inset(pitch, k) && x < w - inset(pitch, k) &&
      (type !== 'hip' || (z >= inset(pitch, k) && z < l - inset(pitch, k)));
    const k = inset(pitch, i), rim = (x, z) => x === k || x === w - 1 - k || (type === 'hip' && (z === k || z === l - 1 - k));
    const out = new Uint8Array(w * l);
    for (let z = 0; z < l; z++) for (let x = 0; x < w; x++)
      out[z * w + x] = inside(i, x, z) && (filled || rim(x, z) || !inside(i + 1, x, z)) ? 1 : 0;
    return out;
  };

  // An arch seen from the front: the opening is w wide and h tall above the springline.
  // Round is half an ellipse (a true semicircle when h is half of w). Pointed is two arcs that meet
  // at the top, each centered on the springline, so h must be at least half of w.
  // Returns { cols, rows, opening, arch }; row 0 is the top, and the arch is t blocks thick.
  const arch = (w, h, style, t) => {
    if (style === 'pointed') h = Math.max(h, Math.ceil(w / 2));
    const cols = w + 2 * t, rows = h + t;
    const r = (h * h + w * w / 4) / w; // pointed: arc radius that puts the apex at height h
    const open = (x, y) => { // x, y: block center relative to the opening's bottom-left corner
      if (y < 0 || x < 0 || x > w) return false;
      if (style === 'pointed') return Math.hypot(x - (w - r), y) <= r && Math.hypot(x - r, y) <= r;
      return ((x - w / 2) / (w / 2)) ** 2 + (y / h) ** 2 <= 1;
    };
    const opening = new Uint8Array(cols * rows), out = new Uint8Array(cols * rows);
    for (let row = 0; row < rows; row++) for (let c = 0; c < cols; c++)
      opening[row * cols + c] = open(c - t + .5, rows - 1 - row + .5) ? 1 : 0;
    // Arch blocks: within t face-steps of the opening (a diamond), not in it.
    for (let row = 0; row < rows; row++) for (let c = 0; c < cols; c++) {
      if (opening[row * cols + c]) continue;
      let near = false;
      for (let dy = -t; dy <= t && !near; dy++) for (let dx = -t; dx <= t && !near; dx++) {
        const rr = row + dy, cc = c + dx;
        near = Math.abs(dx) + Math.abs(dy) <= t && rr >= 0 && rr < rows && cc >= 0 && cc < cols && opening[rr * cols + cc] === 1;
      }
      out[row * cols + c] = near ? 1 : 0;
    }
    return { cols, rows, opening, arch: out };
  };

  const count = g => g.reduce((s, v) => s + v, 0);

  const api = { roofLayers, roofLayer, arch, count };
  if (typeof module !== 'undefined') module.exports = api;
  else window.Roofs = api;
})();
