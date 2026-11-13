// Banner designer: pattern data (Java 26.x jar: banner_pattern registry, tags and en_us names),
// our own drawings of each pattern for the preview, loom steps and /give commands.
// Plain script for the browser (window.Banner) and Node (module.exports) for tests.
(() => {
  // Patterns that need an item in the loom: [item id, item name, how to get it].
  const ITEMS = {
    bricks: ['field_masoned_banner_pattern', 'Field Masoned Banner Pattern', 'craft Paper + Bricks'],
    curly_border: ['bordure_indented_banner_pattern', 'Bordure Indented Banner Pattern', 'craft Paper + Vines'],
    creeper: ['creeper_banner_pattern', 'Creeper Charge Banner Pattern', 'craft Paper + Creeper Head'],
    skull: ['skull_banner_pattern', 'Skull Charge Banner Pattern', 'craft Paper + Wither Skeleton Skull'],
    flower: ['flower_banner_pattern', 'Flower Charge Banner Pattern', 'craft Paper + Oxeye Daisy'],
    mojang: ['mojang_banner_pattern', 'Thing Banner Pattern', 'craft Paper + Enchanted Golden Apple'],
    globe: ['globe_banner_pattern', 'Globe Banner Pattern', 'buy from a master Cartographer villager'],
    piglin: ['piglin_banner_pattern', 'Snout Banner Pattern', 'found in bastion remnant chests'],
    flow: ['flow_banner_pattern', 'Flow Banner Pattern', 'from ominous vaults in trial chambers'],
    guster: ['guster_banner_pattern', 'Guster Banner Pattern', 'from vaults in trial chambers'],
  };

  // Our own drawings on the 20 x 40 banner face (not the game's textures). Each pattern is a list of
  // paths filled even-odd (inner subpaths cut holes); separate paths add up. grad: a fade instead.
  const zigzag = (y0, dir) => { let d = `M0 ${y0}`; for (let x = 0; x < 20; x += 5) d += `L${x + 2.5} ${y0 + dir * 5}L${x + 5} ${y0}`; return d + 'z'; };
  const curly = (() => {
    let d = 'M0 0h20v40H0zM2 2';
    for (let y = 2; y < 38; y += 4) d += `L${y % 8 === 2 ? 3.5 : 2} ${y + 2}L2 ${y + 4}`;
    for (let x = 2; x < 18; x += 4) d += `L${x + 2} ${x % 8 === 2 ? 36.5 : 38}L${x + 4} 38`;
    for (let y = 38; y > 2; y -= 4) d += `L${y % 8 === 6 ? 16.5 : 18} ${y - 2}L18 ${y - 4}`;
    for (let x = 18; x > 2; x -= 4) d += `L${x - 2} ${x % 8 === 2 ? 3.5 : 2}L${x - 4} 2`;
    return d + 'z';
  })();
  const bricks = (() => {
    let d = '';
    for (let y = 3; y < 40; y += 4) d += `M0 ${y}h20v1H0z`;
    for (let r = 0; r < 10; r++) for (let x = r % 2 ? 2 : 6; x < 20; x += 8) d += `M${x} ${r * 4}h1v3h-1z`;
    return d;
  })();
  const circle = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`;
  const SHAPES = {
    square_bottom_left: ['M0 26h10v14H0z'], square_bottom_right: ['M10 26h10v14H10z'],
    square_top_left: ['M0 0h10v14H0z'], square_top_right: ['M10 0h10v14H10z'],
    stripe_bottom: ['M0 27h20v13H0z'], stripe_top: ['M0 0h20v13H0z'],
    stripe_left: ['M0 0h6v40H0z'], stripe_right: ['M14 0h6v40h-6z'], stripe_center: ['M7 0h6v40H7z'], stripe_middle: ['M0 14h20v12H0z'],
    stripe_downright: ['M0 0h4l16 34v6h-4L0 6z'], stripe_downleft: ['M20 0h-4L0 34v6h4l16-34z'],
    small_stripes: ['M1 0h2v40H1zM6 0h2v40H6zM12 0h2v40h-2zM17 0h2v40h-2z'],
    cross: ['M0 0h3l17 37v3h-3L0 3z', 'M20 0h-3L0 37v3h3L20 3z'], straight_cross: ['M8 0h4v40H8z', 'M0 18h20v4H0z'],
    triangle_bottom: ['M0 40L10 29L20 40z'], triangle_top: ['M0 0h20L10 11z'],
    triangles_bottom: [zigzag(40, -1)], triangles_top: [zigzag(0, 1)],
    diagonal_left: ['M0 0h20L0 40z'], diagonal_up_right: ['M20 0v40H0z'], diagonal_right: ['M0 0h20v40z'], diagonal_up_left: ['M0 0v40h20z'],
    circle: [circle(10, 20, 5)], rhombus: ['M10 10L16 20L10 30L4 20z'],
    half_vertical: ['M0 0h10v40H0z'], half_vertical_right: ['M10 0h10v40H10z'],
    half_horizontal: ['M0 0h20v20H0z'], half_horizontal_bottom: ['M0 20h20v20H0z'],
    border: ['M0 0h20v40H0zM1.5 1.5v37h17v-37z'], curly_border: [curly], bricks: [bricks],
    gradient: { grad: 'down' }, gradient_up: { grad: 'up' },
    creeper: ['M5 13h3.5v3.5H5zM11.5 13H15v3.5h-3.5zM8.5 16.5h3V18H13v6h-1.5v-1.5h-3V24H7v-6h1.5z'],
    skull: ['M10 11a5 5 0 0 1 5 5v2.5l-1.5 1V22h-7v-2.5L5 18.5V16a5 5 0 0 1 5-5zM7 15.5h2.2v2.2H7zM10.8 15.5H13v2.2h-2.2z',
      'M4 24.5l12 5-.6 1.4-12-5z', 'M16 24.5l-12 5 .6 1.4 12-5z'],
    flower: [0, 1, 2, 3, 4, 5, 6, 7].map(i => circle(10 + 4 * Math.cos(i * Math.PI / 4), 20 + 4 * Math.sin(i * Math.PI / 4), 2.3))
      .concat([circle(10, 20, 2.6) + circle(10, 20, 1.3)]),
    mojang: ['M4 14h8a4 4 0 0 1 4 4v4a4 4 0 0 1-4 4H4zM7 17v6h4.5a1.5 1.5 0 0 0 1.5-1.5v-3a1.5 1.5 0 0 0-1.5-1.5z'],
    globe: [circle(10, 20, 6.5) + circle(10, 20, 5.3), 'M9.4 13.5h1.2v13H9.4z', 'M3.5 19.4h13v1.2h-13z',
      'M10 13.5a3.2 6.5 0 1 1 0 13a3.2 6.5 0 1 1 0-13zM10 14.7a2 5.3 0 1 0 0 10.6a2 5.3 0 1 0 0-10.6z'],
    piglin: ['M5 16h10a2.5 2.5 0 0 1 2.5 2.5v3a2.5 2.5 0 0 1-2.5 2.5H5a2.5 2.5 0 0 1-2.5-2.5v-3A2.5 2.5 0 0 1 5 16zM6.5 18.5h2.5v3H6.5zM11 18.5h2.5v3H11z'],
    flow: ['M4 12h12v1.4H5.4v13.2h9.2v-8.6H8.2v4.4h3.4v-1.4h-2v-1.6h3.4v4.4H6.8V16.6h9.2V28H4z'],
    guster: ['M4 14.5h9a2 2 0 0 1 0 4h-1v-1.4h1a.6.6 0 0 0 0-1.2H4z', 'M6 20h10a2 2 0 0 1 0 4h-1v-1.4h1a.6.6 0 0 0 0-1.2H6z',
      'M4 25.5h7a2 2 0 0 1 0 4h-1v-1.4h1a.6.6 0 0 0 0-1.2H4z'],
  };

  // In-game names without the color ("Red Chief" -> "Chief"), from en_us.json, in the loom's order.
  const NAMES = {
    square_bottom_left: 'Base Dexter Canton', square_bottom_right: 'Base Sinister Canton', square_top_left: 'Chief Dexter Canton',
    square_top_right: 'Chief Sinister Canton', stripe_bottom: 'Base', stripe_top: 'Chief', stripe_left: 'Pale Dexter',
    stripe_right: 'Pale Sinister', stripe_center: 'Pale', stripe_middle: 'Fess', stripe_downright: 'Bend', stripe_downleft: 'Bend Sinister',
    small_stripes: 'Paly', cross: 'Saltire', straight_cross: 'Cross', triangle_bottom: 'Chevron', triangle_top: 'Inverted Chevron',
    triangles_bottom: 'Base Indented', triangles_top: 'Chief Indented', diagonal_left: 'Per Bend Sinister', diagonal_up_right: 'Per Bend Sinister Inverted',
    diagonal_up_left: 'Per Bend Inverted', diagonal_right: 'Per Bend', circle: 'Roundel', rhombus: 'Lozenge', half_vertical: 'Per Pale',
    half_horizontal: 'Per Fess', half_vertical_right: 'Per Pale Inverted', half_horizontal_bottom: 'Per Fess Inverted', border: 'Bordure',
    gradient: 'Gradient', gradient_up: 'Base Gradient', bricks: 'Field Masoned', curly_border: 'Bordure Indented', creeper: 'Creeper Charge',
    skull: 'Skull Charge', flower: 'Flower Charge', mojang: 'Thing', globe: 'Globe', piglin: 'Snout', flow: 'Flow', guster: 'Guster',
  };
  const PATTERNS = Object.entries(NAMES).map(([id, name]) => ({ id, name, item: ITEMS[id] ?? null, shape: SHAPES[id] }));
  const LOOM_MAX = 6; // the loom refuses a banner that already has 6 patterns

  // design: { base: dye id, layers: [{ pattern, color }] }
  const components = layers => `banner_patterns=[${layers.map(l => `{pattern:"${l.pattern}",color:"${l.color}"}`).join(',')}]`;
  const give = d => `give @p ${d.base}_banner${d.layers.length ? `[${components(d.layers)}]` : ''}`;
  const shield = d => `give @p shield[base_color="${d.base}"${d.layers.length ? `,${components(d.layers)}` : ''}]`;

  // Loom steps in words. dyeName: dye id -> name.
  const steps = (d, dyeName) => [`Craft a ${dyeName(d.base)} Banner from 6 ${dyeName(d.base)} Wool and a Stick.`,
    ...d.layers.map(l => {
      const p = PATTERNS.find(q => q.id === l.pattern);
      return `In the loom: ${dyeName(l.color)} Dye${p.item ? ` and the ${p.item[1]}` : ''}, then pick ${dyeName(l.color)} ${p.name}.`;
    })];

  // What to gather: dyes (one per layer) and pattern items (kept, not used up).
  const needs = d => {
    const dyes = new Map(), items = new Map();
    for (const l of d.layers) {
      dyes.set(l.color, (dyes.get(l.color) ?? 0) + 1);
      const it = ITEMS[l.pattern];
      if (it) items.set(it[0], it);
    }
    return { dyes, items: [...items.values()] };
  };

  const api = { PATTERNS, LOOM_MAX, give, shield, steps, needs };
  if (typeof module !== 'undefined') module.exports = api;
  else window.Banner = api;
})();
