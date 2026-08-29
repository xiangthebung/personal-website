/**
 * Does the project dock still fit, now that there are ten of them?
 *
 * The dock is a fixed rail of one numeral per project plus the hold ring, pinned to the
 * side of the viewport for the whole project run. At seven entries it had room to spare
 * at every height anyone tests at, so nothing ever measured it. Ten is a 43% taller rail
 * against the same window, and the failure mode is quiet: the rail overflows the viewport
 * and the last project's number — plus the motion control under it — simply cannot be
 * reached, on exactly the short laptop screens least likely to be checked.
 *
 * So this measures, at a set of real viewport heights, whether the dock's box fits inside
 * the window and whether every numeral and the hold button are inside it too.
 *
 *   node scripts/dock-fit.mjs
 *   PREVIEW_PORT=4601 node scripts/dock-fit.mjs
 *
 * Requires a current `npm run build`. Exits non-zero on the first height that fails.
 */

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PREVIEW_PORT ?? 4405);
const BASE = `http://localhost:${PORT}`;

/* Heights chosen from what people actually browse on rather than round numbers: a 768p
   laptop with browser chrome, a 900p one, a short window someone has dragged, and a
   1080p screen as the comfortable case. Widths matter too — the dock hides itself on
   narrow viewports, so the wide column is the one under test. */
const SIZES = [
  { width: 1440, height: 1080, label: "1440x1080 comfortable" },
  { width: 1440, height: 900, label: "1440x900  common laptop" },
  { width: 1366, height: 768, label: "1366x768  small laptop" },
  { width: 1280, height: 660, label: "1280x660  dragged short" },
];

const server = spawn(
  process.execPath,
  [path.join(root, "node_modules", "vite", "bin", "vite.js"), "preview", "--port", String(PORT)],
  { cwd: root, stdio: "ignore" },
);

const stop = () => {
  try {
    server.kill();
  } catch {
    /* already gone */
  }
};
process.on("exit", stop);

async function waitForServer(timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(BASE, { redirect: "manual" });
      if (response.status < 500) return;
    } catch {
      /* not up yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`preview server never came up on ${PORT}`);
}

await waitForServer();

const browser = await chromium.launch();
let failures = 0;

for (const size of SIZES) {
  const page = await browser.newPage({ viewport: { width: size.width, height: size.height } });
  await page.goto(BASE, { waitUntil: "networkidle" });

  /* The dock only reveals itself once a project owns the viewport, so stand in one. */
  await page.locator("#choir-practice").scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);

  const measured = await page.evaluate(() => {
    const dock = document.querySelector(".project-dock");
    if (!dock) return null;
    const box = dock.getBoundingClientRect();
    const links = [...dock.querySelectorAll("[data-project-dock]")];
    const hold = dock.querySelector(".dock-hold") ?? dock.querySelector("button");
    const outside = links
      .map((link) => ({ id: link.dataset.projectDock, rect: link.getBoundingClientRect() }))
      .filter(({ rect }) => rect.top < 0 || rect.bottom > window.innerHeight)
      .map(({ id }) => id);
    const holdRect = hold?.getBoundingClientRect() ?? null;
    return {
      top: box.top,
      bottom: box.bottom,
      height: box.height,
      viewport: window.innerHeight,
      links: links.length,
      outside,
      holdVisible: holdRect ? holdRect.top >= 0 && holdRect.bottom <= window.innerHeight : null,
      display: getComputedStyle(dock).display,
    };
  });

  if (!measured) {
    console.log(`  ${size.label}: no .project-dock in the document`);
    await page.close();
    continue;
  }

  if (measured.display === "none") {
    console.log(`  ${size.label}: dock hidden at this width (by design)`);
    await page.close();
    continue;
  }

  const fits = measured.top >= 0 && measured.bottom <= measured.viewport;
  const ok = fits && measured.outside.length === 0 && measured.holdVisible !== false;
  if (!ok) failures += 1;

  console.log(
    `  ${ok ? "ok  " : "FAIL"} ${size.label}: dock ${Math.round(measured.height)}px ` +
      `in ${measured.viewport}px (top ${Math.round(measured.top)}, ` +
      `bottom ${Math.round(measured.bottom)}), ${measured.links} links` +
      (measured.outside.length ? `, off screen: ${measured.outside.join(", ")}` : "") +
      (measured.holdVisible === false ? ", hold button off screen" : ""),
  );

  await page.close();
}

await browser.close();
stop();

if (failures) {
  console.log(`\n${failures} viewport(s) cannot show the whole dock.`);
  process.exit(1);
}
console.log("\nthe dock fits at every height measured");
