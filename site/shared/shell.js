// WASD shell: injects the icon rail and drawer into every page.
// A page opts in with <body data-tool="id"> and a script tag for this file.
(() => {
  // Site root derived from this script's URL, so links work under any Pages subpath.
  const root = new URL('..', document.currentScript.src).href;
  const tools = [
    { id: 'home', name: 'Home', color: '#2ee6c5', path: '', built: true },
    { id: 'snapshots', name: 'Snapshots', color: '#f5b041', path: 'snapshots/', group: 'Updates',
      desc: 'What changed in each snapshot, read straight from the jar.' },
    { id: 'gradient', name: 'Gradient', color: '#f472b6', path: 'gradient/', group: 'Color', built: true,
      desc: 'Smooth block gradients between any two colors.' },
    { id: 'mapart', name: 'Map art', color: '#a78bfa', path: 'mapart/', group: 'Color',
      desc: 'Turn an image into a map art block layout.' },
    { id: 'palette', name: 'Palette', color: '#60a5fa', path: 'palette/', group: 'Color',
      desc: 'Build block palettes that sit well together.' },
    { id: 'seeds', name: 'Seed tools', color: '#4ade80', path: 'seeds/', group: 'World',
      desc: 'Slime chunks and structures from a world seed.' },
    { id: 'building', name: 'Building', color: '#fb923c', path: 'building/', group: 'Build',
      desc: 'Circles, spheres and domes, block by block.' },
    { id: 'utilities', name: 'Utilities', color: '#94a3b8', path: 'utilities/', group: 'Build',
      desc: 'Nether coordinates and other small helpers.' },
  ];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Small spark burst at (x, y). Colors cycle through `colors`.
  const burst = (x, y, colors, count = 10) => {
    if (reduced) return;
    const fx = document.createElement('div');
    fx.className = 'fx';
    fx.style.cssText = `left:${x}px;top:${y}px;--k:${colors[0]}`;
    fx.innerHTML = Array.from({ length: count }, (_, i) =>
      `<i class="fx-spark" style="--a:${i * 360 / count + Math.random() * 24}deg;--d:${22 + Math.random() * 26}px;--k:${colors[i % colors.length]}"></i>`).join('');
    document.body.append(fx);
    setTimeout(() => fx.remove(), 700);
  };
  window.WASD = { root, tools, burst };

  const active = document.body.dataset.tool;
  const logo = '<span class="logo" role="img" aria-label="WASD"><b>W</b><b>A</b><b>S</b><b>D</b></span>';

  // Built tools are links; unbuilt ones are inert spans.
  const item = (t, cls, inner, label) => t.built
    ? `<a class="${cls}" href="${root}${t.path}" data-id="${t.id}" style="--c:${t.color}"${label}${t.id === active ? ' aria-current="page"' : ''}>${inner}</a>`
    : `<span class="${cls} soon" style="--c:${t.color}"${label && ` title="${t.name} (soon)"`}>${inner}</span>`;

  let group;
  document.body.insertAdjacentHTML('afterbegin', `
    <nav class="rail" aria-label="Tools">
      <button class="btn rail-menu" aria-label="Open menu" aria-expanded="false" aria-controls="drawer">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M2 4h14M2 9h14M2 14h14"/></svg>
      </button>
      <div class="rail-list"><i class="hl"></i>${tools.map(t => item(t, 'dot', '', ` title="${t.name}" aria-label="${t.name}"`)).join('')}</div>
    </nav>
    <div class="scrim"></div>
    <aside class="drawer" id="drawer" aria-label="Menu" inert>
      <header><a href="${root}">${logo}</a><button class="btn drawer-close" aria-label="Close menu">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13"/></svg>
      </button></header>
      <div class="drawer-list"><i class="hl"></i>${tools.map(t =>
        (t.group && t.group !== group ? `<h2>${group = t.group}</h2>` : '') +
        item(t, 'entry', t.name + (t.built ? '' : '<small class="tag">soon</small>'), '')).join('')}</div>
    </aside>`);

  const $ = s => document.querySelector(s);
  const menu = $('.rail-menu'), drawer = $('.drawer'), lists = [$('.rail-list'), $('.drawer-list')];

  // Slide both highlights to a tool.
  const place = id => lists.forEach(list => {
    const el = list.querySelector(`[data-id="${id}"]`), hl = list.querySelector('.hl');
    hl.style.opacity = el ? 1 : 0;
    if (!el) return;
    hl.style.transform = `translateY(${el.offsetTop}px)`;
    hl.style.setProperty('--c', el.style.getPropertyValue('--c'));
  });
  place(active);
  // Back button can restore a page whose highlight had already moved on.
  addEventListener('pageshow', () => place(active));

  const setOpen = open => {
    if (open === !drawer.inert) return;
    document.body.classList.toggle('drawer-open', open);
    drawer.inert = !open;
    menu.setAttribute('aria-expanded', open);
    (open ? $('.drawer-close') : menu).focus();
  };
  menu.onclick = () => setOpen(true);
  $('.drawer-close').onclick = $('.scrim').onclick = () => setOpen(false);
  // Escape closes the drawer: modal accessibility, not a shortcut.
  addEventListener('keydown', e => e.key === 'Escape' && setOpen(false));

  // Picking a tool: highlight slides first, then the drawer closes and we navigate.
  document.addEventListener('click', e => {
    const a = e.target.closest('a[data-id]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    place(a.dataset.id);
    setTimeout(() => {
      setOpen(false);
      if (a.dataset.id !== active) location.href = a.href;
    }, reduced ? 0 : 300);
  });
})();
