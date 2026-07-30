"use client";

/**
 * Choir Practice, embedded whole and started for you.
 *
 * The one demo on this page that is not a film, because it does not need to be:
 * the application has no build step and no runtime dependencies — every clef is a
 * Canvas path and every voice is Web Audio formant synthesis — so the real thing
 * can be vendored into `public/demos/choir/` and framed. A staged reconstruction of
 * something that can simply be present would be a worse version of it.
 *
 * It used to sit behind a "Launch Choir Practice" poster. That button was defensible
 * — 1.6 MB of scores and modules, and an audio graph — and it was still a button
 * between a visitor and the thing they came to see, on a page where nothing else
 * asks to be clicked. So the frame now loads itself when the section approaches and
 * drives the app to a useful state: a real score, open, engraved, with the per-voice
 * mixer showing. Nothing to press to get there.
 *
 * Driving it is possible because the copy is served from this origin, so the frame's
 * document is reachable. That is a privilege worth being careful with, so the
 * automation is written to fail silently and completely: every step is guarded, a
 * missing selector aborts the sequence rather than throwing, and the app is
 * perfectly usable by hand if none of it works. `tests/rendered-html.test.mjs`
 * asserts the selectors below still exist in the vendored copy, because the copy is
 * refreshed from its own repository and a rename there would otherwise turn this
 * into a silent no-op.
 *
 * What it deliberately does *not* do is press play. Autoplaying four-part harmony
 * because somebody scrolled past is how you get a tab closed, and `allow="autoplay"`
 * on the frame is there for the transport's own `AudioContext.resume()` when a
 * visitor presses play themselves — not as an invitation to do it for them.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useSectionBeat } from "../scene/section-beat";
import { useOnScreen } from "../use-on-screen";

/**
 * The score to open: Stanford's part song, 104 bars of plain SATB.
 *
 * It was the Wilbye madrigal, which was the wrong choice twice over. That
 * transcription is 649 KB and **774 measures** for a piece that is about seventy
 * bars long, so it engraved a four-and-a-half-minute canvas 1341px tall and took
 * visibly long doing it. And its parts are Soprano 1, Soprano 2, Alto 1, Alto 2,
 * Tenor, Bass — six voices, with the lower staves resting through the opening bars,
 * so the first thing on screen was two staves of rests under a heading promising
 * four voices.
 *
 * This one is 104 bars, four parts named Soprano, Alto, Tenor and Bass, and every
 * staff has notes in bar one. It is also exactly the shape the pitch describes: one
 * part loud, the other three quiet.
 */
const SCORE = "Quick! We have but a second.musicxml";

/** Selectors inside the vendored app. Kept together, and covered by a test. */
const HOOKS = {
  sample: `button.sample[data-sample-path$="${SCORE}"]`,
  transport: "#play-btn",
  parts: "#parts-btn",
};

const CHOIR_BEATS = [{ name: "loading" }, { name: "score" }] as const;
const SCORE_GLYPHS = ["♩", "♪", "♫", "♭", "♯", "♬"] as const;

function ScoreLeaf({ side, part }: { side: "left" | "right"; part: string }) {
  return (
    <span className={`choir-score-leaf choir-score-leaf--${side}`} aria-hidden="true">
      <small>{part}</small>
      {Array.from({ length: 3 }, (_, system) => (
        <span className="choir-score-system" key={system}>
          {Array.from({ length: 5 }, (_, note) => (
            <i key={note}>{SCORE_GLYPHS[(system * 2 + note + (side === "right" ? 1 : 0)) % SCORE_GLYPHS.length]}</i>
          ))}
        </span>
      ))}
    </span>
  );
}

/** Resolves once the selector matches something laid out, or gives up. */
function waitFor(
  doc: Document,
  selector: string,
  timeoutMs: number,
): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;
    const look = () => {
      const node = doc.querySelector<HTMLElement>(selector);
      // `offsetParent` is null for anything display:none, which is how the app
      // hides whichever view is not current.
      if (node && (node.offsetParent !== null || node.getClientRects().length > 0)) {
        resolve(node);
        return;
      }
      if (Date.now() > deadline) {
        resolve(null);
        return;
      }
      window.setTimeout(look, 90);
    };
    look();
  });
}

