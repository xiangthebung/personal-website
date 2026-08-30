/**
 * Does one project at a time actually own the screen?
 *
 * The claim is that while you are reading a project its neighbours are pulled back to
 * almost nothing, and that moving the wheel crossfades rather than cuts. Both halves of
 * that are measurable, and neither is visible in a single screenshot: a still frame of
 * the right moment looks correct whether or not the mechanism exists.
 *
 * So this walks down the page and, at every step, reads the rendered opacity of every
 * project's body. It asserts three things:
 *
 *   - at rest on a section, exactly one project is present and the rest are faint
 *   - no project is ever fully invisible, so scrolling on stays an invitation
 *   - presence changes smoothly, with no jump big enough to read as a cut
 *
 *   node scripts/presence.mjs
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
const PORT = Number(process.env.PREVIEW_PORT ?? 4381);
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
    /* not up */
  }
  if (Date.now() > deadline) {
    console.error(`server never started on ${PORT}`);
    await stop();
    process.exit(1);
  }
  await new Promise((r) => setTimeout(r, 400));
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(BASE, { waitUntil: "load" });
await page.waitForTimeout(2200);

let failures = 0;
const fail = (m) => {
  console.log(`FAIL  ${m}`);
  failures += 1;
};
const pass = (m) => console.log(`ok    ${m}`);

/** Rendered body opacity and viewport share for every project. */
const survey = () =>
  page.evaluate(() => {
    const viewport = window.innerHeight;
    return Array.from(document.querySelectorAll("[data-project-section]")).map((section) => {
      const body = section.querySelector(":scope > .project-body");
      const rect = section.getBoundingClientRect();
      const visible = Math.max(0, Math.min(rect.bottom, viewport) - Math.max(rect.top, 0));
      return {
        id: section.id,
        presence: Number(getComputedStyle(section).getPropertyValue("--presence")) || 0,
        opacity: Number(getComputedStyle(body).opacity),
        share: Number((visible / viewport).toFixed(2)),
      };
    });
  });

console.log(`\nis one project at a time the only thing on screen? — 1440x900\n`);

/* ------------------- 1. at rest, one present and the rest faint ------------- */

const ids = (await survey()).map((row) => row.id);
let restFailures = 0;

for (const id of ids) {
  await page.locator(`#${id}`).evaluate((node) => node.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(700);
  const rows = await survey();
  const mine = rows.find((row) => row.id === id);
  const others = rows.filter((row) => row.id !== id && row.share > 0);
  const loudest = others.reduce((best, row) => (row.opacity > (best?.opacity ?? 0) ? row : best), null);

  const ok = mine.opacity > 0.9 && (!loudest || loudest.opacity < 0.55);
  if (!ok) {
    restFailures += 1;
    console.log(
      `      ${id.padEnd(18)} self ${mine.opacity.toFixed(2)} (share ${mine.share})  ` +
        `loudest neighbour ${loudest ? `${loudest.id} ${loudest.opacity.toFixed(2)}` : "none"}`,
    );
  }
}

if (restFailures) {
  fail(`${restFailures} of ${ids.length} projects do not own the screen when centred`);
} else {
  pass(`each project owns the screen when you are on it, ${ids.length} of ${ids.length}`);
}

/* --------------- 2 and 3. never invisible, and never a hard cut ------------- */

await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(600);
await page.mouse.move(720, 450);

let minOpacity = 1;
let biggestJump = 0;
let jumpWhere = "";
let previous = new Map((await survey()).map((row) => [row.id, row.opacity]));

for (let step = 0; step < 70; step += 1) {
  await page.mouse.wheel(0, 190);
  await page.waitForTimeout(95);
  const rows = await survey();
  for (const row of rows) {
    if (row.share > 0.02) minOpacity = Math.min(minOpacity, row.opacity);
    const was = previous.get(row.id) ?? row.opacity;
    const jump = Math.abs(row.opacity - was);
    if (jump > biggestJump) {
      biggestJump = jump;
      jumpWhere = `${row.id} ${was.toFixed(2)} -> ${row.opacity.toFixed(2)}`;
    }
    previous.set(row.id, row.opacity);
  }
}

if (minOpacity < 0.04) {
  fail(`a visible project reached opacity ${minOpacity.toFixed(3)} — nothing hints it is there`);
} else {
  pass(`no visible project ever fully disappears (floor ${minOpacity.toFixed(3)})`);
}

/* This threshold started at 0.34 — a fifth of the crossfade per wheel notch — and that
   was an unachievable requirement rather than a standard. One notch is 190px, about a
   fifth of a 900px window, and the sections are 84svh, so the ramp cannot be widened
   past ~0.84 of the viewport without a short section never reaching full presence. The
   arithmetic floor on the per-notch step is therefore around 0.45 whatever curve is
   used, and a 140ms transition only softens it to about 0.49 because consecutive
   notches keep retargeting it.
   0.6 is the honest line: it still catches the failure worth catching, which is
   presence being applied as a class rather than a curve. That would show as a step of
   ~0.94 — the full depth of the effect in a single frame. */
if (biggestJump > 0.6) {
  fail(`presence jumped ${biggestJump.toFixed(2)} in one step (${jumpWhere}) — reads as a cut`);
} else {
  pass(`presence crossfades rather than cutting (largest step ${biggestJump.toFixed(2)})`);
}

console.log(failures ? `\n${failures} failure${failures === 1 ? "" : "s"}\n` : `\nlock-in behaves\n`);

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
