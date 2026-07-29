/**
 * Counts what the eight repositories actually contain, and writes it to
 * `app/ledger.generated.ts`.
 *
 *   node scripts/ledger.mjs            # run the suites, count, write the file
 *   node scripts/ledger.mjs --check    # count and diff against the committed file
 *   node scripts/ledger.mjs --static   # skip the suites, keep the committed counts
 *
 * Why a script and not a hand-maintained list: the page makes numeric claims, and
 * a number typed into a page by a person is a number that was true once. Every
 * figure the ledger prints is produced here, from the repository it describes, and
 * the generated file records the command that produced it so a reader can run the
 * same thing.
 *
 * Test counts come from actually running each suite and parsing its reporter
 * output, because the alternative -- counting `it(` and `test(` in the source --
 * counts the ones inside `describe.skip`, counts them again when a table-driven
 * test loops, and cannot see a suite that no longer runs at all. A suite that
 * fails here fails the script; the ledger has no way to print "about 300".
 *
 * The repositories are siblings of this one and are not present in a Cloudflare
 * build, which is the other reason this is not a build step. Run it after landing
 * work in a project, commit the result, and `npm test` will hold the page and the
 * file to each other.
 */

import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const workspace = path.resolve(root, "..");
const outFile = path.join(root, "app", "ledger.generated.ts");

const mode = process.argv.includes("--check")
  ? "check"
  : process.argv.includes("--static")
    ? "static"
    : "write";

/* -------------------------------------------------------------------------- */
/*                              what to count                                 */
/* -------------------------------------------------------------------------- */

/**
 * `suites` is a list of commands to run and a matcher for pulling the number of
 * assertions out of each one's output. Two reporters are in play across the eight
 * repositories -- vitest and `node --test` -- and both are matched rather than
 * normalised, because making every repository use one runner to make this script
 * shorter would be the tail wagging the dog.
 */
const REPOS = [
  {
    slug: "satb-practice",
    label: "Choir Practice",
    projectId: "choir-practice",
    suites: [
      { command: "npm test", kind: "satb" },
      { command: "npm run test:parser", kind: "satb" },
      { command: "npm run e2e", kind: "playwright" },
    ],
  },
  {
    slug: "Decaf",
    label: "Decaf",
    projectId: "decaf",
    suites: [{ command: "npm test", kind: "node-test" }],
  },
  {
    slug: "pdf-explainer",
    label: "PDF Explainer",
    projectId: "pdf-explainer",
    suites: [{ command: "npm test", kind: "vitest" }],
  },
  {
    slug: "pagepack-extension",
    label: "PagePack",
    projectId: "pagepack",
    suites: [{ command: "npm test", kind: "node-test" }],
  },
  {
    slug: "grt-bus-time",
    label: "GRT Next Bus",
    projectId: "grt-next-bus",
    suites: [{ command: "npm test", kind: "node-test" }],
  },
  {
    slug: "n-back",
    label: "N-Back",
    projectId: "n-back",
    suites: [{ command: "npm test", kind: "vitest" }],
  },
  {
    slug: "night-neutralizer",
    label: "Night Neutralizer",
    projectId: "night-neutralizer",
    suites: [{ command: "npm test", kind: "vitest" }],
  },
];

/** Extensions, for the "packaged for the store" figure. */
const EXTENSIONS = ["Decaf", "night-neutralizer", "grt-bus-time", "pagepack-extension"];

/**
 * Files that are the project rather than its scaffolding. Lockfiles, generated
 * bundles and vendored dependencies are excluded by asking git for tracked files
 * and then filtering, so nothing here depends on a `node_modules` being present.
 */
const SOURCE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".css",
  ".html",
]);

const EXCLUDED_PATH = [
  /^dist\//,
  /^dist-free\//,
  /^build\//,
  /(^|\/)node_modules\//,
  /(^|\/)vendor\//,
  /\.min\.(js|css)$/,
  /^public\/demos\//,
  /\.generated\.ts$/,
];

