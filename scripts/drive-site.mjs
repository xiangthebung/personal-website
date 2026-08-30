/**
 * Drives the built site in real Chromium and reports what actually happened.
 *
 * `npm test` renders the page and reads the HTML. That catches a missing section or
 * a broken claim, and catches nothing at all about the scenes embedded in it — a
 * vignette can server-render perfectly and then throw on its first frame, or play
 * to the end of its first beat and stop. This script is the other half: it loads
 * the production build, scrolls to each pod, watches the scene advance, and fails
 * on any console error or uncaught exception along the way.
 *
 *   node scripts/drive-site.mjs              # headless, pass/fail
 *   node scripts/drive-site.mjs --headed     # watch it happen
 *   node scripts/drive-site.mjs --shots      # also write outputs/site/*.png
 *
 * Requires a current `npm run build`.
 *
 * It serves the build with `vite preview`, not `vinext start`. Two reasons: that is
 * the Cloudflare Worker this site actually deploys as, bindings and all; and
 * `vinext start` (0.0.50) only serves top-level files out of `dist/client` — every
 * nested path, `/assets/*` included, comes back 404, so the page it hands you has no
 * stylesheet and no client bundle.
 *
 * For reviewing how a single scene *looks*, use `film-strip.mjs` instead. This
 * script only cares that scenes are alive and quiet.
 */

import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { chromium } from "playwright";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const shotDir = path.join(root, "outputs", "site");

const headed = process.argv.includes("--headed");
const wantShots = process.argv.includes("--shots");
/* Overridable so several of these can run at once — three scenes being built in
 * parallel git worktrees would otherwise all try to serve a preview on the same
 * port, and the second and third would fail for a reason that looks nothing like
 * the real one. The default is unchanged, so nothing that called this before has
 * to change now. */
const PORT = Number(process.env.PREVIEW_PORT ?? 4319);
// `localhost`, not `127.0.0.1`: vite preview binds v6 loopback only by default.
const BASE = `http://localhost:${PORT}`;

/**
 * Every project section, in page order — read off the page rather than listed.
 *
 * It was a hardcoded array, and it went stale the first time the running order
 * changed: the checks still ran, but numbered their screenshots against the old
 * sequence, so `05-decaf.png` was the second section on the page. A list of the
 * thing you are checking, maintained by hand next to the thing that already knows
 * it, is a list that lies eventually.
 */
async function projectOrder(page) {
  return page.$$eval("[data-project-section]", (nodes) => nodes.map((node) => node.id));
}

/** The one pod that is a real embedded application rather than a scene. */
const EMBED = "choir-practice";

/* --------------------------------- server --------------------------------- */

/**
 * Boots the preview server and resolves once it answers a request.
 *
 * Vite's bin is run with `node` rather than through `npx`, deliberately. On Windows
 * `npx` needs a shell, which means the pid we hold is `cmd.exe`, not the server —
 * killing it orphans a listener on the port, and the *next* run then talks to a
 * stale server whose `dist/` has been rebuilt underneath it. That failure looks
 * exactly like a broken site: every asset 500s.
 */
async function startServer() {
  const child = spawn(
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
  child.stdout.on("data", (d) => log.push(String(d)));
  child.stderr.on("data", (d) => log.push(String(d)));

  const deadline = Date.now() + 90_000;
  for (;;) {
    if (child.exitCode !== null) {
      const stale = log.join("").includes("is already in use");
      throw new Error(
        stale
          ? `port ${PORT} is already in use — a previous preview server is still running`
          : `server exited early (${child.exitCode})\n${log.join("")}`,
      );
    }
    try {
      const res = await fetch(BASE, { signal: AbortSignal.timeout(2000) });
      if (res.ok) break;
    } catch {
      /* not up yet */
    }
    if (Date.now() > deadline) throw new Error(`server never came up on ${PORT}`);
    await new Promise((r) => setTimeout(r, 400));
  }

  return {
    async stop() {
      // Miniflare runs the worker in a child `workerd`, so the tree has to go.
      if (process.platform === "win32" && child.pid) {
        await new Promise((resolve) => {
          spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
            stdio: "ignore",
          }).on("close", resolve);
        });
      }
      child.kill();

      for (let attempt = 0; attempt < 12; attempt++) {
        try {
          await fetch(BASE, { signal: AbortSignal.timeout(700) });
        } catch {
          return;
        }
        await new Promise((r) => setTimeout(r, 400));
      }
      console.error(`warning: something is still listening on ${PORT}`);
    },
  };
}

