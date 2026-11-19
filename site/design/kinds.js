// Dome and arch geometry for the 3D designer. Plain script for the browser (window.Kinds) and Node (module.exports) for tests.
// Both shapes come from a profile: radius (dome) or half-width of the opening (arch) as a fraction of
// the base, sampled at N + 1 evenly spaced heights from bottom (0) to top (1). Dragging the model bends it.
(() => {
  const N = 32;
  const sample = f => Array.from({ length: N + 1 }, (_, i) => f(i / N));
  const at = (prof, t) => { // linear between samples; 0 above the top
    if (t >= 1) return prof[N] ?? 0;
    const u = Math.max(0, t) * N, i = Math.floor(u);
    return prof[i] + (prof[i + 1] - prof[i]) * (u - i);
  };
  // Push one height of a profile out (amount > 0) or in, with a soft falloff so the curve stays smooth.
  const bend = (prof, t, amount, width) => prof.map((v, i) => Math.max(0, v + amount * Math.exp(-(((i / N - t) / width) ** 2))));

  // Shapes: a profile and the height it looks right at, as a multiple of the base width (diameter or opening).
  const ogive = k => { const R = (k * k + 1) / 2; return t => Math.max(0, Math.sqrt(R * R - (k * t) ** 2) - (R - 1)); };
  const DOMES = {
    round: { name: 'Round', f: t => Math.sqrt(Math.max(0, 1 - t * t)), h: .5 },
    shallow: { name: 'Shallow', f: t => Math.sqrt(Math.max(0, 1 - t * t)), h: .3 },
    pointed: { name: 'Pointed', f: ogive(1.6), h: .8 },
    // Onion: swells past the base, then draws in to a fine tip.
    onion: { name: 'Onion', f: t => t < .45 ? 1 + .3 * Math.sin(Math.PI * t / .45) : (1 - (t - .45) / .55) ** 1.8, h: .9 },
  };
  const ARCHES = {
    round: { name: 'Round', f: t => Math.sqrt(Math.max(0, 1 - t * t)), h: .5 },
    pointed: { name: 'Pointed', f: ogive(1.6), h: .8 },
    segment: { name: 'Shallow', f: t => { const y0 = (1 - .6 * .6) / (2 * .6), R = Math.hypot(1, y0); return Math.max(0, Math.sqrt(R * R - (t * .6 + y0) ** 2)); }, h: .3 },
    flat: { name: 'Flat', f: () => 1, h: .5 },
  };

  // A dome d blocks across and h layers tall. Layer i's ring is centered like the circle generator's:
  // an odd diameter centers on a block, an even one on a corner, and the bottom layer of an odd dome is
  // its widest. Returns the footprint size (wider than d when the shape swells) and each layer as a
  // size*size array of 0/1. Hollow keeps only blocks open to the outside on a face.
  const dome = (d, h, prof, hollow) => {
    const c = d / 2, odd = d % 2, hc = Math.max(.5, h - (odd ? .5 : 0));
    const radii = Array.from({ length: h }, (_, i) => c * at(prof, (i + (odd ? 0 : .5)) / hc));
    const grow = Math.max(0, Math.ceil(Math.max(...radii, c) - c)), size = d + 2 * grow, mid = size / 2;
    const inside = (i, x, z) => i < 0 ? true : i < h && (x + .5 - mid) ** 2 + (z + .5 - mid) ** 2 <= radii[i] ** 2;
    const layers = radii.map((_, i) => {
      const out = new Uint8Array(size * size);
      for (let z = 0; z < size; z++) for (let x = 0; x < size; x++) {
        if (!inside(i, x, z)) continue;
        const buried = inside(i + 1, x, z) && inside(i - 1, x, z) && inside(i, x - 1, z) && inside(i, x + 1, z) && inside(i, x, z - 1) && inside(i, x, z + 1);
        out[z * size + x] = hollow && buried ? 0 : 1;
      }
      return out;
    });
    return { size, grow, layers };
  };

  // The ring of wall under a dome: blocks of the base circle that touch the outside.
  const ring = (d, size) => {
    const mid = size / 2, c = d / 2, inside = (x, z) => (x + .5 - mid) ** 2 + (z + .5 - mid) ** 2 <= c * c, out = new Uint8Array(size * size);
    for (let z = 0; z < size; z++) for (let x = 0; x < size; x++)
      out[z * size + x] = inside(x, z) && !(inside(x - 1, z) && inside(x + 1, z) && inside(x, z - 1) && inside(x, z + 1)) ? 1 : 0;
    return out;
  };

  // An arch seen from the front: an opening w wide, with straight sides `legs` blocks tall and then a
  // curved top `rise` blocks tall, framed t blocks thick (within t face-steps of the opening, like the
  // roofs page). Returns { cols, rows, open, arch }, row 0 at the bottom; open marks the opening.
  const arch = (w, rise, legs, t, prof) => {
    const cols = w + 2 * t, rows = legs + rise + t;
    const opening = (x, y) => { // block center, relative to the opening's bottom-left corner
      if (y < 0 || x < 0 || x > w) return false;
      if (y < legs) return true;
      return y - legs < rise && Math.abs(x - w / 2) <= w / 2 * at(prof, (y - legs) / rise);
    };
    const open = new Uint8Array(cols * rows), out = new Uint8Array(cols * rows);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) open[r * cols + c] = opening(c - t + .5, r + .5) ? 1 : 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (open[r * cols + c]) continue;
      let near = false;
      for (let dy = -t; dy <= t && !near; dy++) for (let dx = -t; dx <= t && !near; dx++) {
        const rr = r + dy, cc = c + dx;
        near = Math.abs(dx) + Math.abs(dy) <= t && rr >= 0 && rr < rows && cc >= 0 && cc < cols && open[rr * cols + cc] === 1;
      }
      out[r * cols + c] = near ? 1 : 0;
    }
    return { cols, rows, open, arch: out };
  };

  // A profile in a share link: two-digit hundredths, dot-separated (checked: N + 1 numbers, 0 to 3).
  const pack = prof => prof.map(v => Math.round(v * 100)).join('.');
  const unpack = s => {
    if (!new RegExp(`^\\d{1,3}(\\.\\d{1,3}){${N}}$`).test(s || '')) return null;
    return s.split('.').map(v => Math.min(3, +v / 100));
  };

  const api = { N, sample, at, bend, dome, ring, arch, pack, unpack, DOMES, ARCHES };
  if (typeof module !== 'undefined') module.exports = api;
  else window.Kinds = api;
})();
