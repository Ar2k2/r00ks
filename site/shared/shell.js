// WASD shell: injects the icon rail and drawer into every page.
// A page opts in with <body data-tool="id"> and a script tag for this file.
(() => {
  // Site root derived from this script's URL, so links work under any Pages subpath.
  const root = new URL('..', document.currentScript.src).href;
  const tools = [
    { id: 'home', name: 'Home', path: '', built: true },
    { id: 'snapshots', name: 'Snapshots', path: 'snapshots/', group: 'Updates',
      desc: 'What changed in each snapshot, read straight from the jar.' },
    { id: 'gradient', name: 'Gradient', path: 'gradient/', group: 'Color', built: true,
      desc: 'Smooth block gradients between any two colors.' },
    { id: 'mapart', name: 'Map art', path: 'mapart/', group: 'Color',
      desc: 'Turn an image into a map art block layout.' },
    { id: 'palette', name: 'Palette', path: 'palette/', group: 'Color',
      desc: 'Build block palettes that sit well together.' },
    { id: 'seeds', name: 'Seed tools', path: 'seeds/', group: 'World',
      desc: 'Slime chunks and structures from a world seed.' },
    { id: 'building', name: 'Building', path: 'building/', group: 'Build',
      desc: 'Circles, spheres and domes, block by block.' },
    { id: 'utilities', name: 'Utilities', path: 'utilities/', group: 'Build', built: true,
      desc: 'Nether coordinates and other small helpers.' },
  ];
  // Original line icons on a 24px grid, keyed by tool id.
  const icons = {
    home: '<path d="M4 11l8-7 8 7"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/>',
    snapshots: '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><path d="M9 12h6M12 9v6M9 18h6"/>',
    gradient: '<rect x="3" y="8" width="5" height="8" rx="1" fill="currentColor"/><rect x="9.5" y="8" width="5" height="8" rx="1" fill="currentColor" fill-opacity=".45"/><rect x="16" y="8" width="5" height="8" rx="1"/>',
    mapart: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>',
    palette: '<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>',
    seeds: '<path d="M12 21v-9"/><path d="M12 12c0-4-3-6-7-6 0 4 3 6 7 6z"/><path d="M12 14c0-4 3-6 7-6 0 4-3 6-7 6z"/>',
    building: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
    utilities: '<path d="M11.94 9.94A4.5 4.5 0 0 1 17.94 3.94L15.29 6.59 17.41 8.71 20.06 6.06A4.5 4.5 0 0 1 14.06 12.06L6.06 20.06A1.5 1.5 0 0 1 3.94 17.94Z"/>',
  };
  const icon = id => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${icons[id]}</svg>`;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Copy buttons: <button class="btn copy">Label</button>. The icon morphs into a checkmark.
  const copyIcons = '<svg class="ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="5" y="5" width="9" height="9" rx="2"/><path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5"/></svg>'
    + '<svg class="ok" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5"/></svg>';
  document.querySelectorAll('.copy').forEach(b => {
    b.dataset.label = b.textContent.trim();
    b.innerHTML = `${copyIcons}<span>${b.dataset.label}</span>`;
  });
  const copy = async (btn, text) => {
    const label = btn.querySelector('span');
    clearTimeout(btn.t);
    btn.t = setTimeout(() => { btn.classList.remove('done'); label.textContent = btn.dataset.label; }, 1600);
    try { await navigator.clipboard.writeText(text); } catch { label.textContent = 'Copy failed'; return; }
    btn.classList.add('done'); label.textContent = 'Copied';
  };
  window.WASD = { root, tools, copy, icon };

  const active = document.body.dataset.tool;
  const logo = '<span class="logo" role="img" aria-label="WASD"><b>W</b><b>A</b><b>S</b><b>D</b></span>';

  // Built tools are links; unbuilt ones are inert spans.
  const item = (t, cls, inner, label) => t.built
    ? `<a class="${cls}" href="${root}${t.path}" data-id="${t.id}"${label}${t.id === active ? ' aria-current="page"' : ''}>${icon(t.id)}${inner}</a>`
    : `<span class="${cls} soon"${label && ` title="${t.name} (soon)"`}>${icon(t.id)}${inner}</span>`;

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
      <header><a href="${root}">${logo}WASD</a><button class="btn drawer-close" aria-label="Close menu">
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
  });
  // The rail icon follows the highlight while it slides.
  const mark = id => document.querySelectorAll('[data-id]').forEach(a =>
    a.dataset.id === id ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
  place(active);
  // Back button can restore a page whose highlight had already moved on.
  addEventListener('pageshow', () => { place(active); mark(active); });

  // Tool pages: the tool's icon leads the page title.
  document.querySelector('.head h1')?.insertAdjacentHTML('afterbegin', icon(active));

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
    place(a.dataset.id); mark(a.dataset.id);
    setTimeout(() => {
      setOpen(false);
      if (a.dataset.id !== active) location.href = a.href;
    }, reduced ? 0 : 300);
  });
})();
