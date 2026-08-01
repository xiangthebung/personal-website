/**
 * How visible is the join between one project and the next?
 *
 * The reported fault was one sentence — *for Decaf you can see the cutoff to the next
 * project* — and nothing in this repository could see it, for a reason worth writing
 * down: every screenshot tool here photographs one section. `wide-shot.mjs` frames a
 * section, `beat-shot.mjs` frames a section on a named beat. A boundary is not inside
 * either of the things it separates, so a harness that only ever looks at one section at
 * a time is guaranteed to miss it.
 *
 * So this scrolls each join to the middle of the window, photographs the *viewport*, and
 * then reads the pixels: down a column of bare page, in the margin, away from anything
 * anyone is meant to look at. A join you can see is a step in that column. A join you
 * cannot see is a gradient.
 *
 *   node scripts/seam.mjs            # every join, 2560
 *   node scripts/seam.mjs 1440       # at another width
 *
 * Reports the largest single-row colour step in the band around each join, and where it
 * is. Writes the viewport shots to `outputs/seams/` so the number can be checked against
 * a picture.
 *
 * The threshold is deliberately strict. A step of 3 in 8-bit sRGB is at the edge of what
 * is visible on a large flat area of near-neutral colour, which is exactly what this page
 * is made of; the hairline border and the flat paper change together measured 11 before
 * they were replaced by `.project-seam`.
 */
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WIDTH = Number(process.argv[2] || 2560);
const PORT = 4383;
const BASE = `http://localhost:${PORT}`;
const outDir = path.join(root, "outputs", "seams");

/**
 * Above this, the join is a line somebody can see.
 *
 * Measured, the five joins between two pale sections read 0 to 2. GRT to Night
 * Neutralizer reads 5, and that 5 is the harness's own arithmetic rather than anything on
 * screen: the dissolve there is smoothstepped across 223 levels of colour, and the
 * ramp-versus-step comparison below models the ramp as straight, so a curve's steepest
 * point spends a little of its allowance. Magnified four times, that join has no line in
 * it at all.
 *
 * The joins this exists to catch are nowhere near 6. The hairline border and the flat
 * paper change it replaced measured 11 together, and the mask edges caught during
 * development measured 13 to 20.
 */
const STEP_LIMIT = 6;
/**
 * How much further than the dissolve itself to look, in CSS pixels.
 *
 * The band is `--project-bleed` either side of the join plus this, read off the page
 * rather than guessed, and keeping it tight is not laziness — it is the difference
 * between measuring the join and measuring the artwork. Two of these sections draw
 * full-width horizontal lines on purpose: GRT has a road with lanes across it, PagePack
 * has a cable. Those are lines somebody drew, they are hundreds of pixels from any
 * boundary, and a band wide enough to include them reports them as seams for ever.
 */
const MARGIN = 40;

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
const page = await browser.newPage({ viewport: { width: WIDTH, height: 1000 } });
page.on("pageerror", (error) => console.error(`  uncaught: ${error.message}`));
await page.goto(BASE, { waitUntil: "load" });
await page.waitForTimeout(2400);

const sections = await page.evaluate(() =>
  Array.from(document.querySelectorAll("[data-project-section]")).map((node) => node.id),
);

/* The dissolve's own depth, read off a section rather than duplicated here, so this keeps
   judging the right band if the stylesheet's clamp changes. */
const bleed = await page.evaluate((id) => {
  const node = document.querySelector(`#${id}`);
  /* Measured through a throwaway element rather than read off the section, and the first
     attempt at reading it is worth recording: `getPropertyValue("--project-bleed")` hands
     back the literal token `clamp(48px, 10svh, 160px)`, because an unregistered custom
     property has no computed value beyond its own text. `parseFloat` of that is `NaN`, the
     band came out `NaN` wide, the loop never ran, and every join reported a step of 0.
     A harness that passes because it measured nothing is worse than one that fails. */
  const ruler = document.createElement("div");
  ruler.style.cssText = "position:absolute;visibility:hidden;height:var(--project-bleed)";
  node.append(ruler);
  const height = Math.round(ruler.getBoundingClientRect().height);
  ruler.remove();
  return height;
}, sections[0]);
if (!Number.isFinite(bleed) || bleed <= 0) {
  console.error(`could not measure --project-bleed (got ${bleed})`);
  await browser.close();
  await stop();
  process.exit(1);
}

console.log(
  `\nhow visible is the join between one project and the next? — ${WIDTH}x1000, ` +
    `${bleed}px dissolve\n`,
);

let failures = 0;

