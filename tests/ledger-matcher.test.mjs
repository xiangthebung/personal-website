import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

/**
 * The part of `scripts/ledger.mjs` that decides what a number means.
 *
 * Every figure the page prints about the seven projects comes from this function
 * reading a test runner's summary, and the script's promise is that it throws
 * rather than publish a count from a suite that is not green. That promise is only
 * as good as the parsing, and the parsing has already been wrong once in the way
 * that matters most: it read the "Tests" line and nothing else.
 *
 * A file that fails to *load* -- a bad import, a stubbed builtin, a pool worker
 * that will not start -- contributes no test cases at all. Vitest reports it on the
 * "Test Files" line, and the "Tests" line then reads "140 passed" with nothing
 * wrong on it. So a suite that had lost thirteen tests looked healthy, and the same
 * shape had already hidden two entire files in another repository. These cases
 * exist so that cannot come back quietly.
 *
 * The function is lifted out of the script rather than imported, because the script
 * is a program: importing it would walk seven repositories and run every suite.
 * Fixtures are written literally rather than captured from a log, because a log
 * written through a console gets wrapped and these patterns are anchored.
 */
async function loadMatcher() {
  const source = await readFile(new URL("../scripts/ledger.mjs", import.meta.url), "utf8");
  const body = source.match(/function countAssertions\(kind, output\) \{[\s\S]*?\n\}/)?.[0];
  assert.ok(body, "scripts/ledger.mjs no longer defines countAssertions(kind, output)");
  return new Function(`${body}; return countAssertions;`)();
}

test("a runner's summary is read as pass and fail counts", async () => {
  const countAssertions = await loadMatcher();

  for (const [kind, output, expected, why] of [
    [
      "vitest",
      " Test Files  12 passed (12)\n      Tests  153 passed (153)\n",
      { passed: 153, failed: 0 },
      "a clean vitest run",
    ],
    [
      "vitest",
      " Test Files  1 failed | 11 passed (12)\n      Tests  3 failed | 137 passed (140)\n",
      { passed: 137, failed: 4 },
      "failing cases and a failing file counted together",
    ],
    [
      "node-test",
      "# tests 98\n# pass 94\n# fail 0\n",
      { passed: 94, failed: 0 },
      "node:test, where skipped tests make pass and tests differ",
    ],
    [
      "node-test",
      "# tests 12\n# pass 11\n# fail 1\n",
      { passed: 11, failed: 1 },
      "node:test with a failure",
    ],
    [
      "satb",
      "=== Results ===\n  Total: 281\n  Passed: 281\n  Failed: 0\n",
      { passed: 281, failed: 0 },
      "satb-practice's own harness",
    ],
    ["playwright", "  70 passed (1.2m)\n", { passed: 70, failed: 0 }, "playwright"],
    [
      "playwright",
      "  2 failed\n  68 passed (1.2m)\n",
      { passed: 68, failed: 2 },
      "playwright with failures",
    ],
  ]) {
    const counted = countAssertions(kind, output);
    assert.ok(counted, `${why}: nothing was parsed`);
    assert.equal(counted.passed, expected.passed, `${why}: passed`);
    assert.equal(counted.failed, expected.failed, `${why}: failed`);
  }
});

test("a test file that never produced a case is a failure, not a smaller total", async () => {
  const countAssertions = await loadMatcher();

  /* The exact output that fooled the previous version. Thirteen tests had stopped
     running and the total still read as green. */
  const loadFailure = countAssertions(
    "vitest",
    " Test Files  1 failed | 11 passed (12)\n      Tests  140 passed (140)\n",
  );
  assert.equal(loadFailure.passed, 140);
  assert.ok(loadFailure.failed > 0, "a failing test file was not counted as a failure");

  /* And the quieter shape: a file that is neither passed nor failed did not run at
     all, which is how vitest reports a pool worker that could not start. */
  const vanished = countAssertions(
    "vitest",
    " Test Files  11 passed (12)\n      Tests  140 passed (140)\n",
  );
  assert.ok(vanished.failed > 0, "a test file that never ran was not counted as a failure");
});

test("output with no summary in it is not read as zero", async () => {
  const countAssertions = await loadMatcher();

  /* Returning null makes the script throw with the command and the tail of its
     output. Returning a zero would put "0 tests" on the page instead. */
  for (const kind of ["vitest", "node-test", "satb", "playwright"]) {
    assert.equal(
      countAssertions(kind, "npm ERR! missing script: test\n"),
      null,
      `${kind} invented a count from output with no summary`,
    );
  }
});

test("the ledger does not let the parent shell change what it measures", async () => {
  const source = await readFile(new URL("../scripts/ledger.mjs", import.meta.url), "utf8");

  /* Vite decides whether to externalise node builtins partly from NODE_ENV, so a
     shell with NODE_ENV=production exported -- what starting one of these projects'
     servers leaves behind -- makes `node:path` a browser stub inside the test run,
     and a suite that reads fixtures off disk dies at import time. That is exactly
     how the 140 above was produced. */
  assert.match(
    source,
    /delete\s+environment\.NODE_ENV/,
    "scripts/ledger.mjs no longer clears NODE_ENV before running a suite",
  );
});
