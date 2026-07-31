/**
 * Is it actually visible, or is it merely present?
 *
 * Every screenshot tool here answers "did it render". None of them answered the
 * question that actually went wrong twice on this page: whether a thing a visitor is
 * supposed to see is reachable by their eye. The PagePack cable was drawn correctly,
 * at the right size, in the right colour, and passed behind the browser window, so it
 * did not exist. The Night Neutralizer blast was correct in every particular inside a
 * parent at `opacity: 0`. Both survived a build, a lint, a test suite and a
 * screenshot review.
 *
 * So this hit-tests. For each target it samples nine points across the element's box
 * and asks the document what is actually painted at each one. If the answer is not the
 * element or one of its descendants, something is on top, and the thing on top is
 * named. It also walks the ancestor chain multiplying `opacity` and checking
 * `visibility`, `display` and clip, because an element can be unoccluded and still
 * invisible.
 *
 *   node scripts/visible.mjs              # every check
 *   node scripts/visible.mjs pagepack    # only checks whose label matches
 *
 * Exit code is 1 if any check marked `required` fails, so this can gate a commit.
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { chromium } from "playwright";
import { focusSection } from "./settle.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const filter = process.argv[2]?.toLowerCase() ?? "";
const PORT = 4361;
const BASE = `http://localhost:${PORT}`;

/**
 * What a visitor is supposed to be able to see.
 *
 * `section` is scrolled into focus first. `beat` waits for the scene to reach that
 * beat before looking, because most of these only exist for part of a loop. `required`
 * marks the ones whose absence is a bug rather than a note.
 */
