/**
 * The end of the page: how to reach me, and where the policies live.
 *
 * It used to be an essay. Three paragraphs on what the projects had in common,
 * a list of five verification scripts with a paragraph each on what they refuse
 * to let through, and a per-repository table of test counts, source lines and
 * commit hashes. All of it true, and all of it a wall of text after seven
 * sections that had already made the argument by running.
 *
 * So it became an address and two links, and that overshot. A page that spends
 * ten sections being deliberate should not end like the bottom of a form. The
 * two notes below are the smallest thing that is neither: a reason these exist,
 * and the two facts about the page a visitor cannot get by looking at it.
 *
 * A `<footer>`, and it is rendered outside `<main>` in `page.tsx` for that to mean
 * anything: HTML scopes a footer to its nearest sectioning ancestor, so one inside
 * `main`, `article`, `aside`, `nav` or `section` carries no role at all. Out at the
 * top level it is the page's `contentinfo` landmark, which is the thing a screen
 * reader offers as "the end of this page" — and this is the end of the page: the
 * address, the profile and the legal index. It was a `<section>`, which announced
 * itself as one more region among ten.
 *
 * Both notes are held to the rule the rest of the page is held to — nothing here is
 * a claim you could not check. The first is the eight `why` lines in
 * `projects.ts` said once instead of eight times. The second is what the README
 * says about the vendored Choir app, plus the one control the page now has; the
 * hold button is deliberately not given a location, because a control described
 * well enough to find is more fun to find than one pointed at, and the dock it
 * lives in is not on screen this far down anyway.
 */

import Link from "next/link";

export function Closing() {
  return (
    <footer className="closing" aria-labelledby="closing-title" data-arrive>
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
          <Link href="/legal" prefetch={false}>
            Privacy &amp; terms
          </Link>
        </p>

        <div className="closing-notes">
          <p>
            Every one of these began as something small and annoying: a part you
            could not pick out of the choir, a stop you could not check without
            opening a map, a film you spent two hours reaching for the remote
            through.
          </p>
          <p>
            Nine of the scenes above are reconstructions, built out of the same
            moving parts as the software rather than filmed off a screen. Choir
            Practice is the application itself. And any of them will stop on the
            single frame that carries its point, if you find the way to ask —
            stopped films turn out to be strips, and strips can be wound by hand.
          </p>
        </div>
      </div>
    </footer>
  );
}
