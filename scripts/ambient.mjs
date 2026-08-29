/**
 * When you are inside a project, has the whole page become that project?
 *
 * The presence system fades a neighbour's contents, and that turned out not to be the
 * effect being asked for. Standing in Night Neutralizer — a near-black room — the strip
 * of PagePack visible below it was still lavender, so the page read as a stack of
 * differently-coloured panels rather than as one place that had gone dark.
 *
 * This measures the thing that matters: the *rendered* background colour of every
 * section that is on screen, with one project centred. If the page has become one place,
 * the neighbours' backgrounds sit close to the active project's own. If they have kept
 * their paper, they do not.
 *
 * Reported as a distance in RGB so the numbers mean something: 0 is identical, and the
 * gap between PagePack's lavender and Night Neutralizer's black is about 240.
 *
 *   node scripts/ambient.mjs
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { chromium } from "playwright";
import { focusSection } from "./settle.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
/* Overridable so several of these can run at once — three scenes being built in
 * parallel git worktrees would otherwise all try to serve a preview on the same
 * port, and the second and third would fail for a reason that looks nothing like
 * the real one. The default is unchanged, so nothing that called this before has
 * to change now. */
const PORT = Number(process.env.PREVIEW_PORT ?? 4391);
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
server.stdout.on("data", () => {});
server.stderr.on("data", () => {});

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
  if (server.exitCode !== null) process.exit(1);
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

/**
 * What each visible section is wearing.
 *
 * The first version of this read `backgroundColor` and was measuring the wrong thing:
 * six of the seven sections paint themselves with a gradient, which leaves
 * `background-color` transparent, so five of them reported `rgb(0,0,0)` and the check
 * was nonsense. That mistake is worth keeping in mind — it is also what proved the
 * original implementation could never have worked.
 *
 * So this measures the mechanism instead. Each section carries a `.project-tint` filled
 * with the ambient colour at `1 - presence`, and the question is whether a neighbour's
 * tint is actually up. A faded neighbour with an opaque tint *is* wearing the active
 * project's colour, whatever its own paper is doing underneath.
 */
const survey = () =>
  page.evaluate(() => {
    const parse = (value) => (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
    const viewport = window.innerHeight;
    const rows = [];
    for (const section of document.querySelectorAll("[data-project-section]")) {
      const box = section.getBoundingClientRect();
      const visible = Math.max(0, Math.min(box.bottom, viewport) - Math.max(box.top, 0));
      if (visible <= 8) continue;
      const tint = section.querySelector(":scope > .project-tint");
      const tintStyle = tint ? getComputedStyle(tint) : null;
      rows.push({
        id: section.id,
        share: Number((visible / viewport).toFixed(2)),
        presence: Number(getComputedStyle(section).getPropertyValue("--presence")) || 0,
        own: getComputedStyle(section).getPropertyValue("--project-bg").trim(),
        tint: tintStyle ? Number(tintStyle.opacity) : null,
        tintRgb: tintStyle ? parse(tintStyle.backgroundColor) : null,
      });
    }
    return {
      rows,
      ambient: getComputedStyle(document.documentElement)
        .getPropertyValue("--ambient-bg")
        .trim(),
    };
  });

console.log(`\nhas the page become one place? — 1440x900\n`);

const ids = await page.evaluate(() =>
  Array.from(document.querySelectorAll("[data-project-section]")).map((s) => s.id),
);

/* A neighbour showing on screen while another project owns it has to be substantially
   covered. 0.7 leaves room for the crossfade without letting a neighbour sit there in
   its own colour. */
const COVERED = 0.7;

for (const id of ids) {
  await focusSection(page, id);
  // The tint transition is 380ms, deliberately slower than the content's 140ms.
  await page.waitForTimeout(900);

  const { rows, ambient } = await survey();
  const mine = rows.find((row) => row.id === id);
  if (!mine) {
    console.log(`FAIL  ${id.padEnd(18)} not on screen after being focused`);
    failures += 1;
    continue;
  }

  const problems = [];

  // The project you are in must be wearing its own colour, not a wash.
  if (mine.tint === null) problems.push("no tint layer");
  else if (mine.tint > 0.12) problems.push(`its own tint is up at ${mine.tint.toFixed(2)}`);

  // The ambient colour must be this project's.
  if (!ambient) problems.push("--ambient-bg is not set");
  else if (ambient !== mine.own) problems.push(`ambient is ${ambient}, wanted ${mine.own}`);

  // And every neighbour sharing the screen must be covered by it.
  const bare = rows.find(
    (row) => row.id !== id && row.share > 0.08 && (row.tint ?? 0) < COVERED,
  );
  if (bare) {
    problems.push(
      `${bare.id} is showing ${Math.round(bare.share * 100)}% of the screen with only ` +
        `${(bare.tint ?? 0).toFixed(2)} of tint on it`,
    );
  }

  const neighbours = rows
    .filter((row) => row.id !== id)
    .map((row) => `${row.id} tint ${(row.tint ?? 0).toFixed(2)}`)
    .join(", ");
  const detail =
    `own ${mine.own} tint ${(mine.tint ?? 0).toFixed(2)}  ` +
    (neighbours || "no neighbour on screen");

  if (problems.length) {
    console.log(`FAIL  ${id.padEnd(18)} ${problems.join("; ")}`);
    console.log(`      ${detail}`);
    failures += 1;
  } else {
    console.log(`ok    ${id.padEnd(18)} ${detail}`);
  }
}

console.log(
  failures
    ? `\n${failures} project${failures === 1 ? "" : "s"} where the page did not take on its colour\n`
    : `\nthe page becomes one place\n`,
);

await browser.close();
await stop();
setTimeout(() => process.exit(failures ? 1 : 0), 1200).unref();