const CHECKS = [
  {
    label: "pagepack cable",
    section: "pagepack",
    selector: "#pagepack .bd-pack-wire--left",
    required: true,
    note: "the prop the whole outage depends on",
  },
  {
    label: "pagepack plug",
    section: "pagepack",
    selector: "#pagepack .bd-pack-plug--left",
    required: true,
    note: "the moment the connection is pulled",
  },
  {
    /* At `cut`, which is the beat it exists for. An earlier version of this check
       named no beat, sampled whatever was on screen, and failed because the reader
       panel had opened over the toolbar — which is the scene working correctly. A
       visibility check without a moment attached is a coin toss. */
    label: "pagepack wifi",
    section: "pagepack",
    selector: "#pagepack .pp-wifi",
    beat: { section: "pagepack", name: "cut" },
    required: true,
    note: "the connection dying; only has to be visible while it happens",
  },
  {
    /* Not a visibility question — a geometry one. The cable has to run below the
       browser window and still be on screen when the section is centred, and those two
       constraints are set by this element's box and the section's height. Printed so
       the band can be chosen against real numbers instead of guessed at. */
    label: "pagepack browser",
    section: "pagepack",
    selector: "#pagepack .pp-browser",
    /* At `settle`, the opening frame, where the window is the subject. Without a beat
       this sampled whatever was showing and failed on `read-offline` — where the reader
       panel covers the browser on purpose, because a dead window behind living reading
       is the shot the whole scene is built to produce. */
    beat: { section: "pagepack", name: "settle" },
    required: true,
  },
  {
    label: "pagepack section",
    section: "pagepack",
    selector: "#pagepack .project-foreground",
    required: false,
  },
  {
    label: "pagepack reader",
    section: "pagepack",
    selector: "#pagepack .pp-reader",
    beat: { section: "pagepack", name: "read-offline" },
    required: true,
  },
  {
    label: "grt bell",
    section: "grt-next-bus",
    selector: "#grt-next-bus .gx-bell",
    required: true,
  },
  {
    label: "grt notification",
    section: "grt-next-bus",
    selector: ".gx-os-alert",
    beat: { section: "grt-next-bus", name: "alert" },
    required: true,
    note: "portalled to the body; must land over the real viewport",
  },
    /* The pod's own microphone button used to be checked here, and it is gone: it duplicated
     the application's own control, and its "your browser will ask for the microphone" line
     was the site apologising for a prompt every site raises. What replaced it is a leader
     line pointing at the real control, which only exists once the piece is playing -- that
     needs a click, and this harness deliberately does not click anything.
     `work/choir-play.mjs` covers it, and checks the leader actually lands on the button
     rather than merely existing. A check that can never pass here would print a failure on
     every run, and a failure that is always there is one nobody reads. */
  {
    label: "choir scroll shield",
    section: "choir-practice",
    selector: "#choir-practice .choir-shield",
    required: false,
    note: "must be on top of the frame, which is the point of it",
  },
  /* The subtitle this used to check for is gone — a line of film dialogue printed to
     demonstrate that you cannot hear it, on a page with no sound. The meter carries the
     volume half of the argument now, so it is the thing worth checking, and it is
     `required`: it is the only element on the page that says the explosion and the
     whisper share a setting. */
  {
    label: "night volume cue",
    section: "night-neutralizer",
    selector: "#night-neutralizer .nn-vol",
    beat: { section: "night-neutralizer", name: "whisper" },
    required: true,
  },
  /* At `pull`, the peak of the flood, which is the only part of the loop these are
     meant to be visible for. Naming no beat meant sampling whatever happened to be on
     screen, and eight of Decaf's thirteen beats are after the extension goes on — where
     `.dc-deluge[data-spent="true"]` is `opacity: 0` on purpose, because the flood
     draining away is the payoff. So both of these reported "effective opacity 0 through
     its ancestors", correctly, about a layer that was correctly invisible. Two standing
     failures that are expected are worse than none: they train you to skim the output,
     which is exactly when a real one gets through. */
  {
    label: "decaf deluge drop",
    section: "decaf",
    selector: ".dc-drop",
    beat: { section: "decaf", name: "pull" },
    required: false,
    note: "only exists while decaf is the active section, and only before the switch",
  },
  {
    label: "decaf notification",
    section: "decaf",
    selector: ".dc-spam-card",
    beat: { section: "decaf", name: "pull" },
    required: false,
  },
  {
    label: "project heading",
    section: "grt-next-bus",
    selector: "#grt-next-bus .project-identity h2",
    required: true,
    note: "if a heading is occluded the layout is broken",
  },
  {
    label: "project notes",
    section: "grt-next-bus",
    selector: "#grt-next-bus .demo-facts li",
    required: true,
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
 * Runs in the page. Samples a grid across the element and reports, per point, what is
 * actually painted there — plus the effective opacity through every ancestor.
 */
const PROBE = (selector) => {
  /* When a selector matches many elements, test one that is actually on screen.
     `querySelector` takes the first in document order, which for Decaf's radial
     burst is whichever heart happens to be first in the markup — and since the
     burst throws them outward in every direction, that one is regularly mid-flight
     above the top edge. The harness then reported the whole effect as invisible
     while thirty of its siblings were plainly in frame.

     Preference order: intersecting the viewport, then largest. Falls back to the
     first match so a genuinely absent-from-screen element still reports as such. */
  const all = [...document.querySelectorAll(selector)];
  if (!all.length) return { missing: true };
  const onScreen = all.filter((node) => {
    const box = node.getBoundingClientRect();
    return box.bottom > 0 && box.top < innerHeight && box.right > 0 && box.left < innerWidth;
  });
  const pool = onScreen.length ? onScreen : all;
  const el = pool.reduce((best, node) => {
    const a = node.getBoundingClientRect();
    const b = best.getBoundingClientRect();
    return a.width * a.height > b.width * b.height ? node : best;
  }, pool[0]);
  const matched = { total: all.length, onScreen: onScreen.length };

  const box = el.getBoundingClientRect();
  if (box.width === 0 || box.height === 0) {
    return { zeroSized: true, box: { w: box.width, h: box.height } };
  }

  /* `elementFromPoint` hit-tests, and hit-testing skips `pointer-events: none`.
     Most of the decorative layers on this page are exactly that — the portalled
     notification layers, the ambience, the ghost numbers — so asking the document
     what is at a point returned whatever was *behind* them and reported every one as
     "completely covered". That is the difference between "cannot be clicked", which
     is intended, and "cannot be seen", which is the question.

     So pointer events are forced back on for the element and its ancestors just long
     enough to hit-test, then restored. What comes back is true paint order. */
  const patched = [];
  for (let node = el; node && node !== document.documentElement; node = node.parentElement) {
    if (getComputedStyle(node).pointerEvents === "none") {
      patched.push([node, node.style.pointerEvents]);
      node.style.pointerEvents = "auto";
    }
  }
  const restore = () => {
    for (const [node, previous] of patched) node.style.pointerEvents = previous;
  };

  // Effective opacity and hard invisibility, walking up.
  let opacity = 1;
  let hidden = null;
  for (let node = el; node && node !== document.documentElement; node = node.parentElement) {
    const style = getComputedStyle(node);
    opacity *= Number(style.opacity);
    if (style.visibility === "hidden") hidden ??= `${node.className || node.tagName} visibility:hidden`;
    if (style.display === "none") hidden ??= `${node.className || node.tagName} display:none`;
  }

  const describe = (node) => {
    if (!node) return "(nothing)";
    const cls = typeof node.className === "string" ? node.className.trim().split(/\s+/)[0] : "";
    return `${node.tagName.toLowerCase()}${cls ? `.${cls}` : ""}`;
  };

  /* Whether an element actually puts ink on the screen, as opposed to merely owning a
     box at this point. `elementFromPoint` returns the topmost *hit-testable* element,
     and a transparent wrapper hit-tests across its whole box — so the first useful run
     of this harness reported the PagePack cable as "behind div.project-body", which is
     a layout container with no background that paints nothing at all. Chasing that
     would have meant redesigning a section to escape an element that was never
     visible. */
  /**
   * Effective opacity, accumulated up the ancestor chain.
   *
   * A node's own `opacity` is not the question. A panel parked at `opacity: 0` until its
   * beat arrives has children that each compute to `opacity: 1`, and those children
   * hit-test across the whole box — so checking only the node itself reported PagePack's
   * browser window as covered by the header and index of a reader panel that was not on
   * screen. This is the same mistake as trusting `elementFromPoint` on a
   * `pointer-events: none` layer, one level up.
   */
  const effectiveOpacity = (node) => {
    let value = 1;
    for (let n = node; n && n !== document.documentElement; n = n.parentElement) {
      const style = getComputedStyle(n);
      if (style.visibility === "hidden" || style.display === "none") return 0;
      value *= Number(style.opacity);
      if (value < 0.02) return value;
    }
    return value;
  };

  const paintsSomething = (node, x, y) => {
    const style = getComputedStyle(node);
    if (effectiveOpacity(node) < 0.05) return false;
    if (style.visibility === "hidden") return false;
    if (style.backgroundImage !== "none") return true;
    const bg = style.backgroundColor;
    const alpha = bg.startsWith("rgba") ? Number(bg.split(",")[3]) : 1;
    if (alpha > 0.02) return true;
    // Replaced content and anything with its own glyphs is ink by definition.
    if (/^(img|svg|video|canvas|path|rect|circle|use|image)$/i.test(node.tagName)) return true;
    if (Number(style.borderWidth.replace(/[^\d.]/g, "")) > 0 && style.borderStyle !== "none") {
      return true;
    }
    if (style.boxShadow !== "none") return true;
    // A text node of its own directly under the point.
    for (const child of node.childNodes) {
      if (child.nodeType !== Node.TEXT_NODE || !child.textContent.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const rect of range.getClientRects()) {
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return true;
      }
    }
    return false;
  };

  // Nine points: the centre plus a ring inside the edges. Corners are sampled at 15%
  // rather than 0% because a rounded or hairline element legitimately paints nothing
  // exactly on its own boundary.
  const fractions = [0.15, 0.5, 0.85];
  const samples = [];
  let clear = 0;
  const blockers = new Map();

  for (const fy of fractions) {
    for (const fx of fractions) {
      const x = box.left + box.width * fx;
      const y = box.top + box.height * fy;
      if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) {
        samples.push("offscreen");
        continue;
      }

      /* Drill down through anything that does not paint, restoring as we go. Capped
         so a pathological tree cannot spin here. */
      const muted = [];
      let hit = document.elementFromPoint(x, y);
      let ours = hit === el || el.contains(hit) || hit?.contains(el);
      for (let depth = 0; depth < 12 && hit && !ours; depth += 1) {
        if (paintsSomething(hit, x, y)) break;
        muted.push([hit, hit.style.pointerEvents]);
        hit.style.pointerEvents = "none";
        hit = document.elementFromPoint(x, y);
        ours = hit === el || el.contains(hit) || hit?.contains(el);
      }
      for (const [node, previous] of muted) node.style.pointerEvents = previous;

      if (ours) {
        clear += 1;
        samples.push("clear");
      } else {
        const name = describe(hit);
        blockers.set(name, (blockers.get(name) ?? 0) + 1);
        samples.push(name);
      }
    }
  }

  const onscreen = samples.filter((s) => s !== "offscreen").length;
  restore();

  return {
    matched,
    decorative: patched.length > 0,
    box: {
      x: Math.round(box.left),
      y: Math.round(box.top),
      w: Math.round(box.width),
      h: Math.round(box.height),
    },
    opacity: Number(opacity.toFixed(3)),
    hidden,
    clear,
    onscreen,
    inViewport: box.bottom > 0 && box.top < innerHeight,
    blockers: [...blockers.entries()].sort((a, b) => b[1] - a[1]).map(([n, c]) => `${n} x${c}`),
  };
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(BASE, { waitUntil: "load" });
await page.waitForTimeout(2200);

/** Waits until a scene reports the beat we want to inspect. */
async function waitForBeat(sectionId, name) {
  const stage = page.locator(`#${sectionId} [data-beat]`).first();
  try {
    await stage.waitFor({ timeout: 20_000 });
  } catch {
    return false;
  }
  const deadline = Date.now() + 25_000;
  while (Date.now() < deadline) {
    if ((await stage.getAttribute("data-beat")) === name) return true;
    await page.waitForTimeout(60);
  }
  return false;
}

let failures = 0;
let lastSection = null;

console.log(`\nhit-testing what a visitor can actually see — 1440x900\n`);

for (const check of CHECKS) {
  if (filter && !check.label.toLowerCase().includes(filter)) continue;

  if (check.section && check.section !== lastSection) {
    await focusSection(page, check.section);
    lastSection = check.section;
  }
  if (check.beat) {
    const reached = await waitForBeat(check.beat.section, check.beat.name);
    if (!reached) console.log(`  ${check.label}: never reached beat "${check.beat.name}"`);
    /* A beat boundary is the worst moment to measure. Entrances on this page run 300
       to 500ms, so sampling the instant `data-beat` flips catches things at the
       opacity they are animating *from* and reports them as invisible. The first pass
       of this harness failed the GRT notification and the Night Neutralizer subtitle
       for exactly that reason, and both were fine. */
    await page.waitForTimeout(520);
  }

  const result = await page.evaluate(PROBE, check.selector);
  const bad = (message) => {
    console.log(`FAIL  ${check.label.padEnd(20)} ${message}`);
    if (check.note) console.log(`      note: ${check.note}`);
    if (check.required) failures += 1;
  };

  if (result.missing) {
    bad(`not in the document (${check.selector})`);
    continue;
  }
  if (result.zeroSized) {
    bad(`zero-sized (${result.box.w}x${result.box.h})`);
    continue;
  }
  if (result.hidden) {
    bad(`hidden: ${result.hidden}`);
    continue;
  }
  if (result.opacity < 0.05) {
    bad(`effective opacity ${result.opacity} through its ancestors`);
    continue;
  }
  if (!result.inViewport) {
    bad(`outside the viewport at y=${result.box.y}`);
    continue;
  }
  if (result.onscreen === 0) {
    bad(`entirely outside the viewport horizontally or vertically`);
    continue;
  }

  const share = result.clear / result.onscreen;
  const geometry = `${result.box.w}x${result.box.h} at ${result.box.x},${result.box.y}`;
  if (share === 0) {
    bad(`completely covered — ${geometry}, opacity ${result.opacity}, behind ${result.blockers.join(", ")}`);
    continue;
  }
  if (share < 0.5) {
    bad(
      `mostly covered (${result.clear}/${result.onscreen} points clear) — ${geometry}, behind ${result.blockers.join(", ")}`,
    );
    continue;
  }

  const trailing = result.blockers.length ? `  partly behind ${result.blockers.join(", ")}` : "";
  const kind = result.decorative ? " [decorative]" : "";
  const many =
    result.matched.total > 1
      ? `  ${result.matched.onScreen}/${result.matched.total} on screen`
      : "";
  console.log(
    `ok    ${check.label.padEnd(20)} ${result.clear}/${result.onscreen} clear  ${geometry}  opacity ${result.opacity}${kind}${many}${trailing}`,
  );
}

console.log(
  failures
    ? `\n${failures} required element${failures === 1 ? "" : "s"} a visitor cannot see\n`
    : `\neverything required is visible\n`,
);

await browser.close();
await stop();
setTimeout(() => process.exit(failures ? 1 : 0), 1200).unref();
