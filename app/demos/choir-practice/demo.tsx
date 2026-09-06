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
 * mixer showing and a passage marked out on the bar ruler to rehearse. Nothing to
 * press to get there.
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
 * WHAT THE POD ARRANGES, AND WHAT IT LEAVES ALONE
 *
 * The application grew a first run. Opening a score now shows a banner over the music
 * saying which part was chosen and where to change it, the parts panel carries a coach
 * card saying the same, and coming back after a reload puts a "Continue where you left
 * off" card above the samples. All three are right for a singer and wrong inside a
 * portfolio: a banner that explains a control the pod is about to press for you, and a
 * card offering to resume a rehearsal nobody was having. Same origin means the frame's
 * storage is this page's storage, so the pod writes the app's own "seen it" preference
 * and deletes its resume record before the document boots — see `FIRST_RUN`. Nothing
 * in the app is edited to do this; it reads the storage it would have read anyway.
 *
 * The count-in is the one piece of first-run furniture that stays, on purpose. Press
 * play and the app counts a bar in — "1 · 2 · 3" over the score, a click per beat —
 * before a note sounds. It is the best new moment the application has, and the pod
 * expects it: the transport reports "playing" at the press, the music arrives about
 * two seconds later, and the section between the two is a beat of its own
 * (`count-in`), during which the four voice discs fill by thirds and the room ticks.
 *
 * WHEN IT PLAYS
 *
 * On the click that hands the visitor the app, and never before. The distinction that
 * matters here is between scrolling past something and asking for it: autoplaying
 * four-part harmony because somebody scrolled past is how you get a tab closed, and
 * that is still true. But the shield already exists and already requires a deliberate
 * click, and making that click *also* start the music removes the one step nobody
 * should have had to work out — "click the screen, then find Play" was reported as
 * exactly that.
 *
 * `allow="autoplay"` on the frame is what lets it work, together with the fact that
 * user activation propagates through same-origin frames: a real click on the shield
 * gives the framed document sticky activation, so the app's own
 * `AudioContext.resume()` succeeds on the forwarded press. This is the same mechanism
 * the microphone button has always used.
 *
 * The shield is shown once and then never again. It used to re-arm whenever the pointer
 * left the stand, which meant a scrim and a "Click to play" dropping back over an
 * engraved score every time a visitor moved the mouse off it — reported as exactly that.
 * The re-arming had a reason: the shield's original job was to stop the frame eating the
 * wheel, and handing the wheel over felt like something that should expire. But
 * `chainScroll` below now does that job properly, from the moment the score is up and
 * for as long as it is, so re-arming bought nothing and cost the one thing this pod is
 * for — an unobstructed view of the application. `engaged` is a one-way latch, cleared
 * only by the twenty-second teardown, because a reloaded frame is a new document and
 * needs its own gesture before it can make sound.
 *
 * It still reads the transport's state before pressing, because `#play-btn` is a toggle
 * and that teardown can put the shield back after a long absence.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useSectionBeat } from "../scene/section-beat";
import { useOnScreen } from "../use-on-screen";
import { useSectionFocused } from "../use-section-focus";
import "./demo.css";

/**
 * The score to open: Happy Birthday, four parts, nine bars.
 *
 * Two wrong answers came before it. The Wilbye madrigal was 649 KB and 774 measures
 * for a piece about seventy bars long, so it engraved a canvas 1341px tall and took
 * visibly long doing it — and its parts are Soprano 1, Soprano 2, Alto 1, Alto 2,
 * Tenor, Bass, with the lower staves resting through the opening bars, so the first
 * thing on screen was two staves of rests under a heading promising four voices.
 * Stanford's part song fixed all of that and introduced a subtler problem: it is a
 * piece nobody recognises. A visitor heard four-part harmony and had no way to tell
 * whether the app was rendering it correctly, because they had never heard it.
 *
 * A tune everybody knows removes that doubt in about two seconds. You press play, you
 * hear Happy Birthday in four parts, and the claim the section is making — that this
 * thing really does sing all four lines — is checked against your own memory rather
 * than taken on trust. Nine bars, four parts named Soprano, Alto, Tenor and Bass, and
 * every staff has notes in bar one.
 *
 * The cost is length: nine bars is about twenty seconds. So the pod marks a passage
 * out on the app's bar ruler (see `PASSAGE`), which turns the app's own loop on, and
 * the music keeps going for as long as somebody is watching instead of falling flat
 * mid-visit — and the marked passage is the application's newest capability, shown
 * doing what it is for.
 */
const SCORE = "Happy Birthday.musicxml";

/**
 * The passage the pod rehearses, and the score it is a passage of.
 *
 * `bars` is a fact about `Happy Birthday.musicxml`: what the app's own home card
 * prints for it — `data-bars="9"` in the vendored `index.html` — so the ledger on the
 * stand's ledge counts the same bars the application does. It was 104 for a long
 * time, which was the Stanford, and the Stanford is 26 bars anyway.
 *
 * Bars 2 to 3 rather than a whole phrase, and the reason is what fits. At the frame's
 * width, with the parts panel open, the score shows bars 1 to 3 at the zoom it opens at;
 * a loop that ended past the right edge would put one handle on screen and the other
 * off it, and a band with one end is a band that reads as "from here onward". Two bars
 * keeps both handles in view before anything is pressed, which is the frame most
 * visitors see for longest. Bar 1 is the pickup ("Hap-py"), so the loop starts on the
 * first full bar and the opening is still heard once on the way in.
 *
 * Typed as numbers rather than `as const`: the pod compares a bar against both ends,
 * and two distinct literal types cannot both be equal to one value, which is a compile
 * error rather than the one-bar loop it is guarding for.
 */
const PASSAGE: { bars: number; from: number; to: number } = { bars: 9, from: 2, to: 3 };

/**
 * Selectors inside the vendored app, and the one piece of its state this reads.
 *
 * Kept together and covered by `tests/rendered-html.test.mjs`, because the copy under
 * `public/demos/choir/` is refreshed from its own repository and a rename there would
 * turn this whole file into a silent no-op — automation that fails quietly is exactly
 * the kind that stays broken.
 *
 * `playing` is the transport's own signal: `TransportView.setPlaying` writes
 * `aria-label="Pause"` while a piece is running and `"Play"` while it is not. Reading a
 * label rather than a class is deliberate — the label is a published accessibility
 * contract that the app has to keep for its own users, so it is the most stable thing
 * about that button.
 */
const HOOKS = {
  sample: `button.sample[data-sample-path$="${SCORE}"]`,
  transport: "#play-btn",
  parts: "#parts-btn",
  mic: "#mic-btn",
  /**
   * The app's loop toggle, which defaults to looping the whole score.
   *
   * Only the fallback now. The pod prefers `app.setLoopBars`, which marks a passage and
   * turns looping on in one move — the same thing a drag along the ruler does — and
   * reaches for this button only if that entry point has gone. `aria-pressed` is the
   * app's own published state for it, so this is read the same way `#play-btn`'s label
   * is.
   */
  loop: "#loop-btn",
  /** "Share this passage": copies a link carrying the score, part, loop and tempo. */
  share: "#share-btn",
  /** The tempo readout in the transport — "85 BPM · 100%" — which is a button now. */
  tempo: "#tempo-value",
  /** The count-in overlay the app puts over the score: "1 · 2 · 3", the current beat lit. */
  countIn: "#count-in",
  /** One number of the count, and the class the lit one carries. */
  countBeat: ".count-in-beat",
  countNow: "is-now",
  /** "bar 1 / 9" in the transport, rewritten as the transport moves. */
  bar: "#bar-display",
  /** The engraved score, whose ruler the loop band is drawn on. */
  canvas: "#score-canvas",
  /** The zoom readout, in the pill the app floats over the top-right corner of the score. */
  zoom: "#zoom-level",
  /** The app's loading overlay; hidden again once the engine and renderer exist. */
  loading: "#loading",
  /** What `#play-btn` says about itself when a press would *start* playback. */
  idleLabel: "Play",
};

