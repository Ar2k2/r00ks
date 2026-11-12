// Command builder: /give with item components, /summon, /fill and /setblock (Java 26.x syntax).
// Plain script for the browser (window.Commands) and Node (module.exports) for tests.
(() => {
  // SNBT string: quoted, with quotes and backslashes escaped.
  const str = s => `"${String(s).replace(/[\\"]/g, c => '\\' + c)}"`;
  // Text component. Item names and lore are italic by default, so plain text turns that off.
  const text = (s, { color, bold, italic } = {}, item = false) => {
    const f = [`text:${str(s)}`];
    if (color) f.push(`color:${str(color)}`);
    if (bold) f.push('bold:true');
    if (italic) f.push('italic:true'); else if (item) f.push('italic:false');
    return `{${f.join(',')}}`;
  };
  const id = s => String(s).trim().toLowerCase().replace(/^minecraft:/, '');
  const ID = /^[a-z0-9_.\-/]+$/;
  const COORD = /^([~^]-?\d*\.?\d*|-?\d+(\.\d+)?)$/;
  const pos = p => p.map(v => String(v).trim() || '~');

  // { item, count, target, name, style: {color, bold, italic}, lore: [], ench: {id: level}, unbreakable, glint }
  const give = o => {
    const c = [];
    if (o.name) c.push(`custom_name=${text(o.name, o.style, true)}`);
    const lore = (o.lore ?? []).filter(l => l.trim());
    if (lore.length) c.push(`lore=[${lore.map(l => text(l, { color: 'gray' }, true)).join(',')}]`);
    const ench = Object.entries(o.ench ?? {}).filter(([, l]) => l > 0);
    if (ench.length) c.push(`enchantments={${ench.map(([e, l]) => `${id(e)}:${l}`).join(',')}}`);
    if (o.unbreakable) c.push('unbreakable={}');
    if (o.glint) c.push('enchantment_glint_override=true');
    const count = Math.max(1, Math.floor(o.count) || 1);
    return `/give ${o.target || '@p'} ${id(o.item) || 'stone'}${c.length ? `[${c.join(',')}]` : ''}${count > 1 ? ' ' + count : ''}`;
  };

  // { entity, pos: [x, y, z], name, flags: {NoAI, ...}, effects: [{id, amplifier, seconds}], mainhand, head }
  const FLAGS = ['CustomNameVisible', 'NoAI', 'Invulnerable', 'Silent', 'PersistenceRequired', 'Glowing', 'NoGravity'];
  const summon = o => {
    const t = [];
    if (o.name) t.push(`CustomName:${text(o.name)}`);
    for (const f of FLAGS) if (o.flags?.[f]) t.push(`${f}:1b`);
    const fx = (o.effects ?? []).filter(e => e.id);
    if (fx.length) t.push(`active_effects:[${fx.map(e =>
      `{id:${str(id(e.id))},amplifier:${Math.max(0, (e.level | 0) - 1)}b,duration:${e.seconds > 0 ? Math.round(e.seconds * 20) : -1}}`).join(',')}]`);
    const eq = [['mainhand', o.mainhand], ['head', o.head]].filter(([, v]) => v && v.trim());
    if (eq.length) t.push(`equipment:{${eq.map(([k, v]) => `${k}:{id:${str(id(v))},count:1}`).join(',')}}`);
    return `/summon ${id(o.entity) || 'pig'} ${pos(o.pos ?? []).join(' ')}${t.length ? ` {${t.join(',')}}` : ''}`;
  };

  // { from: [x,y,z], to: [x,y,z], block, mode: replace|destroy|keep|hollow|outline, filter }
  const fill = o => {
    const tail = o.mode === 'replace' && o.filter ? ` replace ${o.filter.trim()}` : o.mode && o.mode !== 'replace' ? ` ${o.mode}` : '';
    return `/fill ${pos(o.from).join(' ')} ${pos(o.to).join(' ')} ${o.block.trim() || 'stone'}${tail}`;
  };
  const setblock = o => `/setblock ${pos(o.pos).join(' ')} ${o.block.trim() || 'stone'}${o.mode && o.mode !== 'replace' ? ' ' + o.mode : ''}`;

  // Blocks a /fill covers, when all six coordinates are plain numbers or all relative to the same point.
  const volume = (a, b) => {
    const n = v => { const m = /^~?(-?\d+)?$/.exec(String(v).trim()); return m ? +(m[1] ?? 0) : NaN; };
    const sameKind = [...a, ...b].every(v => String(v).trim().startsWith('~')) || [...a, ...b].every(v => /^-?\d+$/.test(String(v).trim()));
    if (!sameKind) return null;
    const v = [0, 1, 2].reduce((p, i) => p * (Math.abs(n(a[i]) - n(b[i])) + 1), 1);
    return Number.isFinite(v) ? v : null;
  };

  const api = { give, summon, fill, setblock, volume, str, ID, COORD };
  if (typeof module !== 'undefined') module.exports = api;
  else window.Commands = api;
})();
