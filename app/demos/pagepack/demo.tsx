"use client";

/**
 * PagePack, as a thirteen-second film.
 *
 * The pitch is one sentence — "your reading list is just a list of links once the
 * signal drops" — and a sentence is not something you can prove with a screenshot
 * of a popup. So the vignette proves it by staging the failure:
 *
 *   a page is open, the cursor reaches for the toolbar, Save is pressed, and the
 *   page tears itself off into cards that fly out of the button into a stack;
 *   then the connection dies, the tab collapses into a browser error, the colour
 *   drains out of everything — and the stack is still there, still lit, still
 *   readable.
 *
 * The order matters. Showing the library first and the outage second would be a
 * feature tour. Showing the outage first and the library surviving it is an
 * argument, and the visitor gets to feel the moment where everything else on their
 * screen would have stopped working.
 *
 * What is real here and what is staged. The progress vocabulary is real: every
 * label under the bar comes from `captureProgressMessage`, copied out of the
 * extension's service worker, including the rule that a link-following save cannot
 * show a percentage. The chunk sizes and the file counts are the extension's own
 * units. Everything else — the browser frame, the flying cards, the outage — is
 * theatre, and the section says so rather than claiming this is the extension
 * running in the page.
 */

import { useRef } from "react";
import { PhantomCursor } from "../scene/cursor";
import { useStoryboard, type Beat } from "../scene/storyboard";
import { useOnScreen } from "../use-on-screen";
import { captureProgressMessage, formatBytes, type CapturePhase } from "./progress";

type BeatName =
  | "settle"
  | "reach"
  | "open"
  | "aim"
  | "press"
  | "read"
  | "collect"
  | "finish"
  | "cut"
  | "dead"
  | "reveal"
  | "read-offline"
  | "hold";

/**
 * The storyboard.
 *
 * Kept as one visible list because the pacing is the design. `press` is short
 * because a click is short; `dead` is long because the silence after the
 * connection drops is the beat doing the work, and cutting it short would waste
 * the only moment in the scene that is supposed to feel bad.
 */
const BEATS: readonly Beat<BeatName>[] = [
  { name: "settle", ms: 900 },
  { name: "reach", ms: 700 },
  { name: "open", ms: 600 },
  { name: "aim", ms: 550 },
  { name: "press", ms: 260 },
  { name: "read", ms: 850 },
  { name: "collect", ms: 1500 },
  { name: "finish", ms: 700 },
  { name: "cut", ms: 700 },
  { name: "dead", ms: 1400 },
  { name: "reveal", ms: 900 },
  { name: "read-offline", ms: 1900 },
  { name: "hold", ms: 900 },
];

/** Where the cursor is on each beat. `null` means it has left the frame. */
const CURSOR: Partial<Record<BeatName, string>> = {
  reach: "toolbar",
  open: "toolbar",
  aim: "save",
  press: "save",
  read: "save",
  collect: "save",
  reveal: "library-tab",
  "read-offline": "library-tab",
};

/** The pages torn off the site, in the order they fly out of the button. */
const CAPTURED = [
  { title: "The Byzantine Generals Problem", bytes: 402_411 },
  { title: "Reaching agreement in the presence of faults", bytes: 221_004 },
  { title: "Practical Byzantine fault tolerance", bytes: 318_770 },
  { title: "Notes on quorum intersection", bytes: 96_233 },
  { title: "Appendix A — proofs", bytes: 64_120 },
  { title: "Figures and plates", bytes: 512_882 },
  { title: "References", bytes: 41_006 },
];

const TOTAL_BYTES = CAPTURED.reduce((sum, page) => sum + page.bytes, 0);

/**
 * Where each card comes to rest, in viewport units, measured from the Save button
 * it left.
 *
 * Authored rather than randomised. Random scatter looked better in three runs out
 * of four and in the fourth it stacked two cards on top of the project title,
 * which is not a trade worth taking for a page that plays this loop every time
 * somebody scrolls past. Viewport units rather than pixels so the spread stays
 * proportional: the same seven positions have to work across a 1600px section and
 * a 380px phone.
 *
 * Nothing lands near the middle. The middle is where the browser is.
 */
const SCATTER = [
  { x: "-31vw", y: "-13vh", rot: "-11deg" },
  { x: "30vw", y: "-15vh", rot: "9deg" },
  { x: "-25vw", y: "15vh", rot: "7deg" },
  { x: "26vw", y: "14vh", rot: "-6deg" },
  { x: "-39vw", y: "1vh", rot: "13deg" },
  { x: "38vw", y: "3vh", rot: "-9deg" },
  { x: "1vw", y: "-21vh", rot: "4deg" },
] as const;

