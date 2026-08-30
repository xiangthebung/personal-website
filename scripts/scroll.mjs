/**
 * Can you actually scroll this page, and does the right project claim your screen?
 *
 * Two reported faults, both invisible to every other check here because both are about
 * behaviour over time rather than about a rendered frame:
 *
 *  1. The choir section embeds a full application in an iframe. With the pointer over
 *     the score, the wheel scrolled the score's own pane and the page stayed put —
 *     "the bar keeps going and the page stops". The section is nearly a screenful, so
 *     the pointer is over the app for most of the way past it, which made the page
 *     genuinely difficult to leave.
 *
 *  2. Decaf's heart deluge is portalled to the viewport, and it was gated on
 *     `useOnScreen` — true as soon as one pixel of the stage crosses the bottom edge,
 *     plus 120px of lead. So reading Choir Practice and nudging the wheel filled the
 *     screen with hearts belonging to the next section down.
 *
 * This drives a real wheel over real coordinates and asserts on what happens. Exit code
 * 1 on any failure.
 *
 *   node scripts/scroll.mjs
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
/* Overridable so several of these can run at once — three scenes being built in
 * parallel git worktrees would otherwise all try to serve a preview on the same
 * port, and the second and third would fail for a reason that looks nothing like
 * the real one. The default is unchanged, so nothing that called this before has
 * to change now. */
const PORT = Number(process.env.PREVIEW_PORT ?? 4371);
const BASE = `http://localhost:${PORT}`;

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

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(BASE, { waitUntil: "load" });
await page.waitForTimeout(2400);

let failures = 0;
const fail = (message) => {
  console.log(`FAIL  ${message}`);
  failures += 1;
};
const pass = (message) => console.log(`ok    ${message}`);

const scrollY = () => page.evaluate(() => window.scrollY);
const activeSection = () =>
  page.evaluate(
    () =>
      document.querySelector("[data-project-section].is-active")?.id ?? "(none)",
  );

/* -------------------- 1. the wheel over the choir app --------------------- */

console.log(`\nwheel and focus behaviour — 1440x900\n`);

const choir = page.locator("#choir-practice");
await choir.evaluate((node) => node.scrollIntoView({ block: "center" }));
await page.waitForTimeout(1600);

