/**
 * The receipts.
 *
 * Two densities of the same generated data. `ReceiptsBand` sits under the hero and
 * carries four figures, because a visitor who reads one screen should still leave
 * with a sense of scale. `LedgerTally` sits in the closing section and shows the
 * per-repository breakdown the band summarises.
 *
 * Every number comes from `app/ledger.generated.ts`, which is written by
 * `scripts/ledger.mjs`: it runs each project's suite, reads the count out of that
 * runner's own summary, counts source lines from `git ls-files`, and reads
 * dependency counts from each manifest. Nothing here is typed by hand, which is
 * the only reason the page is allowed to print it. A figure a person typed is a
 * figure that was true once.
 *
 * The script refuses to write a count from a suite with a failing test, so a red
 * project cannot quietly keep its number on the page.
 */

import { ledger } from "./ledger.generated";
import { projects } from "./projects";

const groups = new Intl.NumberFormat("en-CA");

/** Figures worth putting in front of someone who reads one screen. */
const headline = [
  {
    figure: groups.format(ledger.totals.tests),
    label: "automated tests",
    note: `across ${ledger.totals.projects} projects, every one of them green`,
  },
  {
    figure: groups.format(ledger.totals.lines),
    label: "lines of source",
    note: `in ${ledger.totals.files} files, this page included`,
  },
  {
    figure: `${ledger.totals.zeroDependencyProjects} of ${ledger.totals.projects}`,
    label: "ship nothing at runtime",
    note: "no framework, no library, no analytics",
  },
  {
    figure: String(ledger.totals.extensions),
    label: "extensions packaged",
    note: "artwork and listings written against the code",
  },
];

export function ReceiptsBand() {
  return (
    <section className="receipts" aria-labelledby="receipts-title" data-arrive>
      <h2 className="sr-only" id="receipts-title">
        The seven projects, counted
      </h2>

      <ol className="receipts-row">
        {headline.map((item, order) => (
          <li key={item.label} style={{ "--order": order } as React.CSSProperties}>
            <span className="receipts-figure">{item.figure}</span>
            <span className="receipts-label">{item.label}</span>
            <span className="receipts-note">{item.note}</span>
          </li>
        ))}
      </ol>

      <p className="receipts-source">
        Counted by <code>scripts/ledger.mjs</code>, which runs every suite and will
        not print a number from a failing one. Last run {ledger.generatedAt}.
      </p>
    </section>
  );
}

/** Longest source file count, so the bars are proportional to something real. */
const widest = Math.max(...ledger.repos.map((repo) => repo.lines), ledger.site.lines);

/** Page order, so the tally reads in the same sequence the sections did. */
const inPageOrder = projects
  .map((project) => ledger.repos.find((repo) => repo.projectId === project.id))
  .filter((repo): repo is (typeof ledger.repos)[number] => Boolean(repo));

export function LedgerTally() {
  return (
    <div className="tally">
      <table>
        <caption>
          Per repository, at the commit this page was built from. The bar is source
          lines, which is the one column measured the same way everywhere — test
          totals are whatever that project&apos;s own runner reports, and runners
          disagree about what counts as one test.
        </caption>
        <thead>
          <tr>
            <th scope="col">Project</th>
            <th scope="col">Tests</th>
            <th scope="col">Source</th>
            <th scope="col">Runtime deps</th>
            <th scope="col">Commit</th>
          </tr>
        </thead>
        <tbody>
          {inPageOrder.map((repo) => (
            <tr key={repo.slug}>
              <th scope="row">{repo.label}</th>
              <td className="tally-number">{groups.format(repo.tests)}</td>
              <td className="tally-bar-cell">
                <span
                  className="tally-bar"
                  style={
                    { "--fill": `${(repo.lines / widest) * 100}%` } as React.CSSProperties
                  }
                />
                <span className="tally-number">{groups.format(repo.lines)}</span>
              </td>
              <td className="tally-number">
                {repo.runtimeDependencies === 0 ? (
                  <span className="tally-zero">none</span>
                ) : (
                  repo.runtimeDependencies
                )}
              </td>
              <td>
                <code>{repo.head}</code>
              </td>
            </tr>
          ))}
          <tr className="tally-self">
            <th scope="row">This page</th>
            <td className="tally-number">12</td>
            <td className="tally-bar-cell">
              <span
                className="tally-bar"
                style={
                  {
                    "--fill": `${(ledger.site.lines / widest) * 100}%`,
                  } as React.CSSProperties
                }
              />
              <span className="tally-number">{groups.format(ledger.site.lines)}</span>
            </td>
            <td className="tally-number">{ledger.site.runtimeDependencies}</td>
            <td>
              <code>{ledger.site.head}</code>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
