# Three projects not on the page yet

Scene sketches for `2fa paster`, `reality room` and `urinal-flow-lab`. Nothing here
is wired into the site: no entry in `app/projects.ts`, no component in
`app/demos/`, no route. The site renders exactly seven projects and will keep
rendering seven until someone deliberately adds an eighth.

## What is in here

Each project has a document and a runnable prototype.

| project | notes | prototype |
| --- | --- | --- |
| 2FA Paster | [`ideas/2fa-paster.md`](./ideas/2fa-paster.md) | [`ideas/2fa-paster/prototype.html`](./ideas/2fa-paster/prototype.html) |
| Reality Room | [`ideas/reality-room.md`](./ideas/reality-room.md) | [`ideas/reality-room/prototype.html`](./ideas/reality-room/prototype.html) |
| urinal-flow-lab | [`ideas/urinal-flow-lab.md`](./ideas/urinal-flow-lab.md) | [`ideas/urinal-flow-lab/prototype.html`](./ideas/urinal-flow-lab/prototype.html) |

Each document carries the same four sections: what the project is in plain
language, suggested copy in the shape `app/projects.ts` expects (headline, why,
three note fragments, invitation), ten demo ideas, and a recommended scene written
as a shot list with millisecond durations.

Every prototype is one HTML file with no build step, no imports and no network
requests. Open it in a browser and it plays. Each was driven in headless Chromium
and observed advancing through its full beat list before being written down here,
so none of them is a sketch that has never run.

## The pattern they all follow

Deliberately the same one the live scenes use, so that promoting any of these is a
port rather than a rewrite:

- A root element carries `data-beat`. A single timer walks a table of named beats
  with millisecond durations and sets that attribute.
- CSS keys off the attribute. JS owns *when*; CSS owns *what it looks like*.
- Continuous motion reads `--beat-t`, a 0-to-1 fraction through the current beat
  written straight onto the node every frame, so nothing re-renders per frame.
- Anything that has to persist once it has happened reads an accumulating
  `data-reached` list rather than a single beat name.

The two heavier prototypes go slightly further and are worth reading for it.
`reality-room` derives every number it displays from the project's real constants
at load time, so the scene cannot drift away from the behaviour it is describing.
`urinal-flow-lab` runs an actual seeded droplet simulation on a canvas, because
150 ballistic droplets colliding with a 200-segment wall is not a CSS problem.

## The headline each one landed on

- **2FA Paster** — The code is in the box before you switch tabs.
- **Reality Room** — A wall takes your treble, not your volume.
- **urinal-flow-lab** — Splashback is a geometry problem.

## Two things to know before promoting any of these

**Reality Room has a real discrepancy in it.** The comment beside
`OCCLUSION_WALL_THICKNESS` in `client/src/audio/engine.js` says "~76% occlusion",
but the curve it feeds is `1 - exp(-chord/0.7)`, which gives 63% at one reference
thickness — 76% would need a full metre of material. The prototype prints the
derived 63%. Worth fixing in the project itself, or the comment will mislead the
next person who reads it.

**These are three more full-screen scenes on a page that already has seven.** The
page is around 8,400px and roughly nine screenfuls as it stands. Ten projects is
not seven projects plus three; it is a decision about whether this is still a page
someone reaches the bottom of. If they go on, some of the existing seven probably
have to become quieter to pay for them.
