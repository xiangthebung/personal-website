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
 * It reads the transport's state before pressing, because `#play-btn` is a toggle and
 * the shield can be re-armed by scrolling away and back. Without the check, a second
 * visit to the section would have clicked *pause* on a rehearsal already in progress.
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

/**
 * Starts the piece, if it is not already going.
 *
 * Called from the shield's click and nowhere else, so the music only ever begins on a
 * gesture that was a request for this application. The guard is what makes the shield
 * re-armable: scroll away, come back, click again, and this does nothing rather than
 * pausing what is already playing.
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
  };
}

function askForMicrophone(frame: HTMLIFrameElement | null): boolean {
  const doc = frame?.contentDocument;
  if (!doc) return false;
  try {
    const button = doc.querySelector<HTMLElement>(HOOKS.mic);
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
  /** Whether the app is actually making sound, read off its own transport. */
  const [playing, setPlaying] = useState(false);

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
      data-playing={playing}
      data-beat={playing ? "singing" : opened ? "score" : "loading"}
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
                  {opened
                    ? "Click to play — scrolling still moves the page"
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
              The real application, from <code>/demos/choir/</code>. Click the score and
              it sings all four parts.
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