/** The real label for a beat, through the extension's own formatter. */
function labelFor(beat: BeatName): string {
  const phase: CapturePhase =
    beat === "read" ? "reading" : beat === "finish" ? "finishing" : "assets";
  const pagesDone = beat === "collect" ? 3 : beat === "finish" ? CAPTURED.length : 0;
  return captureProgressMessage({
    phase,
    pagesDone,
    pagesTotal: CAPTURED.length,
    assetsDone: beat === "collect" ? 34 : 0,
    assetsTotal: beat === "collect" ? 61 : 0,
  });
}

export function PagePackDemo() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const onScreen = useOnScreen(stageRef);
  const { beat, index, run, still } = useStoryboard(BEATS, {
    running: onScreen,
    stage: stageRef,
    // The still that carries the argument: a dead browser and a live library.
    stillBeat: "read-offline",
  });

  const at = (name: BeatName) => BEATS.findIndex((entry) => entry.name === name);

  const popupOpen = index >= at("open");
  const saving = index >= at("read") && index < at("cut");
  /**
   * Stays true for the rest of the scene, and that matters.
   *
   * It was `index >= at("press") && index < at("cut")` at first, which read
   * sensibly — the cards fly during the save — and was wrong. The scatter is held
   * by the animation's `forwards` fill, so dropping the flag at the cut removed
   * the animation and every card snapped back to `opacity: 0`. The outage then
   * played over an empty section, deleting the one image the whole vignette is
   * built to produce: a dead browser surrounded by pages that outlived it.
   */
  const flying = index >= at("press");
  const offline = index >= at("cut");
  const dead = index >= at("dead");
  const libraryOpen = index >= at("reveal");
  const reading = index >= at("read-offline");

  return (
    <div
      className="pp"
      ref={stageRef}
      data-beat={beat}
      data-lap={run}
      data-offline={offline}
      data-dead={dead}
      role="img"
      aria-label={
        "A browser with a page open. PagePack saves the page and six pages linked " +
        "from it, the connection then drops and the browser cannot load anything, " +
        "and the saved pages are still readable from the extension's library."
      }
    >
      {/* ---------------------------------------------------------------- browser */}
      <div className="pp-browser">
        {/* The outage, as a wash rather than a filter on this element. See the
            stylesheet: a filter here would drain the popup with everything else,
            and the popup surviving is the shot. */}
        <div className="pp-drain" aria-hidden="true" />
        <div className="pp-chrome">
          <span className="pp-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>

          <span className="pp-omnibox">
            <span className="pp-lock" aria-hidden="true">
              {offline ? "⚠" : "🔒"}
            </span>
            <span className="pp-url">lamport.azurewebsites.net/pubs/byz.html</span>
          </span>

          {/* The signal. Its own element so the cut can be a single class flip. */}
          <span className="pp-wifi" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M2.5 8.5a15 15 0 0 1 19 0" className="pp-wifi-arc pp-wifi-arc--3" />
                <path d="M5.8 12.2a10 10 0 0 1 12.4 0" className="pp-wifi-arc pp-wifi-arc--2" />
                <path d="M9 15.8a5 5 0 0 1 6 0" className="pp-wifi-arc pp-wifi-arc--1" />
              </g>
              <circle cx="12" cy="19.2" r="1.5" fill="currentColor" className="pp-wifi-dot" />
              <path d="M3 3l18 18" className="pp-wifi-slash" />
            </svg>
          </span>

          <span className="pp-toolbar" data-target="toolbar">
            <span className="pp-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <g fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round">
                  <path d="M5 4.5h9l5 5v10H5z" />
                  <path d="M14 4.5v5h5" />
                </g>
              </svg>
            </span>
            {index >= at("finish") && !offline && (
              <span className="pp-badge" aria-hidden="true">
                {CAPTURED.length}
              </span>
            )}
          </span>
        </div>

        {/* --------------------------------------------------------------- content */}
        <div className="pp-viewport">
          <article className="pp-page" aria-hidden="true">
            <h4>The Byzantine Generals Problem</h4>
            <p className="pp-byline">LESLIE LAMPORT, ROBERT SHOSTAK, MARSHALL PEASE</p>
            {[92, 100, 84, 96, 71, 100, 88, 62].map((width, line) => (
              <span className="pp-line" key={line} style={{ width: `${width}%` }} />
            ))}
            <span className="pp-figure" />
            {[100, 78].map((width, line) => (
              <span className="pp-line" key={`tail-${line}`} style={{ width: `${width}%` }} />
            ))}
          </article>

          {/* The browser's own failure, which is the whole reason the product exists. */}
          <div className="pp-crash" aria-hidden="true">
            <span className="pp-crash-glyph">
              <svg viewBox="0 0 24 24">
                <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <path d="M4 7.5a20 20 0 0 1 16 0" />
                  <path d="M7.5 11.6a13 13 0 0 1 9 0" />
                  <path d="M3 3l18 18" />
                </g>
              </svg>
            </span>
            <strong>No internet</strong>
            <span>ERR_INTERNET_DISCONNECTED</span>
          </div>

          {/* ------------------------------------------------------------- popup */}
          <div className="pp-popup" data-open={popupOpen}>
            <div className="pp-popup-head">
              <span className="pp-popup-mark" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <g fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round">
                    <path d="M5 4.5h9l5 5v10H5z" />
                    <path d="M14 4.5v5h5" />
                  </g>
                </svg>
              </span>
              <strong>PagePack</strong>
              <span className="pp-tabs" aria-hidden="true">
                <span data-on={!libraryOpen}>Save</span>
                <span data-on={libraryOpen} data-target="library-tab">
                  Library
                </span>
              </span>
            </div>

            {libraryOpen ? (
              <div className="pp-library">
                <p className="pp-library-head">
                  <strong>1 pack</strong>
                  <span>{`${CAPTURED.length} pages · ${formatBytes(TOTAL_BYTES)}`}</span>
                </p>
                <ul className="pp-shelf">
                  {CAPTURED.slice(0, 4).map((page, order) => (
                    <li
                      key={page.title}
                      data-open={reading && order === 0}
                      style={{ "--order": order } as React.CSSProperties}
                    >
                      <span className="pp-shelf-title">{page.title}</span>
                      <span className="pp-shelf-meta">{formatBytes(page.bytes)}</span>
                    </li>
                  ))}
                </ul>
                <p className="pp-offline-note">
                  <span aria-hidden="true">●</span> Opens with no connection
                </p>
              </div>
            ) : (
              <div className="pp-save">
                <p className="pp-target">
                  <span className="pp-target-title">The Byzantine Generals Problem</span>
                  <span className="pp-target-host">lamport.azurewebsites.net</span>
                </p>

                <button className="pp-primary" type="button" data-target="save" tabIndex={-1}>
                  {saving ? "Saving…" : "Save page"}
                </button>

                <p className="pp-options">One level of links · scripts on</p>

                {saving && (
                  <p className="pp-progress" key={run}>
                    {/* Indeterminate on purpose: a save that follows links discovers
                        pages as it goes, so a percentage here would be invented. */}
                    <span className="pp-bar" data-indeterminate={beat !== "finish"}>
                      <i />
                    </span>
                    <span className="pp-progress-label">{labelFor(beat)}</span>
                  </p>
                )}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ------------------------------------------------------------------ spill
          Outside `.pp-browser`, because the browser clips its own contents and
          everything in here has to leave it. Laid over the same box, so a card can
          start at the Save button and finish a third of a viewport away, across
          the section, over the heading, past the gutters.

          This is the part that stops the pod being a screen recording. Pages that
          fly out of the window and stay out are the difference between watching
          software work and watching it take your reading with it. */}
      <div className="pp-spill" aria-hidden="true">
        {CAPTURED.map((page, order) => (
          <span
            className="pp-flyer"
            key={`${run}-${page.title}`}
            data-flying={flying}
            data-kept={offline}
            style={
              {
                "--order": order,
                "--to-x": SCATTER[order].x,
                "--to-y": SCATTER[order].y,
                "--rot": SCATTER[order].rot,
              } as React.CSSProperties
            }
          >
            <span className="pp-flyer-head">
              <i />
              <span>{page.title}</span>
            </span>
            <span className="pp-flyer-bar" />
            <span className="pp-flyer-bar" />
            <span className="pp-flyer-bar" />
            <span className="pp-flyer-bar" />
          </span>
        ))}

        {/* One of them comes back and opens — out here, not in the frame. The
            browser is dead; the reading is not. */}
        <div className="pp-reader" data-open={reading}>
          <p className="pp-reader-head">
            <span>The Byzantine Generals Problem</span>
            <small>saved copy</small>
          </p>
          {[100, 94, 88, 97, 72].map((width, line) => (
            <span className="pp-line" key={line} style={{ width: `${width}%` }} />
          ))}
        </div>
      </div>

      {!still && (
        <PhantomCursor
          stage={stageRef}
          target={CURSOR[beat] ?? null}
          pressing={beat === "press" || beat === "reveal"}
          token={`${run}-${beat}`}
        />
      )}

      <p className="pp-caption" aria-hidden="true">
        {offline ? (
          <>
            <strong>Signal gone.</strong> The tab has nothing. The pack still opens.
          </>
        ) : (
          <>
            <strong>One press.</strong> The page, six pages of links, and every file
            they need.
          </>
        )}
      </p>
    </div>
  );
}
