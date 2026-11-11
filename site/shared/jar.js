// Load block textures from a Minecraft jar or resource pack, entirely in the visitor's browser.
// Jar.wire(input, textEl, blocks, textures, done): fills textures (texture path -> object URL).
(() => {
  // Minimal zip reader: central directory + DecompressionStream. Returns name -> bytes|null.
  // shortcut: no zip64 or encryption; jars and packs don't use them.
  function readZip(buf) {
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    let end = buf.length - 22;
    while (end >= 0 && dv.getUint32(end, true) !== 0x06054b50) end--;
    if (end < 0) throw new Error('not a zip file');
    const entries = new Map(), dec = new TextDecoder();
    for (let i = 0, p = dv.getUint32(end + 16, true), n = dv.getUint16(end + 10, true); i < n; i++) {
      if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('damaged zip');
      const nameLen = dv.getUint16(p + 28, true);
      entries.set(dec.decode(buf.subarray(p + 46, p + 46 + nameLen)), {
        method: dv.getUint16(p + 10, true), size: dv.getUint32(p + 20, true), at: dv.getUint32(p + 42, true) });
      p += 46 + nameLen + dv.getUint16(p + 30, true) + dv.getUint16(p + 32, true);
    }
    return async name => {
      const e = entries.get(name);
      if (!e) return null;
      const start = e.at + 30 + dv.getUint16(e.at + 26, true) + dv.getUint16(e.at + 28, true);
      const data = buf.subarray(start, start + e.size);
      if (e.method === 0) return data;
      if (e.method !== 8) return null;
      return new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
    };
  }

  const wire = (input, text, blocks, textures, done) => input.onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    text.textContent = `Reading ${file.name}…`;
    try {
      const zip = readZip(new Uint8Array(await file.arrayBuffer()));
      let found = 0;
      for (const tex of new Set(blocks.map(b => b.tex))) {
        const bytes = await zip(`assets/minecraft/textures/${tex}.png`);
        if (!bytes) continue;
        URL.revokeObjectURL(textures.get(tex));
        textures.set(tex, URL.createObjectURL(new Blob([bytes], { type: 'image/png' })));
        found++;
      }
      text.textContent = found
        ? `Showing ${found} textures from ${file.name}. Nothing left your computer.`
        : `No block textures found in ${file.name}. Pick a client jar (versions/<version>/<version>.jar) or a resource pack.`;
      done();
    } catch (err) {
      text.textContent = `Could not read ${file.name}: ${err.message}`;
    }
    e.target.value = '';
  };

  window.Jar = { wire };
})();