/**
 * What the application keeps in this origin's storage, and what the pod does about it
 * before the frame boots.
 *
 * Both keys are the app's own — `NAMESPACE` in `js/prefs.js` and `DB_NAME` in
 * `js/resume-store.js` — and both are read on startup. `coach-seen` is the preference
 * the app writes when a singer presses "Got it": with it set, neither the part banner
 * over the score nor the coach card in the parts panel is shown. The resume record is
 * what puts "Continue where you left off" on the home screen; the app writes one every
 * time a score is open, including on `pagehide`, so every remount of this frame after
 * the first would otherwise offer to resume the last visit. Deleting the database is
 * the only way to be sure there is no record, and it is done before the document
 * exists so nothing can be racing it.
 *
 * Deliberately not `count-in`: the app defaults to counting one bar in, that default is
 * the moment worth seeing, and the pod leaves it alone.
 */
const FIRST_RUN = {
  coachSeen: "choir-practice:coach-seen",
  resumeDatabase: "choir-practice",
} as const;

/**
 * The section's beats, in order. Not a storyboard — the application is the clock —
 * but the same attributes the storyboarded scenes publish, so `globals.css` and
 * `demo.css` can stage the room per state:
 *
 *   loading   the frame is arriving
 *   score     a score is open and engraved, the mixer showing
 *   passage   the loop band is on the ruler
 *   count-in  play was pressed; the app is counting the bar in
 *   singing   the voices are sounding
 */
const CHOIR_BEATS = [
  { name: "loading" },
  { name: "score" },
  { name: "passage" },
  { name: "count-in" },
  { name: "singing" },
] as const;
type ChoirBeat = (typeof CHOIR_BEATS)[number]["name"];

/**
 * The four voices, as frequency bands.
 *
 * Deliberately narrower and non-overlapping than the real ranges, which overlap
 * heavily — a soprano's bottom octave is an alto's middle. Using the true ranges made
 * all four readouts move together and the display said nothing. These four windows sit
 * in the middle of each part's tessitura, so a passage where the basses carry the line
 * lights the bass row and not the others.
 *
 * This is a reading of the mix, not a transcription of it. A soprano singing low will
 * show up on the alto row, and that is honest about what a spectrum can tell you.
 */
const VOICES = [
  { name: "soprano", lo: 560, hi: 1150 },
  { name: "alto", lo: 350, hi: 560 },
  { name: "tenor", lo: 200, hi: 350 },
  { name: "bass", lo: 80, hi: 200 },
  /* The whole ensemble, for the room to swell with. Runs through the same normaliser as
     the four parts, so it is one code path rather than a special case. */
  { name: "all", lo: 80, hi: 1150 },
] as const;

/**
 * The four parts, in the colours the application engraves them in.
 *
 * These are `PART_COLORS` from `public/demos/choir/js/utils.js`, which is what
 * `notation-renderer.js` inks every notehead, stem and part label with on the canvas six
 * inches away. They were not these colours. The pod's four S/A/T/B markers were all one
 * mint — the section's accent — so the page showed a soprano line drawn in blue on the
 * score and a soprano marker in green beside it, and a visitor matching one to the other
 * had nothing to match on. That was reported as exactly what it was: the buttons are not
 * the same colours as the parts in the music.
 *
 * Copied rather than imported, because the app is a vendored static bundle served to the
 * browser and not a module this build can reach. `tests/rendered-html.test.mjs` reads both
 * and fails if they stop agreeing, which is the only thing that makes a copy safe — the
 * vendored app is refreshed from its own repository and a palette change over there would
 * otherwise silently put the markers back out of step.
 */
const PARTS = [
  { initial: "S", name: "Soprano", voice: "soprano", color: "#4a9eff" },
  { initial: "A", name: "Alto", voice: "alto", color: "#4caf50" },
  { initial: "T", name: "Tenor", voice: "tenor", color: "#ff9800" },
  { initial: "B", name: "Bass", voice: "bass", color: "#f44336" },
] as const;

/**
 * The leader lines, and what each one is hung on.
 *
 * Four labels on a leader line each, in the site's voice, pointing at the application's
 * own controls rather than duplicating them. There was one — the pitch detector's — and
 * the reason there was not a second is recorded at `findSpot`. The three that joined it
 * point at what the application gained: the passage marked on the bar ruler, the bar it
 * counts in before the music (hung on the tempo readout, which is the control that
 * decides how long that bar is), and the Share control that turns the passage into a
 * link.
 *
 * `side` is which way the plate reads out of its dot. The choices are about what is
 * next to each control: the ruler's plate stands *above* the band because either side of
 * it at ruler height is bar numbers; Share's stands above the app bar — outside the
 * frame — because the title is to its left and Export to its right; the tempo's hangs
 * below the transport, where there is only the stand's lip; the microphone's reads left
 * along the transport row, as it always did.
 *
 * Which ones show when: the passage label from the moment the band is drawn, the other
 * three only once the piece has been played. Before that the frame's one instruction is
 * "Play the score", and four cues competing with it is how none of them gets read.
 *
 * Below 760px they stop pointing. The same four are rendered again as a row of chips
 * under the frame — the fallback every other scene's labels already make at that width,
 * see `.speclayer` in `globals.css` — because on a phone the application is in its
 * compact layout, where a plate above the ruler lands on the zoom pill, one under the
 * tempo covers the play button and one beside the microphone covers the transport.
 */
type CueId = "passage" | "count" | "share" | "mic";
type CueSide = "left" | "right" | "above" | "below";

const CUES: readonly { id: CueId; text: string; side: CueSide }[] = [
  { id: "passage", text: "Marked on the ruler, on repeat", side: "above" },
  { id: "count", text: "One bar counted in first", side: "below" },
  { id: "share", text: "Passage, part and tempo, as a link", side: "above" },
  /* "Test your pitch" was the name of a feature. This is what the feature does to you,
     which is the thing worth knowing and the thing the deleted note beside this scene
     used to say. Kept short because it reads leftward along the transport row and a
     long label there covers the other controls. */
  { id: "mic", text: "Sing along: sharp or flat", side: "left" },
];

/** A point in the stand's coordinates, in CSS pixels. */
interface Spot {
  x: number;
  y: number;
}

/**
 * The application's public surface, as much of it as the pod touches.
 *
 * `window.choirPracticeApp` is assigned at the foot of the vendored `js/app.js`. Every
 * member here is optional and every call is guarded, because the copy is refreshed from
 * its own repository: a rename over there has to degrade to "the pod arranged less"
 * rather than to a thrown error in a page that otherwise works. `setLoopBars(from, to)`
 * is the programmatic form of dragging the bar ruler; `renderer` is the score's
 * engraver, whose `getLoopBandX` and `getRulerBounds` say where the band it draws is.
 */
