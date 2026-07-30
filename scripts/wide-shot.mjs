/**
 * Photographs sections at a given viewport width.
 *
 * Everything on this page had been checked at 1440 and nowhere else, which is how a
 * layout that falls apart above about 1600px survived several rounds of review: at
 * 1440 the clamps are still doing their job, and every hole opens up past the point
 * where they stop.
 *
 *   node work/wide-shot.mjs 2560
 *   node work/wide-shot.mjs 2560 choir-practice pagepack
 *
 * Writes `outputs/wide/<width>-<id>.png`, one per section, plus `<width>-top.png`
 * for the first screenful. Needs a current `npm run build`.
 */
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { chromium } from "playwright";
import { focusSection } from "./settle.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const width = Number(process.argv[2] || 2560);
const only = process.argv.slice(3);
const PORT = 4331;
const BASE = `http://localhost:${PORT}`;
const outDir = path.join(root, "outputs", "wide");

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
const page = await browser.newPage({ viewport: { width, height: 1000 } });
const problems = [];
page.on("pageerror", (error) => problems.push(`uncaught: ${error.message}`));
page.on("console", (message) => {
  if (message.type() === "error") problems.push(`console: ${message.text()}`);
});

await page.goto(BASE, { waitUntil: "load" });
/* The hero's name lands letter by letter — `index * 62ms + 160ms` of delay in front
   of an 820ms animation, so the last letter settles at about 1.4s — and the letters
   fill `backwards`, which means an early screenshot shows the ones still waiting in
   their start transform. At 600ms this produced a hero whose surname appeared
   half-size and ghosted below the first name, and it took a reading of the stylesheet
   to establish that the layout was fine and the photograph was early. */
await page.waitForTimeout(2600);
await page.screenshot({ path: path.join(outDir, `${width}-top.png`) });

const ids = await page.evaluate(() =>
  Array.from(document.querySelectorAll("[data-project-section]")).map((node) => node.id),
);

console.log(`viewport ${width}px`);
for (const id of ids) {
  if (only.length > 0 && !only.includes(id)) continue;
  const section = page.locator(`#${id}`);
  /* Focused, not merely "in view": the page dims every heading but the active one,
     and lazy scene mounts move a section out from under a single scroll. */
  if (!(await focusSection(page, id))) console.error(`  ${id}: never became active`);
  const box = await section.boundingBox();
  await section.screenshot({ path: path.join(outDir, `${width}-${id}.png`) });

  /* The numbers that say whether the composition still holds: how much of the well
     the scene fills, and how wide the heading is beside it.

     `offsetWidth`, not `getBoundingClientRect().width`: the rect is the painted box
     and includes any transform, which on this page means the entry animation. Every
     section came back scaled and every fill came back at exactly 100%, because a
     scale applies to the well and the scene alike. */
  const measured = await section.evaluate((node) => {
    const body = node.querySelector(".project-body");
    const head = node.querySelector(".project-heading");
    const well = node.querySelector(".project-window");
    const scene = well?.querySelector(".demo") ?? well?.firstElementChild;
    return {
      body: body?.offsetWidth ?? 0,
      head: head?.offsetWidth ?? 0,
      well: well?.offsetWidth ?? 0,
      scene: scene?.offsetWidth ?? 0,
      fill: well && scene ? Math.round((scene.offsetWidth / well.offsetWidth) * 100) : 0,
    };
  });
  console.log(
    `  ${id.padEnd(18)} body ${String(measured.body).padStart(4)}  head ${String(
      measured.head,
    ).padStart(4)}  well ${String(measured.well).padStart(4)}  scene ${String(
      measured.scene,
    ).padStart(4)}  fill ${measured.fill}%  section ${Math.round(box.height)}px tall`,
  );
}

/* The two sections that are not projects. Both used to be wide multi-column
   layouts holding the page's numeric claims, which is what the measure below was
   for — it is the check that caught a figure row stretching to 2392px over a
   1180px page. The band is gone and the closing section is an address now, but the
   gallery took its place as a full-width section with its own sizing problem, so
   the same discipline applies. */
for (const [selector, label] of [
  [".fun-section", "gallery"],
  [".closing", "closing"],
]) {
  if (only.length > 0 && !only.includes(label)) continue;
  const node = page.locator(selector);
  if ((await node.count()) === 0) {
    console.error(`  ${label}: not on the page`);
    continue;
  }

  await node.scrollIntoViewIfNeeded();
  /* Both arrive on an IntersectionObserver and stagger their children in, so an
     immediate shot catches half of them mid-flight at opacity 0. */
  await page.waitForTimeout(1400);
  await node.screenshot({ path: path.join(outDir, `${width}-${label}.png`) });

  const measured = await node.evaluate((el) => {
    const inner = el.querySelector(".fun-rail, .closing-contact");
    /* Every print in the gallery shares a height and takes its own width from its
       own aspect ratio. So the check that the rail is not normalising anything is
       that those widths differ: if the narrowest and the widest card are the same,
       something is cropping again. */
    const cards = Array.from(el.querySelectorAll(".fun-card")).map((card) => card.offsetWidth);
    return {
      section: el.offsetWidth,
      measure: inner?.offsetWidth ?? 0,
      cards: cards.length,
      narrowest: cards.length ? Math.min(...cards) : 0,
      widest: cards.length ? Math.max(...cards) : 0,
    };
  });
  console.log(
    `  ${label.padEnd(18)} section ${String(measured.section).padStart(4)}  ` +
      `measure ${String(measured.measure).padStart(5)}` +
      (measured.cards
        ? `  cards ${measured.cards}  widths ${measured.narrowest}-${measured.widest}px`
        : ""),
  );

  if (measured.cards && measured.narrowest === measured.widest) {
    console.error(`  ${label}: every card is ${measured.widest}px wide — media is being cropped`);
    process.exitCode = 1;
  }
}

const overflow = await page.evaluate(() => ({
  scrollWidth: document.scrollingElement.scrollWidth,
  clientWidth: document.scrollingElement.clientWidth,
}));
console.log(
  overflow.scrollWidth > overflow.clientWidth
    ? `HORIZONTAL OVERFLOW: ${overflow.scrollWidth} > ${overflow.clientWidth}`
    : `no horizontal overflow (${overflow.scrollWidth}px)`,
);

await browser.close();
await stop();

if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exitCode = 1;
}
