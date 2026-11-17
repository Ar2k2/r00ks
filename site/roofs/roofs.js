// Roof and arch math. Plain script for the browser (window.Roofs) and Node (module.exports) for tests.
// Grids are Uint8Arrays read row by row.
(() => {
  // A slope is a name ('shallow', 'normal' for 45°, 'steep') or a profile { ins, cap }: ins[i] is how far
  // layer i steps in from the edge (never less than the layer below), and past the end the last step
  // repeats (at least 1). cap, when set, stops the roof after that many layers with a flat top.
  // Shallow rises 1 per 2 blocks, steep 2 per 1.
  const inset = (pitch, i) => {
    if (typeof pitch !== 'object') return pitch === 'shallow' ? 2 * i : pitch === 'steep' ? Math.floor(i / 2) : i;
    const a = pitch.ins, m = a.length;
    if (i < m) return a[i];
    return a[m - 1] + (i - m + 1) * Math.max(1, m > 1 ? a[m - 1] - a[m - 2] : 1);
  };
  const capOf = pitch => typeof pitch === 'object' && pitch.cap > 0 ? pitch.cap : Infinity;

  // Layers until the roof closes over the narrower side it slopes on (or reaches its cap).
  const roofLayers = (w, l, type, pitch) => {
    const side = type === 'hip' ? Math.min(w, l) : w;
    let n = 0;
    while (n < capOf(pitch) && side - 2 * inset(pitch, n) >= 1) n++;
    return n;
  };

  // Ready-made profiles for the house designer, from the names above to curved and flat-topped ones.
  const fromSteps = (steps, rows = 64) => { const ins = [0]; for (let i = 1; i < rows; i++) ins.push(ins[i - 1] + steps(i - 1)); return ins; };
  const PROFILES = {
    normal: { ins: fromSteps(() => 1) },
    shallow: { ins: fromSteps(() => 2) },
    steep: { ins: fromSteps(i => i % 2) },
    gambrel: { ins: fromSteps(i => i < 4 ? i % 2 : 2) }, // steep, then shallow: a barn
    mansard: { ins: fromSteps(i => i % 2), cap: 6 }, // steep sides, flat top
    bell: { ins: fromSteps(i => i === 0 ? 2 : i < 3 ? 1 : i < 7 ? (i + 1) % 2 : (i % 3 === 0 ? 1 : 0)) }, // flared eaves, steep crown
    flat: { ins: [0], cap: 1 },
  };

  // Layer i (0 = the bottom, on the walls) seen from above: w across (x), l long (z).
  // A gable slopes on the two long sides only; a hip slopes on all four.
  // Hollow keeps the blocks with nothing on top of them, so the roof is a shell you can stand under.
  // kind: 0 empty, 1 full block, 2 stair, 3 slab. side: which edges a stair or slab sits on
  // (1 west, 2 east, 4 north, 8 south); a stair faces out over them, so two sides make a corner stair.
  const BLOCK = 1, STAIR = 2, SLAB = 3;
  const roofParts = (w, l, type, pitch, i, filled) => {
    const n = roofLayers(w, l, type, pitch);
    const inside = (k, x, z) => k < n && x >= inset(pitch, k) && x < w - inset(pitch, k) &&
      (type !== 'hip' || (z >= inset(pitch, k) && z < l - inset(pitch, k)));
    const k = inset(pitch, i), spanX = w - 2 * k > 1, spanZ = type === 'hip' && l - 2 * k > 1;
    // How far the next layer steps in: 1 makes a stair, 2 or more a slab, 0 (straight up, or a flat top) a block.
    const d = (i === n - 1 && n === capOf(pitch) ? k : inset(pitch, i + 1)) - k;
    const kind = new Uint8Array(w * l), side = new Uint8Array(w * l);
    for (let z = 0; z < l; z++) for (let x = 0; x < w; x++) {
      if (!inside(i, x, z)) continue;
      // Edges on a sloped side; a one-block-wide ridge has no slope across it.
      const s = (spanX && x === k ? 1 : 0) | (spanX && x === w - 1 - k ? 2 : 0) | (spanZ && z === k ? 4 : 0) | (spanZ && z === l - 1 - k ? 8 : 0);
      const open = !inside(i + 1, x, z); // nothing on top
      const rim = x === k || x === w - 1 - k || (type === 'hip' && (z === k || z === l - 1 - k));
      if (!filled && !rim && !open) continue;
      // Steep roofs rise two layers per step: the lower one is covered, so it stays a full block.
      kind[z * w + x] = s && open ? (d === 1 ? STAIR : d >= 2 ? SLAB : BLOCK) : BLOCK;
      side[z * w + x] = kind[z * w + x] === BLOCK ? 0 : s;
    }
    return { kind, side };
  };
  const roofLayer = (...a) => roofParts(...a).kind.map(v => v ? 1 : 0);

  // A whole roof over walls w x l: it overhangs them by o blocks on every side, so its footprint is
  // (w + 2o) x (l + 2o). trim marks the outer ring seen from above (eaves, and a gable's end rakes).
  // lip adds a layer of upside-down stairs (kind LIP) under the eaves. hang: layers below the one that
  // rests on the walls, found where the hollow shell first reaches the wall's column.
  const LIP = 4;
  const design = (w, l, type, pitch, filled, o, lip) => {
    const W = w + 2 * o, L = l + 2 * o, n = roofLayers(W, L, type, pitch);
    const edge = (x, z) => x === 0 || x === W - 1 || z === 0 || z === L - 1;
    const layers = Array.from({ length: n }, (_, i) => {
      const p = roofParts(W, L, type, pitch, i, filled);
      p.trim = p.kind.map((k, j) => k && edge(j % W, Math.floor(j / W)) ? 1 : 0);
      return p;
    });
    let hang = 0;
    while (hang < n - 1 && !roofParts(W, L, type, pitch, hang, false).kind[Math.floor(L / 2) * W + o]) hang++;
    if (lip && n) {
      const kind = new Uint8Array(W * L), side = new Uint8Array(W * L);
      layers[0].kind.forEach((k, j) => {
        const x = j % W, z = Math.floor(j / W);
        const s = (x === 0 ? 1 : 0) | (x === W - 1 ? 2 : 0) | (type === 'hip' ? (z === 0 ? 4 : 0) | (z === L - 1 ? 8 : 0) : 0);
        if (k && s) { kind[j] = LIP; side[j] = s; }
      });
      layers.unshift({ kind, side, trim: kind.map(k => k ? 1 : 0) });
    }
    return { W, L, layers, hang };
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

  // The 3D shape of a roof piece, as boxes in 0..1 (null for a full block). Slabs are the bottom half;
  // stairs add the high back half (a quarter on a corner); a lip is a stair upside down.
  const boxes = (k, s) => {
    if (k === BLOCK || !k) return null;
    const hx = [s & 1 ? .5 : 0, s & 2 ? .5 : 1], hz = [s & 4 ? .5 : 0, s & 8 ? .5 : 1];
    if (k === SLAB) return [[0, 1, 0, .5, 0, 1]];
    if (k === LIP) return [[0, 1, .5, 1, 0, 1], [...hx, 0, .5, ...hz]];
    return [[0, 1, 0, .5, 0, 1], [...hx, .5, 1, ...hz]];
  };

  // Blocks that come as stairs and slabs: [name, full block id]. Shared by the roofs page and the house designer.
  const STAIR_BLOCKS = [['oak', 'oak_planks'], ['spruce', 'spruce_planks'], ['birch', 'birch_planks'], ['jungle', 'jungle_planks'],
    ['acacia', 'acacia_planks'], ['dark oak', 'dark_oak_planks'], ['mangrove', 'mangrove_planks'], ['cherry', 'cherry_planks'],
    ['pale oak', 'pale_oak_planks'], ['bamboo', 'bamboo_planks'], ['crimson', 'crimson_planks'], ['warped', 'warped_planks'],
    ['cobblestone', 'cobblestone'], ['mossy cobblestone', 'mossy_cobblestone'], ['stone', 'stone'], ['stone brick', 'stone_bricks'],
    ['mossy stone brick', 'mossy_stone_bricks'], ['brick', 'bricks'], ['mud brick', 'mud_bricks'], ['sandstone', 'sandstone'],
    ['red sandstone', 'red_sandstone'], ['quartz', 'quartz_block'], ['purpur', 'purpur_block'], ['prismarine', 'prismarine'],
    ['prismarine brick', 'prismarine_bricks'], ['dark prismarine', 'dark_prismarine'], ['nether brick', 'nether_bricks'],
    ['red nether brick', 'red_nether_bricks'], ['blackstone', 'blackstone'], ['polished blackstone brick', 'polished_blackstone_bricks'],
    ['cobbled deepslate', 'cobbled_deepslate'], ['deepslate brick', 'deepslate_bricks'], ['deepslate tile', 'deepslate_tiles'],
    ['tuff brick', 'tuff_bricks'], ['end stone brick', 'end_stone_bricks'], ['cut copper', 'cut_copper'], ['resin brick', 'resin_bricks'],
    ['polished andesite', 'polished_andesite'], ['polished granite', 'polished_granite'], ['polished diorite', 'polished_diorite'],
  ];

  const api = { inset, roofLayers, roofLayer, roofParts, design, arch, count, boxes, STAIR_BLOCKS, PROFILES, BLOCK, STAIR, SLAB, LIP };
  if (typeof module !== 'undefined') module.exports = api;
  else window.Roofs = api;
})();
