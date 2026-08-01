/**
 * Does anything in a project heading land on top of anything else?
 *
 * Written after finding a heading that printed its own links across its own title.
 * `.project-links` was `position: absolute; top: 0.85rem; right: 3vw` under a 900px
 * breakpoint, which was correct when the heading was a full-width band and wrong the
 * moment the compositions turned it into a column only as wide as its contents: "the
 * top-right of the heading" became a couple of inches right of the name, on the same
 * line. Four of the seven sections read "GRT Next BusSource" at 900, 820, 760 and 700px,
 * and the other three had their links marooned in the middle of the section.
 *
 * It survived because nothing here looked at narrow windows. `wide-shot.mjs` exists
 * because everything had only been checked at 1440; this exists because everything was
 * then only checked at 1440 and 2560. Somebody had already met the bottom end of this
 * fault and patched it at 440px, which is the shape of a bug nobody has measured: the
 * symptom gets a floor and the cause keeps its range.
 *
 *   node scripts/heading-fit.mjs
 *
 * Exit code is 1 if any two parts of a heading overlap, or if a heading overflows the
 * body it sits in.
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 4401;
const BASE = `http://localhost:${PORT}`;

/** Every width worth checking, not only the two the page was designed at. */
const WIDTHS = [2560, 1920, 1440, 1180, 1024, 980, 900, 820, 760, 700, 600, 480, 390];

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

/* ----------------------------------- probe --------------------------------- */

/**
 * Runs in the page. Compares the *glyph* boxes of the heading's three parts.
 *
 * Range rects rather than element boxes, because an element box says nothing about
 * collision here: `.project-summary` is a block that can be twice as wide as its longest
 * line, and two boxes touching is the normal way a column of type is laid out. What a
 * reader sees is letters on letters.
 */
const PROBE = () =>
  Array.from(document.querySelectorAll("[data-project-section]")).map((section) => {
    const head = section.querySelector(".project-heading");
    const body = section.querySelector(".project-body");
    const parts = ["project-identity", "project-summary", "project-links"];

    const glyphs = (root) => {
      const out = [];
      for (const node of root.querySelectorAll("*")) {
        for (const child of node.childNodes) {
          if (child.nodeType !== 3 || !child.textContent.trim()) continue;
          const range = document.createRange();
          range.selectNodeContents(child);
          for (const rect of range.getClientRects()) {
            if (rect.width < 2 || rect.height < 2) continue;
            out.push({ words: child.textContent.trim().slice(0, 24), rect });
          }
        }
      }
      return out;
    };

    const lines = parts.map((part) => {
      const node = head.querySelector(`.${part}`);
      return { part, lines: node ? glyphs(node) : [] };
    });

    const hits = [];
    for (let i = 0; i < lines.length; i += 1) {
      for (let j = i + 1; j < lines.length; j += 1) {
        for (const a of lines[i].lines) {
          for (const b of lines[j].lines) {
            const w = Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left);
            const h = Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top);
            if (w > 1 && h > 1) {
              hits.push(
                `${lines[i].part} "${a.words}" over ${lines[j].part} "${b.words}" ` +
                  `(${Math.round(w)}x${Math.round(h)}px)`,
              );
            }
          }
        }
      }
    }

    const headBox = head.getBoundingClientRect();
    const bodyBox = body.getBoundingClientRect();
    /* One pixel of tolerance: a heading is allowed to sit flush with its body's content
       box, and a fractional layout rounds either way. */
    const overflow = Math.round(
      Math.max(0, bodyBox.left - headBox.left, headBox.right - bodyBox.right),
    );

    return { id: section.id, stage: section.dataset.stage, hits, overflow };
  });

/* ------------------------------------ run ---------------------------------- */

const browser = await chromium.launch();
let failures = 0;

console.log(`\ndoes anything in a project heading land on anything else?\n`);

for (const width of WIDTHS) {
  const page = await browser.newPage({ viewport: { width, height: 1000 } });
  page.on("pageerror", (error) => console.error(`  uncaught: ${error.message}`));
  await page.goto(BASE, { waitUntil: "load" });
  /* The headings arrive on a stagger from `is-seen`, and a heading mid-entrance is a
     heading at a transform this has no business measuring. Scroll the run once so every
     section has been reached, then come back and let it settle. */
  await page.evaluate(async () => {
    for (const section of document.querySelectorAll("[data-project-section]")) {
      section.scrollIntoView({ block: "center" });
      await new Promise((r) => setTimeout(r, 90));
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  });
  await page.waitForTimeout(900);

  const report = await page.evaluate(PROBE);
  const bad = report.filter((r) => r.hits.length || r.overflow > 1);
  if (bad.length === 0) {
    console.log(`  ${String(width).padStart(4)}px  all seven headings fit`);
  } else {
    console.log(`  ${String(width).padStart(4)}px`);
    for (const r of bad) {
      for (const hit of r.hits) {
        console.log(`        ${r.id} (${r.stage}): ${hit}`);
        failures += 1;
      }
      if (r.overflow > 1) {
        console.log(`        ${r.id} (${r.stage}): heading overflows its body by ${r.overflow}px`);
        failures += 1;
      }
    }
  }
  await page.close();
}

console.log(
  failures ? `\n${failures} collision${failures === 1 ? "" : "s"}\n` : `\nnothing collides\n`,
);

await browser.close();
await stop();
setTimeout(() => process.exit(failures ? 1 : 0), 1200).unref();
