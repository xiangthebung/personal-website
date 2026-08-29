/**
 * When you are standing in a project, is it the only thing on screen?
 *
 * The page's claim is that a section you are reading owns the whole window: `.project-tint`
 * washes every *other* section toward `--ambient-bg` by however much presence it has lost,
 * and `.project-seam` washes both sides of every join at full strength. Between them, a
 * neighbour poking into the top or bottom of the viewport should be indistinguishable from
 * the paper of the project you are in.
 *
 * Nothing here could see when that stopped being true, and the gap is precise enough to be
 * worth writing down: `seam.mjs` scrolls each *join* to the middle of the window, so both
 * sections are at half presence and both have been seen. That is a different state from the
 * one a visitor spends all their time in — a section centred, its neighbours barely on
 * screen and, crucially, *not yet arrived*. Layers that key off `is-seen` are still up in
 * that state, and a layer painted above `.project-tint` cannot be washed by it.
 *
 * That is exactly how a near-black rectangle came to be sitting across the bottom of GRT
 * Next Bus: Night Neutralizer's entrance curtain, `#04060a` at `z-index: 5`, held at full
 * opacity until its own section is reached. `seam.mjs` waits 2200ms for that curtain to
 * lift before it measures — see the note in it — so the one harness aimed anywhere near
 * this boundary was specifically arranged not to see the fault.
 *
 *   node scripts/immersion.mjs              # every section, 1440x900
 *   node scripts/immersion.mjs 2560 1440    # at another size
 *
 * For each section it reports the worst deviation from the ambient colour found in the
 * rows of the viewport that belong to a *neighbour*, and where that row is. Writes the
 * viewport shots to `outputs/immersion/` so a number can be checked against a picture.
 */
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WIDTH = Number(process.argv[2] || 1440);
const HEIGHT = Number(process.argv[3] || 900);
/* Overridable so several of these can run at once — three scenes being built in
 * parallel git worktrees would otherwise all try to serve a preview on the same
 * port, and the second and third would fail for a reason that looks nothing like
 * the real one. The default is unchanged, so nothing that called this before has
 * to change now. */
const PORT = Number(process.env.PREVIEW_PORT ?? 4387);
const BASE = `http://localhost:${PORT}`;
const outDir = path.join(root, "outputs", "immersion");

/**
 * How far a neighbour's row may sit from the ambient colour, in 8-bit sRGB.
 *
 * Not zero, and it cannot be: the tint's opacity is `1 - presence`, so a neighbour at
 * presence 0.03 keeps three per cent of its own paper. Across the widest pairing on the
 * page — Night Neutralizer's `#05070b` against GRT's `#d8f2e7`, about 210 levels apart —
 * that residue is six or seven levels.
 *
 * 24 is comfortably above that and far below the thing this exists to catch. An opaque
 * curtain leaking into the previous section measures in the hundreds.
 */
const LIMIT = 24;

/* ---------------------------------- server --------------------------------- */

const server = spawn(
  process.execPath,
  [
    path.join(root, "node_modules", "vite", "bin", "vite.js"),
    "preview",
    "--port",
    String(PORT),
    "--strictPort",
  ],
  { cwd: root, stdio: ["ignore", "pipe", "pipe"] },
);
const log = [];
server.stdout.on("data", (d) => log.push(String(d)));
server.stderr.on("data", (d) => log.push(String(d)));

async function stop() {
  if (process.platform === "win32" && server.pid) {
    await new Promise((resolve) =>
      spawn("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" }).on(
        "close",
        resolve,
      ),
    );
  }
  server.kill();
}

const deadline = Date.now() + 90_000;
for (;;) {
  if (server.exitCode !== null) {
    console.error(log.join(""));
    process.exit(1);
  }
  try {
    if ((await fetch(BASE, { signal: AbortSignal.timeout(2000) })).ok) break;
  } catch {
    /* not up yet */
  }
  if (Date.now() > deadline) {
    console.error(`server never started on ${PORT}\n${log.join("")}`);
    await stop();
    process.exit(1);
  }
  await new Promise((r) => setTimeout(r, 400));
}

await mkdir(outDir, { recursive: true });

/* ------------------------------------ run ---------------------------------- */

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
page.on("pageerror", (error) => console.error(`  uncaught: ${error.message}`));
await page.goto(BASE, { waitUntil: "load" });
await page.waitForTimeout(2400);

const sections = await page.evaluate(() =>
  Array.from(document.querySelectorAll("[data-project-section]")).map((node) => node.id),
);

console.log(
  `\nis the project you are standing in the only thing on screen? — ${WIDTH}x${HEIGHT}\n`,
);

let failures = 0;