const frame = page.locator("#choir-practice .choir-frame");
if ((await frame.count()) === 0) {
  fail("the choir frame never mounted, so the wheel test cannot run");
} else {
  const box = await frame.boundingBox();
  // Dead centre of the application — the worst case, over the score itself.
  const px = box.x + box.width / 2;
  const py = box.y + box.height / 2;

  await page.mouse.move(px, py);
  const before = await scrollY();
  for (let i = 0; i < 6; i += 1) {
    await page.mouse.wheel(0, 220);
    await page.waitForTimeout(90);
  }
  await page.waitForTimeout(500);
  const after = await scrollY();
  const moved = after - before;

  if (moved < 600) {
    fail(
      `the page barely moved with the pointer over the choir app: ${moved}px for 1320px of wheel — the frame is still eating the scroll`,
    );
  } else {
    pass(`wheel over the choir app scrolls the page (${moved}px for 1320px of wheel)`);
  }

  /* Re-measure. The wheel above just moved the document 1320px, so the coordinates
     used for it are pointing at a different section now — the first version of this
     test hit-tested the stale point and reported `demo-surface`, which was three
     sections down and entirely correct. */
  await choir.evaluate((node) => node.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(1000);
  const fresh = await frame.boundingBox();
  const fx = fresh.x + fresh.width / 2;
  const fy = fresh.y + fresh.height / 2;

  // The shield must be what is under the pointer, not the frame.
  const onTop = await page.evaluate(
    ([x, y]) => {
      const hit = document.elementFromPoint(x, y);
      return hit?.className?.toString?.() ?? hit?.tagName ?? "(nothing)";
    },
    [fx, fy],
  );
  if (/choir-shield/.test(onTop)) {
    pass(`the shield is under the pointer, not the iframe`);
  } else {
    fail(`expected the shield under the pointer over the app, found "${onTop}"`);
  }

  // Clicking it must hand the app over.
  await page.mouse.click(fx, fy);
  await page.waitForTimeout(500);
  const engaged = await page
    .locator("#choir-practice .choir-shield")
    .getAttribute("data-engaged");
  if (engaged === "true") pass(`clicking the shield hands the app the wheel`);
  else fail(`clicking the shield did not engage it (data-engaged=${engaged})`);
}

/* ---------- 2. the deluge must belong to the section you are in ----------- */

// Back to the top of the choir section and creep down, watching for Decaf's hearts.
await choir.evaluate((node) => node.scrollIntoView({ block: "start" }));
await page.waitForTimeout(1200);

let leaked = null;
let sawDrops = false;
const trail = [];

/**
 * Can Decaf's effects paint on a neighbouring project?
 *
 * The first version of this asked the wrong question. It measured how much of the
 * viewport the *other* projects held whenever a drop existed, and failed whenever a
 * neighbour held more than a third of the screen — which is most ordinary reading
 * positions, because these sections are 84svh and two are visible almost always.
 *
 * Coverage was never the guarantee. The guarantee is the clip: the portalled layer is
 * clipped every frame to the section's own rectangle, so a heart physically cannot be
 * drawn outside Decaf however much of the window the neighbour has. Raising the
 * coverage threshold instead only stopped the effects appearing at all.
 *
 * So this asserts the mechanism. The layer must carry a `clip-path: inset(...)` whose
 * top and bottom match the section's real position, within a frame's worth of
 * tolerance. If somebody removes the clip loop, this fails immediately — which is the
 * regression worth catching, and the one a coverage threshold would sail straight
 * past.
 */
const survey = () =>
  page.evaluate(() => {
    const height = window.innerHeight;
    const sections = Array.from(document.querySelectorAll("[data-project-section]"));
    const coverage = {};
    for (const section of sections) {
      const box = section.getBoundingClientRect();
      const visible = Math.max(0, Math.min(box.bottom, height) - Math.max(box.top, 0));
      if (visible > 0) coverage[section.id] = Number((visible / height).toFixed(2));
    }
    /* The clip, and what it should be. */
    const layer = document.querySelector(".dc-deluge");
    const decaf = document.getElementById("decaf");
    let clip = null;
    if (layer && decaf) {
      const box = decaf.getBoundingClientRect();
      const match = /inset\(([-\d.]+)px\s+[-\d.]+px\s+([-\d.]+)px/.exec(
        layer.style.clipPath || "",
      );
      clip = {
        raw: layer.style.clipPath || "(none)",
        top: match ? Number(match[1]) : null,
        bottom: match ? Number(match[2]) : null,
        wantTop: Math.max(0, Math.round(box.top)),
        wantBottom: Math.max(0, Math.round(height - box.bottom)),
      };
    }

    return {
      active: document.querySelector("[data-project-section].is-active")?.id ?? "(none)",
      drops: document.querySelectorAll(".dc-drop").length,
      spam: document.querySelectorAll(".dc-spam-card").length,
      y: Math.round(window.scrollY),
      coverage,
      clip,
    };
  });

/* One frame of scroll at wheel speed. The clip is written in a rAF loop, so it can
   legitimately trail the measurement by a frame. */
const CLIP_TOLERANCE = 24;

for (let step = 0; step < 30; step += 1) {
  const state = await survey();
  trail.push(`${state.active}:${state.drops}`);

  if (state.drops > 0 || state.spam > 0) {
    sawDrops = true;
    if (state.active !== "decaf") leaked ??= { ...state, why: "wrong active section" };

    const clip = state.clip;
    if (!clip || clip.top === null) {
      leaked ??= { ...state, why: `the layer carries no inset clip (${clip?.raw ?? "no layer"})` };
    } else if (
      Math.abs(clip.top - clip.wantTop) > CLIP_TOLERANCE ||
      Math.abs(clip.bottom - clip.wantBottom) > CLIP_TOLERANCE
    ) {
      leaked ??= {
        ...state,
        why:
          `the clip does not match the section: inset top ${clip.top} bottom ${clip.bottom}, ` +
          `section wants top ${clip.wantTop} bottom ${clip.wantBottom}`,
      };
    }
  }

  await page.mouse.wheel(0, 160);
  await page.waitForTimeout(180);
}

if (leaked) {
  fail(
    `Decaf's effects were on screen when they should not be — ${leaked.why} ` +
      `(${leaked.drops} drops, ${leaked.spam} notifications, scrollY ${leaked.y}, coverage ${JSON.stringify(leaked.coverage)})`,
  );
} else {
  pass(`Decaf's effects stay clipped to Decaf, whatever else is on screen`);
}
if (!sawDrops) {
  console.log(
    `note  the deluge was never seen during this pass, so the leak check proved nothing`,
  );
}

/* ------------------- 3. the page never refuses to move -------------------- */

/* Reloaded, so this measures the state a visitor actually arrives in. The previous
   version ran this pass straight after clicking into the choir app, which left the
   score's own pane consuming the wheel — legitimate nested scrolling, and not the thing
   being tested. What matters here is that someone who has touched nothing can get from
   the top of the page to the bottom. */
await page.reload({ waitUntil: "load" });
await page.waitForTimeout(2400);
await page.mouse.move(720, 450);

let stalls = 0;
let previous = await scrollY();

const waitForScrollToSettle = async (idleMs = 90, timeoutMs = 1200) =>
  page.evaluate(
    ({ idleMs: idle, timeoutMs: timeout }) =>
      new Promise((resolve) => {
        let idleTimer;
        let timeoutTimer;
        let finished = false;

        const finish = () => {
          if (finished) return;
          finished = true;
          window.removeEventListener("scroll", scheduleFinish);
          window.clearTimeout(idleTimer);
          window.clearTimeout(timeoutTimer);
          resolve();
        };
        const scheduleFinish = () => {
          window.clearTimeout(idleTimer);
          idleTimer = window.setTimeout(finish, idle);
        };

        window.addEventListener("scroll", scheduleFinish, { passive: true });
        scheduleFinish();
        timeoutTimer = window.setTimeout(finish, timeout);
      }),
    { idleMs, timeoutMs },
  );

let reachedBottom = false;
let stepsRun = 0;
for (let step = 0; step < 60; step += 1) {
  await page.mouse.wheel(0, 320);
  await waitForScrollToSettle();
  stepsRun = step + 1;

  // Lazy demos replace intrinsic placeholders as this pass reaches them, so the
  // document height is live state rather than a number that can be snapshotted at
  // the top. Comparing against the initial height counted every wheel at the real
  // bottom as a stall whenever the final laid-out page was shorter than its hints.
  const { now, maxScroll } = await page.evaluate(() => ({
    now: window.scrollY,
    maxScroll: document.documentElement.scrollHeight - window.innerHeight,
  }));
  if (now >= maxScroll - 4) {
    reachedBottom = true;
    break;
  }
  if (now <= previous + 2) stalls += 1;
  previous = now;
}

if (!reachedBottom) {
  fail(`the page never reached the bottom after ${stepsRun} wheel steps`);
} else if (stalls > 4) {
  fail(`the page stalled on ${stalls} of ${stepsRun} wheel steps on the way down`);
} else {
  pass(`a wheel all the way down never gets stuck (${stalls} stalled steps of ${stepsRun})`);
}

const finalActive = await activeSection();
console.log(`\nactive section at the bottom of the run: ${finalActive}`);
console.log(
  failures ? `\n${failures} behaviour failure${failures === 1 ? "" : "s"}\n` : `\nscroll behaviour is sound\n`,
);

await browser.close();
await stop();
/* `process.exitCode` first, and the timer only as a backstop.

   `.unref()` says that timer must not keep the process alive, so with nothing else
   pending node reaches the end of this script and exits 0 before it fires. Every one
   of these review scripts had that shape, which meant any of them could print its
   failures and still hand back success — and a caller, a CI step or an `&&` chain
   would read that as a pass. Found in `visible.mjs` by pointing a required check at a
   beat that does not exist: it printed FAIL and exited 0. `exitCode` is what node uses
   when it exits on its own, so the status is right on whichever path runs. */
process.exitCode = failures ? 1 : 0;
setTimeout(() => process.exit(failures ? 1 : 0), 1200).unref();
