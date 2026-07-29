/**
 * Photographs one demo scene beat by beat.
 *
 * `drive-site.mjs` answers "does the page work". This answers "does the film
 * read" — it scrolls to a pod, waits for each named beat to come around, and
 * writes a frame per beat into `outputs/film/<demo>/`. Reviewing a vignette any
 * other way means staring at a loop and trying to remember what the third second
 * looked like.
 *
 *   node scripts/film-strip.mjs pagepack
 *   node scripts/film-strip.mjs pagepack --headed
 *
 * Needs a current `npm run build`.
 */
import { spawn } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const demo = process.argv[2];
if (!demo) {
  console.error("usage: node scripts/film-strip.mjs <project-id> [--headed]");
  process.exit(1);
}
const headed = process.argv.includes("--headed");
const PORT = 4322;
const BASE = `http://localhost:${PORT}`;
const outDir = path.join(root, "outputs", "film", demo);

const server = spawn(
  process.execPath,
  [path.join(root, "node_modules", "vite", "bin", "vite.js"), "preview", "--port", String(PORT), "--strictPort"],
  { cwd: root, stdio: ["ignore", "pipe", "pipe"] },
);
const log = [];
server.stdout.on("data", (d) => log.push(String(d)));
server.stderr.on("data", (d) => log.push(String(d)));

const stop = async () => {
  if (process.platform === "win32" && server.pid) {
    await new Promise((resolve) =>
      spawn("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" }).on("close", resolve),
    );
  }
  server.kill();
};

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
    console.error(`server never started\n${log.join("")}`);
    await stop();
    process.exit(1);
  }
  await new Promise((r) => setTimeout(r, 400));
}

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: !headed });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const problems = [];
page.on("pageerror", (error) => problems.push(`uncaught: ${error.message}`));
page.on("console", (message) => {
  if (message.type() === "error") problems.push(`console: ${message.text()}`);
});

await page.goto(BASE, { waitUntil: "load" });
const section = page.locator(`#${demo}`);
await section.scrollIntoViewIfNeeded();

const stage = section.locator(".demo-surface > .demo-host > *").first();
await stage.waitFor({ state: "visible", timeout: 20_000 });

/* Photographed at the viewport, not cropped to the pod.
   These scenes throw things out of their frames and across the section on
   purpose, so a screenshot cropped to the stage cuts off the entire point — the
   first version of this script did exactly that, and the cards appeared to vanish
   at the frame's edge. */
const shotOf = (file) => page.screenshot({ path: file });

/**
 * Every beat the scene declares, photographed late rather than early.
 *
 * The first version shot 90ms after a beat began and produced a strip of
 * half-finished transitions — a card caught at 30% opacity over a dark wash looks
 * exactly like a card that has been wrongly greyed out, and I spent three rounds
 * of CSS changes chasing a bug that was in this loop. The scene publishes its own
 * progress through the current beat as `--beat-t`, so wait until the beat is most
 * of the way done and photograph what it actually settled on.
 */
const SHOOT_AT = 0.72;
const seen = new Map();
const started = Date.now();
let shot = 0;

const read = () =>
  stage.evaluate((el) => ({
    beat: el.dataset.beat ?? null,
    lap: Number(el.dataset.lap ?? "0"),
    t: Number(el.style.getPropertyValue("--beat-t") || "0"),
  }));

while (Date.now() - started < 60_000) {
  const { beat, lap, t } = await read();

  if (beat && !seen.has(beat) && t >= SHOOT_AT) {
    const file = `${String(shot++).padStart(2, "0")}-${beat}.png`;
    await shotOf(path.join(outDir, file));
    seen.set(beat, file);
    console.log(`  ${file}`);
  }

  // A completed lap means every beat has come around at least once.
  if (lap > 0 && seen.size > 1) break;

  await page.waitForTimeout(40);
}

await browser.close();
await stop();

console.log(`\n${seen.size} beats -> ${path.relative(root, outDir)}`);
if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exitCode = 1;
}
