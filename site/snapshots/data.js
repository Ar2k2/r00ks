// Snapshot and preview breakdowns, newest first. Written by hand from the diff
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
              ids: ['frostbite', 'frostbite_spawn_egg'], tags: ['Bedrock too'] },
            { kind: 'Item', title: 'Ice Ball and Freezing potions',
              text: 'A throwable projectile that also works as a brewing ingredient for new Freezing potions, including long and lingering versions.',
              ids: ['ice_ball', 'freezing', 'long_freezing'], tags: ['Bedrock too'] },
            { kind: 'Biome', title: 'Ice Caves',
              text: 'A new underground biome with its own ore placements. Strongholds, mineshafts, trial chambers and ruined portals can generate there, and cold animal variants spawn in it.',
              ids: ['ice_caves'], tags: [] },
            { kind: 'Blocks', title: 'Icicle, brittle ice and ice crystal',
              text: 'Icicles hang like dripstone, brittle ice cracks and can hold a lily pad, and ice crystals chime. Wandering traders sell icicles and ice crystals.',
              ids: ['icicle', 'brittle_ice', 'ice_crystal'], tags: ['Bedrock too'] },
            { kind: 'Blocks', title: 'Winter building sets',
              text: 'Full slab, stairs and wall sets for calcite, polished calcite, polished calcite bricks, packed ice bricks and snow bricks, plus a calcite pillar and chiseled packed ice.',
              ids: ['calcite_slab', 'polished_calcite_bricks', 'packed_ice_bricks', 'snow_bricks', 'calcite_pillar', 'chiseled_packed_ice'], tags: ['Bedrock too'] },
            { kind: 'Block', title: 'Chiseled Soulshale',
              text: 'A decorative block with its own sound set. It is the first block in the game named soulshale, so a plain soulshale block may be on the way.',
              ids: ['chiseled_soulshale'], tags: ['Bedrock too'] },
            { kind: 'Music', title: 'Music disc Flurry',
              text: 'A new music disc by Hyper Potions.',
              ids: ['music_disc_flurry'], tags: ['Bedrock too'] },
          ],
        },
      },
    ],
  },
  bedrock: {
    name: 'Bedrock',
    release: '1.26.60',
    entries: [
      {
        v: '1.26.70.23', prev: '1.26.70.22', date: '2026-11-03', preview: true,
        title: 'Chat channels and a soulshale block',
        update: {
          summary: 'This preview adds chat channels, brings Chiseled Soulshale and the calcite sets over from Java, and gives add-on makers a new portal event.',
          features: [
            { kind: 'Feature', title: 'Chat channels',
              text: 'Global, party and world chat channels. A new /chat command shows, hides or sends to a channel, and /global sends to the global channel.',
              ids: ['/chat', '/global'], tags: [] },
            { kind: 'Block', title: 'Chiseled Soulshale',
              text: 'Arrives on Bedrock this week, with its own sounds, loot table and recipe. It matches the Java block.',
              ids: ['minecraft:chiseled_soulshale'], tags: ['Java too'] },
            { kind: 'Add-ons', title: 'Portal activation event',
              text: 'Scripts can now react when a portal is lit, through a new after-event in the beta server API.',
              ids: ['PortalActivateAfterEvent', '@minecraft/server 2.13.0-beta'], tags: ['Beta API'] },
          ],
        },
        since: {
          summary: 'Since 1.26.60 Bedrock has picked up the same winter building blocks as Java. The new mob and ice blocks are already in the files but still behind an experiment.',
          features: [
            { kind: 'Blocks', title: 'Winter building sets',
              text: 'Calcite, polished calcite, polished calcite bricks, packed ice bricks and snow bricks, each with slabs, stairs and walls, plus a calcite pillar, chiseled packed ice and brittle ice.',
              ids: ['minecraft:snow_bricks', 'minecraft:packed_ice_bricks', 'minecraft:polished_calcite', 'minecraft:brittle_ice'], tags: ['Java too'] },
            { kind: 'Block', title: 'Chiseled Soulshale',
              text: 'The same decorative block as on Java, with its own sound set.',
              ids: ['minecraft:chiseled_soulshale'], tags: ['Java too'] },
            { kind: 'Mob', title: 'Frostbite, Ice Ball and icicles',
              text: 'Names, sounds and entity files for the Frostbite, the Ice Ball, icicles and ice crystals are in the game, but they are not in the regular block and entity lists yet. Expect them behind an experimental toggle.',
              ids: ['frostbite', 'ice_ball', 'icicle', 'ice_crystal'], tags: ['Experimental', 'Java too'] },
          ],
        },
      },
    ],
  },
};