/* ---------------------------------- output --------------------------------- */

const problems = [];

function ok(what) {
  console.log(`  ok    ${what}`);
}
function bad(what, detail) {
  problems.push(detail ? `${what}\n        ${detail}` : what);
  console.log(`  FAIL  ${what}${detail ? `\n        ${detail}` : ""}`);
}
function note(what) {
  console.log(`  note  ${what}`);
}
function step(what) {
  console.log(`\n[${new Date().toISOString().slice(11, 19)}] ${what}`);
}

/** Asserts a locator becomes visible, recording the outcome either way. */
async function shows(locator, what, timeout = 15_000) {
  try {
    await locator.first().waitFor({ state: "visible", timeout });
    ok(what);
    return true;
  } catch (error) {
    bad(what, String(error).split("\n")[0]);
    return false;
  }
}

/* ----------------------------------- main ---------------------------------- */

async function main() {
  step(`starting preview server on ${PORT}`);
  const server = await startServer();
  step("server up, launching chromium");
  const browser = await chromium.launch({ headless: !headed });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  context.setDefaultTimeout(12_000);
  const page = await context.newPage();

  const ignorable = [
    /favicon/i,
    /Blocked script execution in 'about:blank'/i,
  ];
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (ignorable.some((re) => re.test(text))) return;
    bad(`console error: ${text}`);
  });
  page.on("pageerror", (error) => bad(`uncaught: ${error.message}`));
  page.on("requestfailed", (req) => {
    const url = req.url();
    if (ignorable.some((re) => re.test(url))) return;
    const why = req.failure()?.errorText ?? "";
    /* Chromium cancels media range requests as a matter of course — when a clip
       scrolls out of the loading window, when it has buffered enough, when the
       element is replaced. An aborted video is not a missing video; a missing one
       shows up as a 404 in the console handler above. */
    if (why.includes("ERR_ABORTED") && /\.(mp4|webm|mov)$/i.test(new URL(url).pathname)) {
      return;
    }
    bad(`request failed: ${url} (${why})`);
  });

  if (wantShots) {
    await rm(shotDir, { recursive: true, force: true });
    await mkdir(shotDir, { recursive: true });
  }
  const shot = async (name) => {
    if (!wantShots) return;
    await page.screenshot({ path: path.join(shotDir, `${name}.png`) });
  };

  /* ------------------------------- the shell ------------------------------- */

  step("loading the page");
  await page.goto(BASE, { waitUntil: "load" });
  await shows(page.locator("#hero-title"), "hero renders");

  const shell = await page.evaluate(() => ({
    sheets: document.styleSheets.length,
    focus: document.documentElement.classList.contains("has-project-focus"),
    demoDisplay: getComputedStyle(document.querySelector(".demo")).display,
  }));
  if (shell.sheets > 0 && shell.demoDisplay === "flex") ok("stylesheet applied");
  else bad(`stylesheet not applied (sheets=${shell.sheets}, .demo display=${shell.demoDisplay})`);
  if (shell.focus) ok("client chrome mounted (has-project-focus)");
  else bad("client chrome never mounted: html is missing has-project-focus");

  /* The hero title assembles itself letter by letter, so it is legitimately
     invisible for the first ~1.4s. Wait it out and check it arrives — an animation
     with the wrong fill mode leaves the name off the page for good, and every
     locator would still report it present. */
  await page.waitForTimeout(2200);
  const letters = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".hero-letter")).map((el) => ({
      text: el.textContent,
      opacity: Number(getComputedStyle(el).opacity),
      width: Math.round(el.getBoundingClientRect().width),
    })),
  );
  const faint = letters.filter((l) => l.opacity < 0.99);
  const collapsed = letters.filter((l) => l.text.trim() && l.width === 0);
  if (letters.length === 0) bad("hero title rendered no letters");
  else if (faint.length) bad(`hero letters never finished landing: ${faint.length} still faint`);
  else if (collapsed.length) bad(`hero letters have no width: ${collapsed.length}`);
  else ok(`hero title landed (${letters.length} letters, all opaque)`);

  await shot("00-hero");

  /* --------------------------------- pods ---------------------------------- */

  const PROJECTS = await projectOrder(page);
  if (PROJECTS.length < 7) bad(`only ${PROJECTS.length} project sections found`);
  else ok(`${PROJECTS.length} projects, in order: ${PROJECTS.join(", ")}`);

  for (const id of PROJECTS) {
    step(`pod: ${id}`);
    const section = page.locator(`#${id}`);
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);

    const host = section.locator(".demo-host");
    await host.waitFor({ state: "attached", timeout: 15_000 });
    try {
      await host.locator(".demo-skeleton").waitFor({ state: "detached", timeout: 20_000 });
      ok(`${id}: chunk mounted`);
    } catch {
      bad(`${id}: never replaced its skeleton`);
      continue;
    }

    const stage = host.locator(":scope > *").first();

    /* The shrink-to-fit trap. `.demo-surface` centres its child, so a scene sized
       by `aspect-ratio` rather than by content will quietly render at half width
       and look like a thumbnail of itself. */
    const box = await stage.boundingBox();
    const width = Math.round(box?.width ?? 0);
    if (width < 600) bad(`${id}: stage is only ${width}px wide inside a 1440px viewport`);
    else ok(`${id}: stage fills the well (${width}px)`);

    if (id === EMBED) {
      /* Nothing to press: the frame loads itself and drives the app to a score.
         Both halves are checked, because the automation is written to fail silently
         and a silent failure would otherwise look like success. */
      if (await shows(section.locator("iframe.choir-frame"), "choir: frame mounted itself", 20_000)) {
        const inner = page.frameLocator(`#${id} iframe.choir-frame`);
        await shows(inner.locator("body"), "choir: app document loaded", 20_000);
        if (await shows(inner.locator("#play-btn"), "choir: a score opened on its own", 20_000)) {
          const canvases = await inner.locator("canvas").count();
          if (canvases > 0) ok(`choir: score engraved (${canvases} canvas layers)`);
          else bad("choir: transport is up but nothing was drawn");
        }
        // It must not have started making noise on its own.
        const playing = await inner
          .locator("#play-btn")
          .getAttribute("aria-label")
          .catch(() => null);
        if (playing && /pause/i.test(playing)) bad("choir: started playing without being asked");
        else ok(`choir: silent until asked (play button reads "${playing ?? "?"}")`);
      }
      await shot(`0${PROJECTS.indexOf(id) + 1}-${id}`);
      continue;
    }

    /* A scene has to be *running*. `data-beat` changing is the cheapest proof, and
       a scene stuck on its first beat — a storyboard whose effect bailed, a loop
       that threw after one frame — is otherwise indistinguishable from a working
       one in a screenshot. */
    const firstBeat = await stage.getAttribute("data-beat");
    if (firstBeat === null) {
      note(`${id}: not a scene yet (no data-beat)`);
      await shot(`0${PROJECTS.indexOf(id) + 1}-${id}`);
      continue;
    }

    /* Measured against the lap the scene is already on, not against zero.
       `useOnScreen` starts a scene 120px before it reaches the viewport, so by the
       time its own turn comes round a pod has often been playing throughout the
       previous pod's twenty-second check and is several laps in. Waiting for
       `lap > 0` therefore returned instantly, having seen exactly one beat, and
       reported a perfectly working scene as stuck — which cost a round of
       debugging aimed squarely at the wrong file. */
    const baseline = await stage.evaluate((el) => Number(el.dataset.lap ?? "0"));
    const seen = new Set([firstBeat]);
    /* Long enough for the slowest scene to finish a lap from a standing start.
       PDF Explainer is the slowest at 25.3s of beats plus the 1.1s gap between laps,
       and this check joins a lap at an arbitrary point — so the worst case is very
       nearly a full 26.4s of waiting before `lap` ticks over. At 24s that left under
       three seconds of margin, which is not margin, it is a scene-pacing change away
       from a red build that has nothing to do with the change. Raise this whenever a
       scene gets slower than about thirty-five seconds. */
    const until = Date.now() + 50_000;
    let laps = baseline;
    while (Date.now() < until) {
      const state = await stage.evaluate((el) => ({
        beat: el.dataset.beat,
        lap: Number(el.dataset.lap ?? "0"),
      }));
      if (state.beat) seen.add(state.beat);
      laps = state.lap;
      if (laps > baseline && seen.size >= 3) break;
      await page.waitForTimeout(120);
    }

    if (seen.size < 3) bad(`${id}: scene did not advance (beats seen: ${[...seen].join(", ")})`);
    else if (laps <= baseline) {
      bad(`${id}: scene never finished a loop in 40s (${seen.size} beats, still on lap ${laps})`);
    } else ok(`${id}: scene plays and loops (${seen.size} beats, lap ${laps})`);

    await shot(`0${PROJECTS.indexOf(id) + 1}-${id}`);
  }

  /* --------------------------------- legal --------------------------------- */

  step("legal pages");
  await page.goto(`${BASE}/legal`, { waitUntil: "load" });
  await shows(page.locator("h1"), "legal index renders");
  await shot("09-legal-index");

  /* Read out of the registry rather than typed here. This list was six slugs long while
     the site published nine, so the three newest legal pages — the ones most likely to be
     broken — were the three this driver never opened, and it said "site drives clean"
     either way. A hardcoded list of the things to check is a list that stops covering the
     thing it was written for. */
  const legalSlugs = [
    ...(await readFile(new URL("../app/legal/policies.ts", import.meta.url), "utf8")).matchAll(
      /^\s{4}slug: "([^"]+)",$/gm,
    ),
  ].map((match) => match[1]);
  if (legalSlugs.length < 6) {
    bad(`only ${legalSlugs.length} policy slugs parsed out of policies.ts`);
  }
  /* The level between the index and a document. It 404'd for a long time while
     `grt-bus-time`'s README published `/legal/grt-next-bus` as the base its popup links
     hang off, so this walks it for the same reason the slugs above are read rather than
     typed: the pages nothing ever opens are the pages that break. Derived from the same
     registry, so a project cannot have a document here and no index. */
  for (const project of [...new Set(legalSlugs.map((slug) => slug.split("/")[0]))]) {
    await page.goto(`${BASE}/legal/${project}`, { waitUntil: "load" });
    const body = page.locator(".legal-body");
    if (!(await shows(body, `/legal/${project} renders`))) continue;

    const links = await page.locator(`.legal-index a[href^="/legal/${project}/"]`).count();
    const wanted = legalSlugs.filter((slug) => slug.startsWith(`${project}/`)).length;
    if (links !== wanted) {
      bad(`/legal/${project} lists ${links} document links, registry has ${wanted}`);
    } else {
      ok(`/legal/${project} lists all ${wanted} of its documents`);
    }
  }

  for (const slug of legalSlugs) {
    await page.goto(`${BASE}/legal/${slug}`, { waitUntil: "load" });
    const body = page.locator(".legal-body");
    if (!(await shows(body, `/legal/${slug} renders`))) continue;

    const text = await body.innerText();
    if (/\*\*|^#{1,3}\s/m.test(text)) bad(`/legal/${slug} shows raw markdown`);
    const measure = await body.evaluate((el) => Math.round(el.getBoundingClientRect().width));
    if (measure > 780) bad(`/legal/${slug} body is ${measure}px wide`);
    else ok(`/legal/${slug} reads as a document (${measure}px, ${text.length} chars)`);
  }
  await shot("10-legal-policy");

  /* -------------------------------- gallery -------------------------------- */

  step("gallery");
  await page.goto(BASE, { waitUntil: "load" });
  await page.locator(".fun-section").scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  const broken = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".fun-section img"))
      .filter((img) => img.complete && img.naturalWidth === 0)
      .map((img) => img.getAttribute("src")),
  );
  if (broken.length) bad(`gallery images failed to decode: ${broken.join(", ")}`);
  else ok("gallery images all decoded");
  await shot("11-gallery");

  /* --------------------------- reduced motion ------------------------------ */

  /* The one state on this site nobody sees by accident. A machine reporting
     `prefers-reduced-motion: reduce` is supposed to land with the films already
     held — ten still frames, every label up, and the control in the dock pressed —
     and every part of that is invisible on a normal run, because the browser this
     script drives does not ask for it. It is a fresh context rather than an
     emulation on the page: the preference has to be true from the first commit,
     which is when `MotionHold` reads it.

     Failing here does not mean the animation is broken; it means the setting is
     being ignored again. */
  step("reduced motion");
  const calmContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const calmPage = await calmContext.newPage();
  await calmPage.goto(BASE, { waitUntil: "load" });
  await calmPage.waitForTimeout(1200);

  const landed = await calmPage.evaluate(() => ({
    held: document.documentElement.classList.contains("is-held"),
    settled: document.documentElement.classList.contains("is-held-settled"),
    pressed: document.querySelector(".dock-hold")?.getAttribute("aria-pressed"),
  }));
  if (!landed.held) bad("a reduce visitor did not land held");
  else if (!landed.settled) bad("a reduce visitor landed held but the clocks kept running");
  else if (landed.pressed !== "true") bad(`the hold control reads aria-pressed=${landed.pressed}`);
  else ok("a reduce visitor lands held, settled, with the control showing it");

  /* And can leave. A landing that cannot be undone is the ambient setting the
     README spent four paragraphs refusing.

     Scrolled into the project run first, because the dock is deliberately hidden over
     the hero — `ProjectFocusManager` reveals it once a project owns the viewport, which
     is also where the films the button is about are. Clicking it from the top of the
     page times out against the hero, which is the control working as designed. */
  await calmPage.locator("[data-project-section]").nth(1).scrollIntoViewIfNeeded();
  await calmPage.waitForFunction(() => {
    const root = document.documentElement.classList;
    return root.contains("has-project-in-view") && !root.contains("is-hero-visible");
  });
  await calmPage.waitForTimeout(500);
  await calmPage.locator(".dock-hold").click();
  await calmPage.waitForTimeout(400);
  const released = await calmPage.evaluate(() =>
    document.documentElement.classList.contains("is-held"),
  );
  if (released) bad("pressing the control did not release the hold");
  else ok("and one press gives the motion back");

  await calmContext.close();

  await browser.close();
  await server.stop();

  if (wantShots) {
    console.log(`\nscreenshots: ${path.relative(root, shotDir)}`);
    await writeFile(
      path.join(shotDir, "report.txt"),
      problems.length ? problems.join("\n") : "no problems\n",
      "utf8",
    );
  }

  if (problems.length) {
    console.error(`\n${problems.length} problem(s):`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exitCode = 1;
  } else {
    console.log("\nsite drives clean");
  }
}

/* A hung run is worse than a failed one: it tells you nothing and blocks the
   terminal. */
const watchdog = setTimeout(
  () => {
    console.error("\nwatchdog: drive-site exceeded 8 minutes, giving up");
    process.exit(1);
  },
  8 * 60_000,
).unref();

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    clearTimeout(watchdog);
    // Playwright and workerd both keep handles; do not wait on them.
    setTimeout(() => process.exit(process.exitCode ?? 0), 1500).unref();
  });
