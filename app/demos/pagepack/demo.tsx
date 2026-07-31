"use client";

/**
 * PagePack, as an eighteen-second film.
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

import { useEffect, useRef } from "react";
import { PhantomCursor } from "../scene/cursor";
import { useSectionBeat } from "../scene/section-beat";
import { useStoryboard, type Beat } from "../scene/storyboard";
import { useSceneRun } from "../scene/use-scene-run";
import { useOnScreen } from "../use-on-screen";
import { useSectionFocused } from "../use-section-focus";
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
 *
 * It ran 11.9s and was the fastest thing on the page, which is the one thing this
 * film could not afford to be: it has five acts and a reversal in it, and someone
 * meeting it for the first time was being asked to read a new caption, find a new
 * thing on screen and understand a cause every three quarters of a second. So every
 * beat that introduces something now gets between 1.4 and 2.4 seconds — long enough
 * to read the caption *and then* look at the frame, which is the order a first-time
 * visitor actually does it in — and the beats that are only a move or a click stay
 * where they were. 16.7s now.
 *
 * The four save beats are also load-bearing arithmetic: `press + read + collect +
 * finish` is the window the cards fly in, and `FLYER_STAGGER` below derives the stagger
 * from it, so moving any of them keeps the cards landing on `finish` rather than
 * stranding them mid-air or parking them early.
 *
 * 17.6s now. `reveal` and `hold` went up to clear the floor a line of caption needs;
 * see `MIN_CAPTION_MS` in the storyboard hook and the groupings in `CAPTION`.
 */
const BEATS: readonly Beat<BeatName>[] = [
  // The establishing shot: a browser, a page, a toolbar nobody has looked at yet.
  // 900ms was not enough time to find the PagePack button before the cursor did.
  { name: "settle", ms: 1500 },
  { name: "reach", ms: 900 },
  // The popup is a new object with a name, a target page and a button on it. It was
  // on screen for 600ms, less time than it takes to read its own heading.
  { name: "open", ms: 1400 },
  { name: "aim", ms: 700 },
  // A press is a press.
  { name: "press", ms: 320 },
  // "Reading this page…" — the first of three progress states, and the one that
  // establishes that a save has phases at all.
  { name: "read", ms: 1400 },
  // The cards leaving the window. The longest beat of the save, because it is the
  // one carrying the idea that a save takes the linked pages with it.
  { name: "collect", ms: 2000 },
  /* The count landing on the toolbar badge: small, and the proof the save worked.
     1000ms could not carry its own caption, and this is the beat whose length was
     previously untouchable because a hand-computed stagger depended on it. It is not
     untouchable now — `FLYER_STAGGER` re-derives itself from these four beats. */
  { name: "finish", ms: 1400 },
  // A cut. Long enough for the signal arcs to drop outside-in and the slash to draw
  // across them — 640ms of transition in the stylesheet — and no longer.
  { name: "cut", ms: 800 },
  { name: "dead", ms: 1900 },
  /* Three new things in one frame — the Library tab, a pack, and a file list — and
     1200ms was under the floor a line of caption needs. */
  { name: "reveal", ms: 1500 },
  // The payoff, and the only frame with real prose in it.
  { name: "read-offline", ms: 2400 },
  { name: "hold", ms: 1400 },
];

/**
 * The window the cards fly in: press, read, collect, finish.
 *
 * Named and summed rather than written down, because it is the input to
 * `FLYER_STAGGER` below and the previous version of that constant was a hand-computed
 * `2` with a comment warning that changing any of these four beats would silently
 * strand the animation. That warning came true the first time one of them moved.
 */
const SAVE_BEATS = ["press", "read", "collect", "finish"] as const;
const SAVE_MS = BEATS.filter((beat) =>
  (SAVE_BEATS as readonly string[]).includes(beat.name),
).reduce((total, beat) => total + beat.ms, 0);

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
 * How far apart the cards leave the button, as a multiple of the stylesheet's own
 * 235ms step.
 *
 * `.pp-flyer[data-flying="true"]` runs a 1900ms flight with
 * `animation-delay: calc(var(--order) * 235ms)`, so the last of seven cards lands at
 * `1900 + 6 × 235 × stagger`. That has to equal the save window exactly: the cards
 * should settle as `finish` ends, so the last one arrives the instant before the
 * connection dies.
 *
 * This used to be a hand-computed `2`, correct against a 4,720ms save, under a comment
 * warning that changing any of the four save beats would silently strand the animation.
 * The warning was accurate and the arrangement still failed, because raising `finish`
 * to clear the caption floor is exactly the kind of edit that has no visible connection
 * to a constant seventy lines away. Deriving it means the coupling cannot rot: move any
 * of those beats and the stagger follows.
 */
