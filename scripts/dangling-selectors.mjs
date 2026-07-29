/**
 * Finds selector lists left dangling in `globals.css`, and asks the browser which
 * rules it actually accepted.
 *
 * Written after finding this at line 1815:
 *
 *     .project-scroll-help,
 *
 *     @supports (content-visibility: auto) {
 *
 * A selector list ending in a comma followed by an at-rule is not valid CSS, so a
 * browser drops the whole construct — which means the `content-visibility` block it
 * swallowed had never once applied. The shape is the fingerprint of an earlier
 * automated prune that deleted selector *lines* and left their commas behind, and
 * PostCSS is lenient enough to parse the result without complaining, so the build
 * stayed green and nothing said a word.
 *
 * Two passes:
 *   1. textual — every line ending in `,` whose next meaningful line cannot
 *      continue a selector list;
 *   2. the browser — parse the stylesheet in Chromium and report how many top-level
 *      rules it kept, which is the only authority on what actually applies.
 *
 *   node work/dangling-selectors.mjs
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cssPath = path.join(root, "app", "globals.css");
const css = (await readFile(cssPath, "utf8")).replace(/\r\n/g, "\n");
const lines = css.split("\n");

/* ------------------------------- pass one -------------------------------- */

const suspects = [];
for (let index = 0; index < lines.length; index += 1) {
  const line = lines[index].trim();
  if (!line.endsWith(",")) continue;
  // Inside a declaration value a trailing comma is ordinary (`transition:` lists,
  // `background:` layers), so only lines that look like selectors count.
  if (/[:;{}]/.test(line)) continue;

  let next = index + 1;
  while (next < lines.length && lines[next].trim() === "") next += 1;
  const following = lines[next]?.trim() ?? "";
  // A selector list can continue with another selector. It cannot continue with an
  // at-rule, a closing brace, or a declaration.
  if (/^@/.test(following) || following.startsWith("}") || /^[-\w]+\s*:/.test(following)) {
    suspects.push({ line: index + 1, selector: line, following, followingLine: next + 1 });
  }
}

console.log(`${suspects.length} dangling selector list(s):\n`);
for (const suspect of suspects) {
  console.log(`  line ${suspect.line}: ${suspect.selector}`);
  console.log(`    swallows line ${suspect.followingLine}: ${suspect.following}`);
}

/* ------------------------------- pass two -------------------------------- */

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("about:blank");

const report = await page.evaluate(async (source) => {
  const style = document.createElement("style");
  style.textContent = source;
  document.head.append(style);
  const sheet = style.sheet;
  const kinds = {};
  for (const rule of Array.from(sheet.cssRules)) {
    const name = rule.constructor.name;
    kinds[name] = (kinds[name] ?? 0) + 1;
  }
  return { top: sheet.cssRules.length, kinds };
}, css);

/* What PostCSS-style counting expects: every top-level `{` that opens a rule or an
   at-rule with a block. Counted crudely but consistently, so a large gap between
   the two numbers is the signal, not the exact figures. */
let depth = 0;
let expected = 0;
for (const character of css.replace(/\/\*[\s\S]*?\*\//g, "")) {
  if (character === "{") {
    if (depth === 0) expected += 1;
    depth += 1;
  } else if (character === "}") {
    depth -= 1;
  }
}

console.log(`\nbrowser kept ${report.top} top-level rules`);
console.log(`source opens  ${expected} top-level blocks`);
console.log(`difference:   ${expected - report.top}`);
console.log("\nby kind:");
for (const [kind, count] of Object.entries(report.kinds).sort()) {
  console.log(`  ${kind.padEnd(24)} ${count}`);
}

await browser.close();
