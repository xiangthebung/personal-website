/**
 * Photographs one section whole, at a chosen viewport width, on chosen beats.
 *
 * `film-strip.mjs` shoots a 1280x900 viewport, which crops any pod taller than the
 * window — on GRT that meant the road band, the bottom third of the scene, was
 * missing from every frame. `wide-shot.mjs` shoots whole sections but takes whatever
 * beat happens to be showing, which is no use for checking the one moment a scene is
 * built around. This does both: a named width, a named beat, the whole section.
 *
 *   node work/beat-shot.mjs grt-next-bus 2560 due gone
 *   node work/beat-shot.mjs pagepack 2560 scatter
 *
 * Writes `outputs/beats/<width>-<id>-<beat>.png`, and reports horizontal overflow
 * plus the stage box, which is what tells you whether a scene is still the size it
 * was composed at.
 */
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { chromium } from "playwright";
import { focusSection } from "./settle.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [id, widthArg, ...beats] = process.argv.slice(2);
if (!id) {
  console.error("usage: node work/beat-shot.mjs <section-id> [width] [beat…]");
  process.exit(1);
}
const width = Number(widthArg || 1440);
/* Overridable so several of these can run at once — three scenes being built in
 * parallel git worktrees would otherwise all try to serve a preview on the same
 * port, and the second and third would fail for a reason that looks nothing like
 * the real one. The default is unchanged, so nothing that called this before has
 * to change now. */
const PORT = Number(process.env.PREVIEW_PORT ?? 4337);
const BASE = `http://localhost:${PORT}`;
const outDir = path.join(root, "outputs", "beats");

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

const stop = async () => {
  if (process.platform === "win32" && server.pid) {
    await new Promise((resolve) =>
      spawn("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" }).on(
        "close",
        resolve,
      ),
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

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: 1200 } });
const problems = [];
page.on("pageerror", (error) => problems.push(`uncaught: ${error.message}`));
page.on("console", (message) => {
  if (message.type() === "error") problems.push(`console: ${message.text()}`);
});

await page.goto(BASE, { waitUntil: "load" });
const section = page.locator(`#${id}`);
if (!(await focusSection(page, id))) console.error(`  ${id}: never became active`);
const stage = section.locator("[data-beat]").first();
await stage.waitFor({ state: "visible", timeout: 20_000 });

const overflow = await page.evaluate(() => ({
  scrollWidth: document.scrollingElement.scrollWidth,
  clientWidth: document.scrollingElement.clientWidth,
}));
console.log(
  `${id} at ${width}px — document ${overflow.scrollWidth} in ${overflow.clientWidth}` +
    (overflow.scrollWidth > overflow.clientWidth ? "  <-- HORIZONTAL OVERFLOW" : "  ok"),
);

const read = () =>
  stage.evaluate((el) => ({
    beat: el.dataset.beat ?? null,
    t: Number(el.style.getPropertyValue("--beat-t") || "0"),
    stage: `${el.offsetWidth}x${el.offsetHeight}`,
  }));

/* No beats named means "whatever is showing", which is enough to check a size. */
if (beats.length === 0) {
  const state = await read();
  await section.screenshot({ path: path.join(outDir, `${width}-${id}-${state.beat}.png`) });
  console.log(`  ${state.beat}: stage ${state.stage}`);
} else {
  const seen = new Set();
  const started = Date.now();
  while (Date.now() - started < 120_000 && seen.size < beats.length) {
    const state = await read();
    if (state.beat && beats.includes(state.beat) && !seen.has(state.beat) && state.t >= 0.75) {
      await section.screenshot({ path: path.join(outDir, `${width}-${id}-${state.beat}.png`) });
      seen.add(state.beat);
      console.log(`  ${state.beat}: stage ${state.stage}`);
    }
    await page.waitForTimeout(40);
  }
  for (const beat of beats) if (!seen.has(beat)) console.error(`  never saw beat "${beat}"`);
}

await browser.close();
await stop();

if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exitCode = 1;
}