/**
 * Hands the app's own microphone control a deliberate press.
 *
 * The pitch guidance was reported as broken and it is not: driven with permission
 * already granted, the embedded copy reaches `listening` and pulls a live track
 * exactly like the standalone app does. What fails is the permission *prompt*.
 *
 * `#mic-btn` lives in the app's transport, four rows down inside an iframe on a
 * portfolio. Pressing it raises a microphone prompt attributed to this site — a page
 * about bus timetables and Chrome extensions — with nothing on screen to explain why
 * this site wants a microphone. That prompt gets dismissed, and a dismissed prompt is
 * remembered per origin: `getUserMedia` then rejects instantly, forever, and the app
 * can only report that access was blocked.
 *
 * So the pod asks for it out loud instead. The button below says what it is for, and
 * clicking it forwards the press into the frame, which means the browser's prompt
 * arrives immediately after a control labelled for exactly that. The frame is focused
 * first so the app's own headphones dialog opens where the visitor is looking.
 *
 * Fails silently and completely, like the rest of the automation here: a renamed
 * selector or a cross-origin surprise leaves the app perfectly usable by hand.
 */
/**
 * Makes the wheel chain out of the frame once the app has finished with it.
 *
 * The shield stops the frame stealing the wheel before anyone asks for the app. It does
 * nothing about afterwards, and afterwards is the harder half: Choir Practice is the
 * first project on the page, so it is on screen from the moment the hero is, and a
 * visitor who clicked into it once could no longer scroll away with the pointer over
 * the score. A scroll test caught this — the page stalled on 58 of 60 wheel steps — and
 * it is the same trap the shield was added to fix, just deferred.
 *
 * Within one document a browser chains scroll automatically: an inner pane that has hit
 * its end hands the rest to its parent. Across an iframe boundary it does not, so this
 * does it by hand. On every wheel over the frame it walks up from the event target
 * looking for something that both scrolls and still has somewhere to go in the
 * direction asked for. If it finds one, the app keeps the gesture. If nothing inside
 * wants it, the page takes it.
 *
 * Only possible because the copy is served from this origin. `passive: false` because
 * the whole point is to be able to call `preventDefault` and redirect the gesture.
 */
function chainScroll(frame: HTMLIFrameElement | null): () => void {
  const doc = frame?.contentDocument;
  const view = doc?.defaultView;
  if (!doc || !view) return () => {};

  const wantsIt = (node: Element, deltaY: number): boolean => {
    if (node.scrollHeight <= node.clientHeight + 1) return false;
    const style = view.getComputedStyle(node);
    if (!/(auto|scroll|overlay)/.test(style.overflowY)) return false;

    const atTop = node.scrollTop <= 0;
    const atBottom = node.scrollTop + node.clientHeight >= node.scrollHeight - 1;
    return deltaY < 0 ? !atTop : !atBottom;
  };

  const onWheel = (event: WheelEvent) => {
    if (event.ctrlKey) return; // a zoom gesture, not a scroll

    for (
      let node = event.target as Element | null;
      node && node !== doc.documentElement;
      node = node.parentElement
    ) {
      if (node.nodeType === 1 && wantsIt(node, event.deltaY)) return;
    }

    const root = doc.scrollingElement;
    if (root && wantsIt(root, event.deltaY)) return;

    event.preventDefault();
    window.scrollBy({ top: event.deltaY, left: 0, behavior: "auto" });
  };

  try {
    doc.addEventListener("wheel", onWheel, { passive: false });
  } catch {
    return () => {};
  }
  return () => doc.removeEventListener("wheel", onWheel);
}

function askForMicrophone(frame: HTMLIFrameElement | null): boolean {
  const doc = frame?.contentDocument;
  if (!doc) return false;
  try {
    const button = doc.querySelector<HTMLElement>("#mic-btn");
    if (!button) return false;
    /* Focused before the click so the app's <dialog> takes focus inside the frame
       rather than opening behind a page the visitor is still scrolled on. */
    frame?.focus();
    button.click();
    return true;
  } catch {
    return false;
  }
}

