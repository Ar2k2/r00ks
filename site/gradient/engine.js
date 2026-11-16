// Gradient engine: OKLab color math and a whole-row block picker.
// Plain script for the browser (window.Gradient) and Node (module.exports) for tests.
(() => {
  const lin = c => (c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  const gam = c => Math.round(255 * Math.min(1, Math.max(0, c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055)));

  const hexToLab = hex => {
    const n = parseInt(hex.slice(1), 16);
    const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map(lin);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
            1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
            0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
  };

  const labToHex = ([L, A, B]) => {
    const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
    const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
    const s = (L - 0.0894841775 * A - 1.2914855480 * B) ** 3;
    return '#' + [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
                  -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
                  -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s]
      .map(c => gam(c).toString(16).padStart(2, '0')).join('');
  };

  const d2 = (p, q) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;
  // A pixel color packed as r << 16 | g << 8 | b.
  const keyToLab = key => hexToLab('#' + key.toString(16).padStart(6, '0'));

  // Pick one block per step, scoring the whole row at once (Viterbi-style DP):
  //   unary:    distance to that step's target + noisy texture penalty
  //   pairwise: neighbors should step like the targets do + repeat penalty
  // avoidRepeats: no block twice anywhere in the row (when there are enough blocks).
  const W = { noise: 0.25, smooth: 1, repeat: 0.002 };
  // How well one block matches a target color: distance plus the noisy texture penalty. Mosaic and palette use it too.
  const score = (b, t) => d2(b.lab, t) + W.noise * b.noise ** 2;

  // colors: two or more hex stops, spaced evenly along the row.
  function pick(blocks, colors, steps, { avoidRepeats = false } = {}) {
    const K = blocks.length;
    if (!K || steps < 1 || !colors.length) return [];
    const labs = colors.map(hexToLab), segs = Math.max(1, labs.length - 1);
    const targets = Array.from({ length: steps }, (_, i) => {
      const t = steps === 1 ? 0 : i / (steps - 1) * segs, s = Math.min(Math.floor(t), segs - 1);
      const a = labs[s], b = labs[s + 1] ?? a;
      return a.map((v, k) => v + (b[k] - v) * (t - s));
    });

    // One DP pass. ban[i]: block ids not allowed at step i. Each step only considers its M closest
    // allowed blocks: anything further off loses on distance anyway, and it keeps re-scoring quick.
    const M = 48;
    const solve = ban => {
      const cand = targets.map((t, i) => blocks.map((o, k) => [k, score(o, t)])
        .filter(([k]) => !ban[i].has(blocks[k].id)).sort((p, q) => p[1] - q[1]).slice(0, M));
      if (cand.some(c => !c.length)) return [];
      let cost = cand[0].map(([, u]) => u);
      const back = [];
      for (let i = 1; i < steps; i++) {
        const dt = targets[i].map((v, k) => v - targets[i - 1][k]), prev = cand[i - 1];
        const next = [], from = [];
        for (const [k, u] of cand[i]) {
          const c = blocks[k].lab;
          let best = Infinity, arg = 0;
          prev.forEach(([j], n) => {
            if (cost[n] >= best) return; // cannot win: pairwise terms are never negative
            const p = blocks[j].lab;
            let v = cost[n] + W.smooth * ((c[0] - p[0] - dt[0]) ** 2 + (c[1] - p[1] - dt[1]) ** 2 + (c[2] - p[2] - dt[2]) ** 2);
            // A repeat is the same block, whichever face shows (log end next to log side counts).
            if (blocks[j].id === blocks[k].id) v += avoidRepeats ? Infinity : W.repeat;
            if (v < best) { best = v; arg = n; }
          });
          next.push(best + u);
          from.push(arg);
        }
        cost = next;
        back.push(from);
      }
      let n = cost.indexOf(Math.min(...cost));
      if (!isFinite(cost[n])) return []; // e.g. one block left and repeats forbidden
      const row = [blocks[cand[steps - 1][n][0]]];
      for (let i = back.length - 1; i >= 0; i--) row.unshift(blocks[cand[i][n = back[i][n]][0]]);
      return row;
    };

    const ban = targets.map(() => new Set());
    let row = solve(ban);
    // A block used more than once stays only at the step it fits best; re-score until none repeat.
    // If the blocks run out, the last row that worked stands (with some repeats).
    while (avoidRepeats && row.length) {
      const at = new Map();
      row.forEach((o, i) => at.set(o.id, [...at.get(o.id) ?? [], i]));
      const dups = [...at].filter(([, is]) => is.length > 1);
      if (!dups.length) break;
      for (const [id, is] of dups) {
        const keep = is.reduce((p, i) => d2(row[i].lab, targets[i]) < d2(row[p].lab, targets[p]) ? i : p);
        ban.forEach((s, i) => i !== keep && s.add(id));
      }
      const next = solve(ban);
      if (!next.length) break;
      row = next;
    }
    return row;
  }

  // Lay a row of n blocks out as a w*h pattern (row 0 at the top), returning a block index per cell.
  // Each block gets a band `width` wide. noise (0..1) blends the bands: 0 is hard edges, 0.5 mixes
  // neighbors across one band in a tidy 4x4 ordered dither, 1 scatters blocks at random across two bands.
  // The random part is a hash of the cell, so the same settings always give the same pattern.
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const hash = (x, y) => { let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) | 0; h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296; };
  function pattern(n, width, height, noise) {
    const w = n * width, out = [];
    for (let y = 0; y < height; y++) for (let x = 0; x < w; x++) {
      const order = (BAYER[(y % 4) * 4 + x % 4] + 0.5) / 16;
      const r = order + (hash(x, y) - order) * noise; // tidy dither -> random as noise rises
      const i = Math.floor((x + 0.5) / width + (r - 0.5) * noise * 2);
      out.push(Math.min(n - 1, Math.max(0, i)));
    }
    return { cells: out, w, h: height };
  }

  const api = { hexToLab, labToHex, keyToLab, score, pick, pattern };
  if (typeof module !== 'undefined') module.exports = api;
  else window.Gradient = api;
})();