const FLYER_FLIGHT_MS = 1900;
const FLYER_STEP_MS = 235;
const FLYER_STAGGER =
  (SAVE_MS - FLYER_FLIGHT_MS) / (FLYER_STEP_MS * (CAPTURED.length - 1));

/**
 * Where each card comes to rest, in viewport units, measured from the Save button
 * it left.
 *
 * Authored rather than randomised. The landings stay inside the demo/stage band:
 * they still clear the browser and reach both outer edges, but none can travel up
 * into the title, facts or links. Viewport units keep that safe spread proportional
 * across a 1600px section and a 380px phone.
 *
 * The last one used to land at `8vw, -7vh`, which put it flat on top of the popup.
 * Photographing the beats caught it: through `dead`, `reveal` and `hold` — the three
 * frames where the popup is the only lit thing in a dead section — a saved card was
 * covering the Library tab, the pack's size and two of its four rows. A card resting
 * over the dead browser is the shot; a card resting over the one surviving window is
 * the shot with its subject hidden. Moved down and left, into the frame's empty lower
 * quarter, where it still reads as a page that got out.
 */
const SCATTER = [
  { x: "-31vw", y: "-4vh", rot: "-11deg" },
  { x: "30vw", y: "-5vh", rot: "9deg" },
  { x: "-25vw", y: "8vh", rot: "7deg" },
  { x: "26vw", y: "7vh", rot: "-6deg" },
  { x: "-39vw", y: "2vh", rot: "13deg" },
  { x: "38vw", y: "3vh", rot: "-9deg" },
  { x: "-9vw", y: "13vh", rot: "4deg" },
] as const;

/**
 * What is happening in each frame, in the present tense.
 *
 * There were two captions before — one for the save half, one for the outage half —
 * so eleven of the thirteen beats were described by a sentence written about a
 * different beat. Watching it, the caption under `open` was still talking about a
 * press that had not happened, and the caption under `read-offline` was explaining a
 * browser that had by then faded off the top of the frame. A visitor reading the line
 * and then looking up at the picture found the two disagreeing, which is worse than
 * no caption: it teaches them to stop reading it.
 *
 * Each entry is a lead clause and the rest of the sentence, so the markup can keep
 * the emphasis it had. Kept to one line at the pod's width — the stylesheet reserves
 * `min-height: 2.6em`, which is two lines, and a caption that reflows between beats
 * moves the frame above it.
 */
/**
 * There is no caption under this scene.
 *
 * There were thirteen lines here, one per beat, and they were cut to nine, and then to
 * six, and the six were still wrong. "Text, styles, images and fonts — not a list of
 * links" against a reading column four inches away that says "Saves the page exactly as
 * you saw it, pictures and all". "It takes the pages this one links to, as well" against
 * "Follow the links and it takes the whole section with it". The caption was not too
 * verbose; it was a fifth layer of prose paraphrasing the fourth while the scene
 * demonstrated the same thing a third time.
 *
 * The popup narrates its own save — "Reading this page…", the page count, the badge —
 * and the invitation above the frame says "One save, then the connection dies". Between
 * them there is nothing left for a caption to add.
 */

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

/**
 * How much bare floor the cable needs to the left of the browser window.
 *
 * The coupler is ~68px wide and has to be seen pulling apart, so it wants its own width
 * again in clearance on either side. Below this the section has no desk to lay a cable
 * on and the run moves to the bottom edge instead.
 */
const CABLE_FLOOR_PX = 210;

