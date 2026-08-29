/**
 * Does the click come before the thing it causes?
 *
 * This is the one property none of the other harnesses could see. `visible.mjs` asks
 * whether a thing can be seen and `beat-shot.mjs` photographs a named frame, and a still
 * frame of a click landing in the wrong order looks exactly like a click landing in the
 * right one. It has to be watched.
 *
 * The fault it is here to catch: a scene's state is derived from its beat, and a beat
 * starts when it starts, but `PhantomCursor` schedules its press against the flight it
 * has just measured. So on any beat where the pointer both arrives and clicks, the thing
 * being clicked changed at 0ms and the click landed up to half a second later. Reported
 * twice in exactly those words. See `usePressGate`.
 *
 * So this samples the DOM as fast as it can and records, per beat, when the pointer's
 * press appeared and when the scene's own state changed. A negative gap is the fault.
 *
 *   node scripts/click-order.mjs                  # every scene with a click in it
 *   node scripts/click-order.mjs pdf-explainer    # one section
 *
 * Exit code is 1 if any watched state changed before its click.
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { chromium } from "playwright";
import { focusSection } from "./settle.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const only = process.argv[2];
/* Overridable so several of these can run at once — three scenes being built in
 * parallel git worktrees would otherwise all try to serve a preview on the same
 * port, and the second and third would fail for a reason that looks nothing like
 * the real one. The default is unchanged, so nothing that called this before has
 * to change now. */
const PORT = Number(process.env.PREVIEW_PORT ?? 4379);
const BASE = `http://localhost:${PORT}`;

/**
 * What to watch, per scene.
 *
 * `state` is a selector whose presence means the click's effect is on screen. It is
 * deliberately a selector rather than an attribute on the root: what a visitor sees is an
 * option turning green or a panel swapping, and those are the elements that say so.
 *
 * The sampler runs for a whole lap, so a scene only needs to be named once.
 */
const SCENES = [
  {
    id: "decaf",
    lapMs: 22_000,
    watch: [
      // The toolbar button pressed in, which is the frame the whole switch is about.
      { beat: "press", state: '.dc[data-did="press"]' },
      // The hold ring beginning to fill.
      { beat: "hold", state: '.dc-hold[data-holding="true"]' },
    ],
  },
  {
    id: "grt-next-bus",
    lapMs: 26_000,
    watch: [{ beat: "open", state: '.gx-popup[data-open="true"]' }],
  },
  {
    id: "pagepack",
    lapMs: 19_000,
    watch: [
      { beat: "press", state: '.pp[data-did="press"]' },
      { beat: "reveal", state: ".pp-library" },
    ],
  },
  {
    id: "pdf-explainer",
    lapMs: 26_000,
    watch: [
      { beat: "ask", state: ".pdfx-suggest [data-picked='true']" },
      // The panel swapping from the tutor to the practice set.
      { beat: "to-practice", state: ".pdfx-practice" },
      { beat: "pick", state: '.pdfx-option[data-state="chosen"]' },
      // A term tapped and waiting for its definition.
      { beat: "term-b", state: '.pdfx-match [data-held="true"]' },
      // And a pair locked in.
      { beat: "pair-a", state: '.pdfx-match [data-matched="true"]' },
    ],
  },
];

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

/* ---------------------------------- sampler -------------------------------- */

/**
 * Installed in the page, and it samples on `requestAnimationFrame` rather than from the
 * driver.
 *
 * Round-tripping one `evaluate` per sample gives about 25 samples a second on a good day,
 * which cannot resolve a 90ms ordering question at all — and worse, its jitter is the same
 * order as the thing being measured. This runs in the page's own frame loop, timestamps
 * every change against `performance.now()`, and is read back once at the end.
 */
