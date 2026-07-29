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

export function ChoirPracticeDemo() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  /* 400px of lead time: this frame has real work to do on load, and arriving at a
     half-drawn score is worse than arriving at a drawn one a moment late. */
  const onScreen = useOnScreen(rootRef, "400px 0px");
  const [mounted, setMounted] = useState(false);
  const [opened, setOpened] = useState(false);

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
    <div className="choir" ref={rootRef} data-opened={opened}>
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

      <p className="choir-note">
        The real application, served from <code>/demos/choir/</code> and opened on a
        Stanford part song. Sound is one press away; it stays quiet until you ask.
      </p>
    </div>
  );
}
