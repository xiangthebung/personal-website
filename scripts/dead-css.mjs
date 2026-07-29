/**
 * Finds class selectors in `globals.css` that nothing in the source refers to.
 *
 * Deliberately a *report*, not a fixer. Class names on this page are not all
 * literals: `prefixed()` in the GRT demo builds `grt-countdown` and `grt-is-soon`
 * from the extension's own `labels.ts`, the section themes come from
 * `project--${project.theme}`, and several state classes are only ever added by
 * `classList.toggle` in `page-chrome.tsx`. So anything this prints has to be read
 * against how it could be constructed before it is deleted; a sweep that trusted a
 * literal search would take out working styles.
 *
 * For each candidate it prints where the name appears in the stylesheet and any
 * near-miss in the source (a template literal whose prefix matches), so the
 * judgement can be made from the output rather than by grepping again.
 *
 *   node work/dead-css.mjs
 */
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Every file that could name a class. */
async function sources(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === "dist") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await sources(full, out);
    } else if (/\.(tsx?|jsx?|mjs|html|md)$/.test(entry.name) && entry.name !== "globals.css") {
      out.push(full);
    }
  }
  return out;
}

const cssPath = path.join(root, "app", "globals.css");
const css = (await readFile(cssPath, "utf8")).replace(/\r\n/g, "\n");
const cssLines = css.split("\n");

/* Class names as they appear in selectors. Keyframe percentages, custom
   properties and pseudo-classes are not class names and are excluded by the
   character class. */
const declared = new Map();
for (const match of css.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) {
  const name = match[1];
  if (!declared.has(name)) {
    const line = css.slice(0, match.index).split("\n").length;
    declared.set(name, line);
  }
}

const files = await sources(path.join(root, "app"));
files.push(...(await sources(path.join(root, "scripts"))));
const corpus = new Map();
for (const file of files) corpus.set(file, await readFile(file, "utf8"));

/**
 * Every string that looks like it is building a class name from a prefix.
 *
 * The prefix is taken from immediately before a `${`, wherever that sits. An
 * earlier version anchored on the opening quote, which missed every prefix with
 * something in front of it inside the same template — `bd-note bd-note--lane-${…}`
 * and `dc-media dc-media--${…}` both slipped through, and both are live. Two
 * working rules were one edit from being deleted on that evidence.
 */
const templates = [];
for (const [file, text] of corpus) {
  for (const match of text.matchAll(/([A-Za-z][\w-]*-)\$\{/g)) {
    templates.push({ file: path.relative(root, file), prefix: match[1] });
  }
  // `"grt-" + name` shapes too.
  for (const match of text.matchAll(/["'`]([\w-]{2,}-)["'`]\s*\+/g)) {
    templates.push({ file: path.relative(root, file), prefix: match[1] });
  }
}

const unused = [];
for (const [name, line] of declared) {
  let found = false;
  for (const text of corpus.values()) {
    if (text.includes(name)) {
      found = true;
      break;
    }
  }
  if (!found) unused.push({ name, line });
}

/** How many times the name is written in the stylesheet, and on what lines. */
const occurrences = (name) => {
  const hits = [];
  const pattern = new RegExp(`\\.${name.replace(/[-[\]{}()*+?.,\\^$|#]/g, "\\$&")}(?![\\w-])`, "g");
  cssLines.forEach((text, index) => {
    if (pattern.test(text)) hits.push(index + 1);
    pattern.lastIndex = 0;
  });
  return hits;
};

console.log(`${declared.size} class names in globals.css`);
console.log(`${files.length} source files searched`);
console.log(`\n${unused.length} with no literal match in the source:\n`);

for (const { name, line } of unused.sort((a, b) => a.line - b.line)) {
  const hits = occurrences(name);
  const couldBeBuilt = templates.filter((entry) => name.startsWith(entry.prefix));
  console.log(`  .${name}`);
  console.log(`      declared line ${line}; written on ${hits.length} line(s): ${hits.join(", ")}`);
  if (couldBeBuilt.length > 0) {
    const where = [...new Set(couldBeBuilt.map((entry) => `${entry.prefix}\${…} in ${entry.file}`))];
    console.log(`      COULD BE BUILT: ${where.join("; ")}`);
  }
}

console.log(`\nprefixes that build class names at runtime:`);
for (const prefix of [...new Set(templates.map((entry) => entry.prefix))].sort()) {
  console.log(`  ${prefix}\${…}`);
}
