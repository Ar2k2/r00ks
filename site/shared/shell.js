// R00K’s shell: injects the icon rail and drawer into every page.
// A page opts in with <body data-tool="id"> and a script tag for this file.
(() => {
  // Site root derived from this script's URL, so links work under any Pages subpath.
  const root = new URL('..', document.currentScript.src).href;
  // Cloudflare Web Analytics: cookie-free page views. Live host only, so local testing isn't counted.
  if (location.hostname === 'rooks.rookstudio.net') {
    const s = document.createElement('script');
    s.defer = true;
    s.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    s.dataset.cfBeacon = '{"token": "f556d096d873493d8433eb3fe3550f68"}';
    document.head.append(s);
  }
  // The rail shows categories; the drawer, home and hub pages list every tool.
  // A category's path is its hub page (or its only tool).
  const cats = [
    { id: 'color', name: 'Color & art', path: 'color/' },
    { id: 'world', name: 'World', path: 'world/' },
    { id: 'build', name: 'Build', path: 'build/' },
    { id: 'mechanics', name: 'Mechanics', path: 'mechanics/' },
  ];
  const tools = [
    { id: 'gradient', name: 'Gradient', path: 'gradient/', cat: 'color', built: true,
      desc: 'Smooth block gradients between any two colors.' },
    { id: 'palette', name: 'Palette', path: 'palette/', cat: 'color', built: true,
      desc: 'Build block palettes that sit well together.' },
    { id: 'mosaic', name: 'Image mosaic', path: 'mosaic/', cat: 'color', built: true,
      desc: 'Turn a picture into a wall or floor of blocks.' },
    { id: 'mapart', name: 'Map art', path: 'mapart/', cat: 'color',
      desc: 'Turn an image into a map art block layout.' },
    { id: 'nether', name: 'Nether coordinates', path: 'nether/', cat: 'world', built: true,
      desc: 'Overworld and Nether coordinates for linking portals.' },
    { id: 'stronghold', name: 'Stronghold finder', path: 'stronghold/', cat: 'world', built: true,
      desc: 'Find the stronghold from two Eye of Ender throws.' },
    { id: 'slime', name: 'Slime chunks', path: 'slime/', cat: 'world',
      desc: 'Slime chunks around you from a world seed.' },
    { id: 'structures', name: 'Structure finder', path: 'structures/', cat: 'world',
      desc: 'Villages, monuments and more from a seed.' },
    { id: 'shapes', name: 'Circles & spheres', path: 'shapes/', cat: 'build', built: true,
      desc: 'Circles, spheres and domes, block by block.' },
    { id: 'anvil', name: 'Anvil optimizer', path: 'anvil/', cat: 'mechanics', built: true,
      desc: 'The cheapest order to combine enchanted books.' },
    { id: 'commands', name: 'Command builder', path: 'commands/', cat: 'mechanics', built: true,
      desc: 'Build give, summon and component commands.' },
  ];
  for (const c of cats) c.built = tools.some(t => t.cat === c.id && t.built);
  // Original line icons on a 24px grid, keyed by tool or category id.
  const icons = {
    home: '<path d="M4 11l8-7 8 7"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/>',
    gradient: '<rect x="3" y="8" width="5" height="8" rx="1" fill="currentColor"/><rect x="9.5" y="8" width="5" height="8" rx="1" fill="currentColor" fill-opacity=".45"/><rect x="16" y="8" width="5" height="8" rx="1"/>',
    mapart: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>',
    palette: '<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>',
    mosaic: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9.3h16M4 14.7h16M9.3 4v16M14.7 4v16"/><path d="M4 4h5.3v5.3H4zM9.3 9.3h5.4v5.4H9.3zM14.7 14.7H20V20h-5.3z" fill="currentColor" stroke="none" fill-opacity=".45"/>',
    nether: '<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M8.5 8c1.5-1 3.5 1 5 0s2 0 2 0M8.5 12c1.5-1 3.5 1 5 0s2 0 2 0M8.5 16c1.5-1 3.5 1 5 0s2 0 2 0"/>',
    stronghold: '<path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.6"/>',
    slime: '<rect x="4" y="5" width="16" height="14" rx="4"/><path d="M9.5 10v2M14.5 10v2M10 15.5h4"/>',
    structures: '<path d="M3 9l9-5 9 5"/><path d="M5.5 9v9M10 9v9M14 9v9M18.5 9v9M3 20h18"/>',
    shapes: '<circle cx="12" cy="12" r="8"/><ellipse cx="12" cy="12" rx="8" ry="3"/>',
    anvil: '<path d="M3 6.5h14.5a3 3 0 0 0 3.5 3h-6l-1.5 4.5H16v3.5H8V14h2.5L9 10.5C5.5 10.5 3 9 3 6.5z"/>',
    commands: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 10l3 2-3 2M12.5 15h4.5"/>',
    color: '<path d="M12 3.5c3.5 4 6 7 6 10.5a6 6 0 0 1-12 0c0-3.5 2.5-6.5 6-10.5z"/><path d="M9 14.5a3 3 0 0 0 3 3"/>',
    world: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3.2 3.2 3.2 14.8 0 18M12 3c-3.2 3.2-3.2 14.8 0 18"/>',
    build: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
    mechanics: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="6.5"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  };
  const icon = id => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${icons[id]}</svg>`;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Copy buttons: <button class="btn copy">Label</button>. The icon morphs into a checkmark.
  const copyIcons = '<svg class="ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="5" y="5" width="9" height="9" rx="2"/><path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5"/></svg>'
    + '<svg class="ok" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5"/></svg>';
  const dress = b => {
    b.dataset.label = b.textContent.trim();
    b.innerHTML = `${copyIcons}<span>${b.dataset.label}</span>`;
  };
  document.querySelectorAll('.copy').forEach(dress);
  const copy = async (btn, text) => {
    const label = btn.querySelector('span');
    clearTimeout(btn.t);
    btn.t = setTimeout(() => { btn.classList.remove('done'); label.textContent = btn.dataset.label; }, 1600);
    try { await navigator.clipboard.writeText(text); } catch { label.textContent = 'Copy failed'; return; }
    btn.classList.add('done'); label.textContent = 'Copied';
  };
  window.WASD = { root, cats, tools, copy, dress, icon };

  const active = document.body.dataset.tool;
  // The rail highlights the category of the current tool (or the hub itself).
  const railId = id => tools.find(t => t.id === id)?.cat ?? id;
  // Crane rook logo: a rook (text color) with a crane on top (accent) lifting a block.
  const logo = `<svg class="logo" viewBox="0 0 260 230" role="img" aria-label="R00K’s">
    <g fill="currentColor"><path d="M30 40H58V58H70V40H100V58H112V40H140V86H30Z"/><path d="M44 92H126L132 192H38Z"/><rect x="24" y="198" width="122" height="22"/></g>
    <g class="crane" fill="none" stroke="var(--accent)" stroke-linecap="square">
      <path d="M126 40V12" stroke-width="6"/><path d="M104 12H246M126 30H246" stroke-width="5"/>
      <path d="M126 30L140 12L154 30L168 12L182 30L196 12L210 30L224 12L238 30L246 12" stroke-width="3.5"/>
    </g>
    <rect x="100" y="6" width="14" height="16" fill="var(--accent)"/>
    <g class="trolley"><path class="cable" d="M228 30V124" stroke="var(--accent)" stroke-width="3"/>
      <g class="hook"><rect x="220" y="122" width="16" height="7" fill="var(--accent)"/>
      <rect x="210" y="132" width="36" height="36" fill="var(--accent)"/><rect x="218" y="140" width="20" height="20" fill="none" stroke="var(--bg)" stroke-width="3"/></g></g>
  </svg>`;
  document.querySelectorAll('[data-logo]').forEach(e => { e.outerHTML = logo; });

  // Built tools are links; unbuilt ones are inert spans.
  const item = (t, cls, inner, label, cur) => t.built
    ? `<a class="${cls}" href="${root}${t.path}" data-id="${t.id}"${label}${t.id === cur ? ' aria-current="page"' : ''}>${icon(t.id)}${inner}</a>`
    : `<span class="${cls} soon"${label && ` title="${t.name} (soon)"`}>${icon(t.id)}${inner}</span>`;

  document.body.insertAdjacentHTML('afterbegin', `
    <nav class="rail" aria-label="Tools">
      <button class="btn rail-menu" aria-label="Open menu" aria-expanded="false" aria-controls="drawer">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M2 4h14M2 9h14M2 14h14"/></svg>
      </button>
      <div class="rail-list"><i class="hl"></i>${[{ id: 'home', name: 'Home', path: '', built: true }, ...cats].map(t =>
        item(t, 'dot', '', ` title="${t.name}" aria-label="${t.name}"`, railId(active))).join('')}</div>
    </nav>
    <div class="scrim"></div>
    <aside class="drawer" id="drawer" aria-label="Menu" inert>
      <header><a href="${root}">${logo}<span class="wordmark"><b>R00K</b>’s</span></a><button class="btn drawer-close" aria-label="Close menu">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13"/></svg>
      </button></header>
      <div class="drawer-list"><i class="hl"></i>${cats.map(c => `<h2>${c.name}</h2>` + tools.filter(t => t.cat === c.id).map(t =>
        item(t, 'entry', t.name + (t.built ? '' : '<small class="tag">soon</small>'), '', active)).join('')).join('')}</div>
    </aside>`);

  const $ = s => document.querySelector(s);
  const menu = $('.rail-menu'), drawer = $('.drawer'), lists = [$('.rail-list'), $('.drawer-list')];

  // Slide both highlights to a tool (the rail one to its category); the icons follow.
  const place = id => lists.forEach((list, i) => {
    const key = i ? id : railId(id), el = list.querySelector(`[data-id="${key}"]`), hl = list.querySelector('.hl');
    list.querySelectorAll('[data-id]').forEach(a =>
      a === el ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
    hl.style.opacity = el ? 1 : 0;
    if (el) hl.style.transform = `translateY(${el.offsetTop}px)`;
  });
  place(active);
  // Back button can restore a page whose highlight had already moved on.
  addEventListener('pageshow', () => place(active));

  // Tool lists (home and hub pages): <nav class="panel tools" data-cat="id">. One hover
  // highlight springs from row to row. Home asks for every category with <div data-all-tools>.
  document.querySelector('[data-all-tools]')?.insertAdjacentHTML('beforeend', cats.map((c, i) =>
    `<h2 class="tools-h in" style="--i:${i + 2}">${c.name}</h2><nav class="panel tools in" style="--i:${i + 2}" data-cat="${c.id}" aria-label="${c.name}"></nav>`).join(''));
  document.querySelectorAll('.tools[data-cat]').forEach(list => {
    list.innerHTML = '<i class="hl"></i>' + tools.filter(t => t.cat === list.dataset.cat).map(t => t.built
      ? `<a class="trow" href="${root}${t.path}">${icon(t.id)}<b>${t.name}</b><span>${t.desc}</span><small>Open →</small></a>`
      : `<div class="trow soon">${icon(t.id)}<b>${t.name}</b><span>${t.desc}</span><small>soon</small></div>`).join('');
    const hl = list.firstChild;
    list.querySelectorAll('.trow').forEach(r => r.onmouseenter = () => hl.style.transform = `translateY(${r.offsetTop}px)`);
  });

  // Tool pages: the tool's icon leads the page title.
  document.querySelector('.head h1')?.insertAdjacentHTML('afterbegin', icon(active));
  // Breadcrumb above the title: the way back home (and to the hub) without the rail.
  const cat = cats.find(c => c.id === railId(active));
  if (active !== 'home') document.querySelector('.head')?.insertAdjacentHTML('afterbegin',
    `<nav class="crumbs" aria-label="Breadcrumb"><a class="btn" href="${root}">${icon('home')}Home</a>${cat && cat.id !== active ? `<a class="btn" href="${root}${cat.path}"><span class="arr">←</span>${cat.name}</a>` : ''}</nav>`);

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