/* -------------------------------------------------------------------------- */
/*                                 helpers                                    */
/* -------------------------------------------------------------------------- */

function repoPath(slug) {
  return path.join(workspace, slug);
}

async function git(slug, args) {
  const { stdout } = await run("git", ["-C", repoPath(slug), ...args], {
    maxBuffer: 64 * 1024 * 1024,
  });
  return stdout;
}

/**
 * Runs a package script and hands back its combined output.
 *
 * `shell: true` because npm on Windows is `npm.cmd`, and rejection is swallowed
 * so a non-zero exit can be reported against the repository that produced it
 * rather than as an unhandled rejection with no name attached.
 */
async function runScript(slug, command) {
  try {
    /* NODE_ENV is deleted rather than passed through.
     *
     * Vite decides whether to externalise node builtins partly from it, so a shell
     * that happens to have NODE_ENV=production exported -- which is what starting
     * one of these projects' own servers leaves behind -- makes `node:path` resolve
     * to a browser stub inside the test run. A suite that reads fixtures off disk
     * then dies on `join is not a function` at import time. The suites are
     * measured in the environment they are written for, not in whatever the parent
     * shell was last doing. */
    const environment = { ...process.env, CI: "1", FORCE_COLOR: "0" };
    delete environment.NODE_ENV;

    const { stdout, stderr } = await run(command, {
      cwd: repoPath(slug),
      shell: true,
      maxBuffer: 64 * 1024 * 1024,
      env: environment,
    });
    return { ok: true, output: `${stdout}\n${stderr}` };
  } catch (error) {
    return {
      ok: false,
      output: `${error.stdout ?? ""}\n${error.stderr ?? ""}`,
      code: error.code,
    };
  }
}

/**
 * Pulls the assertion count out of a reporter's summary.
 *
 * Deliberately anchored on each runner's total line rather than on anything
 * per-file: vitest prints a per-file count as it goes and a total at the end, and
 * summing the per-file lines double-counts every retry.
 */
