import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import test from "node:test";

/**
 * What these tests are for.
 *
 * The failure this site actually had was not a broken build — every build passed.
 * It was that the page described software that had moved on: four projects had been
 * renamed, one had been rewritten, one did not exist yet, and every screenshot was
 * of a version nobody was running any more. Nothing failed, so nobody noticed.
 *
 * So most of what is asserted here is not "does it render" but "is it still true".
 * The stale-name check and the demo-registry check exist to fail loudly the next
 * time the page and the projects drift apart.
 */

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

const exists = async (path) => {
  try {
    await stat(new URL(path, import.meta.url));
    return true;
  } catch {
    return false;
  }
};

test("server-renders every project", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Xiang Li<\/title>/i);

  // Each project's current name and its section anchor.
  for (const [name, id] of [
    ["Night Neutralizer", "night-neutralizer"],
    ["GRT Next Bus", "grt-next-bus"],
    ["N-Back", "n-back"],
    ["PagePack", "pagepack"],
    ["Decaf", "decaf"],
    ["PDF Explainer", "pdf-explainer"],
    ["Choir Practice", "choir-practice"],
  ]) {
    assert.match(html, new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `missing ${name}`);
    assert.match(html, new RegExp(`id="${id}"`), `missing section #${id}`);
  }

  assert.match(html, /hero-face-1600\.jpg/);
  // Gallery clips must not download until the gallery is approached.
  assert.match(html, /preload="none"/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|Building your site/i);
});

test("no project is described by a name it no longer has", async () => {
  const response = await render();
  const html = await response.text();

  // The exact drift this rebuild existed to fix. Every one of these was on the
  // page, and `blokamine` was also still the repository URL behind Decaf's
  // "Source" link, which no longer resolves.
  for (const stale of [
    "blokamine",
    "Zen N-Back",
    "Choir Practice Tool",
    "PDF Slide Explainer",
    "Jóhannes Björnsson",
  ]) {
    assert.doesNotMatch(html, new RegExp(stale, "i"), `stale name still on the page: ${stale}`);
  }
});

test("the demo registry covers every project, and every demo module exists", async () => {
  const [projectsSource, mountSource] = await Promise.all([
    read("../app/projects.ts"),
    read("../app/demos/demo-mount.tsx"),
  ]);

  // `\r?` throughout: this repository checks out with CRLF endings, and `$` in
  // JavaScript multiline mode matches before `\n` but not before `\r`.
  const declared = [...projectsSource.matchAll(/^\s*\|\s*"([a-z-]+)";?\r?$/gm)].map((m) => m[1]);
  assert.ok(
    declared.length >= 7,
    `expected the DemoId union to list every demo, found ${declared.length}`,
  );

  for (const id of declared) {
    // Quoted or bare, since `pagepack` needs no quotes as an object key.
    const registered = new RegExp(`(?:"${id}"|^\\s+${id}):\\s*lazy\\(`, "m").test(mountSource);
    assert.ok(registered, `${id} is in DemoId but not in the demo registry`);
    assert.ok(
      await exists(`../app/demos/${id}/demo.tsx`),
      `app/demos/${id}/demo.tsx does not exist`,
    );
  }

  // A total Record is what makes the registry a compile-time guarantee.
  assert.match(mountSource, /Record<DemoId,\s*LazyExoticComponent<ComponentType>>/);
});

