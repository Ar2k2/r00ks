// Firework designer: star and rocket crafting (Java 26.x recipes: firework_star, firework_star_fade,
// firework_rocket) and the /give command. Plain script for the browser (window.Fireworks) and Node for tests.
(() => {
  const D = typeof module !== 'undefined' ? require('../shared/dyes.js') : window.Dyes;

  // Shapes and the item that makes each one (small ball needs none). Names from en_us.json.
  const SHAPES = [
    { id: 'small_ball', name: 'Small Ball', item: null },
    { id: 'large_ball', name: 'Large Ball', item: 'Fire Charge' },
    { id: 'star', name: 'Star-shaped', item: 'Gold Nugget' },
    { id: 'creeper', name: 'Creeper-shaped', item: 'Any mob head' },
    { id: 'burst', name: 'Burst', item: 'Feather' },
  ];
  const shape = id => SHAPES.find(s => s.id === id);

  // A crafting grid has 9 slots. A star takes gunpowder, its shape item, diamond (trail), glowstone
  // dust (twinkle) and the rest dyes; fading takes the star plus up to 8 dyes.
  // A rocket takes paper, 1 to 3 gunpowder (flight duration) and the rest stars.
  const maxColors = s => 8 - (shape(s.shape).item ? 1 : 0) - (s.trail ? 1 : 0) - (s.twinkle ? 1 : 0);
  const MAX_FADES = 8;
  const maxStars = flight => 8 - flight;

  // star: { shape, colors: [dye id], fades: [dye id], trail, twinkle }; rocket: { flight, stars: [star] }
  const explosion = s => {
    const ints = ids => `[I;${ids.map(id => D.byId(id).firework).join(',')}]`;
    return `{shape:"${s.shape}",colors:${ints(s.colors)}${s.fades.length ? `,fade_colors:${ints(s.fades)}` : ''}`
      + `${s.trail ? ',has_trail:true' : ''}${s.twinkle ? ',has_twinkle:true' : ''}}`;
  };
  const give = (r, count = 64) => `give @p firework_rocket[fireworks={flight_duration:${r.flight}`
    + `${r.stars.length ? `,explosions:[${r.stars.map(explosion).join(',')}]` : ''}}] ${count}`;

  const dyeList = ids => ids.map(id => `${D.byId(id).name} Dye`);
  // Crafting steps: [{ make, from: [ingredient names] }]. Each star is crafted once, then the rocket.
  const crafts = r => [
    ...r.stars.flatMap((s, i) => {
      const n = r.stars.length > 1 ? ` ${i + 1}` : '', it = shape(s.shape).item;
      return [
        { make: `Firework Star${n}`, from: ['Gunpowder', ...(it ? [it[0].toUpperCase() + it.slice(1)] : []),
          ...(s.trail ? ['Diamond'] : []), ...(s.twinkle ? ['Glowstone Dust'] : []), ...dyeList(s.colors)] },
        ...(s.fades.length ? [{ make: `Firework Star${n} with fade`, from: [`Firework Star${n}`, ...dyeList(s.fades)] }] : []),
      ];
    }),
    { make: '3 Firework Rockets', from: ['Paper', ...Array(r.flight).fill('Gunpowder'), ...r.stars.map((_, i) => `Firework Star${r.stars.length > 1 ? ` ${i + 1}` : ''}`)] },
  ];

  // Everything to gather for one craft of 3 rockets: Map(name -> count). Stars are made, not gathered.
  const gather = r => {
    const m = new Map();
    for (const c of crafts(r)) for (const f of c.from) if (!f.startsWith('Firework Star')) m.set(f, (m.get(f) ?? 0) + 1);
    return m;
  };

  const api = { SHAPES, MAX_FADES, maxColors, maxStars, give, crafts, gather };
  if (typeof module !== 'undefined') module.exports = api;
  else window.Fireworks = api;
})();
