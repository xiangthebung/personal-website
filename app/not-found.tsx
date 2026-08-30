import Link from "next/link";
import { projects } from "./projects";

/**
 * The section that does not exist.
 *
 * A missing page on this site gets the same grammar as a real one: a number, a
 * name, a platform line, and a scene. The scene is the joke — the phantom
 * cursor that operates every demo on the home page arrives here too, finds one
 * button, presses it, and nothing mounts, because there is nothing to mount.
 * The label pinned to the empty frame says exactly what a label on this site
 * is allowed to say: something true.
 *
 * Server component, CSS-only motion — the one page that must never be worth
 * a client bundle is the wrong-address page.
 */

/**
 * How many projects there are, in words.
 *
 * This line used to be typed: "Seven projects live here, numbered 01 to 07",
 * with the dock immediately below it listing ten of them. One screen
 * contradicting itself is the exact failure the rest of this site is built to
 * refuse, so the count is now read from the same array the dock is rendered
 * from and cannot say anything the dock does not.
 *
 * Spelled where there is a word for it, because this page is written rather
 * than printed. Past the table it falls back to the digits — a wrong word is a
 * lie, and a bare numeral is only a change of register.
 */
const NUMBER_WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
];

const spell = (count: number) => NUMBER_WORDS[count] ?? String(count);

export default function NotFound() {
  const first = projects[0].number;
  const last = projects[projects.length - 1].number;

  return (
    <main className="nf">
      <section className="nf-section" aria-labelledby="nf-title">
        <span className="nf-ghost-number" aria-hidden="true">
          404
        </span>

        <div className="nf-heading">
          <div className="nf-identity">
            <span className="nf-number">404</span>
            <div>
              <h1 id="nf-title">This page</h1>
              <div className="nf-platform-row">
                <span className="nf-platform">Missing</span>
                <span className="nf-mode" aria-hidden="true">
                  ∅ no beat
                </span>
              </div>
            </div>
          </div>

          <div className="nf-summary">
            <p>The address you followed isn&rsquo;t running on this site.</p>
            <small>
              There are {spell(projects.length)} projects here, numbered {first}{" "}
              to {last}. This wasn&rsquo;t one of them.
            </small>
          </div>
        </div>

        <div className="nf-window" aria-hidden="true">
          <div className="nf-stage">
            <button className="nf-play" type="button" tabIndex={-1}>
              <span className="nf-play-mark" />
            </button>
            <span className="nf-cursor">
              {/* The same arrow the scenes' phantom cursor draws, so the visitor
                  who has seen the home page recognises who just walked in. */}
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M5.5 2.6 19.2 12.2l-5.7.5 3.2 6.6-2.5 1.2-3.2-6.6-3.9 4z"
                  fill="#141414"
                  stroke="#fff"
                  strokeWidth="1.4"
                  paintOrder="stroke"
                />
              </svg>
            </span>
            <span className="nf-chip">Nothing mounted here</span>
          </div>
        </div>

        <nav className="nf-links" aria-label="The projects that do exist">
          <Link className="nf-home" href="/">
            Back to the page that exists
          </Link>
          <span className="nf-dock">
            {projects.map((project) => (
              <Link
                href={`/#${project.id}`}
                key={project.id}
                title={project.name}
              >
                <span>{project.number}</span>
                <strong>{project.name}</strong>
              </Link>
            ))}
          </span>
        </nav>
      </section>
    </main>
  );
}
