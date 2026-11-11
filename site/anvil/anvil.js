// Anvil cost optimizer: the cheapest order to put enchanted books onto an item (Java Edition).
// Plain script for the browser (window.Anvil) and Node (module.exports) for tests.
(() => {
  // id: [name, max level, book multiplier]. The sacrifice is always a book here, so only the
  // book multiplier matters: a step costs level x multiplier for each enchantment it carries.
  const ENCH = {
    protection: ['Protection', 4, 1], fire_protection: ['Fire Protection', 4, 1],
    blast_protection: ['Blast Protection', 4, 2], projectile_protection: ['Projectile Protection', 4, 1],
    feather_falling: ['Feather Falling', 4, 1], respiration: ['Respiration', 3, 2], aqua_affinity: ['Aqua Affinity', 1, 2],
    thorns: ['Thorns', 3, 4], depth_strider: ['Depth Strider', 3, 2], frost_walker: ['Frost Walker', 2, 2],
    soul_speed: ['Soul Speed', 3, 4], swift_sneak: ['Swift Sneak', 3, 4],
    sharpness: ['Sharpness', 5, 1], smite: ['Smite', 5, 1], bane_of_arthropods: ['Bane of Arthropods', 5, 1],
    knockback: ['Knockback', 2, 1], fire_aspect: ['Fire Aspect', 2, 2], looting: ['Looting', 3, 2],
    sweeping_edge: ['Sweeping Edge', 3, 2], efficiency: ['Efficiency', 5, 1], silk_touch: ['Silk Touch', 1, 4],
    fortune: ['Fortune', 3, 2], power: ['Power', 5, 1], punch: ['Punch', 2, 2], flame: ['Flame', 1, 2],
    infinity: ['Infinity', 1, 4], luck_of_the_sea: ['Luck of the Sea', 3, 2], lure: ['Lure', 3, 2],
    multishot: ['Multishot', 1, 2], piercing: ['Piercing', 4, 1], quick_charge: ['Quick Charge', 3, 1],
    impaling: ['Impaling', 5, 2], riptide: ['Riptide', 3, 2], loyalty: ['Loyalty', 3, 1], channeling: ['Channeling', 1, 4],
    density: ['Density', 5, 1], breach: ['Breach', 4, 2], wind_burst: ['Wind Burst', 3, 2],
    unbreaking: ['Unbreaking', 3, 1], mending: ['Mending', 1, 2],
    binding_curse: ['Curse of Binding', 1, 4], vanishing_curse: ['Curse of Vanishing', 1, 4],
  };
  const armor = ['protection', 'fire_protection', 'blast_protection', 'projectile_protection', 'thorns'];
  const end = ['unbreaking', 'mending', 'vanishing_curse'];
  const tool = ['efficiency', 'silk_touch', 'fortune', ...end];
  const ITEMS = {
    helmet: ['Helmet', [...armor, 'respiration', 'aqua_affinity', ...end, 'binding_curse']],
    chestplate: ['Chestplate', [...armor, ...end, 'binding_curse']],
    leggings: ['Leggings', [...armor, 'swift_sneak', ...end, 'binding_curse']],
    boots: ['Boots', [...armor, 'feather_falling', 'depth_strider', 'frost_walker', 'soul_speed', ...end, 'binding_curse']],
    sword: ['Sword', ['sharpness', 'smite', 'bane_of_arthropods', 'knockback', 'fire_aspect', 'looting', 'sweeping_edge', ...end]],
    axe: ['Axe', ['sharpness', 'smite', 'bane_of_arthropods', ...tool]],
    pickaxe: ['Pickaxe', tool], shovel: ['Shovel', tool], hoe: ['Hoe', tool],
    bow: ['Bow', ['power', 'punch', 'flame', 'infinity', ...end]],
    crossbow: ['Crossbow', ['multishot', 'piercing', 'quick_charge', ...end]],
    trident: ['Trident', ['impaling', 'riptide', 'loyalty', 'channeling', ...end]],
    mace: ['Mace', ['density', 'breach', 'smite', 'bane_of_arthropods', 'wind_burst', 'fire_aspect', ...end]],
    fishing_rod: ['Fishing Rod', ['luck_of_the_sea', 'lure', ...end]],
    elytra: ['Elytra', [...end, 'binding_curse']],
  };
  // Enchantments that cannot sit on the same item.
  const EXCLUSIVE = [
    ['protection', 'fire_protection', 'blast_protection', 'projectile_protection'],
    ['sharpness', 'smite', 'bane_of_arthropods', 'density', 'breach'],
    ['silk_touch', 'fortune'], ['infinity', 'mending'], ['depth_strider', 'frost_walker'],
    ['riptide', 'loyalty'], ['riptide', 'channeling'], ['multishot', 'piercing'],
  ];
  const LIMIT = 39; // 40 or more is "Too Expensive!" in survival

  const penalty = n => 2 ** n - 1; // prior work penalty after n anvil uses

  // Level after an anvil merge: equal levels go up one (to the max), otherwise the higher stays.
  const merge = (a, b, id) => a === b ? Math.min(a + 1, ENCH[id][1]) : Math.max(a, b);

  // books: [{ id, level }]; has: { id: level } already on the item. Returns { total, work, steps:
  // [{ target, sacrifice, cost }] } where target/sacrifice are trees: 'item' | book index | [left, right].
  // Null if every order goes over the limit.
  // DP over subsets: each subset keeps its cheapest result for every prior work count.
  function plan(books, itemWork = 0, has = {}) {
    const n = books.length, ITEM = 1 << n, full = (ITEM << 1) - 1;
    // Enchantment cost of a book subset as the sacrifice, onto a book or onto the item. Each step
    // charges the resulting level, so a book that upgrades the item's enchantment costs more.
    const value = new Array(ITEM).fill(0), onItem = new Array(ITEM).fill(0);
    for (let m = 1; m < ITEM; m++) {
      const i = 31 - Math.clz32(m & -m), { id, level } = books[i], mult = ENCH[id][2], rest = m & (m - 1);
      value[m] = value[rest] + level * mult;
      onItem[m] = onItem[rest] + (id in has ? merge(has[id], level, id) : level) * mult;
    }
    const best = new Array(full + 1); // mask -> Map(work -> { cost, tree, steps })
    for (let i = 0; i < n; i++) best[1 << i] = new Map([[0, { cost: 0, tree: i, steps: [] }]]);
    best[ITEM] = new Map([[itemWork, { cost: 0, tree: 'item', steps: [] }]]);

    // Masks in order of size, so both halves are solved first.
    const masks = Array.from({ length: full }, (_, i) => i + 1).sort((a, b) => popcount(a) - popcount(b));
    for (const m of masks) {
      if (best[m]) continue;
      const out = new Map();
      // Each split: the sacrifice is a book subset; the target holds the item if this mask does.
      for (let s = (m - 1) & m; s; s = (s - 1) & m) {
        if (s & ITEM) continue;
        const t = m ^ s;
        for (const [wt, a] of best[t] ?? []) for (const [ws, b] of best[s] ?? []) {
          const cost = penalty(wt) + penalty(ws) + (t & ITEM ? onItem[s] : value[s]);
          if (cost > LIMIT) continue;
          const w = Math.max(wt, ws) + 1, total = a.cost + b.cost + cost, prev = out.get(w);
          if (!prev || total < prev.cost) out.set(w, { cost: total, tree: [a.tree, b.tree],
            steps: [...a.steps, ...b.steps, { target: a.tree, sacrifice: b.tree, cost }] });
        }
      }
      if (out.size) best[m] = out;
    }
    let win = null;
    for (const [w, r] of best[full] ?? []) if (!win || r.cost < win.cost || (r.cost === win.cost && w < win.work))
      win = { total: r.cost, work: w, steps: r.steps };
    return win;
  }
  const popcount = m => { let c = 0; for (; m; m &= m - 1) c++; return c; };

  const api = { ENCH, ITEMS, EXCLUSIVE, LIMIT, merge, plan };
  if (typeof module !== 'undefined') module.exports = api;
  else window.Anvil = api;
})();
