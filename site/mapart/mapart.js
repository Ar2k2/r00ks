// Map art: match an image to the colors a Minecraft map can show, flat or staircased.
// Plain script for the browser (window.MapArt) and Node (module.exports) for tests. Needs Gradient (engine.js).
(() => {
  const G = typeof module !== 'undefined' ? require('../gradient/engine.js') : window.Gradient;
  const hex = rgb => '#' + rgb.map(c => c.toString(16).padStart(2, '0')).join('');

  // Map base colors (Java 26.x), one full, non-gravity, survival block for each: [base id, block, name, r, g, b].
  // Water (12) is left out: its shade depends on depth, not height.
  const BASES = [
    [1, 'grass_block', 'Grass Block', 127, 178, 56], [2, 'birch_planks', 'Birch Planks', 247, 233, 163],
    [3, 'mushroom_stem', 'Mushroom Stem', 199, 199, 199], [4, 'redstone_block', 'Block of Redstone', 255, 0, 0],
    [5, 'packed_ice', 'Packed Ice', 160, 160, 255], [6, 'iron_block', 'Block of Iron', 167, 167, 167],
    [7, 'oak_leaves[persistent=true]', 'Oak Leaves', 0, 124, 0], [8, 'white_concrete', 'White Concrete', 255, 255, 255],
    [9, 'clay', 'Clay', 164, 168, 184], [10, 'dirt', 'Dirt', 151, 109, 77],
    [11, 'cobblestone', 'Cobblestone', 112, 112, 112], [13, 'oak_planks', 'Oak Planks', 143, 119, 72],
    [14, 'quartz_block', 'Block of Quartz', 255, 252, 245], [15, 'orange_concrete', 'Orange Concrete', 216, 127, 51],
    [16, 'magenta_concrete', 'Magenta Concrete', 178, 76, 216], [17, 'light_blue_concrete', 'Light Blue Concrete', 102, 153, 216],
    [18, 'yellow_concrete', 'Yellow Concrete', 229, 229, 51], [19, 'lime_concrete', 'Lime Concrete', 127, 204, 25],
    [20, 'pink_concrete', 'Pink Concrete', 242, 127, 165], [21, 'gray_concrete', 'Gray Concrete', 76, 76, 76],
    [22, 'light_gray_concrete', 'Light Gray Concrete', 153, 153, 153], [23, 'cyan_concrete', 'Cyan Concrete', 76, 127, 153],
    [24, 'purple_concrete', 'Purple Concrete', 127, 63, 178], [25, 'blue_concrete', 'Blue Concrete', 51, 76, 178],
    [26, 'brown_concrete', 'Brown Concrete', 102, 76, 51], [27, 'green_concrete', 'Green Concrete', 102, 127, 51],
    [28, 'red_concrete', 'Red Concrete', 153, 51, 51], [29, 'black_concrete', 'Black Concrete', 25, 25, 25],
    [30, 'gold_block', 'Block of Gold', 250, 238, 77], [31, 'prismarine_bricks', 'Prismarine Bricks', 92, 219, 213],
    [32, 'lapis_block', 'Block of Lapis Lazuli', 74, 128, 255], [33, 'emerald_block', 'Block of Emerald', 0, 217, 58],
    [34, 'spruce_planks', 'Spruce Planks', 129, 86, 49], [35, 'netherrack', 'Netherrack', 112, 2, 0],
    [36, 'white_terracotta', 'White Terracotta', 209, 177, 161], [37, 'orange_terracotta', 'Orange Terracotta', 159, 82, 36],
    [38, 'magenta_terracotta', 'Magenta Terracotta', 149, 87, 108], [39, 'light_blue_terracotta', 'Light Blue Terracotta', 112, 108, 138],
    [40, 'yellow_terracotta', 'Yellow Terracotta', 186, 133, 36], [41, 'lime_terracotta', 'Lime Terracotta', 103, 117, 53],
    [42, 'pink_terracotta', 'Pink Terracotta', 160, 77, 78], [43, 'gray_terracotta', 'Gray Terracotta', 57, 41, 35],
    [44, 'light_gray_terracotta', 'Light Gray Terracotta', 135, 107, 98], [45, 'cyan_terracotta', 'Cyan Terracotta', 87, 92, 92],
    [46, 'purple_terracotta', 'Purple Terracotta', 122, 73, 88], [47, 'blue_terracotta', 'Blue Terracotta', 76, 62, 92],
    [48, 'brown_terracotta', 'Brown Terracotta', 76, 50, 35], [49, 'green_terracotta', 'Green Terracotta', 76, 82, 42],
    [50, 'red_terracotta', 'Red Terracotta', 142, 60, 46], [51, 'black_terracotta', 'Black Terracotta', 37, 22, 16],
    [52, 'crimson_nylium', 'Crimson Nylium', 189, 48, 49], [53, 'crimson_planks', 'Crimson Planks', 148, 63, 97],
    [54, 'crimson_hyphae', 'Crimson Hyphae', 92, 25, 29], [55, 'warped_nylium', 'Warped Nylium', 22, 126, 134],
    [56, 'warped_planks', 'Warped Planks', 58, 142, 140], [57, 'warped_hyphae', 'Warped Hyphae', 86, 44, 62],
    [58, 'warped_wart_block', 'Warped Wart Block', 20, 180, 133], [59, 'cobbled_deepslate', 'Cobbled Deepslate', 100, 100, 100],
    [60, 'raw_iron_block', 'Block of Raw Iron', 216, 175, 147], [61, 'verdant_froglight', 'Verdant Froglight', 127, 167, 150],
  ].map(([base, id, name, r, g, b]) => ({ base, id, name, rgb: [r, g, b], hex: hex([r, g, b]), lab: G.hexToLab(hex([r, g, b])) }));

  // Shades: the map darkens a block lower than the one north of it and brightens one higher.
  // Index 0 = lower (x180/255), 1 = level (x220), 2 = higher (x255, the base color).
  const MULT = [180, 220, 255];

  // Colors to choose from: [{ block (index into BASES), shade, rgb, hex, lab }].
  // Flat art only has the level shade; staircase art has all three.
  const colors = stairs => BASES.flatMap((b, k) => (stairs ? [0, 1, 2] : [1]).map(shade => {
    const rgb = b.rgb.map(c => Math.floor(c * MULT[shade] / 255));
    return { block: k, shade, rgb, hex: hex(rgb), lab: G.hexToLab(hex(rgb)) };
  }));

  // rgba: opaque pixels of a w x h image (composite transparent ones first). Returns color indices per pixel.
  // dither: Floyd-Steinberg error diffusion in OKLab, which trades flat bands for fine speckle.
  function convert(rgba, w, h, pal, dither) {
    const out = new Int32Array(w * h), cache = new Map();
    const lab = new Float64Array(w * h * 3);
    for (let p = 0; p < w * h; p++) {
      const i = p * 4, key = rgba[i] << 16 | rgba[i + 1] << 8 | rgba[i + 2];
      let l = cache.get(key);
      if (!l) cache.set(key, l = G.hexToLab('#' + key.toString(16).padStart(6, '0')));
      lab.set(l, p * 3);
    }
    const near = (L, a, b) => {
      let best = 0, low = Infinity;
      for (let k = 0; k < pal.length; k++) {
        const c = pal[k].lab, d = (c[0] - L) ** 2 + (c[1] - a) ** 2 + (c[2] - b) ** 2;
        if (d < low) { low = d; best = k; }
      }
      return best;
    };
    const spread = (x, y, f, e) => {
      if (x < 0 || x >= w || y >= h) return;
      const j = (y * w + x) * 3;
      for (let c = 0; c < 3; c++) lab[j + c] += e[c] * f;
    };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const p = y * w + x, j = p * 3, k = near(lab[j], lab[j + 1], lab[j + 2]);
      out[p] = k;
      if (!dither) continue;
      const c = pal[k].lab, e = [lab[j] - c[0], lab[j + 1] - c[1], lab[j + 2] - c[2]];
      spread(x + 1, y, 7 / 16, e); spread(x - 1, y + 1, 3 / 16, e); spread(x, y + 1, 5 / 16, e); spread(x + 1, y + 1, 1 / 16, e);
    }
    return out;
  }

  // Block heights for staircase art, row 0 at the north. The returned grid has one extra row on top:
  // the line of blocks just north of the art that the first row's shade is measured against.
  // Each column steps up or down by one where its shade asks, then is lowered so its lowest block is at 0.
  function heights(cells, w, h, pal) {
    const ys = new Int32Array(w * (h + 1));
    for (let x = 0; x < w; x++) {
      let y = 0, low = 0;
      for (let r = 0; r < h; r++) {
        y += pal[cells[r * w + x]].shade - 1;
        ys[(r + 1) * w + x] = y;
        if (y < low) low = y;
      }
      for (let r = 0; r <= h; r++) ys[r * w + x] -= low;
    }
    return ys;
  }

  // Swaps (Map block index -> block index): every pixel of a swapped block takes the new block in the
  // same shade, so staircase heights stay put. pal must hold that shade of every block.
  function swap(cells, pal, subs) {
    if (!subs.size) return cells;
    const at = new Map(pal.map((c, k) => [c.block * 3 + c.shade, k]));
    return cells.map(k => subs.has(pal[k].block) ? at.get(subs.get(pal[k].block) * 3 + pal[k].shade) : k);
  }

  const api = { BASES, MULT, colors, convert, heights, swap };
  if (typeof module !== 'undefined') module.exports = api;
  else window.MapArt = api;
})();