interface ChoirApp {
  setLoopBars?: (
    fromBar: number | null,
    toBar: number | null,
    options?: { syncFields?: boolean; announce?: boolean },
  ) => void;
  state?: { loopRange?: { fromBar: number; toBar: number } | null };
  renderer?: {
    scale?: number;
    scrollX?: number;
    config?: { marginLeft?: number; clefWidth?: number };
    getLoopBandX?: () => { startX: number; endX: number } | null;
    getRulerBounds?: () => { top: number; bottom: number };
  } | null;
  audioEngine?: {
    audioContext?: AudioContext;
    live?: { bus?: { master?: AudioNode } };
  } | null;
}

/** The running application inside the frame, or null if it is not reachable. */
function appIn(frame: HTMLIFrameElement | null): ChoirApp | null {
  try {
    const view = frame?.contentWindow as (Window & { choirPracticeApp?: ChoirApp }) | null;
    return view?.choirPracticeApp ?? null;
  } catch {
    return null;
  }
}

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

/** Resolves true once `test` passes, or false when the time is up. */
function until(test: () => boolean, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;
    const look = () => {
      let passed = false;
      try {
        passed = test();
      } catch {
        /* treated as not yet */
      }
      if (passed) return resolve(true);
      if (Date.now() > deadline) return resolve(false);
      window.setTimeout(look, 90);
    };
    look();
  });
}

/**
 * Puts the application's first-run furniture away before the document boots.
 *
 * Same origin, so `localStorage` and `indexedDB` here are the ones the frame will read.
 * The preference is written synchronously; the database deletion is asynchronous and is
 * waited for, with a short ceiling so a storage layer that never answers cannot hold the
 * frame back. Resolves either way — none of this is a condition of the app working.
 */
function quietFirstRun(): Promise<void> {
  try {
    window.localStorage.setItem(FIRST_RUN.coachSeen, "1");
  } catch {
    /* Private mode, or storage refused. The banner shows; the app still works. */
  }

  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      window.clearTimeout(ceiling);
      resolve();
    };
    const ceiling = window.setTimeout(finish, 600);
    try {
      const request = window.indexedDB.deleteDatabase(FIRST_RUN.resumeDatabase);
      request.onsuccess = finish;
      request.onerror = finish;
      request.onblocked = finish;
    } catch {
      finish();
    }
  });
}

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

/**
 * Starts the piece, if it is not already going.
 *
 * Called from the shield's click and nowhere else, so the music only ever begins on a
 * gesture that was a request for this application. The guard covers the one case where
 * the shield can appear twice — the twenty-second teardown remounts the frame — so a
 * second click does nothing rather than pausing what is already playing.
 *
 * What the press starts is the count-in, not the music: the app counts a bar before the
 * first note, and `#play-btn` reads "Pause" from the press onward. The pod treats that
 * bar as its own beat — see `watchCountIn`.
 *
 * Silent on every failure, like the rest of the automation here. A renamed control
 * leaves a visitor with a working app and a Play button, which is the state this page
 * shipped in for months.
 */
function startPlayback(frame: HTMLIFrameElement | null): boolean {
  const doc = frame?.contentDocument;
  if (!doc) return false;
  try {
    const button = doc.querySelector<HTMLElement>(HOOKS.transport);
    if (!button) return false;
    if (button.getAttribute("aria-label") !== HOOKS.idleLabel) return false;
    button.click();
    return true;
  } catch {
    return false;
  }
}

/**
 * Stops the piece, if it is going.
 *
 * The exact mirror of `startPlayback`, guard included, and it exists because four-part
 * harmony carried on playing after the visitor had scrolled to another project. That is the
 * worst version of the autoplay problem this pod was careful about at the other end: the
 * music only ever starts on a deliberate click, and then followed you down the page anyway,
 * with nothing on screen to connect it to. There is a twenty-second teardown that eventually
 * unmounts the frame, so it did stop — long after it should have.
 */
function pausePlayback(frame: HTMLIFrameElement | null): boolean {
  const doc = frame?.contentDocument;
  if (!doc) return false;
  try {
    const button = doc.querySelector<HTMLElement>(HOOKS.transport);
    if (!button) return false;
    // Anything other than "Play" means it is playing; see `HOOKS.idleLabel`.
    if (button.getAttribute("aria-label") === HOOKS.idleLabel) return false;
    button.click();
    return true;
  } catch {
    return false;
  }
}

/**
 * Marks the passage out on the bar ruler.
 *
 * `setLoopBars` is what a drag along the ruler ends in: it resolves the bars, tints the
 * band on the score, puts a handle at each end, turns looping on and mirrors the range
 * into the frame's own URL hash. The pod calls it rather than simulating the drag, for
 * the reason the rest of this file drives buttons through `click()` — the application's
 * own entry points are the contract, and a synthetic pointer sequence over a canvas is
 * not. `announce: false` because the app would otherwise say "Looping bars 2 to 3" into
 * its live region, which a screen reader on this page would hear as something that just
 * happened to it.
 *
 * Reports whether the range took, read back off the app's own state, so the caller can
 * fall back to the plain loop button if it did not.
 */
function stagePassage(frame: HTMLIFrameElement | null): boolean {
  const app = appIn(frame);
  if (!app || typeof app.setLoopBars !== "function") return false;
  try {
    app.setLoopBars(PASSAGE.from, PASSAGE.to, { announce: false });
    const range = app.state?.loopRange;
    return Boolean(range && range.fromBar === PASSAGE.from && range.toBar === PASSAGE.to);
  } catch {
    return false;
  }
}

/**
 * Reports whether the app is playing, by watching the control that says so.
 *
 * A `MutationObserver` on one attribute rather than a poll. The transport rewrites
 * `#play-btn`'s `aria-label` on every state change — that is the same contract
 * `startPlayback` reads — so the state is already published; polling it would be asking
 * a question four times a second that the app volunteers the answer to.
 *
 * Returns a teardown, or null if the app is not reachable, which the caller treats as
 * "no reactive section, just an embedded app". Everything here is best-effort.
 */
function watchPlayback(
  frame: HTMLIFrameElement | null,
  onChange: (playing: boolean) => void,
): (() => void) | null {
  const doc = frame?.contentDocument;
  if (!doc) return null;
  try {
    const button = doc.querySelector(HOOKS.transport);
    if (!button) return null;

    const read = () => onChange(button.getAttribute("aria-label") !== HOOKS.idleLabel);
    read();

    /* This page's `MutationObserver`, watching a node in the frame's document. Observing
       across a same-origin document boundary is allowed, and it avoids reaching for the
       frame realm's own constructor — which is not on the `Window` type and would need a
       cast to say something the platform already guarantees. */
    const observer = new MutationObserver(read);
    observer.observe(button, { attributes: true, attributeFilter: ["aria-label"] });
    return () => observer.disconnect();
  } catch {
    return null;
  }
}

