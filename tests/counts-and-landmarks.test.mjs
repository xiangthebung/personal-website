import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

/* ===========================================================================
   What the page says there is, and how you get around it
   ---------------------------------------------------------------------------
   The site grew from seven projects to ten and several of the things that count
   them did not follow. None of it failed: the 404 page said "Seven projects live
   here, numbered 01 to 07" directly above a list of ten of them, and the meta
   description — the sentence in every search result and every shared link — was
   wrong in all four of its numbers.

   So these tests do not check that a number is ten. They check that nothing on
   this page states a count it did not take. A literal seven becoming a literal
   ten is the same bug with a longer fuse.

   The landmark tests are here for the same reason: a skip link that has stopped
   being the first thing in the document, and a footer that has been moved back
   inside `<main>` where it carries no role, are both invisible to look at.
   =========================================================================== */

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

const projectIds = async () =>
  [...(await read("../app/projects.ts")).matchAll(/^\s{4}id: "([^"]+)",$/gm)].map((m) => m[1]);

test("the 404 page counts the projects rather than remembering them", async () => {
  /* Comments stripped: the note explaining the fix naturally quotes the sentence
     that was wrong, and a check that cannot tell a claim from a sentence about a
     claim would forbid recording it. */
  const source = (await read("../app/not-found.tsx")).replace(/\/\*[\s\S]*?\*\//g, " ");

  /* The specific sentence that was wrong, and the shape of it: a written-out count
     of the projects with nothing reading `projects.ts`. */
  assert.doesNotMatch(
    source,
    /(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d+)\s+projects\s+(live|are)/i,
    "the 404 page states a project count as a literal again; derive it from projects.ts",
  );
  assert.match(source, /projects\.length/, "nothing on the 404 page reads the list");

  const response = await render("/this-is-not-a-page");
  assert.equal(response.status, 404);
  /* React writes `<!-- -->` between adjacent text nodes, so the sentence arrives cut
     into pieces exactly where the derived values are. Reading it back without them is
     reading what a visitor sees. */
  const html = (await response.text()).replaceAll("<!-- -->", "");

  const ids = await projectIds();
  const last = String(ids.length).padStart(2, "0");
  assert.match(
    html,
    new RegExp(`numbered 01[^.]*to ${last}`),
    `the 404 page does not say the projects run 01 to ${last}`,
  );
  // And it lists every one of them below that sentence, which is what it contradicted.
  for (const id of ids) assert.match(html, new RegExp(`/#${id}"`), `404 page omits ${id}`);
});

test("the shared description matches what is actually here", async () => {
  const layout = await read("../app/layout.tsx");
  const description = /const DESCRIPTION =([\s\S]*?);\r?\n/.exec(layout)?.[1] ?? "";
  assert.ok(description, "DESCRIPTION is no longer a single declaration");

  const projects = await read("../app/projects.ts");
  const platforms = [...projects.matchAll(/^\s{4}platform: "([^"]+)",$/gm)].map((m) => m[1]);
  const extensions = platforms.filter((p) => /chrome extension/i.test(p)).length;

  const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
  const total = WORDS[platforms.length] ?? String(platforms.length);
  const chrome = WORDS[extensions] ?? String(extensions);

  assert.match(
    description,
    new RegExp(`\\b${total}\\b side projects`, "i"),
    `the description does not say there are ${total} projects; projects.ts has ${platforms.length}`,
  );
  assert.match(
    description,
    new RegExp(`\\b${chrome}\\b Chrome extensions`, "i"),
    `the description does not say ${chrome} Chrome extensions; projects.ts has ${extensions}`,
  );

  /* It is the meta description, the og:description and the twitter:description, so
     being wrong here is being wrong in every search result and every shared link. */
  const html = await (await render()).text();
  const meta = /<meta name="description" content="([^"]+)"/.exec(html)?.[1];
  assert.ok(meta, "the page renders no meta description");
  assert.match(meta, new RegExp(`${total} side projects`, "i"));
  assert.match(html, new RegExp(`property="og:description"[^>]*content="${total} side`, "i"));
});

