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

  // Pick one block per step, scoring the whole row at once (Viterbi-style DP):
  //   unary:    distance to that step's target + noisy texture penalty
  //   pairwise: neighbors should step like the targets do + repeat penalty
  const W = { noise: 0.25, smooth: 1, repeat: 0.002 };

  function pick(blocks, fromHex, toHex, steps, { avoidRepeats = false } = {}) {
    const K = blocks.length;
    if (!K || steps < 1) return [];
    const a = hexToLab(fromHex), b = hexToLab(toHex);
    const targets = Array.from({ length: steps }, (_, i) => {
      const t = steps === 1 ? 0 : i / (steps - 1);
      return a.map((v, k) => v + (b[k] - v) * t);
    });
    const unary = i => blocks.map(o => d2(o.lab, targets[i]) + W.noise * o.noise ** 2);

    let cost = unary(0);
    const back = [];
    for (let i = 1; i < steps; i++) {
      const u = unary(i), dt = targets[i].map((v, k) => v - targets[i - 1][k]);
      const next = new Array(K), from = new Int32Array(K);
      for (let k = 0; k < K; k++) {
        const c = blocks[k].lab;
        let best = Infinity, arg = 0;
        for (let j = 0; j < K; j++) {
          if (cost[j] >= best) continue; // cannot win: pairwise terms are never negative
          const p = blocks[j].lab;
          let v = cost[j] + W.smooth * ((c[0] - p[0] - dt[0]) ** 2 + (c[1] - p[1] - dt[1]) ** 2 + (c[2] - p[2] - dt[2]) ** 2);
          if (j === k) v += avoidRepeats ? Infinity : W.repeat;
          if (v < best) { best = v; arg = j; }
        }
        next[k] = best + u[k];
        from[k] = arg;
      }
      cost = next;
      back.push(from);
    }
    let k = cost.indexOf(Math.min(...cost));
    if (!isFinite(cost[k])) return []; // e.g. one block left and repeats forbidden
    const row = [blocks[k]];
    for (let i = back.length - 1; i >= 0; i--) row.unshift(blocks[k = back[i][k]]);
    return row;
  }

  const api = { hexToLab, labToHex, pick };
  if (typeof module !== 'undefined') module.exports = api;
  else window.Gradient = api;
})();
