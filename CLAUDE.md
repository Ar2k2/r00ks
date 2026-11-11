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

The look was refreshed in Nov 2026 to move away from a generic "AI site" feel.
`site/shared/shell.css` holds the tokens; match it.

**Theme:** light and dark, following the device (`prefers-color-scheme`). No
manual toggle.

**Seed color:** everything tinted (accent, the W keycap, highlights, and a
faint tint on the backgrounds) derives from `--seed` in `shell.css` via
`oklch(from var(--seed) ...)`. The seed is the average color (from
`blocks.json`) of the **latest snapshot's featured block**. Currently oxidized
copper `#54a587`. When a snapshot is published:
1. Set `--seed` in `shell.css` and the matching fixed values in its
   `@supports not` fallback block.
2. Update `latest` in `site/index.html` (title, summary, changes, link, and
   `strip`: a short run of related block averages ending in the seed).

No per-tool colors. The rainbow section colors were removed; tools are told
apart by their icons.

**Icons:** original line icons on a 24px grid, stroke 1.7, defined once in
`shell.js` (`WASD.icon(id)`) and used in the rail, drawer, home list and tool
page titles. Draw new ones by hand; no icon libraries.

**Type:** IBM Plex Sans (headings and body) and IBM Plex Mono (data:
coordinates, block IDs, diffs, labels). Labels are lowercase mono, not
uppercase letter-spaced.

**Surfaces:** soft and rounded. Panels 16px radius with a soft shadow,
controls and buttons 10px, keycaps 7px. Primary buttons are filled with the
text color. No heavy black borders or hard offset shadows.

**Layout:**
- Tools are grouped into **categories** (Updates, Color & art, World, Build,
  Mechanics), defined with the tool list in `shell.js`. Each category with a
  built tool has a hub page (`color/`, `world/`, `mechanics/`; Updates links
  straight to Snapshots). Add a hub when a category gets its first tool.
- A 72px icon rail is always on the left: a menu button at the top, then home
  and an icon per category. Clicking an icon navigates; the active highlight
  springs to the current tool's category.
- The menu button slides a ~312px drawer **over** the page, with a dimmed
  scrim behind it. Picking a tool slides the drawer highlight first, then the
  drawer closes about 300ms later. The X button or scrim also closes it.
- The drawer has the WASD keycap logo, every tool grouped under its category,
  and "soon" tags on unbuilt tools.
- Home leads with a featured card (latest snapshot, or the newest tool until
  snapshot pages exist) with the block color strip, then the tools listed by
  category.
- **No keyboard shortcuts.** The owner explicitly removed them.

**Motion (the top priority: every click should feel satisfying):**
- Springs, not plain easing. Main spring: `cubic-bezier(.34,1.56,.64,1)`.
  Drawer: `cubic-bezier(.34,1.25,.64,1)` over 0.6s. Page entrance:
  `cubic-bezier(.22,1,.36,1)`.
- Keep interactions quick, about 150 to 300ms (drawer and entrances can run
  slightly longer).
- Buttons lift slightly on hover and squish to `scale(.93)` on press.
- Sidebar highlights slide between items; the home tool list has one hover
  highlight that springs from row to row.
- Icons tilt slightly on hover.
- Page content glides up about 12px while fading in.
- Logo keycaps press down in a staggered ripple on hover.
- The home color strip and gradient result blocks drop in one by one with a
  bounce (gradient blocks about 70ms apart).
- Copy buttons morph into a checkmark. No particle bursts or click splashes: the owner removed them as too much.
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

## Snapshot diffs (manual, owner-curated)

Covers **Java snapshots**. Every snapshot page has two subpages:
- **This update:** changes since the previous snapshot.
- **Since release:** everything changed since the last full release
  (e.g. 26.3 → 26.4-snapshot-8).

**Script** (saved once and reused, not rewritten each time):
- `python3 tools/java_diff.py [OLD] [NEW]` reads jars from the local launcher
  `versions` folder. Defaults: newest snapshot vs the previous installed one;
  `OLD=release` compares against the latest release. Registries are inferred
  from files (blockstates, items, entity lang keys, sounds.json), not by
  running game code. Ignores the DataVersion stamp in structure `.nbt` files.
- It prints a markdown report and writes full JSON to `tools/work/diff/`
  (git-ignored). `python3 tools/test_diffs.py` pins a few known facts.

**Workflow:**
1. The owner asks for the changes in a new snapshot.
2. Run the script for both views (this update, and since release).
3. Report findings, roughly in this priority: language key changes (often the
   earliest hint of unreleased content), registry changes (blocks, items,
   entities, sounds), data changes (worldgen, loot tables, recipes, tags),
   asset file paths, and code changes (new classes, methods, constants).
4. Group related changes into likely features (the script does a first pass by
   shared names).
5. **The owner decides what is important.** Only then write the pages and
   update the index, and publish only when told to.

Pages show names, keys, paths and summaries only, never Mojang's actual
files, text or code.

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
