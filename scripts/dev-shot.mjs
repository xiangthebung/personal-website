/**
 * Photographs one section, whole, on every beat (or the beats named), from a server that
 * is ALREADY RUNNING — the dev server by default — rather than from a fresh `vite preview`
 * of `dist/`.
 *
 * `beat-shot.mjs` is the tool for judging a finished scene against the built site. This is
 * the tool for judging a scene while it is being written: no build, no server spawn, so ten
 * scenes can be worked on at once against one `npm run dev` without anybody's `dist/` being
 * overwritten by somebody else's build.
 *
 *   node scripts/dev-shot.mjs decaf                    every beat, 1440 wide
 *   node scripts/dev-shot.mjs decaf 390                every beat, 390 wide
 *   node scripts/dev-shot.mjs decaf 1440 press hold    only those beats
 *   BASE=http://localhost:5173 node scripts/dev-shot.mjs decaf
 *   OUT=some/dir node scripts/dev-shot.mjs decaf       where to write
 *
 * Writes `<out>/<width>-<id>-<beat>.png` (default `outputs/dev/`) and a contact sheet
 * `<out>/<width>-<id>-sheet.png` tiling every frame in storyboard order, so a scene can be
 * read as a strip. Reports horizontal overflow, the stage box, and every console error or
 * uncaught exception the page produced while the scene ran — a scene that logs is a scene
 * that fails `drive-site.mjs` later.
 *
 * The beat list is read out of the scene's `BEATS` array in `app/demos/<id>/demo.tsx`, the
 * same way the tests read it, so a beat renamed in the source is a beat this looks for.
 */
import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createRequire } from "node:module";
import { chromium } from "playwright";
import { focusSection } from "./settle.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

const [id, widthArg, ...named] = process.argv.slice(2);
if (!id) {
  console.error("usage: node scripts/dev-shot.mjs <section-id> [width] [beat…]");
  process.exit(1);
}
const width = Number(widthArg || 1440);
const BASE = process.env.BASE ?? "http://localhost:3000";
const outDir = path.resolve(root, process.env.OUT ?? path.join("outputs", "dev"));

/* The storyboard, read from the source rather than imported: the scene is a client module
   full of JSX, and this is a node script. Strict about the shape, like the tests. */
const source = await readFile(path.join(root, "app", "demos", id, "demo.tsx"), "utf8");
const block = source.match(/const BEATS[^=]*=\s*\[([\s\S]*?)\n\];/);
const storyboard = block
  ? [...block[1].matchAll(/\{\s*name:\s*"([^"]+)",\s*ms:\s*(\d+)\s*\}/g)].map((m) => m[1])
  : [];
const beats = named.length ? named : storyboard;

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: width < 760 ? 844 : 1200 } });
const problems = [];
page.on("pageerror", (error) => problems.push(`uncaught: ${error.message}`));
page.on("console", (message) => {
  if (message.type() === "error") problems.push(`console: ${message.text()}`);
});

await page.goto(BASE, { waitUntil: "load" });
const section = page.locator(`#${id}`);
if (!(await focusSection(page, id))) console.error(`  ${id}: never became active`);
const stage = section.locator("[data-beat]").first();
await stage.waitFor({ state: "visible", timeout: 30_000 });

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

const frames = new Map();
if (beats.length === 0) {
  const state = await read();
  const file = path.join(outDir, `${width}-${id}-${state.beat}.png`);
  await section.screenshot({ path: file });
  frames.set(state.beat, file);
  console.log(`  ${state.beat}: stage ${state.stage}`);
} else {
  const started = Date.now();
  while (Date.now() - started < 150_000 && frames.size < beats.length) {
    const state = await read();
    if (state.beat && beats.includes(state.beat) && !frames.has(state.beat) && state.t >= 0.75) {
      const file = path.join(outDir, `${width}-${id}-${state.beat}.png`);
      await section.screenshot({ path: file });
      frames.set(state.beat, file);
      console.log(`  ${state.beat}: stage ${state.stage}`);
    }
    await page.waitForTimeout(40);
  }
  for (const beat of beats) if (!frames.has(beat)) console.error(`  never saw beat "${beat}"`);
}

await browser.close();

/* The strip. Sharp is a devDependency here for the gallery's media build, so it is
   already installed; the sheet is the whole reason to shoot every beat at once. */
try {
  const sharp = require("sharp");
  const ordered = beats.filter((beat) => frames.has(beat)).map((beat) => frames.get(beat));
  if (ordered.length > 1) {
    const cols = width < 760 ? 4 : 3;
    const tileW = width < 760 ? 300 : 560;
    const tiles = [];
    let tileH = 0;
    for (const file of ordered) {
      const buf = await sharp(file).resize({ width: tileW }).png().toBuffer();
      const meta = await sharp(buf).metadata();
      tiles.push({ buf, name: path.basename(file, ".png").replace(`${width}-${id}-`, "") });
      tileH = Math.max(tileH, meta.height);
    }
    const labelH = 24;
    const rows = Math.ceil(tiles.length / cols);
    const W = cols * tileW;
    const H = rows * (tileH + labelH);
    const labels = tiles
      .map(
        (t, i) =>
          `<text x="${(i % cols) * tileW + 8}" y="${Math.floor(i / cols) * (tileH + labelH) + tileH + 17}" ` +
          `font-family="Arial" font-size="15" font-weight="bold" fill="#111">${i}. ${t.name}</text>`,
      )
      .join("");
    const sheet = path.join(outDir, `${width}-${id}-sheet.png`);
    await sharp({ create: { width: W, height: H, channels: 3, background: "#cfcfcf" } })
      .composite([
        ...tiles.map((t, i) => ({
          input: t.buf,
          left: (i % cols) * tileW,
          top: Math.floor(i / cols) * (tileH + labelH),
        })),
        { input: Buffer.from(`<svg width="${W}" height="${H}">${labels}</svg>`), left: 0, top: 0 },
      ])
      .png()
      .toFile(sheet);
    console.log(`  sheet: ${path.relative(root, sheet)} (${tiles.length} frames)`);
  }
} catch (error) {
  console.error(`  no contact sheet: ${error.message}`);
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exitCode = 1;
}
