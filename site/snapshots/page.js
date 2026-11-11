// Renders a snapshot/preview page from data.js.
// The page's <body> says which: data-edition="java|bedrock" data-version="…" data-view="update|since".
(() => {
  const { edition, version, view } = document.body.dataset;
  const ed = SNAPSHOTS[edition], e = ed.entries.find(x => x.v === version);
  const esc = s => String(s).replace(/[&<>"]/g, c => `&#${c.charCodeAt(0)};`);
  const date = d => new Date(d + 'T00:00:00Z').toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  const base = `${WASD.root}snapshots/${edition}/${e.v}/`;
  const v = e[view];
  const label = edition === 'java' ? 'Java' : 'Bedrock';
  const kind = e.preview ? 'preview' : 'snapshot';

  const feature = (f, i) => `<article class="panel feature" style="--i:${i}">
    <header><span class="kind">${esc(f.kind)}</span><h2>${esc(f.title)}</h2>
      ${f.tags.map(t => `<span class="chip tag${t === 'Experimental' ? ' exp' : ''}">${esc(t)}</span>`).join('')}</header>
    <p>${esc(f.text)}</p>
    ${f.ids.length ? `<div class="ids">${f.ids.map(id => `<code>${esc(id)}</code>`).join('')}</div>` : ''}
  </article>`;

  document.getElementById('page').innerHTML = `
    <nav class="crumbs"><a href="${WASD.root}snapshots/">Snapshots</a> / <a href="${WASD.root}snapshots/#${edition}">${label}</a></nav>
    <header class="head">
      <h1>${WASD.icon('snapshots')}${esc(e.v)}</h1>
      <p>${esc(e.title)}</p>
      <div class="meta-line"><span>${label} ${kind}</span><span>${date(e.date)}</span></div>
    </header>
    <nav class="seg" aria-label="Compare against"><i class="seg-hl"></i>
      <a href="${base}"${view === 'update' ? ' aria-current="page"' : ''}>This update<small>vs ${esc(e.prev)}</small></a>
      <a href="${base}since-release/"${view === 'since' ? ' aria-current="page"' : ''}>Since release<small>vs ${esc(ed.release)}</small></a>
    </nav>
    <p class="summary">${esc(v.summary)}</p>
    ${v.features.length
      ? `<div class="features">${v.features.map(feature).join('')}</div>`
      : `<p class="empty">No headline features in this update. <a href="${base}since-release/">See everything since ${esc(ed.release)} →</a></p>`}
    <p class="note">Names and IDs come from our own comparison of the game files. Summaries are ours. Unreleased features can change or disappear before release.</p>`;

  // Switch: the highlight springs to the picked option, then we navigate.
  const seg = document.querySelector('.seg'), hl = seg.querySelector('.seg-hl');
  const place = a => { hl.style.width = a.offsetWidth + 'px'; hl.style.transform = `translateX(${a.offsetLeft - 4}px)`; };
  const links = [...seg.querySelectorAll('a')], current = links[view === 'update' ? 0 : 1];
  const reset = () => {
    links.forEach(a => a === current ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
    hl.style.transition = 'none'; place(current); hl.offsetWidth; hl.style.transition = '';
  };
  reset();
  addEventListener('pageshow', reset); // back button restores a page whose highlight had moved
  addEventListener('resize', () => place(seg.querySelector('[aria-current]')));
  seg.addEventListener('click', ev => {
    const a = ev.target.closest('a');
    if (!a || a === current || ev.metaKey || ev.ctrlKey || ev.shiftKey) return;
    ev.preventDefault();
    place(a); links.forEach(x => x === a ? x.setAttribute('aria-current', 'page') : x.removeAttribute('aria-current'));
    setTimeout(() => location.href = a.href, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 250);
  });
})();