test("nothing on the page claims to be the software it is describing", async () => {
  const [html, projectsSource, pageSource] = await Promise.all([
    render().then((response) => response.text()),
    read("../app/projects.ts"),
    read("../app/page.tsx"),
  ]);

  /*
   * There used to be a badge reading "running the real code", gated on a
   * `runsRealCode` flag, and a test here that made each project prove the claim by
   * importing logic ported from its repository. The flag was true because the demos
   * had been built as working software — a playable game, an operable popup — which
   * was the wrong thing to build. They are short films now, and a film should not
   * wear a badge insisting it is a documentary.
   *
   * So the claim is gone, and this test exists to keep it gone: the flag, the badge
   * and any phrasing that would tell a visitor they are looking at the real thing
   * rather than a dramatisation of it.
   */
  assert.doesNotMatch(projectsSource, /runsRealCode/, "the runsRealCode flag is back");
  assert.doesNotMatch(pageSource, /demo-live/, "the live badge is back in the page");
  assert.doesNotMatch(html, /running the real code/i);

  // Nor should a section tell the visitor to operate something that does not react.
  for (const instruction of [/\bDrag the\b/i, /\bPress Save\b/, /\bActually playable\b/i]) {
    assert.doesNotMatch(
      projectsSource,
      instruction,
      `a project still invites the visitor to operate its scene: ${instruction}`,
    );
  }
});

test("ported logic has not drifted from the extension it came from", async (t) => {
  // Skipped when the sibling checkout is absent, e.g. on a clean deploy runner.
  const siblingRoot = "../../night-neutralizer/src/core/";
  if (!(await exists(siblingRoot))) {
    t.skip("night-neutralizer checkout not present");
    return;
  }

  const ported = await readdir(new URL("../app/demos/night-neutralizer/core/", import.meta.url));
  const files = ported.filter((name) => name.endsWith(".ts"));
  assert.ok(files.length >= 6, "expected the whole ported core");

  for (const file of files) {
    const [mine, theirs] = await Promise.all([
      read(`../app/demos/night-neutralizer/core/${file}`),
      read(`${siblingRoot}${file}`),
    ]);
    assert.equal(
      mine.replace(/\r\n/g, "\n"),
      theirs.replace(/\r\n/g, "\n"),
      `${file} has drifted from the extension; recopy it rather than editing in place`,
    );
  }
});

test("demos that run a loop stop running it off screen", async () => {
  for (const id of ["night-neutralizer", "n-back", "grt-next-bus", "choir-practice"]) {
    const source = await read(`../app/demos/${id}/demo.tsx`);
    assert.match(source, /useOnScreen/, `${id} never checks whether it is on screen`);
  }

  const hook = await read("../app/demos/use-on-screen.ts");
  // Both conditions, for the reasons in that file's comment.
  assert.match(hook, /IntersectionObserver/);
  assert.match(hook, /visibilitychange/);
});

test("page stays a server component and the chrome stays a client one", async () => {
  const [page, chrome, layout] = await Promise.all([
    read("../app/page.tsx"),
    read("../app/page-chrome.tsx"),
    read("../app/layout.tsx"),
  ]);

  assert.doesNotMatch(page, /^"use client"/);
  assert.match(chrome, /^"use client"/);

  // The gallery's own behaviours.
  assert.match(chrome, /event\.shiftKey/);
  assert.match(chrome, /onPointerDown=\{handlePointerDown\}/);
  assert.match(chrome, /event\.key === "ArrowRight"/);
  assert.match(chrome, /requestAnimationFrame/);
  assert.match(chrome, /IntersectionObserver/);

  assert.match(layout, /title: "Xiang Li"/);
  assert.doesNotMatch(layout, /codex-preview|_sites-preview/);
});

