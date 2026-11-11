// Palette builder: from one base color, pick blocks for a color-harmony scheme in OKLab.
// Plain script for the browser (window.Palette) and Node (module.exports) for tests.
(() => {
  // Each scheme: hue offsets (degrees) and, per hue, lightness offsets from the base.
  const SCHEMES = {
    tonal: [[0, [-0.3, -0.2, -0.1, 0.1, 0.2]]],
    analogous: [[-30, [-0.08, 0, 0.08]], [30, [-0.08, 0, 0.08]]],
    complementary: [[0, [-0.15, 0.15]], [180, [-0.1, 0, 0.1]]],
    triad: [[-120, [-0.06, 0.06]], [120, [-0.06, 0.06]]],
  };
  const NOISE = 0.25; // same texture penalty weight as the gradient engine

  const d2 = (p, q) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;
  const score = (b, t) => d2(b.lab, t) + NOISE * b.noise ** 2;

  // Groups of blocks: the base first, then one group per scheme hue. A block ID is used once.
  function build(blocks, base, scheme) {
    const used = new Set();
    const take = target => {
      let best = null;
      for (const b of blocks) if (!used.has(b.id) && (!best || score(b, target) < score(best, target))) best = b;
      if (best) used.add(best.id);
      return best;
    };
    const [L, A, B] = base.lab ?? base;
    const C = Math.hypot(A, B), h = Math.atan2(B, A);
    const anchor = base.lab ? base : take([L, A, B]);
    if (!anchor) return [];
    used.add(anchor.id);
    return [{ hue: null, blocks: [anchor] }, ...SCHEMES[scheme].map(([dh, dLs]) => {
      const r = h + dh * Math.PI / 180;
      const targets = dLs.map(dL => [Math.min(0.97, Math.max(0.12, L + dL)), C * Math.cos(r), C * Math.sin(r)]);
      return { hue: dh, blocks: targets.map(take).filter(Boolean).sort((p, q) => p.lab[0] - q.lab[0]) };
    })].filter(g => g.blocks.length);
  }

  const api = { SCHEMES, build };
  if (typeof module !== 'undefined') module.exports = api;
  else window.Palette = api;
})();