/**
 * Reports the count-in, beat by beat.
 *
 * The app puts `#count-in` over the score when play is pressed — one number per beat of
 * the bar, the sounding one carrying `is-now` — and hides it again as the first note
 * lands. `beat` is the lit number (1-based), 0 while the overlay is up but nothing is lit
 * yet, and null once it is hidden; `of` is how many beats the bar has. Same mechanism as
 * `watchPlayback`: the app publishes this into its own DOM, so the pod observes it rather
 * than timing anything itself, which is what keeps it right at any tempo and any metre.
 */
function watchCountIn(
  frame: HTMLIFrameElement | null,
  onChange: (beat: number | null, of: number) => void,
): (() => void) | null {
  const doc = frame?.contentDocument;
  if (!doc) return null;
  try {
    const node = doc.querySelector<HTMLElement>(HOOKS.countIn);
    if (!node) return null;

    let last = "";
    const read = () => {
      let beat: number | null = null;
      let of = 0;
      if (!node.hidden) {
        const numbers = node.querySelectorAll(HOOKS.countBeat);
        of = numbers.length;
        beat = 0;
        numbers.forEach((number, index) => {
          if (number.classList.contains(HOOKS.countNow)) beat = index + 1;
        });
      }
      const key = `${beat}/${of}`;
      if (key === last) return;
      last = key;
      onChange(beat, of);
    };
    read();

    const observer = new MutationObserver(read);
    observer.observe(node, {
      attributes: true,
      attributeFilter: ["hidden", "class"],
      childList: true,
      subtree: true,
    });
    return () => observer.disconnect();
  } catch {
    return null;
  }
}

/**
 * Reports which bar the transport is in, from the readout that prints it.
 *
 * `#bar-display` reads "bar 1 / 9" and is rewritten as the transport moves. The number
 * is read out of it rather than computed from beats, so it is the app's own answer, and
 * the callback fires only when it changes.
 */
