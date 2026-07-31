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
 * The cost is length: nine bars across two tempi is about twenty seconds, where the
 * Stanford ran for minutes. So the pod turns the app's own loop on once the score is
 * up (see `HOOKS.loop`), which is what keeps the voice meters alive for as long as
 * somebody is watching instead of letting them fall flat mid-visit.
 */
const SCORE = "Happy Birthday.musicxml";

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
   * Needed because the score is nine bars. Without it the piece ends after about
   * twenty seconds and the section goes quiet and still while the visitor is very
   * probably still looking at it — the meters drop, the ripples stop, and the pod
   * reads as broken rather than finished. `aria-pressed` is the app's own published
   * state for it, so this is read the same way `#play-btn`'s label is.
   */
  loop: "#loop-btn",
  /** What `#play-btn` says about itself when a press would *start* playback. */
  idleLabel: "Play",
};

const CHOIR_BEATS = [{ name: "loading" }, { name: "score" }, { name: "singing" }] as const;

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
    /* eslint-disable @typescript-eslint/no-explicit-any -- reaching into a vendored app. */
    const engine = (win as any).choirPracticeApp?.audioEngine;
    const ctx: AudioContext | undefined = engine?.audioContext;
    master = engine?.live?.bus?.master ?? null;
    /* eslint-enable @typescript-eslint/no-explicit-any */
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
     *
     * Plain DOM, appended to the origin the stylesheet has already positioned. No React:
     * this is inside a `requestAnimationFrame` loop whose entire purpose is to avoid a
     * render pass per frame.
     */
    const origins = new Map<string, HTMLElement>();
    for (const node of root.querySelectorAll<HTMLElement>(".choir-ripple-origin")) {
      const voice = node.dataset.voice;
      if (voice) origins.set(voice, node);
    }
    /* Whether this band is currently counted as sounding. */
    const sounding = ranges.map(() => false);

    const ripple = (origin: HTMLElement, strength: number) => {
      // A ceiling, in case a noisy band and an unlucky threshold conspire.
      if (origin.childElementCount >= 3) return;
      const ring = origin.ownerDocument.createElement("i");
      ring.className = "choir-ripple";
      // How far it gets, so a loud entry throws a wider ring than a quiet one.
      ring.style.setProperty("--reach", (0.7 + strength * 0.6).toFixed(2));
      ring.addEventListener("animationend", () => ring.remove(), { once: true });
      // `appendChild`, not `append`: this project's type graph resolves `append` to an
      // overload taking a stream, and the DOM one is not worth arguing with.
      origin.appendChild(ring);
    };

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
            ripple(origin, levels[index]);
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
 * the frame and returns its centre relative to the stand, for the annotation to hang off.
 *
 * Takes the selector from `HOOKS` rather than naming one, which is what a second cue was
 * added for and then removed again. That cue was going to carry the deleted note "turn your
 * part up and the other three down" on a leader line to `#parts-btn` — and `#parts-btn` is
 * `display: none` at every width this pod runs at, measured 0x0. The application only has a
 * trigger for that panel below 900px, where the panel is a modal; above it the panel is a
 * permanent side column, which is why the pod's click on it is already a no-op there.
 *
 * Worth recording because the conclusion is not "find another anchor". The panel is open on
 * screen, headed "Parts", listing Soprano at 100% and the other three at 35% over a control
 * called "Balance". The claim is already in the frame, made by the application, better than
 * a label would make it. The note went and nothing replaced it.
 *
 * Returns null on anything unexpected, and the caller renders nothing — a renamed
 * selector costs a label, not a broken layout.
 */