test("every project with a published policy has a /legal index of its own", async () => {
  /* `/legal` existed and each document existed, and the level between them 404'd —
     while `grt-bus-time`'s README published `/legal/grt-next-bus` as the base its
     popup links hang off. A URL a shipped product points at has to resolve. */
  const registry = await read("../app/legal/policies.ts");
  const slugs = [...registry.matchAll(/^\s{4}slug: "([^"]+)",$/gm)].map((m) => m[1]);
  const projects = [...new Set(slugs.map((slug) => slug.split("/")[0]))];
  assert.ok(projects.length >= 7, `only ${projects.length} projects have policies`);

  for (const project of projects) {
    const response = await render(`/legal/${project}`);
    assert.equal(response.status, 200, `/legal/${project} did not render`);
    const html = await response.text();

    for (const slug of slugs.filter((s) => s.startsWith(`${project}/`))) {
      assert.match(html, new RegExp(`/legal/${slug}`), `/legal/${project} omits ${slug}`);
    }
    assert.match(html, /href="\/legal"/, `/legal/${project} has no way back up`);
    assert.match(html, new RegExp(`href="/#${project}"`), `/legal/${project} has no way to the project`);
  }

  // And a project with nothing published is a 404, not an empty page claiming so.
  for (const bare of ["n-back", "pdf-explainer", "choir-practice"]) {
    assert.equal(
      (await render(`/legal/${bare}`)).status,
      404,
      `/legal/${bare} renders, but that project publishes nothing`,
    );
  }
});

test("Totem's policy is published, because two stores require the URL", async () => {
  const response = await render("/legal/totem/privacy");
  assert.equal(response.status, 200, "/legal/totem/privacy did not render");

  const html = await response.text();
  assert.match(html, /microphone/i, "the published Totem policy does not mention the microphone");
  assert.match(html, /Effective/);
  assert.match(html, /xiangli3625@gmail\.com/);
  assert.doesNotMatch(html, /\*\*/, "raw markdown emphasis reached the page");

  // And it is on the index, where the "everything else" paragraph used to leave a gap.
  const index = await (await render("/legal")).text();
  assert.match(index, /\/legal\/totem\/privacy/, "Totem is missing from /legal");
});

test("the page opens with a skip link and closes on a contentinfo landmark", async () => {
  const html = await (await render()).text();

  /* First focusable thing in the document, or it is a skip link that cannot be
     reached before the eleven dock links it exists to skip. */
  const skip = html.indexOf('<a class="skip-link"');
  assert.ok(skip >= 0, "the page has no skip link");
  assert.equal(
    skip,
    html.search(/<(?:a|button)[\s>]/),
    "something focusable comes before the skip link, which is what it exists to skip",
  );

  const target = /href="#([^"]+)"/.exec(html.slice(skip))?.[1];
  assert.ok(target, "the skip link points nowhere");
  assert.match(html, new RegExp(`id="${target}"`), `nothing on the page has id="${target}"`);
  assert.match(html, new RegExp(`id="${target}"[^>]*tabindex="-1"|tabindex="-1"[^>]*id="${target}"`),
    "the skip target is not focusable, so the jump scrolls without moving focus");

  /* The closing section is the page's `contentinfo`, and it only is one because it
     is rendered outside `<main>`: a `<footer>` inside main, article, aside, nav or
     section is scoped to that element and carries no role at all. */
  assert.match(html, /<footer class="closing"/, "the closing section is not a footer");
  const mainEnd = html.indexOf("</main>");
  assert.ok(mainEnd >= 0, "the page has no <main>");
  assert.ok(
    html.indexOf('<footer class="closing"') > mainEnd,
    "the closing footer is inside <main>, where <footer> maps to no landmark",
  );
});

test("a visitor asking for less motion lands held, once, and can leave", async () => {
  const hold = await read("../app/demos/scene/hold.ts");
  const chrome = await read("../app/page-chrome.tsx");

  assert.match(hold, /prefers-reduced-motion: reduce/, "the preference is not read anywhere");
  assert.match(chrome, /adoptReducedMotionPreference\(\)/, "nothing calls the landing");

  /* The server cannot know, so it must keep rendering as running — a snapshot that
     guessed would be a hydration mismatch for everyone it guessed wrong about. */
  assert.match(hold, /const serverSnapshot = \(\) => false;/);

  const adopt = /export function adoptReducedMotionPreference\(\): void \{([\s\S]*?)\n\}/.exec(hold)?.[1];
  assert.ok(adopt, "adoptReducedMotionPreference is gone");
  // Latched, so it cannot fight the button afterwards.
  assert.match(adopt, /if \(adoptedPreference\) return;/);
  // And it can only ever hold, never release.
  assert.match(adopt, /setHeld\(true/);
  assert.doesNotMatch(adopt, /setHeld\(false/);
  // A listener would be the ambient setting the old note refused.
  assert.doesNotMatch(hold, /addEventListener\("change"|addListener\(/);

  // The control it presses is still on the page and still says what it does.
  const html = await (await render()).text();
  assert.match(html, /class="dock-hold"/, "the hold control is gone, so the landing is a trap");
});
