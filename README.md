# Xiang Li — portfolio

Ten side projects, each running on the page as a self-driving scene.

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
doing the thing it exists to do, driven by a storyboard of timed beats. Nine are
staged reconstructions. Choir Practice is the actual application, vendored into
`public/demos/choir/` and driven by the pod that frames it.

**The scenes explain themselves.** Every project used to carry three written notes
in a column beside its scene, and nobody reads prose next to something that is
moving — the scene won that competition every time, and the list still took up the
room. The claims now live inside the frames as labels pinned to their evidence:
"Notifications less distracting" beside the badge at the moment it loses its red,
"Real positions, so late reads late" on the row of a bus that is,
"And every same-site page it links to" on the
cards flying out of the toolbar. What is left in the reading column is a name, a
platform, a headline and — where the headline does not already contain it — the
problem, which is the one thing a demonstration of the solution cannot state.

## Shape

```
app/
  page.tsx            the whole page, as a server component
  not-found.tsx       the section that does not exist
  projects.ts         every project's copy, and what each section may claim
  page-chrome.tsx     the gallery rail, the hold control, and the focus manager
                      that decides which project you are "in"
  backdrops.tsx       per-project scenery behind and in front of each scene
  index-marks.tsx     a live miniature of every scene, for the hero index
  closing.tsx         the address, and the last two sentences
  globals.css         the page: chassis, theming, hero, gallery, sections
  site-chrome.css     the skip link, which must paint before globals.css loads
  demos/
    demo-mount.tsx    lazy registry, one chunk per scene
    scene/            the shared runtime: storyboard, hold, phantom cursor,
                      press gate, viewport layers, in-frame labels
    <project>/        one directory per scene — demo.tsx and demo.css
  legal/              privacy policies and terms, vendored from each project
tests/                node:test against the built Cloudflare worker
scripts/              screenshot and audit tooling (see below)
build/                the Vite plugin that writes dist/client/_headers
worker/               the Cloudflare entry point, and the security headers
                      every response leaves through
```

### Where a style belongs

Every scene's rules live in its own `demo.css` and load with its chunk. They used to
be in `globals.css`, all of them, and the file reached twelve thousand lines — which
was not a tidiness problem. Three separate live rules were destroyed by dangling
selectors left behind when neighbouring code was deleted, and every one of them
shipped, because at that size nobody reads the file whole. One had the gallery's
arrows rendering at twice their intended size for months.

The split rule is about *when the element exists*, not about who the styles feel like
they belong to:

- **The scene's own furniture** — anything that needs one of its `nb-`/`gx-`/`pp-`/
  `pdfx-`/`choir-`/`dc-`/`nn-`/`tfa-`/`tot-`/`bb-` classes as an ancestor to match at
  all — goes in `demo.css`. Those elements do not exist until the chunk mounts, so the stylesheet
  cannot be late.
- **The section around it** — the ambient wash, the entrance veil, the ghost number,
  anything on `.project-*` — stays in `globals.css`. The section is server-rendered
  and on screen long before any chunk is fetched. Styling it from a chunk flashes.
- **`@keyframes` follows its consumer, not its name.** Two of N-Back's entrance
  keyframes were moved into its chunk because they were called `nb-…`; the rule
  playing them is on `.project-veil`, which arrives first, so the entrance silently
  stopped running. Nothing errors when this happens.

Two tests hold the line: one refuses scene-internal selectors in `globals.css`, one
refuses a `@keyframes` block in any stylesheet other than the one that plays it. The
move was verified by fingerprinting the computed style of every element in every
section at three viewport widths, before and after — 4,431 elements, zero differences.
It also took 48K off the render-blocking stylesheet, which is now split across ten
files that arrive with the scenes that need them.

### How a scene works

`demos/scene/storyboard.ts` advances through a list of `{ name, ms }` beats and
writes the current beat onto the stage as `data-beat`, plus the fraction through it
as `--beat-t` — every frame, on the DOM node, without a React render. Continuous
motion is CSS's job. React re-renders once per beat, not once per frame, which is
what lets ten scenes share a page without making a laptop fan audible.

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

**`prefers-reduced-motion` decides where you arrive, not where you stay.** A
machine reporting `reduce` lands on the still frames, with the button that gives
the motion back sitting there, pressed.

For a long time the setting was not honoured at all, on purpose, and the argument
below is why. What changed is that the button now exists, which was the condition
the old note set for its own reversal.

The ten scenes are the content, not decoration wrapped around it. The page's
whole claim is that each project is running on it, so a visitor who cannot see the
scenes move is left reading captions about motion that never arrives — a worse page
than the one the media query exists to protect them from.

The setting also fires for the wrong people here. Windows turns `reduce` on from
places nobody associates with animation: performance options, battery savers, and
remote desktop sessions. Most machines reporting it never asked for it.

