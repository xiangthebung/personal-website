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

async function collectAppCss(directory = new URL("../app/", import.meta.url)) {
  const entries = await readdir(directory, { withFileTypes: true });
  const parts = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const url = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directory);
    if (entry.isDirectory()) {
      parts.push(...(await collectAppCss(url)));
    } else if (entry.name.endsWith(".css")) {
      parts.push(await readFile(url, "utf8"));
    }
  }

  return parts;
}

let appCssPromise;
const readAppCss = () => {
  appCssPromise ??= collectAppCss().then((stylesheets) => stylesheets.join("\n"));
  return appCssPromise;
};

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
  const css = await readAppCss();

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

  /* Whichever scenes still have one. Six of the seven now have no caption at all. They
     lost them because the captions were paraphrasing the written notes beside them while
     the scene demonstrated the same claim a third time -- and the notes have since gone
     too, into the frames, as the pinned labels the test below checks. Discovered rather
     than listed, so removing or restoring a caption map does not need this test edited to
     keep meaning something. */
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
  /* Choir went the same way and by the same route, so it belongs in the same check: its
     footnote printed a build path at a visitor and then repeated the invitation above the
     frame. Its two remaining pieces of copy are leader lines onto the application's own
     controls. */
  assert.doesNotMatch(
    await read("../app/demos/choir-practice/demo.tsx"),
    /className="[a-z]+-caption"/,
    "choir-practice has a caption element again",
  );

  /* Comments stripped first. The notes explaining *why* these are gone naturally name
     them — the `.gx-caption` margin that used to reserve the road's band is worth
     recording — and a check that cannot tell a rule from a sentence about a rule would
     forbid documenting the removal. */
  const css = (await readAppCss()).replace(/\/\*[\s\S]*?\*\//g, "");
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

/**
 * The feature lists beside the scenes are gone, and each scene carries its own copy.
 *
 * This is the second half of the same argument the caption tests make, and it came from a
 * first-time reading of the page: *nobody reads the project description while the
 * animation is running*. Every section had three written notes in a column beside a moving
 * scene, the scene won that competition every time, and the list still took up the room.
 *
 * So the notes were deleted and their claims moved into the frames, pinned to the thing
 * making each claim. The failure mode this guards is drift back: someone finds a scene
 * unclear, adds a bullet in the reading column because that is the easy place to put one,
 * and two releases later there are three of them again and the labels have gone stale.
 * Either the frame says it or the page does not.
 */
test("the claims live in the frames, not in a column beside them", async () => {
  const [projectsSource, pageSource, rawCss] = await Promise.all([
    read("../app/projects.ts"),
    read("../app/page.tsx"),
    readAppCss(),
  ]);

  const projects = projectsSource.replace(/\/\*[\s\S]*?\*\//g, " ");
  assert.doesNotMatch(
    projects,
    /^\s*notes:/m,
    "a project carries a written feature list again; put the claim in its scene instead",
  );
  assert.doesNotMatch(pageSource, /demo-facts/, "the notes list is being rendered again");
  assert.doesNotMatch(
    rawCss.replace(/\/\*[\s\S]*?\*\//g, " "),
    /\.demo-facts(?![\w-])/,
    ".demo-facts is styled again",
  );

  /* One invitation, and it is Choir's. That line makes the only claim prose still has an
     advantage at: what you are looking at is the real application rather than a
     reconstruction of it, which is not a thing any amount of watching can settle. */
  const invitations = [...projectsSource.matchAll(/^\s{4}invitation:/gm)];
  assert.equal(
    invitations.length,
    1,
    `${invitations.length} sections carry a line of framing above the scene; only Choir earns one`,
  );

  // And the shared component is wired up, so the claims went somewhere.
  assert.match(await read("../app/demos/scene/spec.tsx"), /export function SpecTags/);
  assert.match(rawCss, /\.spectag(?![\w-])/, "the in-frame label component has no styles");
});

/**
 * Every pinned label stays up long enough to read, and is short enough to read at a glance.
 *
 * The captions are held to a floor by the test above, and moving the copy into the frames
 * would be a cheap way of escaping it — a label that appears on a 320ms press beat and
 * vanishes on the next one is exactly the failure that floor exists to catch, wearing a
 * different class name. "It accumulates, so it must be fine" is an argument, not a
 * measurement.
 *
 * A label is up from the beat it arrives on until the beat named by `until`, or to the end
 * of the scene. That window has to clear `MIN_CAPTION_MS`.
 *
 * The word limit is the other half. These sit *on* the picture they describe, so a long one
 * is worse than none: it becomes something covering the evidence. Six words is the longest
 * in use; seven is the line.
 *
 * Source parsing rather than importing, for the same reason as the caption test — these are
 * `"use client"` modules and this is a node test. The parser is strict: if a scene stops
 * matching, the test fails rather than quietly checking nothing.
 */
test("every in-frame label stays up long enough to read", async () => {
  const floor = Number(
    (await read("../app/demos/scene/storyboard.ts")).match(/MIN_CAPTION_MS = (\d+)/)?.[1],
  );
  assert.ok(floor > 0, "MIN_CAPTION_MS is no longer declared in the storyboard hook");
  const WORD_LIMIT = 7;

  const all = [
    "choir-practice",
    "decaf",
    "grt-next-bus",
    "n-back",
    "night-neutralizer",
    "pagepack",
    "pdf-explainer",
  ];
  let checked = 0;

  for (const scene of all) {
    const source = await read(`../app/demos/${scene}/demo.tsx`);
    const block = source.match(/const SPECS[^=]*=\s*\[([\s\S]*?)\n\];/);
    if (!block) continue;

    const beatsBlock = source.match(/const BEATS[^=]*=\s*\[([\s\S]*?)\n\];/);
    assert.ok(beatsBlock, `${scene}: declares SPECS but no BEATS to time them against`);
    const beats = [...beatsBlock[1].matchAll(/\{\s*name:\s*"([^"]+)",\s*ms:\s*(\d+)\s*\}/g)].map(
      ([, name, ms]) => ({ name, ms: Number(ms) }),
    );
    assert.ok(beats.length >= 5, `${scene}: parsed only ${beats.length} beats`);

    const tags = [...block[1].matchAll(/\{\s*at:\s*"([^"]+)",\s*text:\s*"([^"]+)"[^}]*\}/g)].map(
      (match) => ({
        at: match[1],
        text: match[2],
        until: match[0].match(/until:\s*"([^"]+)"/)?.[1],
      }),
    );
    assert.ok(tags.length >= 1, `${scene}: SPECS parsed to nothing`);

    for (const tag of tags) {
      const from = beats.findIndex((beat) => beat.name === tag.at);
      assert.ok(from >= 0, `${scene}: "${tag.text}" arrives on "${tag.at}", which is not a beat`);

      let to = beats.length;
      if (tag.until !== undefined) {
        to = beats.findIndex((beat) => beat.name === tag.until);
        assert.ok(to >= 0, `${scene}: "${tag.text}" leaves on "${tag.until}", which is not a beat`);
        assert.ok(
          to > from,
          `${scene}: "${tag.text}" leaves on "${tag.until}", which is not after "${tag.at}"`,
        );
      }

      const dwell = beats.slice(from, to).reduce((total, beat) => total + beat.ms, 0);
      assert.ok(
        dwell >= floor,
        `${scene}: the label "${tag.text}" is up for ${dwell}ms, under the ${floor}ms floor — ` +
          `either move it to an earlier beat or let it stay longer.`,
      );

      const words = tag.text.split(/\s+/).length;
      assert.ok(
        words <= WORD_LIMIT,
        `${scene}: the label "${tag.text}" is ${words} words. These sit on top of the ` +
          `picture they describe; past about ${WORD_LIMIT} they cover the evidence.`,
      );
      checked += 1;
    }
  }

  assert.ok(checked >= 8, `only ${checked} in-frame labels were checked`);

  /* Night Neutralizer labels its two panels rather than pinning to coordinates — the
     panels stack on a narrow screen, so a percentage would land in the wrong one — so its
     copy is a `VERDICT` table of matched pairs instead of a `SPECS` list. Checked
     separately because it is a different mechanism, not an exemption. */
  const nn = await read("../app/demos/night-neutralizer/demo.tsx");
  assert.match(nn, /const VERDICT:/, "night-neutralizer has no per-panel copy at all");
  const pairs = [...nn.matchAll(/^\s{2}([a-z-]+): \["([^"]*)", "([^"]*)"\],$/gm)];
  assert.ok(pairs.length >= 4, `night-neutralizer: parsed only ${pairs.length} verdicts`);
  for (const [, beat, before, after] of pairs) {
    for (const line of [before, after]) {
      const words = line.split(/\s+/).filter(Boolean).length;
      assert.ok(
        words <= WORD_LIMIT,
        `night-neutralizer: "${line}" on "${beat}" is ${words} words, over the ${WORD_LIMIT}-word limit`,
      );
    }
  }
});

/**
 * Night Neutralizer's audio half still shows something, on a page with no audio.
 *
 * This is the one claim on the site that cannot be demonstrated in the medium it is about,
 * and the scene has now failed at it once: an earlier version reasoned that a printed line
 * of dialogue reads the same whispered or shouted, concluded the audio half was unshowable,
 * and deleted the line. It is showable — the size of the line is the channel — and this
 * test exists because that is a subtle enough idea to be "simplified" away again by
 * somebody tidying up a table of magic numbers.
 *
 * What it checks is the argument, not the implementation. Untreated, a whisper and an
 * explosion must be wildly different sizes. Treated, they must be close. That gap closing
 * is the compressor, and it is the only reason the numbers are what they are.
 */
test("the Night Neutralizer scene prints its soundtrack at the size it sounds", async () => {
  const source = await read("../app/demos/night-neutralizer/demo.tsx");

  const block = source.match(/const SOUND: Record<BeatName[^>]*>\s*=\s*\{([\s\S]*?)\n\};/);
  assert.ok(block, "could not find the SOUND table");

  /** `name: { say: "…", before: { db: "…", loud: n }, after: { db: "…", loud: n } },` */
  const rows = new Map();
  for (const row of block[1].matchAll(
    /^\s{2}([a-z-]+): \{\s*say: "([^"]*)",\s*before: \{ db: "([^"]*)", loud: ([\d.]+) \},\s*after: \{ db: "([^"]*)", loud: ([\d.]+) \},?\s*\},$/gm,
  )) {
    rows.set(row[1], {
      say: row[2],
      before: { db: row[3], loud: Number(row[4]) },
      after: { db: row[5], loud: Number(row[6]) },
    });
  }
  assert.ok(rows.size >= 6, `parsed only ${rows.size} SOUND rows; the table shape changed`);

  const whisper = rows.get("whisper");
  const boom = rows.get("boom");
  assert.ok(whisper?.say, "the whispered line is gone; the audio half has nothing to show");
  assert.ok(boom?.say, "the explosion has no printed line");

  /* Untreated, the two have to be far apart or there is no problem being described. The
     printed size is `0.5rem + loud * 2rem`, so a 4x spread in `loud` is roughly a 4x spread
     on screen. */
  assert.ok(
    boom.before.loud / whisper.before.loud >= 4,
    `untreated, the explosion is only ${(boom.before.loud / whisper.before.loud).toFixed(1)}x ` +
      `the whisper — not enough of a gap to read as a problem`,
  );
  /* Treated, they have to be close, because that is the product. */
  assert.ok(
    boom.after.loud / whisper.after.loud <= 2,
    `treated, the explosion is still ${(boom.after.loud / whisper.after.loud).toFixed(1)}x the ` +
      `whisper — the levelling is what this scene exists to show`,
  );
  // And the quiet part has to come up rather than the loud one merely coming down.
  assert.ok(whisper.after.loud > whisper.before.loud, "the whisper is not lifted at all");
  assert.ok(boom.after.loud < boom.before.loud, "the explosion is not brought down at all");

  // Every reading is a real figure with a unit, not a bare number.
  for (const [name, row] of rows) {
    for (const side of ["before", "after"]) {
      const { db } = row[side];
      if (db !== "") {
        assert.match(db, /^−?\d+ dB$/, `${name}.${side} reads "${db}", which is not a level`);
      }
    }
  }

  // The size channel has to actually be wired to the printed line.
  const css = await readAppCss();
  assert.match(
    css.replace(/\/\*[\s\S]*?\*\//g, " "),
    /\.nn-say\s*\{[\s\S]*?font-size:[^;]*var\(--loud/,
    ".nn-say no longer sizes itself from --loud, so the loudness channel is gone",
  );
});

/**
 * The Choir pod's four voices are inked in the colours the application engraves them in.
 *
 * They were not. The four S/A/T/B markers around the frame were all one mint — the
 * section's accent — while six inches away the app was drawing soprano in blue, alto in
 * green, tenor in orange and bass in red on its own canvas. So the page was asking a
 * visitor to match four things to four differently-coloured lines, with nothing to match
 * on, which is the opposite of what a colour code is for.
 *
 * The palette is copied into the pod because the app is a vendored static bundle served to
 * the browser rather than a module this build can import. A copy is only safe if something
 * checks it: `public/demos/choir/` is refreshed from its own repository, and a palette
 * change there would silently put the markers back out of step with the score.
 */
test("the Choir pod inks each voice the colour the app engraves it in", async () => {
  const [pod, utils] = await Promise.all([
    read("../app/demos/choir-practice/demo.tsx"),
    read("../public/demos/choir/js/utils.js"),
  ]);

  const parts = [...pod.matchAll(/voice: "([a-z]+)",\s*color: "(#[0-9a-fA-F]{6})"/g)].map(
    ([, voice, color]) => ({ voice, color: color.toLowerCase() }),
  );
  assert.equal(parts.length, 4, `the pod declares ${parts.length} coloured voices, wanted four`);
  assert.deepEqual(
    parts.map((part) => part.voice),
    ["soprano", "alto", "tenor", "bass"],
    "the pod's voices are no longer soprano, alto, tenor, bass in that order",
  );

  for (const { voice, color } of parts) {
    const engraved = utils.match(new RegExp(`^\\s*${voice}: '(#[0-9a-fA-F]{6})'`, "m"))?.[1];
    assert.ok(engraved, `${voice} is no longer in the vendored app's PART_COLORS`);
    assert.equal(
      color,
      engraved.toLowerCase(),
      `the pod inks ${voice} ${color} and the app engraves it ${engraved}; recopy the palette`,
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
  assert.match(
    html,
    /href="mailto:xiangli3625@gmail\.com"/,
    "the closing section no longer offers the restored contact email",
  );
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
    readAppCss(),
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

/**
 * PagePack's save label counts the pages it is actually saving.
 *
 * Reported as "it says page 4 of 7, but there are 61 files? Doesn't make sense", and it did
 * not. The two file figures were the literals `34` and `61`, and they were wrong twice over.
 *
 * Unattached: every other number in that scene comes from `CAPTURED` — the badge that lands
 * on seven, the library head's "7 pages · 1.6 MB", the reader's pack index, the seven cards
 * — so two invented figures were the one thing on screen a reader could not reconcile with
 * anything else on screen.
 *
 * And contradictory. In the extension's `runCapture`, `assetsDone` and `assetsTotal` are
 * running totals over only the pages opened so far: each page snapshots `assetsBefore` and
 * `assetTotalBefore` and adds its own counts on top, so a finished page contributes equally
 * to both and `assetsTotal - assetsDone` is always the outstanding files of the page being
 * hydrated right now. `61 - 34` puts 27 files outstanding on page 4 alone while the three
 * finished pages managed 34 between them, which is not a state the extension can reach.
 *
 * So this checks the arithmetic is derived rather than typed, which is the thing that
 * actually rots. A pair of magic numbers is easy to reintroduce while tuning how the frame
 * looks, and nothing about the label's appearance would give it away.
 */
test("PagePack's progress label is counted from the pages it is saving", async () => {
  const source = await read("../app/demos/pagepack/demo.tsx");

  const block = source.match(/const CAPTURED = \[([\s\S]*?)\n\];/);
  assert.ok(block, "could not find PagePack's CAPTURED list");

  const pages = [...block[1].matchAll(/\{ title: "([^"]+)", bytes: ([\d_]+), files: ([\d_]+) \}/g)].map(
    ([, title, bytes, files]) => ({
      title,
      bytes: Number(bytes.replace(/_/g, "")),
      files: Number(files.replace(/_/g, "")),
    }),
  );
  assert.equal(pages.length, 7, `parsed ${pages.length} captured pages; the list shape changed`);

  /* A page with no files is a page the save had nothing to fetch, which would make the
     denominator lie about the work. */
  for (const page of pages) {
    assert.ok(page.files > 0, `"${page.title}" has no files`);
    assert.ok(page.bytes > 0, `"${page.title}" has no size`);
  }

  /* Both figures come from the pages. Checked as source text because this is a
     `"use client"` module and importing it would drag React and the scene runtime into a
     node test — the same trade the caption and label tests above make. */
  const label = source.match(/function labelFor\(beat: BeatName\): string \{([\s\S]*?)\n\}/);
  assert.ok(label, "could not find labelFor");
  assert.match(
    label[1],
    /assetsDone:\s*filesThrough\(/,
    "assetsDone is not derived from the captured pages any more",
  );
  assert.match(
    label[1],
    /assetsTotal:\s*filesThrough\(/,
    "assetsTotal is not derived from the captured pages any more",
  );
  /* A bare number as the value, which is what `assetsDone: 34` was. Deliberately anchored
     to the value rather than searching the line: `Math.min(pagesDone + 1, ...)` is an index
     offset and the first version of this check failed on its `1`. */
  assert.doesNotMatch(
    label[1],
    /assets(?:Done|Total):\s*\d/,
    "a file count is a hardcoded number again; derive it from CAPTURED",
  );

  /* And the frame that prints a page number is inside the pack. */
  const done = Number(source.match(/const COLLECT_PAGES_DONE = (\d+)/)?.[1]);
  assert.ok(
    Number.isInteger(done) && done > 0 && done < pages.length,
    `COLLECT_PAGES_DONE is ${done}, which is not a page part-way through a ${pages.length}-page pack`,
  );

  /* The invariant the old numbers broke: everything before the current page is finished, so
     the only files still outstanding belong to the page being read. */
  const through = (n) => pages.slice(0, n).reduce((sum, page) => sum + page.files, 0);
  assert.equal(
    through(done + 1) - through(done),
    pages[done].files,
    "the outstanding file count is no longer exactly the current page's own files",
  );
});

/**
 * And the formatter itself is still the extension's, word for word.
 *
 * `app/demos/pagepack/progress.ts` says it is copied out of `background.js`, and that claim
 * is the only reason the scene is allowed to print a progress line at all — the section's
 * argument is that this is the real vocabulary rather than plausible-looking placeholder
 * text. A copy is only safe if something checks it.
 *
 * The signature legitimately differs: the extension destructures a plain object, the demo
 * destructures a typed one, and the demo braces one `if`. So the comparison strips braces
 * and collapses whitespace, which leaves every string, every unit and the whole of the
 * arithmetic compared exactly.
 */
test("PagePack's progress vocabulary has not drifted from the extension", async (t) => {
  const origin = "../../pagepack-extension/background.js";
  if (!(await exists(origin))) {
    t.skip("pagepack-extension checkout not present");
    return;
  }

  /* From the first branch to the last return, which is the whole of the decision. */
  const body = (text) => {
    const start = text.indexOf('if (phase === "reading")');
    const end = text.indexOf("return `Saving ${files}`;", start);
    assert.ok(start >= 0 && end > start, "captureProgressMessage no longer has its known shape");
    return text
      .slice(start, end + "return `Saving ${files}`;".length)
      .replace(/[{}]/g, (brace) => (brace === "{" || brace === "}" ? "" : brace))
      .replace(/\s+/g, " ")
      .trim();
  };

  const [mine, theirs] = await Promise.all([
    read("../app/demos/pagepack/progress.ts"),
    read(origin),
  ]);

  /* Braces matter inside the template literals, so those are protected before the strip:
     `${files}` must not become `$files`. Done by comparing the two normalisations of the
     same shape rather than by a cleverer regex. */
  const normalise = (text) =>
    text.replace(/\$\{/g, "\u0001").replace(/[{}]/g, "").replace(/\u0001/g, "${").replace(/\s+/g, " ").trim();

  assert.equal(
    normalise(body(mine)),
    normalise(body(theirs)),
    "the demo's captureProgressMessage has drifted from background.js; recopy it",
  );
});

/**
 * A theme's entrance does not paint over the page's answer to "am I somewhere else yet".
 *
 * Reported as GRT Next Bus not being fully immersive — "I see the black from night
 * neutralizer" — and the cause was paint order. `.project-tint` washes every section that
 * is *not* the one you are reading toward `--ambient-bg` by `1 - presence`, and
 * `.project-seam` does the same at full strength along both edges of every join. Between
 * them a neighbour poking into the window should be indistinguishable from the paper of the
 * project you are standing in.
 *
 * `.project-veil` was `z-index: 5`, above both. Night Neutralizer's entrance curtain is an
 * opaque `#04060a` across its whole box, and `:not(.is-seen)` is not an "arriving" state —
 * it is the default for everything below the fold — so the section below GRT painted a hard
 * black band across the bottom of the window that neither layer could reach. Measured at
 * 1920x1020 those rows sat 236/255 from the ambient colour against 0 to 2 everywhere else.
 *
 * Two things keep it fixed and both are invisible in isolation, which is why they are
 * checked here: the veil's resting level, and its position in the markup. They are separate
 * because `z-index: 0` alone is not enough — at equal levels the later element in the
 * document wins, so the veil has to come *before* the tint as well as share its level.
 *
 * `scripts/immersion.mjs` measures the consequence in a browser. This catches the cause in
 * the two places someone would undo it without noticing.
 */
test("a section's entrance layer cannot paint over its neighbours' ambient wash", async () => {
  const [pageSource, rawCss] = await Promise.all([read("../app/page.tsx"), readAppCss()]);

  /* Markup order. The veil has to be painted before the tint and the seam. */
  const order = ["project-ambience", "project-veil", "project-tint", "project-seam", "project-body"];
  const at = order.map((name) => {
    const index = pageSource.indexOf(`className="${name}"`);
    assert.ok(index >= 0, `app/page.tsx no longer renders .${name}`);
    return { name, index };
  });
  for (let i = 1; i < at.length; i += 1) {
    assert.ok(
      at[i - 1].index < at[i].index,
      `.${at[i - 1].name} must come before .${at[i].name} in the section; ` +
        `a layer that comes later wins at the same z-index`,
    );
  }

  const css = rawCss.replace(/\/\*[\s\S]*?\*\//g, " ");

  /* Resting level. The blast raises this layer to 1 for three beats and says so; nothing
     else may sit it above the tint. */
  const veil = css.match(/\.project > \.project-veil \{([^}]*)\}/);
  assert.ok(veil, "the veil no longer has a base rule");
  assert.match(veil[1], /z-index:\s*0\b/, "the veil is above the ambient tint again");

  /* And it is feathered at the bleed like the other two full-section layers, so it cannot
     end on a line at the join while both sections are at half presence. */
  const mask = css.match(
    /\.project > \.project-ambience,\s*\r?\n\.project > \.project-veil,\s*\r?\n\.project > \.project-foreground \{([\s\S]*?)\n\}/,
  );
  assert.ok(mask, "the veil is no longer masked with the ambience and the foreground");
  assert.match(mask[1], /mask-image:\s*linear-gradient/);
  assert.match(mask[1], /--project-bleed/);
});
