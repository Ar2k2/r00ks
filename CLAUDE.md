# WASD — Minecraft tools site

WASD is a website of Minecraft **Java Edition** tools: snapshot breakdowns,
block gradients, seed tools, building helpers and utilities. It is a personal
project built from scratch. Prefer writing our own code over pulling in
libraries, and ask before adding any dependency.

## Hosting and workflow

- The repo is on GitHub and the site is served by **GitHub Pages**.
- `.github/workflows/pages.yml` publishes the `site/` folder. Keep that pipeline minimal.
- The stack is plain HTML, CSS and JavaScript. No framework and no build step
  unless we explicitly decide otherwise.
- Every tool is its own folder under `site/`.
- Only commit and push when the owner asks (for example "publish it").

## Repo layout

```
CLAUDE.md
.github/workflows/pages.yml
design/            design export from Claude Design (reference only)
tools/             local scripts: jar diffing, NBT parsing, block color extraction
site/
  index.html       home
  shared/          shared CSS, JS (sidebar, animations, color math)
  snapshots/       one page per snapshot + index
  gradient/        block gradient tool
  ...              future tools, one folder each
```

## Hard rules

- **No Mojang assets in the repo or on the site.** No textures, sounds,
  fonts, logos, or decompiled code. Allowed: names, IDs, translation keys,
  summarized changes, and numbers we compute ourselves (like average colors).
- Any feature that shows real textures must read them **locally in the
  visitor's browser** from a jar or resource pack they provide. Nothing is
  uploaded or redistributed.
- All visual design is original. No Minecraft font or logo.

## Design system

The design reference is in `design/`. Match it closely.

**Theme:** dark only.

| Token | Value |
| --- | --- |
| Background | `#0b0e13` |
| Panel | `#11151c` (border `#1f2632`) |
| Raised / drawer | `#0f131a`, controls `#12161d` (border `#2a3240`) |
| Text | `#e8edf4` |
| Muted text | `#8b96a8`, faint `#6f7a8c` |
| Accent | teal `#2ee6c5` (text on it: `#06201b`) |

**Section colors:** Home teal `#2ee6c5`, Snapshots amber `#f5b041`,
Gradient pink `#f472b6`, Map art violet `#a78bfa`, Palette blue `#60a5fa`,
Seed tools green `#4ade80`, Building orange `#fb923c`, Utilities slate
`#94a3b8`.

**Type:** Space Grotesk (headings), Inter (body), JetBrains Mono (data:
coordinates, block IDs, diffs, labels).

**Layout:**
- A 72px icon rail is always on the left: a menu button at the top, then a
  colored dot per tool. Clicking a dot navigates; the active highlight springs
  to it.
- The menu button slides a ~312px drawer **over** the page, with a dimmed
  scrim behind it. Picking a tool slides the drawer highlight first, then the
  drawer closes about 300ms later. The X button or scrim also closes it.
- The drawer has the WASD keycap logo, grouped tool list with section headers,
  and "soon" tags on unbuilt tools.
- **No keyboard shortcuts.** The owner explicitly removed them.

**Motion (the top priority: every click should feel satisfying):**
- Springs, not plain easing. Main spring: `cubic-bezier(.34,1.56,.64,1)`.
  Drawer: `cubic-bezier(.34,1.25,.64,1)` over 0.6s. Page entrance:
  `cubic-bezier(.22,1,.36,1)`.
- Keep interactions quick, about 150 to 300ms (drawer and entrances can run
  slightly longer).
- Buttons lift slightly on hover and squish to `scale(.93)` on press.
- Sidebar highlights slide between items.
- Page content glides up about 12px while fading in.
- Cards lift about 4px on hover.
- Logo keycaps press down in a staggered ripple on hover.
- Gradient result blocks drop in one by one (about 70ms apart) with a bounce.
- Copy buttons morph into a checkmark with a small particle burst.
- Everything must respect `prefers-reduced-motion`.

## Tools and build order

1. **Foundation:** repo, Pages pipeline, shared shell (rail, drawer, home).
2. **Snapshot diffs** (first real feature, see below).
3. **Block gradient** (see below).
4. **Quick wins:** Nether coordinate converter, slime chunk finder, circle /
   sphere / dome generator.
5. **Bigger tools:** map art converter and palette builder (reuse the
   gradient's color engine), structure finder (extends the slime chunk seed
   math), command and component builder.

## Snapshot diff workflow (manual, owner-curated)

1. The owner asks for the changes in a new snapshot.
2. Read the new snapshot jar and the previous one straight from the local
   Minecraft `versions` folder. Nothing gets uploaded.
3. Run the diff scripts in `tools/`, which are saved once and reused, not
   rewritten each time.
4. Report findings, roughly in this priority: language key changes (often the
   earliest hint of unreleased content), registry changes (blocks, items,
   entities, sounds), data changes (worldgen, loot tables, recipes, tags),
   asset file paths, and code changes (new classes, methods, constants).
5. Group related changes into likely features (for example a new lang key, a
   texture path and a registry entry sharing a name are probably one block).
6. **The owner decides what is important.** Only then write the snapshot page
   and update the index, and publish only when told to.

Pages show names, keys, paths and summaries only, never Mojang's actual
files or code.

## Block gradient spec

**Data script (`tools/`), run once per game version:**
- Read the client jar's blockstates and models to find full, opaque cubes.
  Skip slabs, stairs, plants and anything with transparent pixels.
- Treat each visible face as its own option (e.g. oak log top vs side).
- Average each texture's pixels **in linear light**, then convert to OKLab.
- Store a noise score (texture variance), and tags: gravity block, light
  source, survival-obtainable.
- Animated textures: use the first frame. Biome-tinted blocks (grass, leaves):
  apply the default tint or exclude them.
- Output `site/gradient/blocks.json` containing only IDs and numbers.

**Engine:**
- Interpolate between colors in OKLab.
- Score the **whole row at once** (dynamic programming), not one step at a
  time: distance to each target, smoothness between neighbors, a penalty for
  repeats, and a penalty for noisy textures.
- Later: multi-stop gradients and a "start from a block" mode.

**UI:** color pickers, step slider, filters (smooth only, include wool,
avoid repeats, survival only, no gravity blocks, no light sources), result row
of swatches with block names, copy list. Optional "load your jar" button that
reads textures locally (via JSZip) for real previews.

**Testing:** sanity checks (pure white should give white concrete) and
comparison against in-game screenshots.

## Notes

- Target the current Minecraft Java version (26.x). Worldgen and data formats
  change between updates, so re-run data scripts and re-check tools each major
  update.
- The owner's Mac is called Mother-Brain.