So motion control is a control: the ring at the foot of the dock, beneath the ten
numbers. `app/demos/scene/hold.ts` holds one boolean and a set of subscribers —
the scenes are ten independently lazy chunks with no common ancestor short of a
server component, so a context would mean making the page a client component to
share a boolean.

**Held is not paused**, and that is the whole design. Pausing stops each scene
wherever it happens to be, which for nine of the ten is a transitional frame that
argues nothing — a cursor halfway to a button, a card mid-flight. Held reads the
`stillBeat` every scene has always declared, cuts to the frame that carries its
argument, and leaves every accumulated in-frame label pinned to its evidence. The
page stops being ten films and becomes ten labelled diagrams: Decaf's feed
under its notice card, PagePack's pack being read with the network down, Night
Neutralizer's explosion blown out on one side and levelled on the other.

**And a held film is in your hands.** Drag across any stage and the storyboard
scrubs, the stage's own width mapping the first beat to the last, backwards
included — the cursor turns east-west over the wells to say so. A held stage also
takes focus, and steps a beat at a time on the arrow keys, jumping to either end on
Home and End: the drag shipped pointer-only, which is a feature half the people who
might want it cannot reach. Beats rather than pixels for the keyboard, because a
beat is the unit the storyboard is written in and stepping one lands on a frame the
film was composed around. The state a scrub writes is exactly the state the clock
would have written at that elapsed time, so a scrubbed frame is never a new claim;
it is a frame the film already contains.
The press-gate opens on stills for the same honesty (`press-gate.ts`): a still is
not a moment in a gesture but a diagram of the world after it, so a frame at or
past a press shows the pressed world rather than waiting for a phantom hand that
is deliberately hidden. This is the line the page keeps: the scenes never became
operable software again — you cannot press Decaf's switch — but the *films* became
an object, which is what films on a desk are.

Two details that are not obvious and were both found by looking:

- The cut and the freeze are **not simultaneous**. `SETTLE_MS` gives the page time
  to arrive before CSS clocks stop; Decaf's rewards take 1450ms to drain away and
  freezing them at 900ms left forty-two hearts halfway down, across the heading.
- The freeze applies to **what loops, not to everything**. Entrances are animations
  too, so a universal `animation-play-state: paused` froze any section reached
  while held at the first frame of its own arrival — an empty coloured panel.

**And the setting is read once.** `adoptReducedMotionPreference` in `hold.ts` runs
on the first client commit, presses the button, and never listens again — so it
cannot overrule a visitor who then presses it back. It only ever moves toward
held, and the server still renders as running, because a page rendered on
Cloudflare has no idea what anybody's machine asks for. The 1.6s settle is skipped
for that landing: the wait exists to let a *running* page come to rest, and making
somebody who asked for less motion watch 1.6 seconds of it first would honour and
disregard the setting in the same breath.

There is still no `@media (prefers-reduced-motion: reduce)` block in
`app/globals.css`, and that is deliberate rather than left over. The state a
`reduce` visitor gets is `html.is-held` and `html.is-held-settled` — the same two
classes the button writes, styled in one place. A media query would be a second
definition of that state, reached by a route the visitor cannot leave.

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
| `node scripts/dock-fit.mjs` | Whether the whole dock — ten numerals and the hold ring — fits the viewport at four real window heights. Written when the page went from seven projects to ten, because the rail got 43% taller against the same window and the failure would have been silent: the last project and the motion control simply unreachable on a short laptop screen. Measured at 250px in a 660px window, so there is room, but there is now a command that says so. |
| `node scripts/dead-css.mjs` | Class names in the stylesheet with no literal match in the source. |
| `node scripts/dangling-selectors.mjs` | Selector lists the browser dropped. |
| `node scripts/security-headers.mjs` | Whether the six headers are on the wire for a document, a static asset, a media file and the framed choir document — and whether anything on any page is blocked by the policy. Listens for `securitypolicyviolation` rather than trusting that a build which passed is a page that works. |

## Deployment

Cloudflare Workers, via `vinext` and `@cloudflare/vite-plugin`. `npm run build`
produces `dist/server/index.js` — the worker the tests import directly — and the
client bundle beside it.

It also writes `dist/client/_headers`, and that file is generated rather than
checked in for a reason worth knowing. Wrapping the worker puts the security
headers on documents and on nothing else: Cloudflare's asset handler answers
`/assets/`, `/demos/` and `/fun/` before the worker ever runs, so the stylesheet —
frequently the first response a browser reads — went out bare. The plugin in
`build/` generates `_headers` from the same module the worker imports, so the two
cannot disagree, and carries vinext's own immutable-cache rule forward because
vinext only writes that file when it is absent.