function countAssertions(kind, output) {
  const plain = output.replace(/\u001B\[[0-9;]*m/g, "");

  if (kind === "vitest") {
    // "      Tests  298 passed (298)"
    const match = plain.match(/^\s*Tests\s+(?:(\d+)\s+failed\s*\|\s*)?(\d+)\s+passed/m);
    if (!match) return null;
    let failed = Number(match[1] ?? 0);

    /* The `Tests` line is not enough on its own.
     *
     * A file that fails to *load* -- a bad import, a stubbed builtin, a worker
     * that will not start -- contributes no test cases at all, so vitest reports
     * the failure on the `Test Files` line and the `Tests` line reads
     * "140 passed" with nothing wrong on it. Reading only the second line, this
     * script once recorded a drop of thirteen tests as a healthy 140, which is the
     * same shape as the failure that had already hidden two whole files in another
     * repository for weeks.
     */
    const files = plain.match(
      /^\s*Test Files\s+(?:(\d+)\s+failed\s*(?:\|\s*)?)?(?:(\d+)\s+passed\s*)?\((\d+)\)/m,
    );
    if (files) {
      const filesFailed = Number(files[1] ?? 0);
      const filesPassed = Number(files[2] ?? 0);
      const filesTotal = Number(files[3]);
      if (filesFailed > 0) failed += filesFailed;
      // A file that neither passed nor failed did not run.
      if (filesPassed + filesFailed < filesTotal) {
        failed += filesTotal - filesPassed - filesFailed;
      }
    }

    return { passed: Number(match[2]), failed };
  }

  if (kind === "node-test") {
    // node:test's TAP-ish summary: "# pass 94" / "ℹ pass 94"
    const total = plain.match(/^[^\n]*?\btests\s+(\d+)\s*$/m);
    const pass = plain.match(/^[^\n]*?\bpass\s+(\d+)\s*$/m);
    const fail = plain.match(/^[^\n]*?\bfail\s+(\d+)\s*$/m);
    if (!pass) return null;
    return {
      passed: Number(pass[1]),
      failed: Number(fail?.[1] ?? 0),
      declared: total ? Number(total[1]) : undefined,
    };
  }

  if (kind === "playwright") {
    // "  70 passed (1.2m)"
    const match = plain.match(/^\s*(?:(\d+)\s+failed[\s\S]*?)?(\d+)\s+passed\s*\(/m);
    if (!match) return null;
    return { passed: Number(match[2]), failed: Number(match[1] ?? 0) };
  }

  if (kind === "satb") {
    /* satb-practice runs its own harness rather than a framework, and prints
       "=== Results ===" with Total / Passed / Failed under it. */
    const passed = plain.match(/^\s*Passed:\s*(\d+)\s*$/m);
    const failed = plain.match(/^\s*Failed:\s*(\d+)\s*$/m);
    if (!passed) return null;
    return { passed: Number(passed[1]), failed: Number(failed?.[1] ?? 0) };
  }

  return null;
}

/** Tracked source files and their line counts, straight out of git. */
async function measureSource(slug) {
  const tracked = (await git(slug, ["ls-files", "-z"]))
    .split("\0")
    .filter(Boolean)
    .filter((file) => SOURCE_EXTENSIONS.has(path.extname(file)))
    .filter((file) => !EXCLUDED_PATH.some((pattern) => pattern.test(file)));

  let lines = 0;
  for (const file of tracked) {
    const absolute = path.join(repoPath(slug), file);
    if (!existsSync(absolute)) continue;
    const text = await readFile(absolute, "utf8");
    if (text.length === 0) continue;
    lines += text.split("\n").length - (text.endsWith("\n") ? 1 : 0);
  }

  return { files: tracked.length, lines };
}

/** Production dependencies, which is the number the page is entitled to boast about. */
async function measureDependencies(slug) {
  const manifestPath = path.join(repoPath(slug), "package.json");
  if (!existsSync(manifestPath)) return { runtime: 0, dev: 0 };
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  return {
    runtime: Object.keys(manifest.dependencies ?? {}).length,
    dev: Object.keys(manifest.devDependencies ?? {}).length,
  };
}

async function measureCommits(slug) {
  const count = await git(slug, ["rev-list", "--count", "HEAD"]);
  const head = await git(slug, ["rev-parse", "--short", "HEAD"]);
  return { commits: Number(count.trim()), head: head.trim() };
}

/* -------------------------------------------------------------------------- */
/*                                  main                                      */
/* -------------------------------------------------------------------------- */

function plural(count, one, many) {
  return count === 1 ? one : many;
}

async function main() {
  const missing = REPOS.map((repo) => repo.slug).filter(
    (slug) => !existsSync(repoPath(slug)),
  );
  if (missing.length) {
    throw new Error(
      `these repositories are not beside this one: ${missing.join(", ")}\n` +
        `looked in ${workspace}`,
    );
  }

  /** Test counts from the previous run, so `--static` can keep them. */
  let previous = null;
  if (mode !== "write" && existsSync(outFile)) {
    const text = await readFile(outFile, "utf8");
    const json = text.slice(text.indexOf("= {") + 2, text.lastIndexOf("} as const"));
    try {
      previous = JSON.parse(`${json}}`);
    } catch {
      previous = null;
    }
  }

  const repos = [];

  for (const repo of REPOS) {
    process.stderr.write(`${repo.slug}\n`);

    const [source, dependencies, history] = await Promise.all([
      measureSource(repo.slug),
      measureDependencies(repo.slug),
      measureCommits(repo.slug),
    ]);

    const suites = [];
    for (const suite of repo.suites) {
      if (mode === "static") {
        const kept = previous?.repos
          ?.find((entry) => entry.slug === repo.slug)
          ?.suites?.find((entry) => entry.command === suite.command);
        if (kept) {
          suites.push(kept);
          process.stderr.write(`  ${suite.command}: ${kept.passed} (kept)\n`);
          continue;
        }
      }

      process.stderr.write(`  ${suite.command} ... `);
      const result = await runScript(repo.slug, suite.command);
      const counted = countAssertions(suite.kind, result.output);

      if (!counted) {
        throw new Error(
          `could not read a test count out of \`${suite.command}\` in ${repo.slug}\n` +
            `exit ${result.code ?? 0}. Last 30 lines:\n` +
            result.output.split("\n").slice(-30).join("\n"),
        );
      }
      if (counted.failed > 0) {
        throw new Error(
          `${repo.slug}: \`${suite.command}\` has ${counted.failed} failing ` +
            `${plural(counted.failed, "test", "tests")}. The ledger does not ` +
            `publish counts from a red suite.`,
        );
      }

      process.stderr.write(`${counted.passed}\n`);
      suites.push({ command: suite.command, passed: counted.passed });
    }

    repos.push({
      slug: repo.slug,
      label: repo.label,
      projectId: repo.projectId,
      tests: suites.reduce((total, suite) => total + suite.passed, 0),
      suites,
      files: source.files,
      lines: source.lines,
      runtimeDependencies: dependencies.runtime,
      devDependencies: dependencies.dev,
      commits: history.commits,
      head: history.head,
    });
  }

  /* This repository too. It is one of the eight and the page should not pretend
     it built itself. */
  const [siteSource, siteDeps, siteHistory] = await Promise.all([
    measureSource("personal-website"),
    measureDependencies("personal-website"),
    measureCommits("personal-website"),
  ]);

  const totals = {
    projects: repos.length,
    tests: repos.reduce((sum, repo) => sum + repo.tests, 0),
    lines: repos.reduce((sum, repo) => sum + repo.lines, 0) + siteSource.lines,
    files: repos.reduce((sum, repo) => sum + repo.files, 0) + siteSource.files,
    commits: repos.reduce((sum, repo) => sum + repo.commits, 0) + siteHistory.commits,
    extensions: EXTENSIONS.length,
    /* Repositories that ship nothing at runtime but their own code. The claim the
       page makes, so it is computed rather than asserted. */
    zeroDependencyProjects: repos.filter((repo) => repo.runtimeDependencies === 0)
      .length,
  };

  const payload = {
    generatedAt: new Date().toISOString().slice(0, 10),
    command: "node scripts/ledger.mjs",
    totals,
    repos,
    site: {
      slug: "personal-website",
      files: siteSource.files,
      lines: siteSource.lines,
      runtimeDependencies: siteDeps.runtime,
      commits: siteHistory.commits,
      head: siteHistory.head,
    },
  };

  const body = `/**
 * Generated by \`${payload.command}\`. Do not edit.
 *
 * Every number here was counted from the repository it describes: test totals by
 * running the suite and reading its reporter, line and file counts from
 * \`git ls-files\` filtered to source, dependency counts from each manifest,
 * commit counts from \`git rev-list\`. Re-run the script rather than editing a
 * figure -- \`tests/rendered-html.test.mjs\` checks the page against this file.
 */

export type LedgerRepo = (typeof ledger)["repos"][number];

export const ledger = ${JSON.stringify(payload, null, 2)} as const;
`;

  if (mode === "check") {
    const existing = existsSync(outFile) ? await readFile(outFile, "utf8") : "";
    const strip = (text) => text.replace(/"generatedAt": "[^"]*"/, "");
    if (strip(existing) === strip(body)) {
      console.log("ledger is current");
      return;
    }
    console.error("ledger is out of date -- run `node scripts/ledger.mjs`");
    process.exitCode = 1;
    return;
  }

  await writeFile(outFile, body, "utf8");
  console.log(
    `\n${path.relative(root, outFile)}\n` +
      `  ${totals.tests} tests across ${totals.projects} projects\n` +
      `  ${totals.lines.toLocaleString("en-CA")} lines in ${totals.files} source files\n` +
      `  ${totals.commits} commits\n` +
      `  ${totals.zeroDependencyProjects} of ${totals.projects} ship zero runtime dependencies`,
  );
}

main().catch((error) => {
  console.error(`\n${error.message}`);
  process.exitCode = 1;
});
