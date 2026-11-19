// Substitute picker: a popover of the blocks closest in color to the one clicked.
// Swap.open(anchor, block, pool, textures, { onPick(block), actions: [{ label, run }] }). Needs blocks.js.
// Swap.search(box, blocks, textures, onPick(block or null when cleared)): call on each input in a block name box.
(() => {
  const SHOW = 8;
  let open = null;

  const close = () => {
    if (!open) return;
    const { el, anchor } = open;
    open = null;
    el.classList.add('out');
    setTimeout(() => el.remove(), 150);
    anchor.focus({ preventScroll: true });
  };

  // Closest by OKLab distance; other faces of the same block count as options.
  const nearest = (block, pool) => pool.filter(b => b !== block)
    .map(b => [b, (b.lab[0] - block.lab[0]) ** 2 + (b.lab[1] - block.lab[1]) ** 2 + (b.lab[2] - block.lab[2]) ** 2])
    .sort((p, q) => p[1] - q[1]).slice(0, SHOW).map(p => p[0]);

  function show(anchor, block, pool, textures, { onPick, actions = [], list = nearest(block, pool), title, focus = true }) {
    const again = open?.anchor === anchor && !block; // typing in a search: keep the popover, refill the list
    if (!again) close();
    const face = b => b.face ? ` · ${b.face}` : '';
    const tile = b => Blocks.tile(b, textures, 'i');
    const el = again ? open.el : document.createElement('div');
    el.className = 'swap-pop';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', block ? `Substitutes for ${block.name}` : title);
    el.innerHTML = `<header>${block ? `${tile(block)}<span><b>${block.name}</b><small>${block.face ? block.face + ' · ' : ''}pick a substitute</small></span>` : `<span><small>${title}</small></span>`}</header>
      <div class="swap-list">${list.map((b, i) => `<button type="button" data-i="${i}" style="--i:${i}">${tile(b)}<span><b>${b.name}</b><small>${b.id}${face(b)}</small></span></button>`).join('')
        || `<p class="empty">${block ? 'No other blocks match the filters.' : 'No blocks by that name.'}</p>`}</div>
      ${actions.length ? `<footer>${actions.map((a, i) => `<button type="button" class="btn" data-a="${i}">${a.label}</button>`).join('')}</footer>` : ''}`;
    if (again) { open.list = list; open.onPick = onPick; return; }
    document.body.append(el);

    // Under the anchor, kept inside the viewport; above it when there is no room below.
    // clientWidth leaves out the scrollbar, so the popover never causes a sideways scroll.
    const r = anchor.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight, vw = document.documentElement.clientWidth;
    const left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), vw - w - 8);
    const top = r.bottom + 8 + h > innerHeight && r.top - 8 - h > 0 ? r.top - 8 - h : r.bottom + 8;
    el.style.left = `${left + scrollX}px`;
    el.style.top = `${top + scrollY}px`;
    el.style.transformOrigin = `${r.left + r.width / 2 - left}px ${top < r.top ? '100%' : '0'}`;

    el.onclick = e => {
      const pick = e.target.closest('[data-i]'), act = e.target.closest('[data-a]');
      if (pick) { const o = open; close(); o.onPick(o.list[pick.dataset.i]); }
      if (act) actions[act.dataset.a].run(act);
    };
    open = { el, anchor, list, onPick };
    if (focus) el.querySelector('button')?.focus({ preventScroll: true });
  }

  // Click outside or Escape closes it (Escape is modal accessibility, not a shortcut).
  document.addEventListener('pointerdown', e => open && !open.el.contains(e.target) && !open.anchor.contains(e.target) && close());
  addEventListener('keydown', e => e.key === 'Escape' && close());
  addEventListener('resize', () => open?.anchor !== document.activeElement && close()); // a phone keyboard opening resizes too

  // Typing a block name pops up matching blocks with their colors; Enter takes the top one, Down moves into the list.
  const search = (box, blocks, textures, onPick) => {
    const q = box.value.trim().toLowerCase();
    if (!q) { close(); onPick(null); return; }
    const seen = new Set(), list = blocks.filter(b => b.name.toLowerCase().includes(q) && !seen.has(b.name) && seen.add(b.name))
      .sort((a, b) => b.name.toLowerCase().startsWith(q) - a.name.toLowerCase().startsWith(q)).slice(0, SHOW);
    show(box, null, null, textures, { list, title: list.length ? 'pick a block' : '', focus: false, onPick: b => { box.value = b.name; onPick(b); } });
    box.onkeydown = e => {
      const first = open?.anchor === box && open.el.querySelector('.swap-list button');
      if (!first) return;
      if (e.key === 'Enter') { e.preventDefault(); first.click(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); first.focus(); }
    };
  };

  window.Swap = { open: show, close, search };
})();
