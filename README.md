# Xiang Li — portfolio

Seven side projects, each running on the page as a self-driving scene.

Live at [personal-website.xiangli3625.workers.dev](https://personal-website.xiangli3625.workers.dev/).

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm test         # builds, then asserts what the page claims
```

## The idea

A portfolio of software should not be a list of screenshots. The old shape of this
site was exactly that — an image per project, a caption, a pointer angle — and
every picture went stale: four of the projects had been renamed, one had been
rewritten from scratch, and one did not exist yet. Nothing failed, so nobody
noticed.

So each project section mounts a **scene** instead: a short film of the software
doing the thing it exists to do, driven by a storyboard of timed beats. Six are
staged reconstructions. Choir Practice is the actual application, vendored into
`public/demos/choir/` and driven by the pod that frames it.

**The scenes explain themselves.** Every project used to carry three written notes
in a column beside its scene, and nobody reads prose next to something that is
moving — the scene won that competition every time, and the list still took up the
room. The claims now live inside the frames as labels pinned to their evidence:
"Notifications less distracting" beside the badge at the moment it loses its red,
"Real-time bus tracking" on the stop card, "And every page it links to" on the
cards flying out of the toolbar. What is left in the reading column is a name, a
platform, a headline and — where the headline does not already contain it — the
problem, which is the one thing a demonstration of the solution cannot state.

## Shape

```
app/
  page.tsx            the whole page, as a server component
  projects.ts         every project's copy, and what each section may claim
  page-chrome.tsx     the photo rail, and the focus manager that decides
                      which project you are "in"
  backdrops.tsx       per-project scenery behind and in front of each scene
  index-marks.tsx     a live miniature of every scene, for the hero index
  globals.css         shared and server-rendered page styles
  demos/
    demo-mount.tsx    lazy registry, one chunk per scene
    scene/            the shared runtime: storyboard, phantom cursor,
                      viewport layers, in-frame labels
    <project>/        one directory per scene; lazy demos own demo.css
  legal/              privacy policies and terms, vendored from each project
tests/                node:test against the built Cloudflare worker
scripts/              screenshot and audit tooling (see below)
worker/               the Cloudflare entry point
```

### How a scene works

`demos/scene/storyboard.ts` advances through a list of `{ name, ms }` beats and
writes the current beat onto the stage as `data-beat`, plus the fraction through it
as `--beat-t` — every frame, on the DOM node, without a React render. Continuous
motion is CSS's job. React re-renders once per beat, not once per frame, which is
what lets seven scenes share a page without making a laptop fan audible.

A scene never runs off screen, and restarts from the top rather than resuming: a
vignette caught halfway makes no sense to somebody who just arrived.

### In-frame labels

`demos/scene/spec.tsx`. A label declares the beat it arrives on, a position as a
percentage of its layer, and optionally the beat it leaves on — for the ones whose
subject leaves. It stays put otherwise, so the last frame of a scene is a labelled
diagram of itself.

Labels fly out of the control that was pressed, on a stagger, which reads as *this
button did all of this*. Each has a drawn dot-and-lead to its subject rather than a
dot and a gap, because six plates around one frame with no connectors is six things
a reader has to pair up by proximity.

The theming contract is shape, type, case, tracking and lead length as well as
colour — four different pieces of software should not annotate themselves
identically. Decaf gets square system chips, GRT dark-green uppercase transit
signage, PagePack frosted pills, PDF Explainer a violet highlighter wash.

Below 760px the layer stops being a layer and falls back into the scene's own
column as a wrapped row of chips that still fills up beat by beat. The pointing is
lost; the reading is not.

## Motion

**This site does not honour `prefers-reduced-motion`, on purpose.**

The seven scenes are the content, not decoration wrapped around it. The page's
whole claim is that each project is running on it, so a visitor who cannot see the
scenes move is left reading captions about motion that never arrives — a worse page
than the one the media query exists to protect them from.

The setting also fires for the wrong people here. Windows turns `reduce` on from
places nobody associates with animation: performance options, battery savers, and
remote desktop sessions. Most machines reporting it never asked for it.

What was removed, if it ever needs to come back:

- four `@media (prefers-reduced-motion: reduce)` blocks in `app/globals.css`,
  including a blanket one that flattened every animation and transition
- the still-frame branch in `useStoryboard` (`app/demos/scene/storyboard.ts`),
  which held one nominated beat instead of looping

The seam survives. Every scene still declares `stillBeat` — the single frame that
carries its argument — and `SceneState.still` is still threaded through to the
phantom cursor. Bringing motion control back should mean a control on the page a
visitor can find and press, not an ambient setting read behind their back.

## Tests

`npm test` builds the site and then runs `node --test` against the built worker.
Most of what it asserts is not "does it render" but **"is it still true"**, because
the failure this site actually had was a page describing software that had moved
on while every build passed.

So the suite checks that no project is described by a name it no longer has, that
the demo registry covers every project, that the vendored Choir app still has the
controls the pod reaches into, that the published policies still match the
originals in each project's repository, and that the page counts nothing at the
reader. It also holds the copy to its own rules: every caption clears a reading
floor, every in-frame label clears that floor and a seven-word limit, the claims
stay in the frames rather than returning to a column, and Choir's four voices are
still inked in the colours the vendored app engraves them in.

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Local development |
| `npm run build` | Build the Cloudflare worker and client |
| `npm test` | Build, then assert what the page claims |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run media` | Rebuild the AVIF/poster manifest for the photo gallery |

Review tooling, none of it part of CI:

| Command | Does |
| --- | --- |
| `node scripts/drive-site.mjs` | Loads the built site in real Chromium, scrolls to every pod, checks each scene advances and loops, and fails on any console error. `--shots` writes screenshots. |
| `node scripts/beat-shot.mjs <id> [width] [beat…]` | Photographs one section whole, at a chosen width, on chosen beats. The main tool for judging a scene. |
| `node scripts/visible.mjs` | Checks that things which must be legible are not occluded. |
| `node scripts/dead-css.mjs` | Class names in the stylesheet with no literal match in the source. |
| `node scripts/dangling-selectors.mjs` | Selector lists the browser dropped. |

## Deployment

Cloudflare Workers, via `vinext` and `@cloudflare/vite-plugin`. `npm run build`
produces `dist/server/index.js` — the worker the tests import directly — and the
client bundle beside it.