function watchBar(
  frame: HTMLIFrameElement | null,
  onChange: (bar: number) => void,
): (() => void) | null {
  const doc = frame?.contentDocument;
  if (!doc) return null;
  try {
    const node = doc.querySelector<HTMLElement>(HOOKS.bar);
    if (!node) return null;

    let last = 0;
    const read = () => {
      const bar = Number(node.textContent?.match(/(\d+)\s*\/\s*\d+/)?.[1] ?? 0);
      if (!bar || bar === last) return;
      last = bar;
      onChange(bar);
    };
    read();

    const observer = new MutationObserver(read);
    observer.observe(node, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  } catch {
    return null;
  }
}

/**
 * Where the ripples come from: one origin per voice, positioned by the stylesheet to sit
 * under that voice's disc. See the note at the markup.
 */
function rippleOrigins(root: HTMLElement): Map<string, HTMLElement> {
  const origins = new Map<string, HTMLElement>();
  for (const node of root.querySelectorAll<HTMLElement>(".choir-ripple-origin")) {
    const voice = node.dataset.voice;
    if (voice) origins.set(voice, node);
  }
  return origins;
}

/**
 * One ring into the room from a voice's disc.
 *
 * Plain DOM, appended to the origin the stylesheet has already positioned. No React:
 * this is called from inside a `requestAnimationFrame` loop whose entire purpose is to
 * avoid a render pass per frame, and from the count-in observer, which wants the same
 * thing for the same reason. `reach` is how far it gets, so a loud entry throws a wider
 * ring than a quiet one and a count-in tick a smaller one than either.
 */
function ripple(origin: HTMLElement, reach: number): void {
  // A ceiling, in case a noisy band and an unlucky threshold conspire.
  if (origin.childElementCount >= 3) return;
  const ring = origin.ownerDocument.createElement("i");
  ring.className = "choir-ripple";
  ring.style.setProperty("--reach", reach.toFixed(2));
  ring.addEventListener("animationend", () => ring.remove(), { once: true });
  // `appendChild`, not `append`: this project's type graph resolves `append` to an
  // overload taking a stream, and the DOM one is not worth arguing with.
  origin.appendChild(ring);
}

/**
 * Drives the section from the actual four-part harmony.
 *
 * The app's audio graph ends `… → ceiling → master → destination`, and `master` is
 * reachable from here because the copy is served from this origin. Connecting an
 * analyser to it adds a second output from that node; the existing connection to
 * `destination` is untouched, so this is a tap rather than an insertion and it cannot
 * affect what a visitor hears. Analysers are sinks, so it does not need connecting
 * onward.
 *
 * Writes one custom property per voice onto the pod's root element, which the stylesheet
 * uses to light the S/A/T/B rows and swell the room's acoustics. Nothing re-renders —
 * this must not cost a React pass per frame.
 *
 * Two economies worth keeping. Levels are only written when they move by more than a
 * hundredth, because writing a custom property invalidates style for the subtree below
 * it and most frames do not change a band meaningfully. And the loop only exists while
 * the music is playing: it is started by `watchPlayback` reporting true and torn down
 * the moment it reports false.
 *
 * It is also started while the app is still counting in, which is two seconds of
 * silence through the analyser. Harmless by construction: every band's level starts at
 * zero, the normaliser below floors an empty band's span, and nothing rises through the
 * ripple threshold until a voice actually enters.
 *
 * Attack is fast and release is slow, which is what a level meter does. Symmetric
 * smoothing either jitters or lags, and a choir's attacks are the part worth seeing.
 */
function tapVoices(frame: HTMLIFrameElement | null, root: HTMLElement | null): () => void {
  const win = frame?.contentWindow;
  if (!win || !root) return () => {};

  let analyser: AnalyserNode | null = null;
  let master: AudioNode | null = null;
  let raf = 0;

  try {
    const engine = appIn(frame)?.audioEngine;
    const ctx = engine?.audioContext;
    master = engine?.live?.bus?.master ?? null;
    if (!ctx || !master) return () => {};

    analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.72;
    /**
     * The window the bytes are mapped from, and it has to be set.
     *
     * `getByteFrequencyData` scales between `minDecibels` and `maxDecibels`, which
     * default to −100 and −30. Four voices through a limiter sit comfortably above −30
     * in the mid bands, so every one of the four readouts pinned at 255 and the section
     * showed four full meters that never moved — measured: soprano, alto and tenor all
     * flat at 1.000 for two seconds while the piece was audibly changing. It looked like
     * the tap had failed and it was working perfectly; the range was just too narrow to
     * express anything.
     *
     * −90 to −12 covers a real mix with headroom at both ends.
     */
    analyser.minDecibels = -90;
    analyser.maxDecibels = -12;
    master.connect(analyser);

    const bins = new Uint8Array(analyser.frequencyBinCount);
    const binHz = ctx.sampleRate / analyser.fftSize;
    const ranges = VOICES.map((voice) => ({
      name: voice.name,
      from: Math.max(1, Math.round(voice.lo / binHz)),
      to: Math.min(bins.length - 1, Math.round(voice.hi / binHz)),
    }));
    const levels = ranges.map(() => 0);
    const written = ranges.map(() => -1);
    /* Each band's own working range, tracked rather than assumed. See below. */
    const peaks = ranges.map(() => 0);
    const troughs = ranges.map(() => 1);

    /**
     * Ripples: one ring into the room each time a voice comes in.
     *
     * The four rows used to end in a horizontal level rule pointing at the score, which
     * was reported as a line going into the music — and it was, both literally and in the
     * sense that mattered: a meter aimed at the application, competing with it. What
     * replaced it puts the same information behind the frame instead of beside it, where
     * a section of a page can afford to be atmospheric.
     *
     * Triggered on attacks rather than animated continuously, because that is the
     * difference between decoration and a reading of the music: a ring appears in the
     * alto's green *when the altos come in*. `levels` is already smoothed with a fast
     * attack, so the crossing is the attack. The two thresholds are hysteresis — one
     * value would fire a burst of rings every time a sustained note wobbled across it.
     */
    const origins = rippleOrigins(root);
    /* Whether this band is currently counted as sounding. */
    const sounding = ranges.map(() => false);

    const tick = () => {
      analyser!.getByteFrequencyData(bins);

      ranges.forEach((range, index) => {
        let total = 0;
        for (let bin = range.from; bin <= range.to; bin += 1) total += bins[bin];
        const mean = total / Math.max(1, range.to - range.from + 1) / 255;

        /**
         * Each band normalised against its own range, which it discovers as it goes.
         *
         * A single fixed mapping cannot serve four bands, and the measurements are
         * unambiguous about why: the alto window (350–560 Hz) is where most of a choir's
         * energy lives, so a scale that gave the basses room left the altos pinned at
         * 1.000 with a working range of 0.03. Calibrating four constants by hand would
         * fix this score and break the next one, since the answer depends on the voicing
         * of whatever is being sung.
         *
         * So each band keeps a fast-attack, slow-release peak and the mirror-image
         * trough, and reports where it currently sits between them. Every band therefore
         * uses the full range whatever its absolute energy, and the display becomes about
         * dynamics — which part is pushing right now — rather than about which frequency
         * band happens to carry the most power. The 0.04 floor on the span stops a silent
         * band, where peak and trough converge, amplifying its own noise into a
         * flickering full-scale meter.
         */
        peaks[index] += (mean - peaks[index]) * (mean > peaks[index] ? 0.35 : 0.004);
        troughs[index] += (mean - troughs[index]) * (mean < troughs[index] ? 0.35 : 0.004);
        const span = Math.max(0.04, peaks[index] - troughs[index]);
        const target = Math.max(0, Math.min(1, (mean - troughs[index]) / span));

        levels[index] += (target - levels[index]) * (target > levels[index] ? 0.5 : 0.12);

        if (Math.abs(levels[index] - written[index]) > 0.01) {
          written[index] = levels[index];
          root.style.setProperty(`--v-${range.name}`, levels[index].toFixed(3));
        }

        /* Rising through the upper threshold is an entry; it has to fall back below the
           lower one before it can count as entering again. `all` has no origin, so the
           ensemble band drives the room's swell and nothing here. */
        const origin = origins.get(range.name);
        if (origin) {
          if (!sounding[index] && levels[index] > 0.6) {
            sounding[index] = true;
            // How far it gets, so a loud entry throws a wider ring than a quiet one.
            ripple(origin, 0.7 + levels[index] * 0.6);
          } else if (sounding[index] && levels[index] < 0.32) {
            sounding[index] = false;
          }
        }
      });

      raf = win.requestAnimationFrame(tick);
    };
    raf = win.requestAnimationFrame(tick);
  } catch {
    /* A renamed graph, or a browser without an analyser. The app still sings. */
  }

  return () => {
    if (raf) win.cancelAnimationFrame(raf);
    try {
      // Named, so the master keeps its connection to the destination.
      if (master && analyser) master.disconnect(analyser);
    } catch {
      /* already torn down */
    }
    for (const voice of VOICES) root.style.removeProperty(`--v-${voice.name}`);
    /* Any ring still expanding when the music stops. Their `animationend` listeners
       would clear them, but the loop that made them is gone and a half-finished ripple
       frozen over the paper is worse than no ripple. */
    for (const ring of root.querySelectorAll(".choir-ripple")) ring.remove();
  };
}

/** Which point of a control a leader line's dot sits on. */
type Grip = "center" | "left" | "top" | "bottom";

/**
 * Where one of the application's controls is, in the pod's own coordinates.
 *
 * The pod used to carry its own microphone button, which forwarded a press into the
 * frame. That was a workaround for a real problem — a permission prompt raised by a
 * portfolio with nothing on screen explaining why it wants a microphone gets dismissed,
 * and a dismissed prompt is remembered per origin, so `getUserMedia` then fails forever.
 * The label was the context.
 *
 * A leader line pointing at the real control solves the same problem better: the prompt
 * still arrives right after a labelled gesture, and the visitor learns where the feature
 * actually lives instead of meeting a duplicate of it. So this measures a control inside
 * the frame and returns a point on it relative to the stand, for the annotation to hang
 * off. `grip` is which point: the microphone's label reads leftward, so it hangs on the
 * button's left edge rather than crossing half of it to reach the middle.
 *
 * WHY THERE IS NO LEADER LINE ON THE PARTS MIXER
 *
 * A cue for it was designed and dropped, and the reason survives the three cues that
 * were added later for other things. The panel is open on screen, headed "Parts",
 * listing Soprano at 100% and the other three at 35% over a control called "Balance".
 * The claim is already in the frame, made by the application, better than a label would
 * make it. The controls that do carry a cue are the ones whose consequence is *not*
 * visible in the frame at rest: a band on a ruler does not say it repeats, a readout
 * does not say it counts a bar in first, and a button reading "Share" does not say what
 * a link carries.
 *
 * Returns null on anything unexpected, and the caller renders nothing — a renamed
 * selector costs a label, not a broken layout.
 */
function findSpot(
  frame: HTMLIFrameElement | null,
  stand: HTMLElement | null,
  selector: string,
  grip: Grip = "center",
): Spot | null {
  const doc = frame?.contentDocument;
  if (!doc || !stand) return null;
  try {
    const button = doc.querySelector<HTMLElement>(selector);
    if (!button) return null;
    const box = button.getBoundingClientRect();
    if (box.width === 0) return null;
    const frameBox = frame.getBoundingClientRect();
    const standBox = stand.getBoundingClientRect();
    const fx = grip === "left" ? 0 : 0.5;
    const fy = grip === "top" ? 0 : grip === "bottom" ? 1 : 0.5;
    return {
      x: Math.round(frameBox.left + box.left + box.width * fx - standBox.left),
      y: Math.round(frameBox.top + box.top + box.height * fy - standBox.top),
    };
  } catch {
    return null;
  }
}

/**
 * Where the loop band is on the ruler, in the pod's own coordinates, or null when it has
 * scrolled out of view.
 *
 * Not a DOM node: the band is painted on the score canvas by the app's engraver, in a
 * layout space that the engraver scrolls (`scrollX`) and scales (`scale`) on the way to
 * the screen. `getLoopBandX` gives the band's edges in that space and `getRulerBounds`
 * the ruler's top, so the conversion is the one `hitTest` in the renderer does, run
 * backwards. The engraver also draws the part-name gutter over the score as it scrolls,
 * so the visible band is clipped to the right of it.
 *
 * The dot sits at the middle of whatever part of the band is on screen rather than on a
 * handle, because while the piece plays the score moves under the cursor like a
 * teleprompter and either handle spends part of every pass behind the gutter. The
 * middle of the visible band is always on the band, which is the only thing the label
 * has to be true about.
 *
 * "On screen" also means out from under the zoom pill, which the app floats over the
 * top-right corner of the score at ruler height. On a phone-width frame the pill covers
 * the end of the band, and a dot under a button is a dot on the wrong thing.
 */
function passageSpot(frame: HTMLIFrameElement | null, stand: HTMLElement | null): Spot | null {
  const doc = frame?.contentDocument;
  const renderer = appIn(frame)?.renderer;
  if (!doc || !stand || !renderer) return null;
  try {
    const band = renderer.getLoopBandX?.();
    const ruler = renderer.getRulerBounds?.();
    const canvas = doc.querySelector<HTMLElement>(HOOKS.canvas);
    if (!band || !ruler || !canvas) return null;

    const canvasBox = canvas.getBoundingClientRect();
    if (canvasBox.width === 0) return null;
    const scale = renderer.scale || 1;
    const scrollX = renderer.scrollX || 0;
    const gutter = ((renderer.config?.marginLeft ?? 0) + (renderer.config?.clefWidth ?? 0)) * scale;
    const rulerTop = ruler.top * scale;

    const left = Math.max((band.startX - scrollX) * scale, gutter + 6);
    let right = Math.min((band.endX - scrollX) * scale, canvasBox.width - 6);
    const pill = doc.querySelector<HTMLElement>(HOOKS.zoom)?.parentElement?.getBoundingClientRect();
    if (pill && pill.width > 0) {
      const pillTop = pill.top - canvasBox.top;
      const pillBottom = pill.bottom - canvasBox.top;
      if (pillBottom > rulerTop - 6 && pillTop < rulerTop + 30) {
        right = Math.min(right, pill.left - canvasBox.left - 10);
      }
    }
    if (right - left < 24) return null;

    const frameBox = frame.getBoundingClientRect();
    const standBox = stand.getBoundingClientRect();
    return {
      x: Math.round(frameBox.left + canvasBox.left + (left + right) / 2 - standBox.left),
      y: Math.round(frameBox.top + canvasBox.top + rulerTop - standBox.top),
    };
  } catch {
    return null;
  }
}

/** Every cue's point, measured now. Absent where the control could not be found. */
function spotsFor(
  frame: HTMLIFrameElement | null,
  stand: HTMLElement | null,
): Partial<Record<CueId, Spot>> {
  const spots: Partial<Record<CueId, Spot>> = {};
  const passage = passageSpot(frame, stand);
  const count = findSpot(frame, stand, HOOKS.tempo, "bottom");
  const share = findSpot(frame, stand, HOOKS.share, "top");
  const mic = findSpot(frame, stand, HOOKS.mic, "left");
  if (passage) spots.passage = passage;
  if (count) spots.count = count;
  if (share) spots.share = share;
  if (mic) spots.mic = mic;
  return spots;
}

export function ChoirPracticeDemo() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  /* The chunk itself now loads only as the frame approaches. A small amount of lead
     still lets the score begin engraving before the stand is fully visible, without
     paying for the embedded application while the visitor is on the hero. */
  const onScreen = useOnScreen(rootRef, "80px 0px");
  /* Whether this is the section the visitor is actually standing in. `onScreen` is the
     wrong question for the music: it is true 400px before the section arrives and stays
     true while the next project fills the screen. */
  const focused = useSectionFocused(rootRef);
  const [mounted, setMounted] = useState(false);
  const [opened, setOpened] = useState(false);
  /** Whether the passage is marked on the ruler and looping. */
  const [looped, setLooped] = useState(false);
  /** Whether the visitor has asked for the app, which is when it gets the wheel. */
  const [engaged, setEngaged] = useState(false);
  /** Whether the app's transport is running, read off its own play button. */
  const [playing, setPlaying] = useState(false);
  /** Whether the app is counting the bar in: the transport is running and no note yet. */
  const [counting, setCounting] = useState(false);
  /** Whether the piece has been played at all this visit. One-way, like `engaged`. */
  const [played, setPlayed] = useState(false);
  /** Where each leader line is hung, measured against the stand. */
  const [spots, setSpots] = useState<Partial<Record<CueId, Spot>>>({});
  const standRef = useRef<HTMLDivElement | null>(null);
  /** The passage cue's own element, which is moved without a render while the score scrolls. */
  const passageRef = useRef<HTMLSpanElement | null>(null);

  const beat: ChoirBeat = playing
    ? counting
      ? "count-in"
      : "singing"
    : looped
      ? "passage"
      : opened
        ? "score"
        : "loading";

  /** Whether a cue has something to say yet. See the note on `CUES`. */
  const showing = (cue: { id: CueId }) => (cue.id === "passage" ? looped : played);

  /* The surrounding room waits for the real app to finish engraving, brightens when the
     passage is marked, ticks through the count-in, and reacts once it starts singing. */
  useSectionBeat(rootRef, beat, CHOIR_BEATS);

  /* `--beat-t` is what the storyboarded scenes write every frame — how far through the
     current beat they are — and what `scripts/beat-shot.mjs` waits on before it
     photographs a named beat. This pod's beats are states of the application rather than
     spans of a clock, so a beat has wholly arrived the moment it is published: 1, written
     once per change, is the true fraction, and it is what lets the review tooling name
     this pod's frames the way it names every other scene's. */
  useEffect(() => {
    rootRef.current?.style.setProperty("--beat-t", "1");
  }, [beat]);

  /**
   * Mount the frame once the section is near — after the app's first-run furniture has
   * been put away. `quietFirstRun` is asynchronous only because deleting a database is,
   * and it resolves whatever happens; the frame is never withheld for it.
   */
  useEffect(() => {
    if (!onScreen || mounted) return;
    let cancelled = false;
    void quietFirstRun().then(() => {
      if (!cancelled) setMounted(true);
    });
    return () => {
      cancelled = true;
    };
  }, [onScreen, mounted]);

  /**
   * Scrolling away tears the frame down, but only after a grace period. A fast
   * scroll past and back should not kill a rehearsal someone was in the middle of,
   * and leaving a suspended AudioContext and a score renderer alive three sections
   * up is exactly what makes a page feel heavy for no visible reason.
   *
   * This is also the one place `engaged` goes back to false, and it has to: the next
   * mount is a fresh document with no user activation, so its `AudioContext` cannot
   * start until somebody clicks. Nothing shorter-lived resets it — see the note at
   * the top of this file on why the shield does not come back on pointer-leave.
   */
  useEffect(() => {
    if (!mounted || onScreen) return;
    const timer = window.setTimeout(() => {
      setMounted(false);
      setOpened(false);
      setLooped(false);
      setEngaged(false);
      setPlaying(false);
      setCounting(false);
      setPlayed(false);
      setSpots({});
    }, 20_000);
    return () => window.clearTimeout(timer);
  }, [mounted, onScreen]);

  /**
   * Stop the music when this stops being the section you are looking at.
   *
   * Reported, and fair: the piece carried on into the next project. The pod was careful
   * about the other end of this — nothing plays until a real click, because autoplaying
   * four-part harmony at somebody who scrolled past is how a tab gets closed — and then let
   * the same harmony follow them down the page with nothing on screen to explain it. The
   * twenty-second teardown above did eventually stop it, which is a long time to listen to a
   * choir you have left.
   *
   * Keyed on focus rather than `onScreen`. The frame mounts 400px before the section
   * arrives and stays mounted while the next project fills the window, so `onScreen` is true
   * for far longer than "you are here" — and the app would have been paused before the
   * visitor ever reached it. `useSectionFocused` is the page's own answer to which project
   * you are in, and it is the signal every other viewport-level effect already uses.
   *
   * Pausing rather than muting, so coming back finds the piece where it was rather than
   * three minutes further on. Resuming is the application's own Play button, which is on
   * screen, says "Play", and is the control a visitor who has already clicked into this
   * frame is holding. The shield does not reappear to offer a second one.
   */
  useEffect(() => {
    if (!playing || focused) return;
    pausePlayback(frameRef.current);
  }, [playing, focused]);

  /* Wheel chaining, attached once the app's document exists. Keyed on `opened` because
     that is the point at which the score — the thing with a scrollable pane — is up. */
  useEffect(() => {
    if (!opened) return;
    return chainScroll(frameRef.current);
  }, [opened]);

  /* Watch the transport. Attached once the score is up, because `#play-btn` does not
     exist before then. `played` latches here rather than in an effect of its own, so
     the two cannot disagree about which press was the first. */
  useEffect(() => {
    if (!opened) return;
    return (
      watchPlayback(frameRef.current, (running) => {
        setPlaying(running);
        if (running) setPlayed(true);
      }) ?? undefined
    );
  }, [opened]);

  /**
   * Watch the count-in, and let the room tick with it.
   *
   * Each beat of the bar writes `--count-t` — how far through the bar the count is —
   * onto the pod, which the stylesheet turns into the four discs' rings filling by
   * thirds, and throws a small ring off every disc: the same ripple a voice's entry
   * throws, at a third of the reach, so the count reads as the room keeping time before
   * the singing. Cleared when the overlay goes, which is the moment the music starts and
   * `tapVoices` takes over the rings.
   */
  useEffect(() => {
    if (!opened) return;
    const root = rootRef.current;
    const origins = root ? rippleOrigins(root) : new Map<string, HTMLElement>();
    const stop = watchCountIn(frameRef.current, (count, of) => {
      setCounting(count !== null);
      if (!root) return;
      if (count === null) {
        root.style.removeProperty("--count-t");
        return;
      }
      root.style.setProperty("--count-t", (of > 0 ? count / of : 0).toFixed(3));
      if (count > 0) for (const origin of origins.values()) ripple(origin, 0.42);
    });
    return () => {
      stop?.();
      root?.style.removeProperty("--count-t");
    };
  }, [opened]);

  /**
   * The bar ruler echoed on the stand's ledge.
   *
   * The lip under the frame carries the score's nine bars, and two things are written
   * onto them from here: which bars are the looped passage, once the band is on the
   * ruler, and which bar the transport is in, as it moves. Both are attributes rather
   * than React state, for the reason `tapVoices` gives about the voice levels — the bar
   * changes every second or so while the piece plays, and a render pass to change one
   * attribute on one cell is a poor trade for a thing the stylesheet can key on directly.
   */
  useEffect(() => {
    const cells = Array.from(rootRef.current?.querySelectorAll<HTMLElement>(".choir-ledger i") ?? []);
    cells.forEach((cell, index) => {
      const bar = index + 1;
      if (!looped || bar < PASSAGE.from || bar > PASSAGE.to) {
        cell.removeAttribute("data-looped");
        return;
      }
      const edge =
        bar === PASSAGE.from && bar === PASSAGE.to
          ? "both"
          : bar === PASSAGE.from
            ? "start"
            : bar === PASSAGE.to
              ? "end"
              : "";
      cell.setAttribute("data-looped", edge);
    });
  }, [looped]);

  useEffect(() => {
    if (!opened) return;
    const cells = Array.from(rootRef.current?.querySelectorAll<HTMLElement>(".choir-ledger i") ?? []);
    const stop = watchBar(frameRef.current, (bar) => {
      cells.forEach((cell, index) => cell.toggleAttribute("data-now", index + 1 === bar));
    });
    return () => {
      stop?.();
      for (const cell of cells) cell.removeAttribute("data-now");
    };
  }, [opened]);

  /**
   * Listen to the mix while it is playing, and only while it is playing.
   *
   * Also torn down when the section leaves the screen. An analyser reading a graph
   * nobody is looking at is a `requestAnimationFrame` loop and an FFT per frame spent on
   * an effect that is three sections up.
   */
  useEffect(() => {
    if (!playing || !onScreen) return;
    return tapVoices(frameRef.current, rootRef.current);
  }, [playing, onScreen]);

  /**
   * Keeps the leader lines on the controls they point at.
   *
   * Measured when a cue first has something to point at, and again on play and pause,
   * because the score scrolls while it plays and settles where it stops. Re-measured on
   * resize because the frame's height follows the window, which moves the transport the
   * buttons sit in — and on the score pane's own resize, which is what the parts panel
   * opening does to it, because the band's position is a fraction of that pane. Not per
   * frame: the buttons do not move while the piece plays, and the one thing that does is
   * followed separately below.
   */
  useEffect(() => {
    if (!looped && !played) return;

    const measure = () => setSpots(spotsFor(frameRef.current, standRef.current));
    measure();
    /* Once more when the entrances are over. The band is measured the moment it is
       drawn, which is also the moment the parts panel is still opening beside it. */
    const settle = window.setTimeout(measure, 480);

    const observer = new ResizeObserver(measure);
    if (standRef.current) observer.observe(standRef.current);
    try {
      const pane = frameRef.current?.contentDocument?.querySelector(HOOKS.canvas)?.parentElement;
      if (pane) observer.observe(pane);
    } catch {
      /* Unreachable frame; the stand's own resize still re-measures. */
    }
    return () => {
      window.clearTimeout(settle);
      observer.disconnect();
    };
  }, [looped, played, playing]);

  /**
   * Follows the band while the score scrolls under the cursor.
   *
   * The one cue whose subject moves: while the piece plays, the engraver keeps the
   * playhead pinned a third of the way across and scrolls the music past it, so the band
   * on the ruler travels left every pass and snaps back at the loop. Written straight
   * onto the element from a frame loop — the same rule as `tapVoices`: nothing here may
   * cost a React render per frame. A React render in between puts the last measured
   * point back for one frame, which the next tick corrects.
   */
  useEffect(() => {
    if (!looped || !playing) return;
    const node = passageRef.current;
    if (!node) return;

    let raf = 0;
    let last = "";
    const tick = () => {
      const spot = passageSpot(frameRef.current, standRef.current);
      const key = spot ? `${spot.x},${spot.y}` : "away";
      if (key !== last) {
        last = key;
        node.dataset.away = spot ? "false" : "true";
        if (spot) {
          node.style.setProperty("--cue-x", `${spot.x}px`);
          node.style.setProperty("--cue-y", `${spot.y}px`);
        }
      }
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(raf);
      node.dataset.away = "false";
    };
  }, [looped, playing]);

  /**
   * Opens a score, reveals the mixer and marks the passage. Gives up quietly at any
   * step.
   *
   * The passage is marked last and only once the app has finished loading — `#loading`
   * goes back to hidden after the engine and the engraver exist — because
   * `setLoopBars` needs both to draw anything. The transport appears before either, so
   * "the transport is up" is the wrong moment for it, and was measured to be.
   */
  const drive = useCallback(async () => {
    const frame = frameRef.current;
    const doc = frame?.contentDocument;
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

      const ready = await until(() => {
        const loading = doc.querySelector<HTMLElement>(HOOKS.loading);
        return Boolean(loading?.hidden && appIn(frame)?.renderer);
      }, 8000);

      /* Marked before playback starts rather than after, so the first pass round is
         already looping and there is no gap to notice. If the entry point has gone, the
         plain loop toggle still keeps the nine bars going round. */
      if (ready && stagePassage(frame)) {
        setLooped(true);
      } else {
        const loop = doc.querySelector<HTMLElement>(HOOKS.loop);
        if (loop && loop.getAttribute("aria-pressed") !== "true") loop.click();
      }
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
      data-playing={playing}
      data-beat={beat}
      data-lap="0"
    >
      <div className="choir-rehearsal">
        <ScoreLeaf side="left" part="Alto" />
        <ScoreLeaf side="right" part="Tenor" />

        {/* The four voices, in the score's own colours, moving with the mix.
            `--v` is declared here rather than by four `nth-child` rules in the stylesheet
            so that a row carries its own band: the fallback of 0 is what makes the whole
            rack inert before anything is playing and when the analyser could not be
            reached at all. See `tapVoices`. Each disc settles onto a short stave of its
            own as the score opens — the stylesheet draws it — and lifts off it by however
            hard that voice is singing. */}
        <ol className="choir-part-cues" aria-hidden="true">
          {PARTS.map((part, order) => (
            <li
              key={part.name}
              style={
                {
                  "--part": order,
                  "--part-color": part.color,
                  "--v": `var(--v-${part.voice}, 0)`,
                } as React.CSSProperties
              }
            >
              <b>{part.initial}</b>
              <span>{part.name}</span>
            </li>
          ))}
        </ol>

        {/* Where the ripples come from.
            One origin per voice, positioned by the stylesheet to sit under that voice's
            disc, so the two stay together without either knowing the other's
            coordinates. `tapVoices` appends a ring into one of these when it hears that
            voice attack, and the count-in appends a smaller one per beat; the animation
            and the removal are handled by `ripple`.

            This layer sits behind the stand rather than over it. A ripple crossing the
            score would be something drawn on top of the application, which is the one
            thing this pod is careful not to do — the point is that the room reacts, not
            that the frame gets decorated. */}
        <div className="choir-ripples" aria-hidden="true">
          {PARTS.map((part) => (
            <span
              key={part.name}
              className="choir-ripple-origin"
              data-voice={part.voice}
              style={{ "--part-color": part.color } as React.CSSProperties}
            />
          ))}
        </div>

        <svg className="choir-acoustics" viewBox="0 0 1200 700" aria-hidden="true">
          <path d="M160 420 Q600 70 1040 420" />
          <path d="M230 470 Q600 170 970 470" />
          <path d="M315 515 Q600 275 885 515" />
        </svg>

        <div className="choir-stand" ref={standRef}>
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
              and it does not scroll. Clicking hands the app over, and that is permanent:
              `chainScroll` keeps the page scrollable from then on, so there is nothing
              left for a second shield to protect against.

              It goes the instant it is clicked, which is two seconds before any sound:
              what fills those two seconds is the application's own count-in, in the
              middle of the score, and the shield leaving at once is what lets it be
              seen. */}
          {mounted && (
            <div
              className="choir-shield"
              data-engaged={engaged}
              /* One click does both jobs: hands the app the wheel and starts the
                 piece. Two clicks to hear anything — one on the shield, one on a Play
                 button the visitor had to go and find — was reported, and it was never
                 a decision, just the shield and the transport not knowing about each
                 other. */
              onClick={() => {
                setEngaged(true);
                startPlayback(frameRef.current);
              }}
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
                  {/* "Click to play", and nothing about scrolling.
                      It read "Click to play — scrolling still moves the page", which is
                      an apology for a bug that no longer exists. Scrolling moving the
                      page is what a visitor already expects; saying so out loud only
                      raises the question of why it might not. */}
                  {opened ? "Play the score" : "Opening a score…"}
                </span>
              </div>
            </div>
          )}

          {/* The leader lines onto the application's own controls. See `CUES` for what
              each says and why it sits where it does, and `findSpot` for why they point
              rather than duplicate.

              There was a second button here once — "Sing into it / your browser will ask
              for the microphone" — and both halves were wrong. The permission line was
              the pod apologising in advance for something every site does, and a
              duplicate control means a visitor who finds the real one in the transport
              has no idea the two are the same thing. A label with a leader line teaches
              where the feature lives; a button hides it. */}
          {CUES.map((cue) => {
            const spot = spots[cue.id];
            if (!showing(cue)) return null;
            /* Three of these exist only once their control has been measured. The
               passage's is different, because its subject moves: the band can be out of
               reach at the moment it is first measured — wholly under the zoom pill at a
               narrow frame, or behind the part-name gutter mid-pass — and the frame loop
               that would find it once it comes back only runs on an element that exists.
               So it is rendered from the moment the band is drawn, hidden by `data-away`
               until there is somewhere to point. */
            if (!spot && cue.id !== "passage") return null;
            return (
              <span
                key={cue.id}
                ref={cue.id === "passage" ? passageRef : undefined}
                className="choir-cue"
                data-cue={cue.id}
                data-side={cue.side}
                data-away={spot ? "false" : "true"}
                style={
                  spot
                    ? ({ "--cue-x": `${spot.x}px`, "--cue-y": `${spot.y}px` } as React.CSSProperties)
                    : undefined
                }
                aria-hidden="true"
              >
                <b>{cue.text}</b>
                <i className="choir-cue-line" />
              </span>
            );
          })}

          {/* The stand's ledge, and on it the application's bar ruler, echoed.
              The app draws a ruler of bar numbers along the top of its score, with the
              passage being rehearsed as a tinted band on it and a handle at each end.
              This is the same ruler — all nine bars of the score — on the ledge under
              the score: the looped bars take the app's own loop ink once the pod has
              marked them, and the bar the transport is in is lit as the music moves, so
              the loop going round can be read outside the frame as well as in it. The
              attributes are written by the two effects above. It stood in the section's
              margin once, and the right-hand manuscript leaf covered it. */}
          <span className="choir-stand-lip" aria-hidden="true">
            <span className="choir-ledger">
              <small>bar</small>
              {Array.from({ length: PASSAGE.bars }, (_, index) => (
                <i key={index}>{index + 1}</i>
              ))}
            </span>
          </span>
        </div>
        <span className="choir-stand-base" aria-hidden="true" />
      </div>

      {/* The same cues as chips, for the widths where a leader line has nowhere to go.
          Shown by the stylesheet below 760px and hidden above it; the leader lines do
          the reverse. See the note on `CUES`. */}
      {CUES.some(showing) && (
        <div className="choir-cue-row" aria-hidden="true">
          {CUES.filter(showing).map((cue) => (
            <span key={cue.id} className="choir-chip" data-cue={cue.id}>
              <i />
              {cue.text}
            </span>
          ))}
        </div>
      )}

      {/* No footnote. It said "The real application, from /demos/choir/. Click the score
          and it sings all four parts." — a build path printed at a visitor, followed by
          the same instruction the shield gives and the same claim the invitation above the
          frame already makes. Its loading state was covered by the shield's own "Opening a
          score…" too. */}
    </div>
  );
}
