// Image mosaic: match each pixel of a small image to the nearest block color in OKLab.
// Plain script for the browser (window.Mosaic) and Node (module.exports) for tests. Needs Gradient (engine.js).
(() => {
  const G = typeof module !== 'undefined' ? require('../gradient/engine.js') : window.Gradient;
  const NOISE = 0.25; // same texture penalty weight as the gradient engine

  const lab = key => G.hexToLab('#' + key.toString(16).padStart(6, '0'));
  const score = (b, t) => (b.lab[0] - t[0]) ** 2 + (b.lab[1] - t[1]) ** 2 + (b.lab[2] - t[2]) ** 2 + NOISE * b.noise ** 2;
  // Opaque pixels by color: Map(rgb key -> pixel count).
  const colors = rgba => {
    const m = new Map();
    for (let i = 0; i < rgba.length; i += 4)
      if (rgba[i + 3] >= 128) { const key = rgba[i] << 16 | rgba[i + 1] << 8 | rgba[i + 2]; m.set(key, (m.get(key) ?? 0) + 1); }
    return m;
  };

  // rgba: pixel bytes of a w x h image. Returns block indices per pixel, -1 where mostly transparent.
  // limit: at most this many block types. Starting from the blocks a free match uses, it keeps
  // adding the one that cuts the total color error most (weighted by pixel count), so a small
  // area with a distinct color still gets its block. Then every pixel takes its closest kept block.
  function build(rgba, blocks, limit = Infinity) {
    const free = match(rgba, blocks), cand = [...new Set(free)].filter(k => k >= 0);
    if (cand.length <= limit) return free;
    const cols = colors(rgba), labs = [...cols.keys()].map(lab), ns = [...cols.values()];
    const D = cand.map(k => labs.map(t => score(blocks[k], t)));
    const best = new Float64Array(labs.length).fill(1e3), keep = [];
    while (keep.length < Math.max(1, limit)) {
      let top = -1, most = -1;
      D.forEach((row, c) => {
        if (keep.includes(cand[c])) return;
        let gain = 0;
        for (let u = 0; u < row.length; u++) if (row[u] < best[u]) gain += ns[u] * (best[u] - row[u]);
        if (gain > most) { most = gain; top = c; }
      });
      keep.push(cand[top]);
      D[top].forEach((d, u) => { if (d < best[u]) best[u] = d; });
    }
    return match(rgba, keep.map(k => blocks[k])).map(k => k < 0 ? k : keep[k]);
  }

  function match(rgba, blocks) {
    const out = new Int32Array(rgba.length / 4), cache = new Map();
    for (let p = 0; p < out.length; p++) {
      const i = p * 4;
      if (rgba[i + 3] < 128) { out[p] = -1; continue; }
      const key = rgba[i] << 16 | rgba[i + 1] << 8 | rgba[i + 2];
      let k = cache.get(key);
      if (k === undefined) {
        const t = lab(key);
        let low = Infinity;
        k = -1;
        blocks.forEach((b, j) => { const s = score(b, t); if (s < low) { low = s; k = j; } });
        cache.set(key, k);
      }
      out[p] = k;
    }
    return out;
  }

  // Block counts, most used first: [{ block, count }].
  const count = (cells, blocks) => {
    const n = new Map();
    for (const k of cells) if (k >= 0) n.set(k, (n.get(k) ?? 0) + 1);
    return [...n].sort((a, b) => b[1] - a[1]).map(([k, c]) => ({ block: blocks[k], count: c }));
  };

  // "3 stacks + 12" style count (64 per stack).
  const stacks = c => {
    const s = Math.floor(c / 64), r = c % 64;
    return !s ? `${c}` : `${s} stack${s > 1 ? 's' : ''}${r ? ` + ${r}` : ''}`;
  };

  const api = { build, count, stacks };
  if (typeof module !== 'undefined') module.exports = api;
  else window.Mosaic = api;
})();