export function ChoirPracticeDemo() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  /* 400px of lead time: this frame has real work to do on load, and arriving at a
     half-drawn score is worse than arriving at a drawn one a moment late. */
  const onScreen = useOnScreen(rootRef, "400px 0px");
  const [mounted, setMounted] = useState(false);
  const [opened, setOpened] = useState(false);
  /** Whether the visitor has asked for the app, which is when it gets the wheel. */
  const [engaged, setEngaged] = useState(false);

  // The surrounding score waits for the real app to finish engraving.
  useSectionBeat(rootRef, opened ? "score" : "loading", CHOIR_BEATS);

  useEffect(() => {
    if (onScreen && !mounted) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMounted(true);
    }
  }, [onScreen, mounted]);

  /**
   * Scrolling away tears the frame down, but only after a grace period. A fast
   * scroll past and back should not kill a rehearsal someone was in the middle of,
   * and leaving a suspended AudioContext and a score renderer alive three sections
   * up is exactly what makes a page feel heavy for no visible reason.
   */
  useEffect(() => {
    if (!mounted || onScreen) return;
    const timer = window.setTimeout(() => {
      setMounted(false);
      setOpened(false);
    }, 20_000);
    return () => window.clearTimeout(timer);
  }, [mounted, onScreen]);

  /* Re-arm the shield the moment the section is left. Handing the wheel to the app is
     something a visitor asks for while they are standing here, not a decision that
     should still be in force when they scroll back past it half a page later — and if
     it were, the scroll trap would be waiting for them again.

     Scroll position is not React state, so there is nowhere to derive this from; the
     observer reports it and this reacts. Same pattern, and same reason, as the mount
     effect above. */
  useEffect(() => {
    if (onScreen || !engaged) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEngaged(false);
  }, [onScreen, engaged]);

  /* Wheel chaining, attached once the app's document exists. Keyed on `opened` because
     that is the point at which the score — the thing with a scrollable pane — is up. */
  useEffect(() => {
    if (!opened) return;
    return chainScroll(frameRef.current);
  }, [opened]);

  /** Opens a score and reveals the mixer. Gives up quietly at any step. */
  const drive = useCallback(async () => {
    const doc = frameRef.current?.contentDocument;
    if (!doc) return;

    try {
      const sample = await waitFor(doc, HOOKS.sample, 6000);
      if (!sample) return;
      sample.click();

      // The score is parsed and engraved before the transport appears.
      const transport = await waitFor(doc, HOOKS.transport, 8000);
      if (!transport) return;
      setOpened(true);

      const parts = doc.querySelector<HTMLElement>(HOOKS.parts);
      if (parts && parts.getAttribute("aria-expanded") !== "true") parts.click();
    } catch {
      /* A cross-origin surprise or a renamed control. The app still works; this
         page simply does not get to have arranged it. */
    }
  }, []);

  return (
    <div
      className="choir"
      ref={rootRef}
      data-opened={opened}
      data-beat={opened ? "score" : "loading"}
      data-lap="0"
    >
      <div className="choir-rehearsal">
        <ScoreLeaf side="left" part="Alto" />
        <ScoreLeaf side="right" part="Tenor" />

        <ol className="choir-part-cues" aria-hidden="true">
          {[
            ["S", "Soprano"],
            ["A", "Alto"],
            ["T", "Tenor"],
            ["B", "Bass"],
          ].map(([initial, part], order) => (
            <li key={part} style={{ "--part": order } as React.CSSProperties}>
              <b>{initial}</b>
              <span>{part}</span>
              <i />
            </li>
          ))}
        </ol>

        <svg className="choir-acoustics" viewBox="0 0 1200 700" aria-hidden="true">
          <path d="M160 420 Q600 70 1040 420" />
          <path d="M230 470 Q600 170 970 470" />
          <path d="M315 515 Q600 275 885 515" />
        </svg>

        {/* Leaving the stand re-arms the shield. Engaging is a request to use the thing
            under the pointer, so it should expire when the pointer is no longer over
            it — otherwise one click buys the frame the wheel for as long as the section
            is on screen, which for the first project on the page is most of the top of
            it. A separate overlay cannot do this job: detecting a pointer leaving
            requires receiving pointer events, and anything receiving them here would be
            taking them from the application. */}
        <div className="choir-stand" onPointerLeave={() => setEngaged(false)}>
          {mounted ? (
            <iframe
              ref={frameRef}
              className="choir-frame"
              src="/demos/choir/index.html"
              title="Choir Practice — the full application"
              allow="autoplay; microphone"
              onLoad={() => void drive()}
            />
          ) : (
            <div className="choir-holding" aria-hidden="true">
              <span />
            </div>
          )}

          {/* The scroll shield.
              A full application in an iframe eats the wheel. Scrolling with the pointer
              over the score scrolled the score's own pane and left the page exactly
              where it was — reported as "the bar keeps going and the page stops" — and
              because this section is nearly a screenful, the pointer is over the app
              for most of the way past it. That is a page you cannot leave by scrolling,
              which is about the worst thing a portfolio can do.

              So the frame is inert until it is asked for. While the shield is up the
              wheel belongs to the page, because the shield is what is under the pointer
              and it does not scroll. Clicking hands the app over. Scrolling away puts
              the shield back, so the trap cannot outlive the visit to this section.

              This is also where the microphone button lives now. It used to sit in the
              footnote under the stand, which hit-testing put at y=919 in a 900px
              window — a control nobody would ever see. Over the score it is the first
              thing you look at. */}
          {mounted && (
            <div
              className="choir-shield"
              data-engaged={engaged}
              onClick={() => setEngaged(true)}
              role="presentation"
            />
          )}

          {mounted && (
            <div className="choir-shield-controls" data-engaged={engaged}>
              {/* Two messages, because there are two states and only one of them was
                  ever named. Between the frame mounting and the score finishing
                  engraving — 1.6 MB of scores and modules, then a parse and a canvas
                  layout — the shield sat over a blank frame telling the visitor to
                  click it, and clicking it at that point does nothing you can see.
                  Nothing said anything was on its way. So the hint now says what the
                  pod is doing while it is doing it, and only offers the frame once
                  there is a frame worth having. The scroll glyph goes with the second
                  message: an icon about the wheel over a still-blank frame is a
                  question, not a cue. */}
              <div className="choir-shield-cluster">
                <span className="choir-shield-hint">
                  {opened && (
                    <span className="choir-shield-glyph" aria-hidden="true">
                      <svg viewBox="0 0 24 24">
                        <path
                          d="M7 4.5v11M7 15.5l-2.6-2.6M7 15.5l2.6-2.6"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <rect
                          x="13"
                          y="5"
                          width="7"
                          height="14"
                          rx="3.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                        />
                      </svg>
                    </span>
                  )}
                  {opened
                    ? "Click to use it — scrolling moves the page"
                    : "Opening a score…"}
                </span>

                <button
                  className="choir-mic"
                  type="button"
                  onClick={(event) => {
                    // Not a request to take the app over; just a request for the mic.
                    event.stopPropagation();
                    setEngaged(true);
                    askForMicrophone(frameRef.current);
                  }}
                  disabled={!opened}
                >
                  <span className="choir-mic-glyph" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <g
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                      >
                        <path d="M12 4.6a2.7 2.7 0 0 0-2.7 2.7v4.3a2.7 2.7 0 0 0 5.4 0V7.3A2.7 2.7 0 0 0 12 4.6Z" />
                        <path d="M6.6 11.2a5.4 5.4 0 0 0 10.8 0M12 16.6V19.4M9.2 19.4h5.6" />
                      </g>
                    </svg>
                  </span>
                  Sing into it
                  <small>your browser will ask for the microphone</small>
                </button>
              </div>
            </div>
          )}

          <span className="choir-stand-lip" aria-hidden="true" />
        </div>
        <span className="choir-stand-base" aria-hidden="true" />
      </div>

      {/* The footnote follows the same two states. It is the only line of prose under
          this pod, so while the frame is still loading it is the only thing that can
          explain why there is a dark rectangle where a score should be. */}
      <div className="choir-footnote">
        <p className="choir-note">
          {opened ? (
            <>
              The real application, from <code>/demos/choir/</code>. Silent until you
              press Play.
            </>
          ) : (
            <>
              Loading the real application from <code>/demos/choir/</code>, then
              opening a four-part score in it.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