test("layout rules the page depends on are still in the stylesheet", async () => {
  const css = await read("../app/globals.css");

  assert.match(css, /html\s*\{[\s\S]*overflow-x:\s*hidden/);
  assert.match(css, /body\s*\{[\s\S]*overflow-x:\s*hidden/);
  assert.match(css, /\.project \+ \.project\s*\{[\s\S]*margin-top/);

  // Sections size to their demo now. A fixed height was the rail's requirement and
  // would clip a 600px extension popup or a tall game board.
  assert.match(css, /min-height:\s*var\(--project-height\)/);
  assert.doesNotMatch(
    css,
    /^\s*height:\s*var\(--project-height\)/m,
    "the section height is fixed again; a demo taller than it will be clipped",
  );

  // The gallery rail still needs its drag affordances.
  assert.match(css, /cursor:\s*grab/);
  assert.match(css, /touch-action:\s*pan-y/);

  // Demo pods.
  assert.match(css, /\.demo-surface/);
  // The shared cursor every vignette borrows. Without it a scene still plays, but
  // buttons depress with nothing touching them, which reads as a rendering fault.
  assert.match(css, /\.ghost-cursor/);
});

test("the vendored Choir Practice copy is complete and carries nothing it should not", async () => {
  for (const path of [
    "../public/demos/choir/index.html",
    "../public/demos/choir/js/app.js",
    "../public/demos/choir/css/styles.css",
    "../public/demos/choir/README.md",
  ]) {
    assert.ok(await exists(path), `missing ${path}`);
  }

  for (const path of [
    "../public/demos/choir/node_modules",
    "../public/demos/choir/tests",
    "../public/demos/choir/e2e",
    "../public/demos/choir/package.json",
    // Removed for copyright: composer Jón Nordal, b. 1926.
    "../public/demos/choir/sample-pieces/Smavinir fagrir.musicxml",
  ]) {
    assert.equal(await exists(path), false, `${path} must not be published`);
  }

  const html = await read("../public/demos/choir/index.html");
  // Relative paths are what let the app run unchanged from a subdirectory.
  assert.match(html, /href="css\/styles\.css"/);
  assert.match(html, /src="js\/app\.js"/);
});

/**
 * The pod reaches into the framed app and drives it: it opens a score, reveals the
 * mixer, presses play on the visitor's click and forwards a microphone request. All of
 * that is `querySelector` against a copy that gets refreshed from its own repository,
 * so a rename over there silently turns the whole thing into a no-op — the app still
 * works by hand, nothing throws, and the page just quietly stops arranging anything.
 * That is the failure this test exists to make loud.
 *
 * `demo.tsx` claimed to be covered by this file before it actually was.
 */
test("the controls the Choir pod drives still exist in the vendored copy", async () => {
  const html = await read("../public/demos/choir/index.html");
  const transport = await read("../public/demos/choir/js/ui/transport.js");
  const pod = await read("../app/demos/choir-practice/demo.tsx");

  // The selectors the pod names, read out of the pod rather than duplicated here.
  const hooks = pod.slice(pod.indexOf("const HOOKS = {"));
  const score = pod.match(/const SCORE = "([^"]+)"/)?.[1];
  assert.ok(score, "the pod no longer names a score to open");
  assert.ok(
    await exists(`../public/demos/choir/sample-pieces/${score}`),
    `the pod opens "${score}", which is not in the vendored sample-pieces`,
  );

  for (const [label, id] of [
    ["transport", "play-btn"],
    ["parts", "parts-btn"],
    ["mic", "mic-btn"],
  ]) {
    assert.ok(hooks.includes(`#${id}`), `the pod stopped naming #${id} as its ${label}`);
    assert.match(html, new RegExp(`id="${id}"`), `#${id} is gone from the vendored app`);
  }

  // The sample buttons the pod finds a score by.
  assert.match(html, /class="sample"|class="[^"]*\bsample\b/);
  assert.match(html, /data-sample-path=/);

  /* The play/pause contract. `startPlayback` reads this label to decide whether a press
     would start or stop the music, which is what stops a re-armed shield pausing a
     rehearsal already in progress. If the app switches to a class or a data attribute,
     the guard silently starts returning false and clicking the score does nothing. */
  const idle = pod.match(/idleLabel: "([^"]+)"/)?.[1];
  assert.equal(idle, "Play", "startPlayback's idle label changed");
  assert.match(
    transport,
    /setPlaying\(isPlaying\)\s*\{[\s\S]*?isPlaying \? 'Pause' : 'Play'[\s\S]*?setAttribute\('aria-label', label\)/,
    "the transport no longer reports play state through #play-btn's aria-label",
  );
});

/**
 * Every line of caption has to be on screen long enough to read.
 *
 * This is the second time the page has been reported as moving text too fast, and both
 * times the cause was the same structural mistake rather than a bad number: each scene
 * wrote one caption per beat, so beats sized for a 320ms click or a 600ms cursor glide
 * were handed a fresh sentence. Twenty-one captions across seven scenes were under 1.4
 * seconds; the worst demanded about 771 words a minute against a comfortable 200–250.
 *
 * Scenes fix it by giving consecutive beats the *identical* caption string, which makes
 * the reader's time the sum of those beats. This checks that the arithmetic actually
 * works out, by reading the beat lists and caption maps back out of the source.
 *
 * Source parsing rather than importing, because these are `"use client"` modules that
 * would drag React and the whole scene runtime into a node test to read two arrays —
 * the same trade `policyRegistry` below makes for the same reason. The parser is strict
 * about what it finds: if a scene stops matching, the test fails rather than silently
 * checking nothing, which is the only way a test like this is worth having.
 *
 * The 1100ms loop gap is deliberately not counted. It only ever applies to the last
 * beat, and letting it count would excuse whatever that beat happens to be.
 */
test("no caption goes by faster than it can be read", async () => {
  const floor = Number(
    (await read("../app/demos/scene/storyboard.ts")).match(
      /MIN_CAPTION_MS = (\d+)/,
    )?.[1],
  );
  assert.ok(floor > 0, "MIN_CAPTION_MS is no longer declared in the storyboard hook");

  /* Whichever scenes still have one. Five of the seven now have no caption at all --
     their sections already carry a headline, a reason, an invitation and three notes, and
     the captions were paraphrasing the notes while the scene demonstrated the same claim
     a third time. Discovered rather than listed, so removing or restoring a caption map
     does not need this test edited to keep meaning something. */
  const all = ["choir-practice", "decaf", "grt-next-bus", "n-back", "night-neutralizer", "pagepack", "pdf-explainer"];
  const scenes = [];
  for (const scene of all) {
    const source = await read(`../app/demos/${scene}/demo.tsx`);
    if (/const CAPTION[^=]*=\s*\{/.test(source)) scenes.push(scene);
  }
  assert.ok(scenes.length >= 1, "no scene has a caption map at all any more");
  let checked = 0;

  for (const scene of scenes) {
    const source = await read(`../app/demos/${scene}/demo.tsx`);

    const beatsBlock = source.match(/const BEATS[^=]*=\s*\[([\s\S]*?)\n\];/);
    assert.ok(beatsBlock, `${scene}: could not find its BEATS array`);
    const beats = [...beatsBlock[1].matchAll(/\{\s*name:\s*"([^"]+)",\s*ms:\s*(\d+)\s*\}/g)].map(
      ([, name, ms]) => ({ name, ms: Number(ms) }),
    );
    assert.ok(beats.length >= 5, `${scene}: parsed only ${beats.length} beats`);

    const captionBlock = source.match(/const CAPTION[^=]*=\s*\{([\s\S]*?)\n\};/);
    assert.ok(captionBlock, `${scene}: could not find its CAPTION map`);
    const captions = new Map();
    for (const entry of captionBlock[1].matchAll(
      /^\s{2}(?:"([^"]+)"|([A-Za-z][\w-]*)):\s*\[([\s\S]*?)\],\s*$/gm,
    )) {
      const key = entry[1] ?? entry[2];
      // Normalised so a line broken across two source lines matches its one-line twin.
      captions.set(key, entry[3].replace(/\s+/g, " ").trim());
    }

    for (const beat of beats) {
      assert.ok(captions.has(beat.name), `${scene}: beat "${beat.name}" has no caption`);
    }

    /* Walk the beats, accumulating runs of identical caption text. */
    let runName = beats[0].name;
    let runText = captions.get(beats[0].name);
    let runMs = 0;
    const groups = [];
    for (const beat of beats) {
      const text = captions.get(beat.name);
      if (text !== runText) {
        groups.push({ from: runName, ms: runMs, text: runText });
        runName = beat.name;
        runText = text;
        runMs = 0;
      }
      runMs += beat.ms;
    }
    groups.push({ from: runName, ms: runMs, text: runText });

    let spoken = 0;
    for (const group of groups) {
      /* Deliberate silence. Beats whose picture says everything carry `["", ""]` and the
         caption area simply goes quiet — there is nothing to read, so there is no reading
         time to check. Counted, because a scene that had gone *entirely* silent would
         otherwise pass this test by saying nothing at all. */
      const words = group.text.replace(/["'\s,]+/g, "") === "" ? 0 : group.text.split(/\s+/).length;
      if (words === 0) continue;
      spoken += 1;

      assert.ok(
        group.ms >= floor,
        `${scene}: the caption starting at "${group.from}" is on screen for ` +
          `${group.ms}ms, under the ${floor}ms floor — ${words} words at ` +
          `${Math.round((words / group.ms) * 60_000)} words a minute. Either lengthen a ` +
          `beat or give the neighbouring beat the identical caption text.`,
      );
      checked += 1;
    }

    assert.ok(spoken >= 2, `${scene}: only ${spoken} caption(s) say anything at all`);
  }

  assert.ok(checked >= 5, `only ${checked} caption groups were checked`);
});

/**
 * The scenes that were meant to lose their captions still have none.
 *
 * Removing them was the point of the change, and the failure mode is not that they come
 * back deliberately — it is that a caption gets reintroduced one beat at a time by
 * someone solving a local "this frame is unclear" problem, which is exactly how there
 * came to be five layers of prose per project in the first place. If a scene genuinely
 * needs words again, delete its entry here and say why in the commit.
 */
test("the scenes without captions have not grown them back", async () => {
  for (const scene of ["decaf", "grt-next-bus", "night-neutralizer", "pagepack", "pdf-explainer"]) {
    const source = await read(`../app/demos/${scene}/demo.tsx`);
    assert.doesNotMatch(
      source,
      /className="[a-z]+-caption"/,
      `${scene} has a caption element again`,
    );
  }

  /* Comments stripped first. The notes explaining *why* these are gone naturally name
     them — the `.gx-caption` margin that used to reserve the road's band is worth
     recording — and a check that cannot tell a rule from a sentence about a rule would
     forbid documenting the removal. */
  const css = (await read("../app/globals.css")).replace(/\/\*[\s\S]*?\*\//g, "");
  for (const gone of ["dc-caption", "pdfx-caption", "pp-caption", "gx-caption", "nn-caption", "nn-sub"]) {
    /* Bounded, because `.nn-sub` is a prefix of `.nn-subrow` — which survives and holds
       the level meter. A substring search reported the meter as the deleted subtitle. */
    assert.doesNotMatch(
      css,
      new RegExp(`\\.${gone}(?![\\w-])`),
      `.${gone} is still styled in globals.css`,
    );
  }
});

/* ===========================================================================
   /legal
   ---------------------------------------------------------------------------
   A privacy policy is a promise, and the Chrome Web Store makes it a published
   one. These tests care about two failures. First, that a policy exists at a URL
   for every extension that needs one — a listing whose policy link 404s is a
   listing that gets pulled. Second, that the copy served here still says what
   the original in the project repository says, because the whole point of the
   document is that it describes the code, and it stops being true the moment
   only one of the two copies is edited.
   =========================================================================== */

/** Renders any path through the built worker. */
async function renderPath(pathname) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

/** The policy registry, read from source so the test needs no bundler. */
async function policyRegistry() {
  const source = await read("../app/legal/policies.ts");
  const entries = [...source.matchAll(/\{\s*\r?\n\s*slug: "([^"]+)",[\s\S]*?copy: "([^"]+)",/g)];
  return entries.map(([, slug, copy]) => ({ slug, copy }));
}

/** Where each vendored copy came from, taken from the README's own table. */
async function copyOrigins() {
  const readme = await read("../app/legal/policies/README.md");
  const rows = [...readme.matchAll(/^\|\s*`([^`]+\.md)`\s*\|\s*`([^`]+)`\s*\|/gm)];
  return new Map(rows.map(([, copy, original]) => [copy, original]));
}

test("every extension that needs a policy has one, reachable and rendered", async () => {
  const registry = await policyRegistry();
  assert.equal(registry.length, 6, `expected six policies, found ${registry.length}`);

  const index = await renderPath("/legal");
  assert.equal(index.status, 200, "/legal did not render");
  const indexHtml = await index.text();

  for (const { slug } of registry) {
    assert.match(indexHtml, new RegExp(`/legal/${slug}`), `${slug} is missing from /legal`);

    const response = await renderPath(`/legal/${slug}`);
    assert.equal(response.status, 200, `/legal/${slug} did not render`);

    const html = await response.text();
    // The markdown renderer is homegrown, so check it actually produced
    // structure rather than handing over a page of asterisks.
    assert.match(html, /<h2>/, `/legal/${slug} rendered no headings`);
    assert.match(html, /Effective/, `/legal/${slug} does not state an effective date`);
    assert.match(
      html,
      /xiangli3625@gmail\.com/,
      `/legal/${slug} has no contact address`,
    );
    assert.doesNotMatch(
      html,
      /\[YOUR |\[TODO|\bTBD\b/i,
      `/legal/${slug} still contains a placeholder`,
    );
    // `**bold**` reaching the page means the inline pass did not run.
    assert.doesNotMatch(html, /\*\*/, `/legal/${slug} shows raw markdown emphasis`);
  }

  // Both paid extensions must publish terms, not only a privacy policy.
  for (const slug of ["pagepack/terms", "grt-next-bus/terms"]) {
    assert.ok(
      registry.some((policy) => policy.slug === slug),
      `${slug} is not registered, but that extension takes money`,
    );
  }
});

test("the home page links to the policies of the projects that have them", async () => {
  const response = await render();
  const html = await response.text();

  for (const slug of [
    "pagepack/privacy",
    "pagepack/terms",
    "grt-next-bus/privacy",
    "grt-next-bus/terms",
    "night-neutralizer/privacy",
    "decaf/privacy",
  ]) {
    assert.match(html, new RegExp(`/legal/${slug}`), `home page does not link /legal/${slug}`);
  }

  // And the closing section, so the policies are reachable without hunting for a
  // project. This used to look for `.site-foot`, a thin strip under the photo
  // rail; the closing section replaced it and carries the same links.
  assert.match(html, /class="closing"/);
  assert.match(html, /href="\/legal"/);
  /* There was a third assertion here, for a `mailto:` in the closing section. The
     address was removed from the page on purpose, so the assertion went with it —
     the GitHub profile and the policy index are the two things that still have to
     survive down there. */
});

test("the published policies still match the originals in the project repos", async (t) => {
  const origins = await copyOrigins();
  assert.equal(origins.size, 6, "the README table no longer lists every copy");

  let compared = 0;
  for (const [copy, original] of origins) {
    const originalUrl = `../../${original}`;
    if (!(await exists(originalUrl))) continue;

    const [mine, theirs] = await Promise.all([
      read(`../app/legal/policies/${copy}`),
      read(originalUrl),
    ]);
    assert.equal(
      mine.replace(/\r\n/g, "\n").trim(),
      theirs.replace(/\r\n/g, "\n").trim(),
      `${copy} has drifted from ${original}; recopy it rather than editing the published copy`,
    );
    compared += 1;
  }

  if (compared === 0) t.skip("no sibling project checkouts present");
});

test("the index in the hero previews every project rather than listing it", async () => {
  const response = await render();
  const html = await response.text();

  const marks = await read("../app/index-marks.tsx");
  const ids = [...(await read("../app/projects.ts")).matchAll(/^\s{4}id: "([^"]+)",$/gm)].map(
    (match) => match[1],
  );
  assert.equal(ids.length, 7, "projects.ts no longer declares seven ids");

  /* The hero says all seven are running on this page. If a project is added and
     nobody draws it a mark, that sentence quietly stops being true and the index
     goes back to being a list with one gap in it. */
  for (const id of ids) {
    assert.match(
      marks,
      new RegExp(`"?${id}"?:\\s`),
      `app/index-marks.tsx has no mark for ${id}`,
    );
  }

  const slots = html.match(/class="imark-slot"/g) ?? [];
  assert.equal(slots.length, ids.length, `rendered ${slots.length} index marks, wanted ${ids.length}`);

  /* Decorative, so each one must be hidden from assistive tech: the link's own
     text already carries the name and the number. */
  assert.match(html, /class="imark-slot" aria-hidden="true"|aria-hidden="true" class="imark-slot"/);
});

test("the page counts nothing at the reader", async () => {
  const [html, rawProjects] = await Promise.all([
    render().then((response) => response.text()),
    read("../app/projects.ts"),
  ]);
  const text = html.replace(/<[^>]+>/g, " ");

  /* Comments stripped before matching. The doc comment on `facts` quotes the lines
     this test exists to keep out, as the explanation of why — so checking the raw
     source makes the warning against a phrase fail on the warning itself. */
  const projectsSource = rawProjects
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

  /*
   * There used to be a band of four figures under the hero (960 automated tests,
   * 104,401 lines of source, 4 of 7 shipping nothing at runtime, 4 extensions
   * packaged), a per-repository table of test counts and commit hashes in the
   * closing section, and test totals in the project descriptions. A generator,
   * `scripts/ledger.mjs`, produced all of it by running every suite.
   *
   * It was asked for twice to be taken off, so this is the check that keeps it
   * off: a portfolio counting its own tests at a reader is talking about itself
   * rather than about the software.
   */
  for (const claim of [
    /\bautomated tests\b/i,
    /\blines of source\b/i,
    /\bship nothing at runtime\b/i,
    /\bruntime deps\b/i,
    /\b\d+ unit tests\b/i,
    /\b\d+ (?:end-to-end|browser|e2e) (?:tests|checks)\b/i,
    /\bzero runtime dependencies\b/i,
  ]) {
    assert.doesNotMatch(text, claim, `the page is counting at the reader again: ${claim}`);
    assert.doesNotMatch(
      projectsSource,
      claim,
      `a project describes itself with a count again: ${claim}`,
    );
  }

  // The generator and its output are gone, so nothing can quietly reinstate them.
  for (const path of ["../app/ledger.generated.ts", "../scripts/ledger.mjs", "../app/ledger.tsx"]) {
    assert.equal(await exists(path), false, `${path} is back`);
  }
});

test("the gallery is pictures and nothing else", async () => {
  const [html, css, pageSource] = await Promise.all([
    render().then((response) => response.text()),
    read("../app/globals.css"),
    read("../app/page.tsx"),
  ]);

  /* No heading and no caption, so the section has to be labelled some other way
     or it is an unnamed region to a screen reader. */
  assert.match(html, /<section class="fun-section" aria-label="[^"]+"/);
  assert.doesNotMatch(pageSource, /fun-head|fun-lede|fun-eyebrow/, "the gallery heading is back");

  /* The crop is the thing to guard. `max-width` and `object-fit: cover` on the
     same element meant the cap and the height together defined one box, and every
     landscape in the set was cut to fit it — which is what "they all look like the
     same aspect ratio" was. Width has to stay free so it can follow the picture. */
  const block = css.match(/\.fun-media img,\s*\r?\n\.fun-media video \{[\s\S]*?\n\}/)?.[0];
  assert.ok(block, "the gallery no longer sizes its own media");

  // Comments out, for the same reason as the test above: the rule explains itself
  // by naming the two properties that must not be in it.
  const media = block.replace(/\/\*[\s\S]*?\*\//g, " ");
  assert.match(media, /max-width:\s*none/, "the gallery media is capped in width again");
  assert.doesNotMatch(media, /object-fit/, "the gallery is cropping its media again");
  assert.match(media, /width:\s*auto/, "the gallery media no longer takes its own width");

  // The mount and the pin are gone, and the media is bigger than it was.
  assert.doesNotMatch(css, /\.fun-mount|\.fun-pin/, "the paper mount is back");
  const height = media.match(/height:\s*clamp\((\d+)px/);
  assert.ok(height && Number(height[1]) >= 240, "the gallery media shrank again");
});
