// Substitute picker: a popover of the blocks closest in color to the one clicked.
// Swap.open(anchor, block, pool, textures, { onPick(block), actions: [{ label, run }] })
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

  function show(anchor, block, pool, textures, { onPick, actions = [] }) {
    close();
    const list = nearest(block, pool), face = b => b.face ? ` · ${b.face}` : '';
    const tile = b => { const t = textures.get(b.tex); return `<i class="tile${t ? ' tex' : ''}" style="--hex:${b.hex}${t ? `;--tex:url(${t})` : ''}"></i>`; };
    const el = document.createElement('div');
    el.className = 'swap-pop';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', `Substitutes for ${block.name}`);
    el.innerHTML = `<header>${tile(block)}<span><b>${block.name}</b><small>${block.face ? block.face + ' · ' : ''}pick a substitute</small></span></header>
      <div class="swap-list">${list.map((b, i) => `<button type="button" data-i="${i}" style="--i:${i}">${tile(b)}<span><b>${b.name}</b><small>${b.id}${face(b)}</small></span></button>`).join('')
        || '<p class="empty">No other blocks match the filters.</p>'}</div>
      ${actions.length ? `<footer>${actions.map((a, i) => `<button type="button" class="btn" data-a="${i}">${a.label}</button>`).join('')}</footer>` : ''}`;
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
      if (pick) { close(); onPick(list[pick.dataset.i]); }
      if (act) actions[act.dataset.a].run(act);
    };
    open = { el, anchor };
    el.querySelector('button')?.focus({ preventScroll: true });
  }

  // Click outside or Escape closes it (Escape is modal accessibility, not a shortcut).
  document.addEventListener('pointerdown', e => open && !open.el.contains(e.target) && !open.anchor.contains(e.target) && close());
  addEventListener('keydown', e => e.key === 'Escape' && close());
  addEventListener('resize', close);

  window.Swap = { open: show, close };
})();