const WATCH = ({ id, watch }) => {
  const section = document.querySelector(`#${id}`);
  const stage = section?.querySelector("[data-beat]");
  if (!stage) return false;

  const marks = [];
  let beat = null;
  const seen = new Map();

  const tick = () => {
    const now = performance.now();
    const current = stage.dataset.beat ?? null;
    if (current !== beat) {
      beat = current;
      marks.push({ kind: "beat", name: current, at: now });
      // A fresh window per beat: the same state can come and go across a lap.
      seen.clear();
    }

    /* The pointer's press. `data-pressing` is on for `HOLD_MS`, so a frame loop cannot
       miss it, and the ring is keyed per click — but the attribute is the honest signal
       because it is what the component sets at the instant it decides to press. */
    const pressing =
      section.querySelector('.ghost-cursor[data-pressing="true"]') !== null;
    if (pressing && !seen.has("press")) {
      seen.set("press", now);
      marks.push({ kind: "press", at: now, beat });
    }

    for (const item of watch) {
      if (seen.has(item.state)) continue;
      if (section.querySelector(item.state)) {
        seen.set(item.state, now);
        marks.push({ kind: "state", state: item.state, at: now, beat });
      }
    }

    window.__clickOrderFrame = requestAnimationFrame(tick);
  };

  window.__clickOrderMarks = marks;
  window.__clickOrderFrame = requestAnimationFrame(tick);
  return true;
};

/* ------------------------------------ run ---------------------------------- */

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on("pageerror", (error) => console.error(`  uncaught: ${error.message}`));
await page.goto(BASE, { waitUntil: "load" });
await page.waitForTimeout(2000);

let failures = 0;
console.log(`\ndoes the click come before the thing it causes? — 1440x1000\n`);

for (const scene of SCENES) {
  if (only && scene.id !== only) continue;
  await focusSection(page, scene.id);

  const started = await page.evaluate(WATCH, { id: scene.id, watch: scene.watch });
  if (!started) {
    console.log(`${scene.id}: no stage to watch\n`);
    continue;
  }
  // A whole lap plus the loop gap, so every beat in the list is met at least once.
  await page.waitForTimeout(scene.lapMs);
  const marks = await page.evaluate(() => {
    cancelAnimationFrame(window.__clickOrderFrame);
    return window.__clickOrderMarks;
  });

  console.log(`${scene.id}`);
  for (const item of scene.watch) {
    /* The first time this beat was entered, and what happened during it. A lap can enter
       the same beat more than once if the sampler catches a second pass; the first is the
       one to judge, because a state left over from the previous pass would flatter it. */
    const start = marks.find((mark) => mark.kind === "beat" && mark.name === item.beat);
    if (!start) {
      console.log(`  ${item.beat.padEnd(14)} never reached in this lap`);
      continue;
    }
    const inBeat = (kind, extra = () => true) =>
      marks.find(
        (mark) => mark.kind === kind && mark.at >= start.at && mark.beat === item.beat && extra(mark),
      );
    const press = inBeat("press");
    const change = inBeat("state", (mark) => mark.state === item.state);

    if (!change) {
      console.log(
        `  ${item.beat.padEnd(14)} the watched state never appeared: ${item.state}`,
      );
      failures += 1;
      continue;
    }
    if (!press) {
      console.log(
        `  ${item.beat.padEnd(14)} state at +${Math.round(change.at - start.at)}ms, ` +
          `but no press was seen on this beat`,
      );
      failures += 1;
      continue;
    }

    const gap = Math.round(change.at - press.at);
    const label =
      `  ${item.beat.padEnd(14)} press +${Math.round(press.at - start.at)}ms, ` +
      `effect +${Math.round(change.at - start.at)}ms`;
    if (gap < 0) {
      console.log(`${label}  <-- ${-gap}ms BEFORE the click`);
      failures += 1;
    } else {
      console.log(`${label}  ok (${gap}ms after)`);
    }
  }
  console.log("");
}

console.log(
  failures
    ? `\n${failures} effect${failures === 1 ? "" : "s"} out of order\n`
    : `\nevery watched effect follows its click\n`,
);

await browser.close();
await stop();
setTimeout(() => process.exit(failures ? 1 : 0), 1200).unref();
