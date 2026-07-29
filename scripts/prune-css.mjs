/**
 * Removes rules from `app/globals.css` that nothing can match.
 *
 * Companion to `dead-css.mjs`, which only reports. This one edits, and it is
 * deliberately narrow about when it will: a rule goes only if it names at least one
 * class and *every* class it names is unreachable from the rendered HTML and from
 * every `class`/`className` string in the source. A rule with an element or
 * attribute selector and no class is never touched, because a selector like
 * `.demo-surface > *` says something about markup this analysis cannot see.
 *
 * Then, separately, `@keyframes` whose names no surviving `animation` mentions.
 * That has to come second: most of the dead animations are only referenced by the
 * dead rules, so the keyframes look alive until those are gone.
 *
 * Why this exists at all: the stylesheet went through two redesigns. The first
 * built every project as a draggable rail of screenshot cards, the second replaced
 * them with self-running scenes. The components were deleted; roughly nine hundred
 * lines describing them were not. The cost is not bytes, it is that every future
 * change to the project layout has to be made in a file where most of the project
 * rules describe markup that has not existed for two redesigns.
 *
 *   node scripts/prune-css.mjs --dry     # report what would go
 *   node scripts/prune-css.mjs           # do it
 *
 * Needs a current `npm run build`, since the rendered HTML is half the evidence.
 */
import { readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dry = process.argv.includes("--dry");
const cssPath = path.join(root, "app", "globals.css");

/* ------------------------------- the evidence ------------------------------ */

async function renderedHtml() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("prune", String(Date.now()));
  const { default: worker } = await import(workerUrl.href);
  const bodies = [];
  for (const pathname of ["/", "/legal", "/legal/pagepack/privacy"]) {
    const response = await worker.fetch(
      new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }),
      { ASSETS: { fetch: async () => new Response("", { status: 404 }) } },
      { waitUntil() {}, passThroughOnException() {} },
    );
    bodies.push(await response.text());
  }
  return bodies.join("\n");
}

async function walk(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, out);
    else out.push(full);
  }
  return out;
}

const [html, sources] = await Promise.all([
  renderedHtml(),
  (async () => {
    const files = [
      ...(await walk(path.join(root, "app"))).filter((f) => /\.(tsx|ts)$/.test(f)),
      ...(await walk(path.join(root, "public", "demos", "choir"))).filter((f) =>
        /\.(html|js)$/.test(f),
      ),
    ];
    return (await Promise.all(files.map((f) => readFile(f, "utf8")))).join("\n");
  })(),
]);

const haystack = `${html}\n${sources}`;

/**
 * Is this class name reachable?
 *
 * Three ways to count as used. A literal appearance is the obvious one. A bare
 * token match catches names inside template literals and `classList` calls. And a
 * *dynamic* match catches `` `dc-media dc-media--${post.tint}` `` — a modifier whose
 * suffix is computed, where the stylesheet declares `.dc-media--a` and the source
 * only ever contains `dc-media--`. Without that third rule the pruner would delete
 * live theme and variant rules, which is the one mistake it must not make.
 */
