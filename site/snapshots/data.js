// Snapshot breakdowns, newest first. Written by hand from the diff
// scripts in tools/, after the owner picks what matters. Names, IDs and our own
// summaries only: never Mojang's text, files or code.
//
// entry: { v, prev, date, title, update: view, since: view }
// view:  { summary, features: [{ kind, title, text, ids: [], tags: [] }] }
window.SNAPSHOTS = {
  java: {
    name: 'Java',
    release: '26.3',
    entries: [
      {
        v: '26.4-snapshot-8', prev: '26.4-snapshot-7', date: '2026-11-10',
        title: 'A quiet week on top of a winter update',
        update: {
          summary: 'Mostly behind-the-scenes work this week: a rework of how commands are parsed and checked, plus a new debug screen. Nothing new to find in-game.',
          features: [],
        },
        since: {
          summary: 'Since 26.3 the theme is winter: a new icy mob, a cave biome, a throwable ice ball and a stack of ice, snow and calcite building blocks.',
          features: [
            { kind: 'Mob', title: 'Frostbite',
              text: 'A new member of the zombie family. It burns in daylight, walks on powder snow, and zombies can convert into one. Comes with a spawn egg.',
              ids: ['frostbite', 'frostbite_spawn_egg'], tags: [] },
            { kind: 'Item', title: 'Ice Ball and Freezing potions',
              text: 'A throwable projectile that also works as a brewing ingredient for new Freezing potions, including long and lingering versions.',
              ids: ['ice_ball', 'freezing', 'long_freezing'], tags: [] },
            { kind: 'Biome', title: 'Ice Caves',
              text: 'A new underground biome with its own ore placements. Strongholds, mineshafts, trial chambers and ruined portals can generate there, and cold animal variants spawn in it.',
              ids: ['ice_caves'], tags: [] },
            { kind: 'Blocks', title: 'Icicle, brittle ice and ice crystal',
              text: 'Icicles hang like dripstone, brittle ice cracks and can hold a lily pad, and ice crystals chime. Wandering traders sell icicles and ice crystals.',
              ids: ['icicle', 'brittle_ice', 'ice_crystal'], tags: [] },
            { kind: 'Blocks', title: 'Winter building sets',
              text: 'Full slab, stairs and wall sets for calcite, polished calcite, polished calcite bricks, packed ice bricks and snow bricks, plus a calcite pillar and chiseled packed ice.',
              ids: ['calcite_slab', 'polished_calcite_bricks', 'packed_ice_bricks', 'snow_bricks', 'calcite_pillar', 'chiseled_packed_ice'], tags: [] },
            { kind: 'Block', title: 'Chiseled Soulshale',
              text: 'A decorative block with its own sound set. It is the first block in the game named soulshale, so a plain soulshale block may be on the way.',
              ids: ['chiseled_soulshale'], tags: [] },
            { kind: 'Music', title: 'Music disc Flurry',
              text: 'A new music disc by Hyper Potions.',
              ids: ['music_disc_flurry'], tags: [] },
          ],
        },
      },
    ],
  },
};
