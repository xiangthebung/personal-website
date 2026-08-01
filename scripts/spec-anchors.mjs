/**
 * Where do the in-frame labels actually point?
 *
 * The labels are the explanation now — the written notes beside each scene were
 * deleted and their content pinned to the thing it is about — so a label that misses
 * its subject by forty pixels is not a cosmetic fault. It is the page making a claim
 * about the wrong element.
 *
 * Nothing in the suite could see that. `visible.mjs` hit-tests whether a label can be
 * seen; the tests measure how long it is on screen. Neither asks the only question
 * that matters about a pointer: is the thing under the dot the thing the words are
 * about. So this reads each label's anchor point out of the live layout, names what is
 * painted there, and prints the boxes of the elements the scene *could* have meant, in
 * the same percentages `SPECS` is written in.
 *
 *   node scripts/spec-anchors.mjs                     # every scene, on the beat its labels land
 *   node scripts/spec-anchors.mjs decaf               # one section
 *   node scripts/spec-anchors.mjs decaf drain         # one section, one beat
 *   node scripts/spec-anchors.mjs decaf drain 2560    # and at another width
 *
 * `sitting on` is what is under the dot. `candidates` lists what the scene could have
 * meant. When the two disagree, the element to hang a `data-spec-anchor` on is right
 * there in the list.
 *
 * The width argument is the one that matters most, and it is the argument that found the
 * original fault. The pods look like fixed geometry and are not: every scene here has at
 * least one `1fr` column, so everything to the right of it moves as a *fraction* of the
 * layer when the layer changes width. Decaf's notification bell sits at 72.7% of the
 * layer at 1440 and 75.7% at 2560. A label authored as a percentage at one width is
 * therefore wrong at every other, which is exactly what a single run of this cannot
 * show. Run two.
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { chromium } from "playwright";
import { focusSection } from "./settle.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
/* Section, then beat, then width, then height — and bare numbers are read as the size
   wherever they appear, so "every beat at 2560" does not need a placeholder argument
   nobody remembers.

   The height matters as much as the width and it took a disagreement to prove it. This
   harness ran at 900x900 and reported GRT's label clear of the popup; `beat-shot.mjs`
   photographs at a 1200px height and showed the same label lying across the popup's first
   stop. Both were right about their own window. The sections are `84svh` tall and the pods
   inside them are laid out against that, so a taller window moves everything the labels
   are measured from. */
const args = process.argv.slice(2);
const words = args.filter((arg) => !/^\d+$/.test(arg));
const sizes = args.filter((arg) => /^\d+$/.test(arg)).map(Number);
const only = words[0];
const onlyBeat = words[1];
const WIDTH = sizes[0] ?? 1440;
const HEIGHT = sizes[1] ?? 900;
const PORT = 4371;
const BASE = `http://localhost:${PORT}`;

/**
 * The beats to look at, and what each scene's labels are plausibly about.
 *
 * A beat per scene rather than one moment for the page: labels arrive on the beat their
 * evidence does, and half of them have left again by the last frame. The candidate lists
 * are deliberately generous — the point is to read the geometry off the page rather than
 * to assert a particular answer.
 */
