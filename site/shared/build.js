// Build commands: turn a grid of blocks (gradient, palette, mosaic) into command block commands.
// Plain script for the browser (window.Build) and Node (module.exports) for tests.
(() => {
  // Blocks whose texture faces depend on a facing or axis state.
  const FACING = /^(barrel|piston|sticky_piston|observer|dispenser|dropper|(chain_|repeating_)?command_block)$/;
  const AXIS = /(_log|_stem|_wood|_hyphae|basalt|bone_block|hay_block|_pillar|bamboo_block|froglight|muddy_mangrove_roots|creaking_heart)$|^deepslate$/;

  // The block with the state that turns the face this tool picked toward the viewer:
  // up for floors (view 't'), south for walls (view 's').
  // shortcut: crafter and jigsaw use an orientation state and are placed in their default one.
  const block = (b, view) => {
    const t = view === 't', tex = b.tex.split('/').pop(), props = [];
    if (FACING.test(b.id)) {
      let facing;
      if (tex === 'observer_top') facing = t ? 'north' : 'up';
      else if (tex === 'observer_side') facing = 'east';
      else {
        const kind = /_(front|front_vertical)$|^barrel_top$|^piston_top/.test(tex) ? 'front' : /_(bottom|back)$/.test(tex) ? 'back' : 'side';
        facing = { front: t ? 'up' : 'south', back: t ? 'down' : 'north', side: t ? 'north' : 'up' }[kind];
      }
      props.push(`facing=${facing}`);
    } else if (AXIS.test(b.id) && b.face) {
      props.push(`axis=${b.face === 'end' ? (t ? 'y' : 'z') : (t ? 'x' : 'y')}`);
    }
    if (b.id === 'creaking_heart') props.push(`creaking_heart_state=${/awake/.test(tex) ? 'awake' : /dormant/.test(tex) ? 'dormant' : 'uprooted'}`);
    return props.length ? `${b.id}[${props.join(',')}]` : b.id;
  };

  const MAX_FILL = 32768; // /fill refuses bigger volumes

  // grid: w*h block strings (or null for empty), row 0 at the top. Greedy rectangles of one block:
  // run right as far as it goes, then grow down while the next row matches. Returns [{ c, r, w, h, block }].
  const rects = (grid, w, h) => {
    const used = new Uint8Array(w * h), out = [];
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
      const i = r * w + c, b = grid[i];
      if (b == null || used[i]) continue;
      let rw = 1;
      while (c + rw < w && !used[i + rw] && grid[i + rw] === b) rw++;
      let rh = 1;
      const rowFits = rr => { for (let k = 0; k < rw; k++) { const j = rr * w + c + k; if (used[j] || grid[j] !== b) return false; } return true; };
      while (r + rh < h && rw * (rh + 1) <= MAX_FILL && rowFits(r + rh)) rh++;
      for (let rr = r; rr < r + rh; rr++) used.fill(1, rr * w + c, rr * w + c + rw);
      out.push({ c, r, w: rw, h: rh, block: b });
    }
    return out;
  };

  // Where things go, relative to the command block: the build starts 2 blocks south of it and runs east.
  // A wall stands up from the command block's level; a floor lies at that level and spreads south.
  // Commands run from minecarts on the rail 1 block above the command block, hence the -1 on Y.
  const at = n => n ? `~${n}` : '~';
  const commands = (grid, w, h, view) => rects(grid, w, h).map(({ c, r, w: rw, h: rh, block: b }) => {
    const [x1, x2] = [c, c + rw - 1];
    const [y1, y2] = view === 't' ? [0, 0] : [h - r - rh, h - 1 - r];
    const [z1, z2] = view === 't' ? [2 + r, 2 + r + rh - 1] : [2, 2];
    const a = `${at(x1)} ${at(y1 - 1)} ${at(z1)}`;
    return rw * rh === 1 ? `setblock ${a} ${b}` : `fill ${a} ${at(x2)} ${at(y2 - 1)} ${at(z2)} ${b}`;
  });

  // One command for an impulse command block with an activator rail on top, powered by a lever on its side
  // (the lever powers the block, and the block powers the rail). The command summons a stack of command block
  // minecarts riding a short-lived area effect cloud; when the cloud vanishes they drop onto the rail, each runs
  // its command once, and the last one removes them all. No falling blocks: their block field changed between
  // versions and a wrong one silently drops sand. If Duration were ignored the cloud just lasts its default 30s.
  const LIMIT = 32500; // longest command a command block accepts
  const HEAD = 'summon area_effect_cloud ~ ~1 ~ {Duration:1,Radius:0f,Passengers:[';
  const TAIL = '{id:"command_block_minecart",Command:"kill @e[type=command_block_minecart,distance=..2]"}]}';
  const cart = c => `{id:"command_block_minecart",Command:"${c}"},`;
  const pack = cmds => {
    const parts = [];
    let cur = '';
    for (const c of cmds) {
      if (/["\\]/.test(c)) throw new Error(`cannot nest: ${c}`);
      const next = cart(c);
      if (cur && HEAD.length + cur.length + next.length + TAIL.length > LIMIT) { parts.push(HEAD + cur + TAIL); cur = ''; }
      cur += next;
    }
    if (cur) parts.push(HEAD + cur + TAIL);
    return parts;
  };

  // Browser only: fill a panel with one copy button per part. getGrid() returns { grid, w, h, view } or null.
  const panel = (el, getGrid) => {
    const g = getGrid();
    if (!g) { el.innerHTML = ''; return; }
    const cmds = commands(g.grid, g.w, g.h, g.view), parts = pack(cmds);
    const where = g.view === 't' ? 'as a floor at its level, 2 blocks south of it, spreading east and south'
      : 'as a wall standing on its level, 2 blocks south of it, running east (read it from the south)';
    el.innerHTML = `<p class="build-help">Get a command block with <code>/give @p command_block</code> (cheats on) and place it. Put an <b>activator rail</b> on top and a <b>lever</b> on its side. Paste the command, leave it on Impulse and Needs Redstone, and flip the lever on. The build appears ${where}.${parts.length > 1 ? ' Big builds come in parts: flip the lever off, paste the next part, and flip it on again.' : ''}</p>
      <div class="build-parts">${parts.map((_, i) => `<button class="btn copy" data-i="${i}">${parts.length > 1 ? `Copy part ${i + 1} of ${parts.length}` : 'Copy command'}</button>`).join('')}</div>
      <p class="meta">${cmds.length} fill commands · ${parts.reduce((s, p) => s + p.length, 0).toLocaleString('en')} characters</p>`;
    el.querySelectorAll('.copy').forEach(b => { WASD.dress(b); b.onclick = () => WASD.copy(b, parts[b.dataset.i]); });
  };

  const api = { block, rects, commands, pack, panel, LIMIT };
  if (typeof module !== 'undefined') module.exports = api;
  else window.Build = api;
})();
