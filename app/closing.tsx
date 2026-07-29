/**
 * The end of the page.
 *
 * It used to end on the photo rail and three small links, so the last thing a
 * visitor saw was a picture of dinner. Everything above this is an argument, and
 * an argument needs a last paragraph.
 *
 * What it closes with is the checking, which is the part of the work a portfolio
 * normally hides. Every script named here exists in this repository, runs, and
 * fails the build when it should — the descriptions are of what each one refuses
 * to let through, because "we have tests" says nothing and "this one fails if a
 * scene stops advancing" says the thing.
 */

import Link from "next/link";
import { LedgerTally } from "./ledger";

/** Named after what each check will not allow, not after what it does. */
const checks = [
  {
    script: "scripts/drive-site.mjs",
    refuses:
      "Loads the production build in real Chromium, walks all seven sections, and fails on any console error, any failed request, any scene that stops advancing, and any scene that cannot finish a loop in 24 seconds. A vignette can render perfectly and then throw on its first frame; a screenshot would not know.",
  },
  {
    script: "scripts/wide-shot.mjs",
    refuses:
      "Measures the layout at a given width and reports overflow and how much of each well the scene fills. Run at 1440 and 2560, because everything here was verified at 1440 once and every hole opened above 1600.",
  },
  {
    script: "tests/rendered-html.test.mjs",
    refuses:
      "Reads the server-rendered HTML. Among other things it re-reads each extension's privacy policy out of that project's own repository and fails if the copy published here has drifted from it.",
  },
  {
    script: "scripts/dangling-selectors.mjs",
    refuses:
      "Compares what the stylesheet declares against what the browser actually kept. A selector list that ends in a comma in front of an at-rule parses without complaint and silently swallows the block after it, which is how three content-visibility rules became one.",
  },
  {
    script: "scripts/ledger.mjs",
    refuses:
      "Produces every figure above by running each project's suite and reading its own reporter. It throws rather than publish a count from a suite with a failing test.",
  },
];

export function Closing() {
  return (
    <section className="closing" aria-labelledby="closing-title" data-arrive>
      <div className="closing-head">
        <p className="closing-eyebrow">
          <span aria-hidden="true">§</span> In closing
        </p>
        <h2 id="closing-title">Seven projects, and the machinery that keeps them honest</h2>
      </div>

      <div className="closing-body">
        <div className="closing-thesis">
          <p>
            These were built one at a time, with AI doing most of the typing and
            all of the tedium. That changes what a person can finish alone; it does
            not change what makes software worth shipping. So each of them has a
            real problem behind it, a test suite that fails when the behaviour
            changes, and no dependency it did not need.
          </p>
          <p>
            The work that took longest is not visible in any screenshot. An
            open-ended transit alert decoding as finished in 1970. Responsive images
            saved without their <code>srcset</code>, which made an offline reader
            show a broken figure on exactly the sites the feature was for. A deploy
            publishing an entire repository, <code>.git</code> included, instead of
            the site in it. All three were found by writing tests for code that
            already appeared to work.
          </p>
          <p>
            Every claim on this page traces to a repository linked from the section
            that makes it. If one cannot be found there, it should be deleted rather
            than softened.
          </p>
        </div>

        <div className="closing-checks">
          <h3>What this page is not allowed to do</h3>
          <dl>
            {checks.map((check, order) => (
              <div key={check.script} style={{ "--order": order } as React.CSSProperties}>
                <dt>
                  <code>{check.script}</code>
                </dt>
                <dd>{check.refuses}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <LedgerTally />

      <div className="closing-contact">
        <p className="closing-contact-lead">Email</p>
        <a className="closing-mail" href="mailto:xiangli3625@gmail.com">
          xiangli3625@gmail.com
        </a>
        <p className="closing-contact-links">
          <a href="https://github.com/xiangthebung" target="_blank" rel="noreferrer">
            github.com/xiangthebung
          </a>
          <span aria-hidden="true">·</span>
          <Link href="/legal">Privacy &amp; terms</Link>
        </p>
      </div>
    </section>
  );
}