function findSpot(
  frame: HTMLIFrameElement | null,
  stand: HTMLElement | null,
  selector: string,
): { x: number; y: number } | null {
  const doc = frame?.contentDocument;
  if (!doc || !stand) return null;
  try {
    const button = doc.querySelector<HTMLElement>(selector);
    if (!button) return null;
    const box = button.getBoundingClientRect();
    if (box.width === 0) return null;
    const frameBox = frame.getBoundingClientRect();
    const standBox = stand.getBoundingClientRect();
    return {
      x: Math.round(frameBox.left + box.left + box.width / 2 - standBox.left),
      y: Math.round(frameBox.top + box.top + box.height / 2 - standBox.top),
    };
  } catch {
    return null;
  }
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
  /** Whether the visitor has asked for the app, which is when it gets the wheel. */
  const [engaged, setEngaged] = useState(false);
  /** Whether the app is actually making sound, read off its own transport. */
  const [playing, setPlaying] = useState(false);
  /** Where the app's microphone button is, for the leader line to point at. */
  const [micSpot, setMicSpot] = useState<{ x: number; y: number } | null>(null);
  const standRef = useRef<HTMLDivElement | null>(null);

  /* The surrounding score waits for the real app to finish engraving, and the whole
     section reacts once it starts singing. */
  useSectionBeat(rootRef, playing ? "singing" : opened ? "score" : "loading", CHOIR_BEATS);

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
      setEngaged(false);
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
     exist before then. */
  useEffect(() => {
    if (!opened) return;
    return watchPlayback(frameRef.current, setPlaying) ?? undefined;
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
   * Keeps the leader line on the control it points at.
   *
   * Re-measured on resize because the frame's height follows the window, which moves the
   * transport the button sits in. Not per frame: the button does not move while the piece
   * plays, and a `ResizeObserver` says so for free.
   */
  useEffect(() => {
    if (!playing) return;

    const measure = () => setMicSpot(findSpot(frameRef.current, standRef.current, HOOKS.mic));
    measure();

    const stand = standRef.current;
    if (!stand) return;
    const observer = new ResizeObserver(measure);
    observer.observe(stand);
    return () => observer.disconnect();
  }, [playing]);

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

      /* Loop the whole score, because it is nine bars long. Set before playback
         starts rather than after, so the first pass round is already looping and
         there is no gap to notice. */
      const loop = doc.querySelector<HTMLElement>(HOOKS.loop);
      if (loop && loop.getAttribute("aria-pressed") !== "true") loop.click();

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
      data-playing={playing}
      data-beat={playing ? "singing" : opened ? "score" : "loading"}
      data-lap="0"
    >
      <div className="choir-rehearsal">
        <ScoreLeaf side="left" part="Alto" />
        <ScoreLeaf side="right" part="Tenor" />

        {/* The four voices, in the score's own colours, moving with the mix.
            `--v` is declared here rather than by four `nth-child` rules in the stylesheet
            so that a row carries its own band: the fallback of 0 is what makes the whole
            rack inert before anything is playing and when the analyser could not be
            reached at all. See `tapVoices`. */}
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
            voice attack; the animation and the removal are handled there.

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

              This is also where the microphone button lives now. It used to sit in the
              footnote under the stand, which hit-testing put at y=919 in a 900px
              window — a control nobody would ever see. Over the score it is the first
              thing you look at. */}
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

          {/* Points at the application's own microphone button rather than duplicating
              it.
              There was a second button here — "Sing into it / your browser will ask for
              the microphone" — and both halves were wrong. The permission line was the
              pod apologising in advance for something every site does, and a duplicate
              control means a visitor who finds the real one in the transport has no idea
              the two are the same thing. A label with a leader line teaches where the
              feature lives; a button hides it.

              Only once the piece is playing. Before that the frame's one instruction is
              "Click to play", and two cues competing is how neither gets read. */}
          {playing && micSpot && (
            <span
              className="choir-cue"
              style={
                { "--cue-x": `${micSpot.x}px`, "--cue-y": `${micSpot.y}px` } as React.CSSProperties
              }
              aria-hidden="true"
            >
              <i className="choir-cue-line" />
              {/* "Test your pitch" was the name of a feature. This is what the feature
                  does to you, which is the thing worth knowing and the thing the deleted
                  note beside this scene used to say. Kept short because it reads leftward
                  along the transport row and a long label there covers the other
                  controls. */}
              <b>Sing along: sharp or flat</b>
            </span>
          )}

          {/* There is no second cue on the parts mixer, and the reason is in the note on
              `findSpot`: the panel is already open on screen, headed "Parts", showing
              Soprano at 100% against the other three at 35% under a control called
              "Balance". The application labels that better than a leader line would. */}

          <span className="choir-stand-lip" aria-hidden="true" />
        </div>
        <span className="choir-stand-base" aria-hidden="true" />
      </div>

      {/* No footnote. It said "The real application, from /demos/choir/. Click the score
          and it sings all four parts." — a build path printed at a visitor, followed by
          the same instruction the shield gives and the same claim the invitation above the
          frame already makes. Its loading state was covered by the shield's own "Opening a
          score…" too. */}
    </div>
  );
}
