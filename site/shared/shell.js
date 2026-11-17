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
    { id: 'mapart', name: 'Map art', path: 'mapart/', cat: 'color', built: true, flag: 'mapart',
      desc: 'Turn an image into a map art block layout.' },
    { id: 'banner', name: 'Banner designer', path: 'banner/', cat: 'color', built: true,
      desc: 'Banners layer by layer, with loom steps and commands.' },
    { id: 'fireworks', name: 'Firework designer', path: 'fireworks/', cat: 'color', built: true,
      desc: 'Firework stars and rockets, with crafting steps.' },
    { id: 'nether', name: 'Nether coordinates', path: 'nether/', cat: 'world', built: true,
      desc: 'Overworld and Nether coordinates for linking portals.' },
    { id: 'stronghold', name: 'Stronghold finder', path: 'stronghold/', cat: 'world', built: true,
      desc: 'Find the stronghold from two Eye of Ender throws.' },
    { id: 'slime', name: 'Slime chunks', path: 'slime/', cat: 'world', built: true,
      desc: 'Slime chunks around you from a world seed.' },
    { id: 'shapes', name: 'Circles & spheres', path: 'shapes/', cat: 'build', built: true,
      desc: 'Circles, spheres and domes, block by block.' },
    { id: 'anvil', name: 'Anvil optimizer', path: 'anvil/', cat: 'mechanics', built: true,
      desc: 'The cheapest order to combine enchanted books.' },
    { id: 'commands', name: 'Command builder', path: 'commands/', cat: 'mechanics', built: true,
      desc: 'Build give, summon and component commands.' },
  ];
  // Feature flags: a tool with flag: 'x' shows as "soon" until this browser opts in with ?flags=x
  // (comma-separated, saved; ?flags= clears). Its page still works by URL for testing.
  let flags = '';
  try {
    const q = new URLSearchParams(location.search).get('flags');
    if (q !== null) localStorage.setItem('rooks-flags', q);
    flags = localStorage.getItem('rooks-flags') ?? '';
  } catch {}
  const on = new Set(flags.split(',').filter(Boolean));
  for (const t of tools) if (t.flag && !on.has(t.flag)) t.built = false;
  for (const c of cats) c.built = tools.some(t => t.cat === c.id && t.built);
  // Original line icons on a 24px grid, keyed by tool or category id.
  const icons = {
    home: '<path d="M4 11l8-7 8 7"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/>',
    gradient: '<rect x="3" y="8" width="5" height="8" rx="1" fill="currentColor"/><rect x="9.5" y="8" width="5" height="8" rx="1" fill="currentColor" fill-opacity=".45"/><rect x="16" y="8" width="5" height="8" rx="1"/>',
    mapart: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>',
    palette: '<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>',
    mosaic: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9.3h16M4 14.7h16M9.3 4v16M14.7 4v16"/><path d="M4 4h5.3v5.3H4zM9.3 9.3h5.4v5.4H9.3zM14.7 14.7H20V20h-5.3z" fill="currentColor" stroke="none" fill-opacity=".45"/>',
    banner: '<path d="M4 4h16"/><path d="M6.5 4v16l5.5-3.5 5.5 3.5V4"/><path d="M6.5 9.5h11"/>',
    fireworks: '<path d="M12 21v-6"/><circle cx="12" cy="9" r="1.3" fill="currentColor"/><path d="M12 3v2.5M12 12.5V14M6 9h2.5M15.5 9H18M7.8 4.8l1.7 1.7M14.5 11.5l1.7 1.7M7.8 13.2l1.7-1.7M14.5 6.5l1.7-1.7"/>',
    nether: '<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M8.5 8c1.5-1 3.5 1 5 0s2 0 2 0M8.5 12c1.5-1 3.5 1 5 0s2 0 2 0M8.5 16c1.5-1 3.5 1 5 0s2 0 2 0"/>',
    stronghold: '<path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.6"/>',
    slime: '<rect x="4" y="5" width="16" height="14" rx="4"/><path d="M9.5 10v2M14.5 10v2M10 15.5h4"/>',
    shapes: '<circle cx="12" cy="12" r="8"/><ellipse cx="12" cy="12" rx="8" ry="3"/>',
    anvil: '<path d="M3 6.5h14.5a3 3 0 0 0 3.5 3h-6l-1.5 4.5H16v3.5H8V14h2.5L9 10.5C5.5 10.5 3 9 3 6.5z"/>',
    commands: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 10l3 2-3 2M12.5 15h4.5"/>',
    color: '<path d="M12 3.5c3.5 4 6 7 6 10.5a6 6 0 0 1-12 0c0-3.5 2.5-6.5 6-10.5z"/><path d="M9 14.5a3 3 0 0 0 3 3"/>',
    world: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3.2 3.2 3.2 14.8 0 18M12 3c-3.2 3.2-3.2 14.8 0 18"/>',
    build: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
    mechanics: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="6.5"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  };
  const icon = id => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${icons[id]}</svg>`;

  // Tiny sample output per tool (home rows and hub cards), drawn on a 96x48 grid.
  const sq = (x, y, s, c, r = 2) => `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${r}" fill="${c}"/>`;
  // Hand-placed pixel scene (hills and a sun): s sky, l low sky, y sun, g grass, d dark grass.
  const scene = { s: '#86b6ea', l: '#a8cdf3', y: '#f4cd57', g: '#7aa84a', d: '#5a7d34' };
  const pixels = (rows, x0, y0, pitch, size, r) =>
    rows.flatMap((row, y) => [...row].map((k, x) => sq(x0 + x * pitch, y0 + y * pitch, size, scene[k], r))).join('');
  const ring = () => { // a block circle, radius 5.5 on a 4px grid
    let s = '';
    for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++)
      if (Math.abs(Math.hypot(x, y) - 5.5) < .55) s += sq(48 + x * 3.5 - 1.5, 24 + y * 3.5 - 1.5, 3.2, 'var(--accent)', .6);
    return s;
  };
  const line = 'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"';
  const previews = {
    gradient: ['#2c2e8f', '#3c44aa', '#4a54b0', '#8932b7', '#a9309f', '#d064a8'].map((c, k) => sq(1 + k * 16, 17, 14, c)).join(''),
    palette: ['#6b4e2f', '#a2834f', '#c29d62', '#5e7a3d', '#8a8a8a', '#e4e0d8'].map((c, k) => sq(24 + k % 3 * 16, 9 + (k > 2) * 16, 14, c)).join(''),
    mosaic: pixels(['ssssys', 'lgglll', 'gggggg'], 3, 1, 15.5, 14, 2),
    mapart: '<rect x="24" width="48" height="48" rx="5" fill="#dcc79c"/><rect x="27.5" y="3.5" width="41" height="41" rx="1.5" fill="none" stroke="#b99d68"/>'
      + pixels(['ssssssss', 'sssssyys', 'sssssyys', 'llllllll', 'lgggllll', 'ggggggll', 'gggggggg', 'dddddddd'], 28, 4, 5, 5.3, 0),
    banner: `<path d="M34 3h28" ${line}/><path d="M38 4h20v40l-10-6-10 6z" fill="#3c44aa"/><path d="M38 14h20v8H38z" fill="#f9fffe"/><path d="M38 44V32l10-6 10 6v12l-10-6z" fill="#f9801d"/>`,
    fireworks: ['#b02e26', '#f9801d', '#fed83d', '#80c71f', '#3ab3da', '#c74ebd', '#f9fffe', '#fed83d'].map((c, k) => {
      const a = k * Math.PI / 4;
      return [9, 16].map(d => `<circle cx="${48 + Math.cos(a) * d}" cy="${24 + Math.sin(a) * d}" r="${d > 9 ? 2.2 : 1.6}" fill="${c}"/>`).join('');
    }).join('') + '<circle cx="48" cy="24" r="2.4" fill="currentColor"/>',
    nether: `<rect x="8" y="4" width="26" height="40" rx="2" fill="#1d1430"/><rect x="12" y="8" width="18" height="32" fill="#8a3ee8"/>`
      + `<text x="48" y="28" text-anchor="middle" font-family="var(--mono)" font-size="10" fill="currentColor">÷8</text>`
      + `<rect x="66" y="16" width="16" height="24" rx="2" fill="#1d1430"/><rect x="69" y="19" width="10" height="18" fill="#8a3ee8"/>`,
    stronghold: `<path d="M10 42L60 10M86 40L60 10" ${line} stroke-dasharray="3 3"/><circle cx="10" cy="42" r="3" fill="#2f8f7a"/><circle cx="86" cy="40" r="3" fill="#2f8f7a"/><circle cx="60" cy="10" r="4.5" fill="var(--accent)"/>`,
    slime: [0, 1, 2, 3, 4, 5].flatMap(c => [0, 1, 2].map(r =>
      `<rect x="${3 + c * 15.5}" y="${1 + r * 15.5}" width="14" height="14" rx="2" fill="${[[1, 0], [4, 1], [2, 2], [5, 0]].some(([a, b]) => a === c && b === r) ? '#7ebf6e' : 'color-mix(in srgb, currentColor 10%, transparent)'}"/>`)).join(''),
    shapes: ring(),
    anvil: `<path d="M18 36L32 22L46 36M50 36L64 22L78 36M32 22L48 10L64 22" ${line} opacity=".5"/>`
      + [18, 46, 50, 78].map(x => sq(x - 6, 34, 12, '#7a3fb0')).join('') + sq(26, 16, 12, '#9b5fd0') + sq(58, 16, 12, '#9b5fd0') + sq(42, 4, 12, 'var(--accent)'),
    commands: `<rect x="4" y="12" width="88" height="24" rx="6" fill="color-mix(in srgb, currentColor 8%, transparent)"/><text x="48" y="28.5" text-anchor="middle" font-family="var(--mono)" font-size="13" fill="currentColor"><tspan fill="var(--accent)">/give</tspan> @p</text>`,
  };
  const preview = id => `<svg class="pv" viewBox="0 0 96 48" aria-hidden="true"><g>${previews[id] ?? ''}</g></svg>`;
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
  // Smooth sliders, on every <input type=range>: the thumb moves freely while dragging, then glides onto
  // the nearest step (data-step, default 1) on release. Arrow keys move one whole step. The page only gets
  // an input event when the stepped value changes, and reads it with WASD.val(el).
  const val = el => {
    const s = +(el.dataset.step || 1), lo = +el.min || 0, hi = el.max === '' ? 100 : +el.max;
    return Math.min(hi, Math.max(lo, lo + Math.round((el.value - lo) / s) * s));
  };
  const isRange = el => el instanceof HTMLInputElement && el.type === 'range';
  document.querySelectorAll('input[type=range]').forEach(el => { el.step = 'any'; el.setAttribute('aria-valuetext', val(el)); });
  // Remember the value a drag starts from (pages may have set it in code since).
  for (const type of ['pointerdown', 'focusin']) document.addEventListener(type, e => { if (isRange(e.target)) e.target.last = val(e.target); }, true);
  document.addEventListener('input', e => {
    const el = e.target;
    if (!isRange(el)) return;
    const v = val(el);
    if (v === el.last) return e.stopImmediatePropagation();
    el.last = v;
    el.setAttribute('aria-valuetext', v);
  }, true);
  document.addEventListener('change', e => {
    const el = e.target;
    if (!isRange(el)) return;
    const from = +el.value, to = val(el), t0 = performance.now();
    if (reduced) { el.value = to; return; }
    const tick = now => {
      const k = Math.min(1, (now - t0) / 180);
      el.value = from + (to - from) * (1 - (1 - k) ** 3);
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, true);
  document.addEventListener('keydown', e => {
    const el = e.target, d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
    if (!isRange(el) || !d) return;
    e.preventDefault();
    el.last = val(el);
    el.value = el.last + d * +(el.dataset.step || 1);
    el.value = val(el);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, true);
  window.WASD = { root, copy, dress, icon, val };

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
    if (el) hl.style.transform = `translate(${el.offsetLeft}px, ${el.offsetTop}px)`;
  });
  place(active);
  // Back button can restore a page whose highlight had already moved on; the rail flips to a bottom bar on phones.
  addEventListener('pageshow', () => place(active));
  addEventListener('resize', () => place(active));

  // Result rows (.row): when tiles wrap, even out the rows (5 + 4, not 8 + 1).
  const balance = row => {
    const n = row.children.length, per = Math.max(1, Math.floor((row.clientWidth + 10) / 98)); // 88px tile + 10px gap
    row.style.gridTemplateColumns = n > per ? `repeat(${Math.ceil(n / Math.ceil(n / per))}, minmax(0, 1fr))` : '';
  };
  document.querySelectorAll('.row').forEach(row => {
    new ResizeObserver(() => balance(row)).observe(row);
    new MutationObserver(() => balance(row)).observe(row, { childList: true });
  });

  // Tool lists (home and hub pages): <nav class="panel tools" data-cat="id">. One hover
  // highlight springs from row to row. Home asks for every category with <div data-all-tools>.
  // The HTML ships plain links in these for crawlers; they are replaced here.
  const all = document.querySelector('[data-all-tools]');
  if (all) all.innerHTML = cats.map((c, i) =>
    `<h2 class="tools-h in" style="--i:${i + 2}">${c.name}</h2><nav class="panel tools in" style="--i:${i + 2}" data-cat="${c.id}" aria-label="${c.name}"></nav>`).join('');
  // Hub pages use <nav class="tools cards">: one card per tool with a larger sample on top.
  document.querySelectorAll('.tools.cards').forEach(list => {
    list.innerHTML = tools.filter(t => t.cat === list.dataset.cat).map((t, i) => {
      const inner = `${preview(t.id)}<span class="tcard-t"><i class="ico">${icon(t.id)}</i><b>${t.name}</b>${t.built ? '' : '<small class="tag">soon</small>'}</span><span>${t.desc}</span>`;
      return t.built ? `<a class="tcard in" style="--i:${i + 1}" href="${root}${t.path}">${inner}</a>` : `<div class="tcard soon in" style="--i:${i + 1}">${inner}</div>`;
    }).join('');
  });
  document.querySelectorAll('.tools[data-cat]:not(.cards)').forEach(list => {
    list.innerHTML = '<i class="hl"></i>' + tools.filter(t => t.cat === list.dataset.cat).map(t => {
      const inner = `<i class="ico">${icon(t.id)}</i><b>${t.name}</b><span>${t.desc}</span>${preview(t.id)}`;
      return t.built ? `<a class="trow" href="${root}${t.path}">${inner}<small>Open →</small></a>` : `<div class="trow soon">${inner}<small>soon</small></div>`;
    }).join('');
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
