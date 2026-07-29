/**
 * Finds bytes in the source that are valid UTF-8 but decode to the tell-tale
 * "Â"/"â€"/"â†" sequences of text that was written once as UTF-8 and then read and
 * re-encoded as Latin-1.
 *
 * The gallery's rail buttons were rendering "â†" instead of an arrow, which is
 * exactly that double-encoding, and it is invisible in a diff.
 *
 * Exits non-zero when it finds anything, so it can be used as a gate. It also skips
 * itself: the examples above and the pattern below are the very sequences it looks
 * for, so while it lived next to the code it was scanning it reported two hits on
 * every run, which is the fastest way to teach somebody to ignore a check.
 */
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const self = fileURLToPath(import.meta.url);
const SKIP = new Set(["node_modules", "dist", ".git", ".vinext", "outputs", "work"]);
const SUSPECT = /Â|â€|â†|Ã[\u0080-\u00bf]|ï¿½/;
let hits = 0;

async function walk(dir) {
  for (const entry of await readdir(dir)) {
    if (SKIP.has(entry)) continue;
    const full = path.join(dir, entry);
    if ((await stat(full)).isDirectory()) {
      await walk(full);
      continue;
    }
    if (!/\.(tsx?|css|mjs|json|md)$/.test(entry)) continue;
    if (full === self) continue;
    const text = await readFile(full, "utf8");
    text.split(/\r?\n/).forEach((line, index) => {
      if (SUSPECT.test(line)) {
        hits += 1;
        console.log(`${path.relative(root, full)}:${index + 1}: ${line.trim().slice(0, 120)}`);
      }
    });
  }
}

await walk(root);
console.log(hits === 0 ? "scan complete: clean" : `scan complete: ${hits} suspect line(s)`);
if (hits > 0) process.exitCode = 1;