const SCENES = [
  {
    id: "decaf",
    beats: ["drain", "dashes", "calm", "pause"],
    want: [
      ".dc-media",
      ".dc-play",
      ".dc-post-meta",
      ".dc-count",
      ".dc-bell",
      ".dc-search",
      ".dc-suggest",
      ".dc-suggest-head",
      ".dc-toolbar",
      ".dc-feed",
    ],
  },
  {
    id: "pagepack",
    beats: ["read", "collect"],
    want: [
      ".pp-popup",
      ".pp-target",
      ".pp-primary",
      ".pp-options",
      ".pp-progress",
      ".pp-page",
      ".pp-browser",
    ],
  },
  {
    id: "grt-next-bus",
    beats: ["street", "stops"],
    want: [
      ".gx-action",
      ".gx-badge",
      ".gx-popup",
      ".grt-stop-card",
      ".grt-stop-live",
      ".grt-stop-name",
      ".gx-browser",
    ],
  },
  {
    id: "pdf-explainer",
    beats: ["resting", "pick"],
    want: [".pdfx-notes", ".pdfx-slide", ".pdfx-panel", ".pdfx-figure", ".pdfx-stage"],
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

/* ----------------------------------- probe --------------------------------- */

/**
 * Runs in the page. Reads the layer, every shown label and every candidate box, all as
 * percentages of the layer, which is the coordinate space `SPECS` is authored in.
 */
const PROBE = ({ id, want }) => {
  const section = document.querySelector(`#${id}`);
  const layer = section?.querySelector(".speclayer");
  if (!layer) return { missing: true };

  const frame = layer.getBoundingClientRect();
  if (frame.width === 0 || frame.height === 0) return { unlaidOut: true };

  const asPercent = (box) => ({
    x: Number((((box.left + box.width / 2 - frame.left) / frame.width) * 100).toFixed(1)),
    y: Number((((box.top + box.height / 2 - frame.top) / frame.height) * 100).toFixed(1)),
    x0: Number((((box.left - frame.left) / frame.width) * 100).toFixed(1)),
    x1: Number((((box.right - frame.left) / frame.width) * 100).toFixed(1)),
    y0: Number((((box.top - frame.top) / frame.height) * 100).toFixed(1)),
    y1: Number((((box.bottom - frame.top) / frame.height) * 100).toFixed(1)),
    w: Math.round(box.width),
    h: Math.round(box.height),
  });

  const name = (node) => {
    if (!node) return "(nothing)";
    const cls = typeof node.className === "string" ? node.className.trim().split(/\s+/)[0] : "";
    return `${node.tagName.toLowerCase()}${cls ? `.${cls}` : ""}`;
  };

  /* Hit-testing has to see through the decorative layers, which are all
     `pointer-events: none` — including the label layer itself, so without this every
     dot reports as sitting on its own plate. Same trick, and same reason, as
     `visible.mjs`. */
  const patched = [];
  for (const node of section.querySelectorAll("*")) {
    if (getComputedStyle(node).pointerEvents === "none") {
      patched.push([node, node.style.pointerEvents]);
      node.style.pointerEvents = "auto";
    }
  }
  /** What is painted at a point, skipping the labels themselves. */
  const under = (x, y) => {
    if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return "offscreen";
    const muted = [];
    let hit = document.elementFromPoint(x, y);
    for (let depth = 0; depth < 10 && hit?.closest(".speclayer, .ghost-cursor"); depth += 1) {
      muted.push([hit, hit.style.pointerEvents]);
      hit.style.pointerEvents = "none";
      hit = document.elementFromPoint(x, y);
    }
    for (const [node, previous] of muted) node.style.pointerEvents = previous;
    return name(hit);
  };

  /**
   * Every line of type in the pod, with the box the glyphs actually occupy.
   *
   * A `Range` over the text node rather than the element's own box, because the element
   * is usually much bigger than its words: a full-width paragraph holding six characters
   * on the left reports a rect the whole way across, and a plate resting in the empty
   * three quarters of it would be reported as covering the text. Range rects are the
   * glyphs.
   */
  /**
   * Whether a line of type is one a visitor could actually be reading right now.
   *
   * Two exclusions, and both were found by running this at more than one width.
   *
   * Anything inside an effectively invisible ancestor. GRT's toolbar label reported a 7%
   * overlap with the word "Next bus" — which is the eyebrow inside the extension popup, on
   * a beat three before the popup opens. A closed popup still has a box and still has text
   * in it; `opacity: 0` is not `visibility: hidden`, so the box was real and the reading was
   * meaningless. Same accumulated-opacity walk as `visible.mjs`.
   *
   * And anything mid-animation. PagePack throws seven saved pages out of a button and across
   * the section, and at any instant during that beat some of them are passing behind the
   * labels. A label crossed by a card in flight is a flood, not a collision — Decaf's hearts
   * do the same thing. A card that has *landed* is still checked, because `forwards` leaves
   * a finished animation in `finished` rather than `running`, so a label resting on a settled
   * card is still a fault this will report.
   */
  const readable = (node) => {
    let opacity = 1;
    for (let n = node; n && n !== document.documentElement; n = n.parentElement) {
      const style = getComputedStyle(n);
      if (style.visibility === "hidden" || style.display === "none") return false;
      opacity *= Number(style.opacity);
      if (opacity < 0.05) return false;
      if (n.getAnimations({ subtree: false }).some((a) => a.playState === "running")) {
        return false;
      }
    }
    return true;
  };

  const type = [];
  for (const node of section.querySelectorAll("*")) {
    if (node.closest(".speclayer")) continue;
    if (!readable(node)) continue;
    for (const child of node.childNodes) {
      if (child.nodeType !== 3 || !child.textContent.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(child);
      for (const rect of range.getClientRects()) {
        if (rect.width < 2 || rect.height < 2) continue;
        type.push({ who: name(node), words: child.textContent.trim().slice(0, 28), rect });
      }
    }
  }

  /** How much of `b` the box `a` covers, as a fraction of `b`'s area. */
  const covers = (a, b) => {
    const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    if (w <= 0 || h <= 0) return 0;
    return (w * h) / (b.width * b.height);
  };

  const raw = [...layer.querySelectorAll(".spectag")].map((tag) => {
    const body = tag.querySelector(".spectag-body");
    const plate = tag.querySelector(".spectag-text");
    /* `.spectag` is a 0x0 point, so its box *is* the anchor — which is the whole
       reason it is a separate element from the plate that hangs off it. */
    const point = tag.getBoundingClientRect();
    return {
      node: tag,
      box: plate?.getBoundingClientRect() ?? null,
      text: plate?.textContent ?? "",
      shown: tag.dataset.shown === "true",
      side: body?.dataset.side ?? "right",
      at: asPercent(point),
      hit: under(point.left, point.top),
      plate: plate ? asPercent(plate.getBoundingClientRect()) : null,
      declared: {
        x: tag.style.getPropertyValue("--spec-x").trim(),
        y: tag.style.getPropertyValue("--spec-y").trim(),
      },
    };
  });

  /**
   * What each plate is sitting on top of, which is the question this harness was missing.
   *
   * The anchoring work made every dot land on its subject and was reviewed on the numbers,
   * and the numbers were right. What a photograph then showed was a plate lying across the
   * line of type immediately above its own anchor — Decaf's "Colour off" struck through
   * "because you watched" — because a dot that is correctly on the top-left corner of an
   * image hangs its plate half a line higher than that. A dot's position and a plate's
   * position are different facts and only one of them was being checked.
   *
   * Both kinds of collision are reported. A plate over another plate is unreadable; a plate
   * over a line of type takes information off the page to put information on it, which is
   * the one trade this component must never make. The threshold is low on purpose: clipping
   * the descenders of a 10px label is enough to read as a strike-through.
   */
  const shown = raw.filter((tag) => tag.shown && tag.box);
  const collisions = shown.map((tag) => {
    const plates = shown
      .filter((other) => other !== tag && covers(tag.box, other.box) > 0.02)
      .map((other) => `"${other.text}"`);
    const words = type
      .map((line) => ({ ...line, share: covers(tag.box, line.rect) }))
      .filter((line) => line.share > 0.06)
      .sort((a, b) => b.share - a.share)
      .map((line) => `${line.who} "${line.words}" ${Math.round(line.share * 100)}%`);
    return { text: tag.text, plates, words };
  });

  /* Without the DOM references the collision pass needed. `page.evaluate` can only hand
     back structured-cloneable values, and an element is not one. */
  const tags = raw.map((tag) => ({
    text: tag.text,
    shown: tag.shown,
    side: tag.side,
    at: tag.at,
    hit: tag.hit,
    plate: tag.plate,
    declared: tag.declared,
  }));

  const candidates = [];
  for (const selector of want) {
    const nodes = [...section.querySelectorAll(selector)];
    nodes.forEach((node, order) => {
      const box = node.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) return;
      // Only what is inside the layer's own box; the rest cannot be named by a percentage.
      if (box.bottom < frame.top || box.top > frame.bottom) return;
      candidates.push({
        selector: nodes.length > 1 ? `${selector}[${order}]` : selector,
        ...asPercent(box),
      });
    });
  }

  for (const [node, previous] of patched) node.style.pointerEvents = previous;

  return {
    frame: { w: Math.round(frame.width), h: Math.round(frame.height) },
    beat: section.querySelector("[data-beat]")?.dataset.beat ?? null,
    tags,
    collisions,
    candidates,
  };
};

/* ----------------------------------- run ----------------------------------- */

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
page.on("pageerror", (error) => console.error(`  uncaught: ${error.message}`));
await page.goto(BASE, { waitUntil: "load" });
await page.waitForTimeout(2200);

/** Waits until a scene reports the beat we want, and lets the label's flight finish. */
async function waitForBeat(id, name) {
  const stage = page.locator(`#${id} [data-beat]`).first();
  try {
    await stage.waitFor({ timeout: 20_000 });
  } catch {
    return false;
  }
  const cutoff = Date.now() + 30_000;
  while (Date.now() < cutoff) {
    if ((await stage.getAttribute("data-beat")) === name) return true;
    await page.waitForTimeout(50);
  }
  return false;
}

console.log(`\nwhere the in-frame labels point — ${WIDTH}x${HEIGHT}\n`);

let collisions = 0;

for (const scene of SCENES) {
  if (only && scene.id !== only) continue;
  await focusSection(page, scene.id);

  for (const beat of scene.beats) {
    if (onlyBeat && beat !== onlyBeat) continue;
    if (!(await waitForBeat(scene.id, beat))) {
      console.log(`${scene.id} @ ${beat}: never reached\n`);
      continue;
    }
    /* The plates travel out of the pressed control over 660ms with a per-label stagger
       on top, so the instant `data-beat` flips is the one moment the anchor is
       guaranteed to be wrong. Wait it out. */
    await page.waitForTimeout(1200);

    const result = await page.evaluate(PROBE, { id: scene.id, want: scene.want });
    if (result.missing) {
      console.log(`${scene.id} @ ${beat}: no .speclayer\n`);
      continue;
    }
    if (result.unlaidOut) {
      console.log(`${scene.id} @ ${beat}: layer has no size\n`);
      continue;
    }

    console.log(
      `${scene.id} @ ${result.beat}  layer ${result.frame.w}x${result.frame.h}`,
    );
    for (const tag of result.tags) {
      if (!tag.shown) continue;
      const clash = result.collisions.find((entry) => entry.text === tag.text);
      console.log(
        `  "${tag.text}"  side=${tag.side}\n` +
          `      dot at ${tag.at.x}%, ${tag.at.y}%   declared ${tag.declared.x}, ${tag.declared.y}\n` +
          `      sitting on ${tag.hit}` +
          (tag.plate
            ? `\n      plate x ${tag.plate.x0}–${tag.plate.x1}%  y ${tag.plate.y0}–${tag.plate.y1}%`
            : ""),
      );
      if (clash?.plates.length) {
        console.log(`      COVERS LABEL  ${clash.plates.join(", ")}`);
        collisions += 1;
      }
      for (const line of clash?.words ?? []) {
        console.log(`      COVERS TYPE   ${line}`);
        collisions += 1;
      }
    }
    if (result.candidates.length) {
      console.log(`  candidates:`);
      for (const c of result.candidates) {
        console.log(
          `      ${c.selector.padEnd(24)} centre ${String(c.x).padStart(5)}%,${String(c.y).padStart(5)}%   ` +
            `x ${c.x0}–${c.x1}%  y ${c.y0}–${c.y1}%   ${c.w}x${c.h}`,
        );
      }
    }
    console.log("");
  }
}

console.log(
  collisions
    ? `${collisions} plate${collisions === 1 ? "" : "s"} covering something\n`
    : `no plate covers another plate or a line of type\n`,
);

await browser.close();
await stop();
setTimeout(() => process.exit(collisions ? 1 : 0), 1200).unref();
