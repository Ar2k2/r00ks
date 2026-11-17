// Beacon math (Java Edition). Plain script for the browser (window.Beacon) and Node (module.exports) for tests.
(() => {
  // Pyramid level L has L layers under the beacon; the k-th layer down is a (2k+1) square.
  const side = k => 2 * k + 1;
  const layers = L => Array.from({ length: L }, (_, i) => side(i + 1) ** 2); // top first
  const total = L => layers(L).reduce((s, n) => s + n, 0);
  // Range from the beacon, sideways and down; upward it reaches the top of the world.
  const range = L => 10 + 10 * L;
  // Effects last this long and are topped up every 4 seconds, so they linger after you leave.
  const seconds = L => 9 + 2 * L;
  // Powers and the pyramid level that unlocks them. Regeneration and level II are the level 4 secondary.
  const POWERS = [
    ['Speed', 1], ['Haste', 1], ['Resistance', 2], ['Jump Boost', 2], ['Strength', 3], ['Regeneration', 4],
  ];

  const api = { side, layers, total, range, seconds, POWERS };
  if (typeof module !== 'undefined') module.exports = api;
  else window.Beacon = api;
})();
