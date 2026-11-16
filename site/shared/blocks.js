// Shared by the block color tools (gradient, palette, mosaic): the filter chips and the swatch tile.
(() => {
  // Filter chip id -> the blocks it keeps while checked. "Include wool" works the other way round.
  const KEEP = {
    smooth: b => b.noise < 0.05,
    survival: b => !b.flags?.includes('u'),
    nogravity: b => !b.flags?.includes('g'),
    nolight: b => !b.flags?.includes('l'),
  };
  const checked = id => document.getElementById(id)?.checked;

  // Faces seen from this view ('t' top, 's' side) that pass the page's filter chips.
  const pool = (blocks, view) => blocks.filter(b => b.views.includes(view) &&
    !(checked('wool') === false && b.id.endsWith('_wool')) &&
    Object.entries(KEEP).every(([id, keep]) => !checked(id) || keep(b)));

  // A block's swatch: its real texture once a jar is loaded, its average color until then.
  const tile = (b, textures, tag = 'div') => {
    const t = textures.get(b.tex);
    return `<${tag} class="tile${t ? ' tex' : ''}" style="--hex:${b.hex}${t ? `;--tex:url(${t})` : ''}"></${tag}>`;
  };

  window.Blocks = { pool, tile };
})();