for (let i = 1; i < sections.length; i += 1) {
  const above = sections[i - 1];
  const below = sections[i];

  /* The join at the middle of the window, and settled. Both sections are then at
     roughly half presence, which is the state the fault lives in: the tint has each of
     them half-mixed toward the ambient colour and, before `.project-seam`, still not
     mixed to the same colour as each other.

     Scrolled twice, for the reason `settle.mjs` documents at length: the scenes mount
     lazily, so a section's height changes once it comes near the window and a single jump
     lands on a layout that no longer exists. Measured, one pass put the join 135px off
     centre, and the first version of this harness then read its pixels 135px away from the
     thing it was measuring. */
  let joinY = 0;
  for (let pass = 0; pass < 3; pass += 1) {
    joinY = await page.evaluate((id) => {
      const node = document.querySelector(`#${id}`);
      const top = node.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: Math.round(top - window.innerHeight / 2), behavior: "instant" });
      return Math.round(node.getBoundingClientRect().top);
    }, below);
    await page.waitForTimeout(500);
    if (Math.abs(joinY - 500) <= 2) break;
  }

  /**
   * And then long enough for the entrances to be over.
   *
   * 900ms was not, and it produced the one finding in this harness that was about the
   * clock rather than the page: Night Neutralizer's section arrives from behind a
   * near-black curtain that fades over 1500ms, so a frame taken before that is done has an
   * opaque rectangle sitting on the boundary at whatever opacity it has reached. Measured
   * at 15% it reported a step of 6 that does not exist a second later. A harness that
   * photographs an entrance and calls it a layout will fail on effects that are working
   * correctly.
   */
  await page.waitForTimeout(2200);

  const shot = await page.screenshot();
  const file = path.join(outDir, `${WIDTH}-${above}--${below}.png`);
  await writeFile(file, shot);

  /**
   * A sustained colour change that goes all the way across. Two properties, and it took
   * three attempts to measure either of them honestly.
   *
   * *All the way across*, because that is the only thing a section boundary can be: it is
   * the bottom of one section's paper meeting the top of the next. The first version
   * sampled two columns in the margins, on the theory that a margin is bare page, and
   * reported five visible joins on a page where four were already seamless — the right
   * margin is where the fixed project index sits and the left is where the outlined ghost
   * numbers are. It was measuring furniture. Every candidate column has something in it
   * somewhere down the page, so instead every 24th column is sampled and the tenth
   * percentile is taken: a step ninety per cent of the width agrees on. A median was not
   * enough, because the pods are about 40% of the width at 2560 and GRT's drawn road is
   * clipped to 66% of it.
   *
   * *Sustained*, because a one-pixel line is not a boundary however far it reaches. The
   * percentile version still failed one join, and the culprit was 137px inside the section
   * and entirely deliberate: `.project--mint > .project-veil::before` rules staff lines
   * across the page at 14% of its height, one pixel every 1.1rem. Row-to-row deltas cannot
   * tell that from a seam. So each candidate row is judged by the difference between the
   * average of the eight rows below it and the average of the eight above — which leaves a
   * real step at its full height and divides a hairline by eight.
   *
   * The two rows either side are skipped. A boundary lands on a fractional device pixel as
   * often as not, and the blended row between two colours is neither of them.
   *
   * And what is reported is the *excess* over the local ramp, not the raw difference, which
   * was the last correction and the one that matters most. Night Neutralizer is a near-black
   * room next to a pale grey one: 223 levels of change dissolved across a hundred pixels is
   * about eighteen levels across any eighteen-pixel window however smooth it is. Judged as a
   * raw difference that join can never pass, and the number would not be answering the
   * question — a steep gradient is not a cutoff.
   *
   * So every window is compared with one three times as wide around the same row. Across a
   * ramp the narrow window reads a third of the wide one, whatever the ramp's slope; across
   * a step it reads all of it, because a step has no width. The difference between the two
   * is the discontinuity and nothing else, and it needs no assumption about how deep the
   * dissolve is or how far apart the two colours are.
   */
  const { data, info } = await sharp(shot).raw().toBuffer({ resolveWithObject: true });
  const scale = info.width / WIDTH;
  const band = bleed + MARGIN;
  const reach = Math.max(4, Math.round(8 * scale));
  const skip = Math.max(1, Math.round(2 * scale));
  /* The comparison window: three times as wide, same centre. See the note above. */
  const wide = reach * 3;
  const edge = wide + skip;
  const from = Math.max(edge, Math.round((joinY - band) * scale));
  const to = Math.min(info.height - edge - 1, Math.round((joinY + band) * scale));
  const stride = 24;

  /** The mean of `rows` rows in one column, per channel, starting at `y0`. */
  const meanAt = (x, y0, rows) => {
    let r = 0;
    let g = 0;
    let b = 0;
    for (let y = y0; y < y0 + rows; y += 1) {
      const i = (y * info.width + x) * info.channels;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    }
    return [r / rows, g / rows, b / rows];
  };

  /** The largest of the three channels: a step a visitor notices is a step in one of them,
      and averaging hides a blue seam on grey paper behind two channels that did not move. */
  const spread = (a, b) =>
    Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), Math.abs(b[2] - a[2]));

  let worst = { step: 0, at: 0 };
  const steps = [];
  for (let y = from; y <= to; y += 1) {
    steps.length = 0;
    for (let x = 0; x < info.width; x += stride) {
      const near = spread(meanAt(x, y - skip - reach, reach), meanAt(x, y + skip, reach));
      const far = spread(meanAt(x, y - skip - wide, wide), meanAt(x, y + skip, wide));
      steps.push(Math.max(0, near - far / 3));
    }
    steps.sort((a, b) => a - b);
    const across = steps[Math.floor(steps.length * 0.1)];
    if (across > worst.step) worst = { step: Math.round(across), at: Math.round(y / scale) };
  }

  const where = worst.at - joinY;
  const label = `${above} → ${below}`.padEnd(34);
  if (worst.step > STEP_LIMIT) {
    console.log(
      `${label} step ${String(worst.step).padStart(3)}  ` +
        `at ${where >= 0 ? "+" : ""}${where}px from the join  <-- VISIBLE`,
    );
    failures += 1;
  } else {
    console.log(`${label} step ${String(worst.step).padStart(3)}  ok`);
  }
}

console.log(
  failures
    ? `\n${failures} join${failures === 1 ? "" : "s"} you can see — pictures in outputs/seams\n`
    : `\nno join steps by more than ${STEP_LIMIT}/255 — pictures in outputs/seams\n`,
);

await browser.close();
await stop();
setTimeout(() => process.exit(failures ? 1 : 0), 1200).unref();
