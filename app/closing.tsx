/**
 * The end of the page: how to reach me, and where the policies live.
 *
 * It used to be an essay. Three paragraphs on what the projects had in common,
 * a list of five verification scripts with a paragraph each on what they refuse
 * to let through, and a per-repository table of test counts, source lines and
 * commit hashes. All of it true, and all of it a wall of text after seven
 * sections that had already made the argument by running.
 *
 * What is left is the part a reader actually needs at the bottom of a page: an
 * address, a profile, and the legal index. The checks still exist and still run
 * — see the verification list in the README — they just do not need describing
 * to a visitor.
 */

import Link from "next/link";

export function Closing() {
  return (
    <section className="closing" aria-labelledby="closing-title" data-arrive>
      <h2 className="sr-only" id="closing-title">
        Contact
      </h2>

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
