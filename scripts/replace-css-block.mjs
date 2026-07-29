/**
 * Swaps one titled block out of `app/globals.css` for the contents of a file.
 *
 * The stylesheet is one long document divided by banner comments, and the demo
 * rewrites replace whole sections of it. Doing that by hand means matching several
 * hundred lines exactly; doing it by line number means recounting after every
 * previous edit. This finds a section by its banner title and replaces everything
 * up to the next banner.
 *
 *   node scripts/replace-css-block.mjs "PagePack" path/to/new-block.css
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const [title, replacementPath] = process.argv.slice(2);
if (!title || !replacementPath) {
  console.error('usage: node scripts/replace-css-block.mjs "<Section title>" <file.css>');
  process.exit(1);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cssPath = path.join(root, "app", "globals.css");
const css = await readFile(cssPath, "utf8");
const eol = css.includes("\r\n") ? "\r\n" : "\n";
const lines = css.split(/\r?\n/);

const BANNER = /^\/\* ={10,}\s*$/;
const banners = [];
for (let i = 0; i < lines.length; i++) {
  if (BANNER.test(lines[i])) banners.push({ at: i, title: (lines[i + 1] ?? "").trim() });
}

/* Prefix match, not exact. Several of these banner titles carry a quoted phrase
   after an em dash — "PagePack — \"the signal drops…\"" — and passing that through
   a shell intact is a fight not worth having. `PagePack` is enough, and an
   ambiguous prefix is an error rather than a coin toss. */
/* `--before` inserts a new section rather than replacing one, which is what adding
   a demo needs. Without it the only way to add a block was to append to whichever
   section happened to precede the right place, which is how the lazy-mount rules
   ended up filed under Night Neutralizer and got deleted with it. */
const insert = process.argv.includes("--before");

const matches = banners
  .map((banner, index) => ({ ...banner, index }))
  .filter((banner) => banner.title.startsWith(title));

if (matches.length === 0) {
  console.error(`No section starting with "${title}".`);
  console.error(`Sections: ${banners.map((b) => b.title).join(" | ")}`);
  process.exit(1);
}
if (matches.length > 1) {
  console.error(`"${title}" matches ${matches.length} sections: ${matches.map((b) => b.title).join(" | ")}`);
  process.exit(1);
}
const startIndex = matches[0].index;

const from = banners[startIndex].at;
const to = insert ? from : (banners[startIndex + 1]?.at ?? lines.length);

const replacement = (await readFile(path.resolve(replacementPath), "utf8"))
  .replace(/\r\n/g, "\n")
  .replace(/\s*$/, "");

const next = [...lines.slice(0, from), ...replacement.split("\n"), "", ...lines.slice(to)];
await writeFile(cssPath, next.join(eol), "utf8");

console.log(
  insert
    ? `inserted ${replacement.split("\n").length + 1} lines before "${banners[startIndex].title}"`
    : `replaced "${title}": ${to - from} lines -> ${replacement.split("\n").length + 1} lines`,
);
