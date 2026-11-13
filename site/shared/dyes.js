// The 16 dyes (Java 26.x): id, name, banner color (also leather, collars, beacon beams) and firework color.
// Both colors are fixed numbers in the game, taken from the wiki's dye color table (allowed, see CLAUDE.md).
// Plain script for the browser (window.Dyes) and Node (module.exports) for tests.
(() => {
  const DYES = [
    ['white', 'White', 0xF9FFFE, 0xF0F0F0], ['orange', 'Orange', 0xF9801D, 0xEB8844],
    ['magenta', 'Magenta', 0xC74EBD, 0xC354CD], ['light_blue', 'Light Blue', 0x3AB3DA, 0x6689D3],
    ['yellow', 'Yellow', 0xFED83D, 0xDECF2A], ['lime', 'Lime', 0x80C71F, 0x41CD34],
    ['pink', 'Pink', 0xF38BAA, 0xD88198], ['gray', 'Gray', 0x474F52, 0x434343],
    ['light_gray', 'Light Gray', 0x9D9D97, 0xABABAB], ['cyan', 'Cyan', 0x169C9C, 0x287697],
    ['purple', 'Purple', 0x8932B8, 0x7B2FBE], ['blue', 'Blue', 0x3C44AA, 0x253192],
    ['brown', 'Brown', 0x835432, 0x51301A], ['green', 'Green', 0x5E7C16, 0x3B511A],
    ['red', 'Red', 0xB02E26, 0xB3312C], ['black', 'Black', 0x1D1D21, 0x1E1B1B],
  ].map(([id, name, color, firework]) => ({ id, name, color, firework, hex: '#' + color.toString(16).padStart(6, '0'),
    fwHex: '#' + firework.toString(16).padStart(6, '0') }));

  const api = { DYES, byId: id => DYES.find(d => d.id === id) };
  if (typeof module !== 'undefined') module.exports = api;
  else window.Dyes = api;
})();
