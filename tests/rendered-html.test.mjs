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