const literal = new Set();
for (const match of haystack.matchAll(/class(?:Name)?\s*=\s*["'`]([^"'`]*)["'`]/g)) {
  for (const name of match[1].split(/\s+/)) if (name) literal.add(name);
}
for (const match of haystack.matchAll(/[\w-]*[a-z]-[\w-]+/g)) literal.add(match[0]);

const dynamicPrefixes = new Set();
for (const match of haystack.matchAll(/([\w-]+--?)\$\{/g)) dynamicPrefixes.add(match[1]);
for (const match of haystack.matchAll(/([\w-]+--?)"?\s*\+/g)) dynamicPrefixes.add(match[1]);

function isUsed(name) {
  if (literal.has(name)) return true;
  for (const prefix of dynamicPrefixes) {
    if (name.startsWith(prefix) && name.length > prefix.length) return true;
  }
  return false;
}

/* --------------------------------- the parse -------------------------------- */

const original = await readFile(cssPath, "utf8");
const eol = original.includes("\r\n") ? "\r\n" : "\n";
const lines = original.split(/\r?\n/);

/** Brace depth at the start of each line, plus where each block ends. */
function blocks() {
  const found = [];
  const open = [];
  lines.forEach((line, index) => {
    const opens = (line.match(/\{/g) ?? []).length;
    const closes = (line.match(/\}/g) ?? []).length;
    for (let n = 0; n < opens; n++) open.push({ start: index, depth: open.length });
    for (let n = 0; n < closes; n++) {
      const block = open.pop();
      if (block) found.push({ ...block, end: index });
    }
  });
  return found.sort((a, b) => a.start - b.start);
}

/** The selector text for a block: everything back to the previous `}`, `{` or blank. */
function selectorOf(start) {
  const parts = [];
  for (let i = start; i >= 0; i--) {
    const line = lines[i];
    parts.unshift(line);
    if (i < start && /[{}]|^\s*$/.test(line)) {
      parts.shift();
      break;
    }
    if (i === start && line.includes("{")) {
      parts[0] = line.slice(0, line.indexOf("{"));
      if (parts[0].trim() !== "") break;
    }
  }
  return parts.join(" ");
}

const drop = new Set();
const removed = [];

for (const block of blocks()) {
  const selector = selectorOf(block.start).trim();
  // At-rules are containers, not rules; their contents are judged individually.
  if (selector.startsWith("@") || selector === "") continue;
  const names = [...selector.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1]);
  if (names.length === 0) continue;
  if (names.some(isUsed)) continue;

  // Take any comment sitting directly above the rule with it.
  let from = block.start;
  while (from > 0 && /^\s*(\/\*|\*|\/\/)/.test(lines[from - 1])) from -= 1;
  // Only if the comment block really opens above (avoid eating a trailing `*/`).
  if (from < block.start && !/^\s*\/\*/.test(lines[from])) from = block.start;

  for (let i = from; i <= block.end; i++) drop.add(i);
  removed.push({ line: block.start + 1, selector: selector.replace(/\s+/g, " ").trim() });
}

/* ------------------------------ dead keyframes ------------------------------ */

const surviving = lines.filter((_, index) => !drop.has(index)).join("\n");
const animated = new Set();
for (const match of surviving.matchAll(/animation(?:-name)?\s*:\s*([^;]+);/g)) {
  for (const token of match[1].split(/[\s,]+/)) if (/^[a-zA-Z][\w-]*$/.test(token)) animated.add(token);
}

const keyframesGone = [];
for (const block of blocks()) {
  if (drop.has(block.start)) continue;
  const line = lines[block.start];
  const named = /@keyframes\s+([\w-]+)/.exec(line);
  if (!named) continue;
  if (animated.has(named[1])) continue;
  for (let i = block.start; i <= block.end; i++) drop.add(i);
  keyframesGone.push({ line: block.start + 1, name: named[1] });
}

/* --------------------------------- report ---------------------------------- */

console.log(`${removed.length} unreachable rules, ${keyframesGone.length} orphaned keyframes`);
for (const entry of removed) console.log(`  ${String(entry.line).padStart(5)}  ${entry.selector}`);
for (const entry of keyframesGone) console.log(`  ${String(entry.line).padStart(5)}  @keyframes ${entry.name}`);

if (dry) {
  console.log(`\n--dry: nothing written (${drop.size} of ${lines.length} lines would go)`);
} else {
  const kept = lines.filter((_, index) => !drop.has(index));
  // Collapse the runs of blank lines the removals leave behind.
  const tidy = kept.filter(
    (line, index) => !(line.trim() === "" && (kept[index - 1] ?? "").trim() === ""),
  );
  await writeFile(cssPath, tidy.join(eol), "utf8");
  console.log(`\n${lines.length} lines -> ${tidy.length} lines`);
}