export function PagePackDemo() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const browserRef = useRef<HTMLDivElement | null>(null);
  const onScreen = useOnScreen(stageRef);
  /* Starts on focus. The save and the outage are cause and effect, and arriving to find
     the connection already dead is arriving after the cause. */
  const running = useSceneRun(useSectionFocused(stageRef), onScreen);
  const { beat, index, run, still } = useStoryboard(BEATS, {
    running,
    stage: stageRef,
    // The still that carries the argument: a dead browser and a live library.
    stillBeat: "read-offline",
  });

  // The cable, section outage and reading field follow the save film beat for beat.
  useSectionBeat(stageRef, beat, BEATS);

  /**
   * Tells the section's cable where this browser window actually is.
   *
   * The cable is drawn in `.bd--pagepack-front` as an SVG with `viewBox="0 0 1600 720"`
   * stretched to the full width with `preserveAspectRatio="none"`, so every x in its path
   * is a percentage of the viewport. The window it is supposed to run behind is a
   * max-width box inside a two-column grid, so its left edge is not a percentage of
   * anything. Those two facts cannot be reconciled by choosing a better number, which is
   * what the previous version tried: the path stopped at x=440 of 1600 — 27.5% — from a
   * measurement taken at one width.
   *
   * Measured across the range, that single number was wrong nearly everywhere.
   *
   *     width   window left   cable ended   error
   *     820     53            226           176px *across the article*
   *     1024    72            282           210px across the article
   *     1180    191           325           134px across the article
   *     1440    392           396           4px — the width it was measured at
   *     1600    472           440           32px short, ending in mid-air
   *     2560    952           704           248px short
   *
   * So at 1440 it looked deliberate and at every other width it was either a cord thrown
   * over the page — the thing that was reported in the first place — or a wire stopping
   * in space. The coupler was worse: below about 1200px the window's left edge is inside
   * it, so the one part of this that has to be *seen* coming apart was underneath the
   * article.
   *
   * Publishing the measurement fixes both. `--pack-window-left` is where the window
   * starts, in pixels from the section's left edge; the stylesheet clips the cable there
   * and hangs the coupler a fixed distance short of it.
   *
   * `data-pack-room` is the honest admission that below a certain width there is no floor
   * to lay a cable on at all — at 820px the window begins 53px in. Rather than pick a
   * breakpoint and hope, the flag is set from the space actually available, and the
   * stylesheet moves the run to the bottom edge when there is not enough.
   *
   * Resize and layout only. Nothing here needs to run while the scene plays, so it is not
   * in the storyboard's frame loop; `ResizeObserver` on the section covers a window
   * resize, a font swap and the section's own height changing as scenes mount.
   */
  useEffect(() => {
    const stage = stageRef.current;
    const section = stage?.closest<HTMLElement>("[data-project-section]");
    if (!stage || !section) return;

    let last = { left: -1, bottom: -1 };
    const publish = () => {
      const browser = browserRef.current;
      if (!browser) return;
      const left = Math.round(
        browser.getBoundingClientRect().left - section.getBoundingClientRect().left,
      );
      const box = browser.getBoundingClientRect();
      const sectionBox = section.getBoundingClientRect();
      const bottom = Math.round(box.bottom - sectionBox.top);
      if (left === last.left && bottom === last.bottom) return;
      last = { left, bottom };
      section.style.setProperty("--pack-window-left", `${left}px`);
      /* Where the window's lower edge is, so the `tight` layout can hang the run under it
         rather than at a percentage. 86% of the section put the coupler *inside* the
         window at 1024 and 1180 — the section's height and the window's height do not
         scale together, so no single percentage clears it. */
      section.style.setProperty("--pack-window-bottom", `${bottom}px`);
      section.dataset.packRoom = left >= CABLE_FLOOR_PX ? "roomy" : "tight";
    };

    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(section);
    observer.observe(stage);

    return () => {
      observer.disconnect();
      section.style.removeProperty("--pack-window-left");
      section.style.removeProperty("--pack-window-bottom");
      delete section.dataset.packRoom;
    };
  }, []);

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
      {/* Measured, so the section's cable knows where to stop. See the effect above. */}
      <div className="pp-browser" ref={browserRef}>
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

                {/* Three labels, not two. It read "Saving…" and then went back to
                    "Save page", so the frames where the connection dies showed a
                    popup offering to do a job it had already finished — and a
                    visitor who had not yet seen the Library had nothing on screen
                    telling them the save succeeded. The badge says seven; this says
                    it in words, in the panel the eye is already on. */}
                <button className="pp-primary" type="button" data-target="save" tabIndex={-1}>
                  {saving ? "Saving…" : index >= at("cut") ? "Saved" : "Save page"}
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
                // Scaled, not the raw index. See `FLYER_STAGGER`: the stylesheet
                // multiplies this by 235ms to get the card's launch delay, and the
                // save it was timed against is 1410ms longer than it used to be.
                "--order": order * FLYER_STAGGER,
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
          <header className="pp-reader-head">
            <span>
              <small>saved copy · no network request</small>
              The Byzantine Generals Problem
            </span>
            <b>offline</b>
          </header>
          <div className="pp-reader-layout">
            <article className="pp-reader-document">
              <p className="pp-reader-byline">
                Leslie Lamport · Robert Shostak · Marshall Pease
              </p>
              <h4>Reaching agreement in the presence of faults</h4>
              {[100, 94, 88, 97, 72, 91, 84].map((width, line) => (
                <span className="pp-line" key={line} style={{ width: `${width}%` }} />
              ))}
              <p className="pp-reader-callout">
                The saved HTML, styles, figures and linked pages are served from the
                pack after the connection is gone.
              </p>
              {[96, 78, 89].map((width, line) => (
                <span className="pp-line" key={`tail-${line}`} style={{ width: `${width}%` }} />
              ))}
            </article>
            <aside className="pp-reader-index">
              <small>pack contents</small>
              {CAPTURED.slice(0, 5).map((page, order) => (
                <span key={page.title} data-current={order === 0}>
                  <i>{String(order + 1).padStart(2, "0")}</i>
                  {page.title}
                </span>
              ))}
            </aside>
          </div>
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

      {/* No caption. The popup narrates its own save — "Reading this page…", the page
          count, the badge — and the reading column beside it makes the claims. */}
    </div>
  );
}