/**
 * Every scroll position at which a section is the one you are standing in — not just the
 * one where it is centred.
 *
 * Centring only was the first version of this, and it reported the whole page clean while
 * the fault was on screen. Four of the seven sections are taller than a laptop window, so
 * centred is precisely the offset at which no neighbour is visible at all: GRT Next Bus
 * measured `0px above, 0px below`, which is a section with nothing to leak into it rather
 * than a section that is not leaking.
 *
 * A visitor does not sit at one offset. They stop wherever the wheel left them, and
 * anywhere in the upper or lower part of that range a neighbour is on screen while this
 * section is still the one being read. So the sweep runs from the section's top meeting the
 * top of the window to its bottom meeting the bottom, which is the whole band over which it
 * owns the view, and takes the worst leak anywhere in it.
 */
const SWEEP = 7;

for (const id of sections) {
  /* Settled once, before the sweep, so the section's own height has stopped changing.
     The scenes mount lazily and a section's height changes as it approaches the window, so
     offsets computed against a stale layout land somewhere else. */
  for (let pass = 0; pass < 3; pass += 1) {
    const offBy = await page.evaluate((target) => {
      const node = document.querySelector(`#${target}`);
      const box = node.getBoundingClientRect();
      const top = box.top + window.scrollY;
      window.scrollTo({
        top: Math.round(top - (window.innerHeight - box.height) / 2),
        behavior: "instant",
      });
      const after = node.getBoundingClientRect();
      return Math.round(after.top + after.height / 2 - window.innerHeight / 2);
    }, id);
    await page.waitForTimeout(500);
    if (Math.abs(offBy) <= 2) break;
  }

  /* Long enough for this section's own entrance to be over, so what is left in a
     neighbour's rows is layout rather than an animation still running. */
  await page.waitForTimeout(2200);

  /* The band of scroll offsets over which this section owns the view: from its top level
     with the top of the window, to its bottom level with the bottom. */
  const span = await page.evaluate((target) => {
    const node = document.querySelector(`#${target}`);
    const box = node.getBoundingClientRect();
    const top = box.top + window.scrollY;
    return { from: Math.round(top), to: Math.round(top + box.height - window.innerHeight) };
  }, id);

  /**
   * How many offsets were actually judged, and it is reported rather than assumed.
   *
   * The first two versions of this harness both came back green by measuring nothing — once
   * because every offset was skipped, and once because a section with no deviation left the
   * `worst` record at its initial zero and printed a blank reading that looked identical to
   * a skip. A count is the only thing that tells those apart from the outside, and a run
   * that judged no offsets is a failure here rather than a pass.
   */
  let samples = 0;
  /* Rows of a *neighbouring project* actually judged, across the whole sweep. Counted for
     the same reason as `samples`: a section whose neighbours never appear on screen has not
     been shown to be immersive, it has only failed to be tested. */
  let rowsJudged = 0;
  let worst = { off: 0, at: 0, band: "", presence: 0, room: "", shot: null };
  let leakingPx = 0;

  for (let step = 0; step < SWEEP; step += 1) {
    const offset =
      span.to <= span.from
        ? Math.round((span.from + span.to) / 2)
        : Math.round(span.from + ((span.to - span.from) * step) / (SWEEP - 1));

    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), offset);

    /**
     * Then let the page catch up, and only then read it.
     *
     * Scrolling and reading `is-active` in one `evaluate` was the second thing this harness
     * got wrong, and it failed silently in the most misleading way available: the class is
     * set from an `IntersectionObserver` callback, which cannot have run yet inside the same
     * task that scrolled. So every offset reported `active: false`, every offset was
     * skipped, and the run came back with `presence 0.00 ... ok` for six of the seven
     * sections — a pass produced by measuring nothing at all.
     *
     * 700ms also covers the tint and seam's own 380ms crossfade, so what is measured is a
     * settled layout rather than an animation halfway through.
     */
    await page.waitForTimeout(700);

    const probe = await page.evaluate(
      (target) => {
        const node = document.querySelector(`#${target}`);
        const box = node.getBoundingClientRect();
        const ambient = getComputedStyle(document.documentElement)
          .getPropertyValue("--ambient-bg")
          .trim();
        /* Resolved through a throwaway element: `--ambient-bg` is written as whatever token
           the theme used, and only the browser can turn that into channels. */
        const ruler = document.createElement("div");
        ruler.style.cssText = `position:fixed;visibility:hidden;background:${ambient}`;
        document.body.append(ruler);
        const rgb = getComputedStyle(ruler).backgroundColor;
        ruler.remove();
        return {
          top: Math.round(box.top),
          bottom: Math.round(box.bottom),
          active: node.classList.contains("is-active"),
          presence: Number(getComputedStyle(node).getPropertyValue("--presence")),
          ambient: (rgb.match(/[\d.]+/g) || []).slice(0, 3).map(Number),
          /**
           * Where the *other projects* are, and only them.
           *
           * The claim under test is that the project you are standing in is the only
           * project on screen — not that it is the only thing on screen. The page has a
           * hero above the run and a gallery below it, both on the site's own paper, and
           * neither is washed toward `--ambient-bg` because neither is a project. Judging
           * every row this section does not own reported both of those as faults: the
           * gallery's pale paper is 208/255 from N-Back's dark green, and it is supposed
           * to be. That is the same "measuring furniture" mistake `seam.mjs` records
           * making twice.
           */
          neighbours: Array.from(document.querySelectorAll("[data-project-section]"))
            .filter((other) => other !== node)
            .map((other) => {
              const rect = other.getBoundingClientRect();
              return { top: Math.round(rect.top), bottom: Math.round(rect.bottom) };
            }),
        };
      },
      id,
    );

    /* Only offsets at which this really is the section being read. At the ends of a short
       section's span the neighbour can legitimately have taken over, and a neighbour that
       owns the screen is not a leak. */
    if (!probe.active) continue;
    samples += 1;

    const shot = await page.screenshot();
    const { data, info } = await sharp(shot).raw().toBuffer({ resolveWithObject: true });
    const scale = info.height / HEIGHT;

    /**
     * Every 24th column, tenth percentile, exactly as `seam.mjs` samples.
     *
     * A section boundary runs the full width, so the thing being looked for is a deviation
     * most of the width agrees on. Sampling one column would measure whichever piece of
     * furniture happens to be in it — the dock on the right, the ghost numbers on the left,
     * a drawn road two thirds of the way across.
     */
    const rowDeviation = (y) => {
      const across = [];
      for (let x = 0; x < info.width; x += 24) {
        const i = (y * info.width + x) * info.channels;
        across.push(
          Math.max(
            Math.abs(data[i] - probe.ambient[0]),
            Math.abs(data[i + 1] - probe.ambient[1]),
            Math.abs(data[i + 2] - probe.ambient[2]),
          ),
        );
      }
      across.sort((a, b) => a - b);
      return across[Math.floor(across.length * 0.1)];
    };

    /* Only the rows another project owns. Inside this section the artwork is allowed to be
       any colour it likes — that is the section a visitor came for — and outside the run
       altogether the hero and the gallery keep the site's own paper on purpose. */
    const inNeighbour = (cssY) =>
      probe.neighbours.some((rect) => cssY >= rect.top && cssY < rect.bottom);

    const bands = [
      ["above", 0, Math.max(0, Math.min(HEIGHT, probe.top))],
      ["below", Math.max(0, Math.min(HEIGHT, probe.bottom)), HEIGHT],
    ];

    for (const [band, fromCss, toCss] of bands) {
      let leaking = 0;
      let localWorst = 0;
      let localAt = 0;
      for (let y = Math.round(fromCss * scale); y < Math.round(toCss * scale); y += 1) {
        if (y < 0 || y >= info.height) continue;
        if (!inNeighbour(Math.round(y / scale))) continue;
        rowsJudged += 1;
        const off = rowDeviation(y);
        if (off > LIMIT) leaking += 1;
        if (off > localWorst) {
          localWorst = off;
          localAt = Math.round(y / scale);
        }
      }
      if (localWorst > worst.off || !worst.room) {
        worst = {
          off: localWorst,
          at: localAt,
          band,
          presence: probe.presence,
          room:
            `${Math.max(0, probe.top)}px above, ` +
            `${Math.max(0, HEIGHT - probe.bottom)}px below`,
          shot,
        };
        leakingPx = Math.round(leaking / scale);
      }
    }
  }

  if (worst.shot) await writeFile(path.join(outDir, `${WIDTH}x${HEIGHT}-${id}.png`), worst.shot);

  const label = id.padEnd(20);
  const seen = `${samples}/${SWEEP} offsets`.padEnd(15);
  if (!samples) {
    console.log(`${label} ${seen} never the active section  <-- NOT MEASURED`);
    failures += 1;
  } else if (!rowsJudged) {
    /* Not a failure. The first and last sections in the run are taller than some windows,
       and at every offset where they own the view their only neighbour is the hero or the
       gallery. There is nothing to leak, so there is nothing to report. */
    console.log(`${label} ${seen} no neighbouring project on screen at any offset`);
  } else if (worst.off > LIMIT) {
    console.log(
      `${label} ${seen} ${worst.room.padEnd(26)}` +
        `off by ${String(Math.round(worst.off)).padStart(3)} ` +
        `over ${String(leakingPx).padStart(3)}px ` +
        `(${worst.band}, y=${worst.at})  <-- LEAKING`,
    );
    failures += 1;
  } else {
    console.log(
      `${label} ${seen} ${worst.room.padEnd(26)}` +
        `off by ${String(Math.round(worst.off)).padStart(3)} over ${rowsJudged} rows  ok`,
    );
  }
}

console.log(
  failures
    ? `\n${failures} section${failures === 1 ? "" : "s"} with a neighbour showing through` +
        ` — pictures in outputs/immersion\n`
    : `\nno neighbour deviates from the ambient colour by more than ${LIMIT}/255` +
        ` — pictures in outputs/immersion\n`,
);

await browser.close();
await stop();
setTimeout(() => process.exit(failures ? 1 : 0), 1200).unref();
