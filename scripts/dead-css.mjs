/**
 * Finds class selectors across the app stylesheets that nothing in the source refers to.
 *
 * Deliberately a *report*, not a fixer. Class names on this page are not all
 * literals: `prefixed()` in the GRT demo builds `grt-countdown` and `grt-is-soon`
 * from the extension's own `labels.ts`, the section themes come from
 * `project--${project.theme}`, and several state classes are only ever added by
 * `classList.toggle` in `page-chrome.tsx`. So anything this prints has to be read
 * against how it could be constructed before it is deleted; a sweep that trusted a
 * literal search would take out working styles.
 *
 * For each candidate it prints where the name appears in the stylesheets and any
 * near-miss in the source (a template literal whose prefix matches), so the
 * judgement can be made from the output rather than by grepping again.
 *
 *   node scripts/dead-css.mjs
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
    } else if (/\.(tsx?|jsx?|mjs|html|md)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/** Every stylesheet shipped from app, including lazy demo-owned CSS. */
async function styles(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await styles(full, out);
    else if (entry.name.endsWith(".css")) out.push(full);
  }
  return out;
}

const styleFiles = (await styles(path.join(root, "app"))).sort();
const stylesheets = await Promise.all(
  styleFiles.map(async (file) => ({
    file: path.relative(root, file),
    text: (await readFile(file, "utf8")).replace(/\r\n/g, "\n"),
  })),
);

/* Class names as they appear in selectors. Keyframe percentages, custom
   properties and pseudo-classes are not class names and are excluded by the
   character class. */
const declared = new Map();
for (const stylesheet of stylesheets) {
  for (const match of stylesheet.text.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) {
    const name = match[1];
    if (!declared.has(name)) {
      const line = stylesheet.text.slice(0, match.index).split("\n").length;
      declared.set(name, { file: stylesheet.file, line });
    }
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
for (const [name, location] of declared) {
  let found = false;
  for (const text of corpus.values()) {
    if (text.includes(name)) {
      found = true;
      break;
    }
  }
  if (!found) unused.push({ name, ...location });
}

/** How many times the name is written in the stylesheets, and where. */
const occurrences = (name) => {
  const hits = [];
  const escaped = name.replace(/[-[\]{}()*+?.,\\^$|#]/g, "\\$&");
  const pattern = new RegExp(`\\.${escaped}(?![\\w-])`, "g");

  for (const stylesheet of stylesheets) {
    stylesheet.text.split("\n").forEach((text, index) => {
      if (pattern.test(text)) hits.push(`${stylesheet.file}:${index + 1}`);
      pattern.lastIndex = 0;
    });
  }
  return hits;
};

console.log(`${declared.size} class names in ${stylesheets.length} app stylesheets`);
console.log(`${files.length} source files searched`);
console.log(`\n${unused.length} with no literal match in the source:\n`);

for (const { name, file, line } of unused.sort((a, b) =>
  a.file.localeCompare(b.file) || a.line - b.line
)) {
  const hits = occurrences(name);
  const couldBeBuilt = templates.filter((entry) => name.startsWith(entry.prefix));
  console.log(`  .${name}`);
  console.log(`      declared ${file}:${line}; written on ${hits.length} line(s): ${hits.join(", ")}`);
  if (couldBeBuilt.length > 0) {
    const where = [...new Set(couldBeBuilt.map((entry) => `${entry.prefix}\${…} in ${entry.file}`))];
    console.log(`      COULD BE BUILT: ${where.join("; ")}`);
  }
}

console.log(`\nprefixes that build class names at runtime:`);
for (const prefix of [...new Set(templates.map((entry) => entry.prefix))].sort()) {
  console.log(`  ${prefix}\${…}`);
}
