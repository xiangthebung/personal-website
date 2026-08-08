"use client";

/**
 * The clock behind every vignette on this page.
 *
 * The demos here are not interfaces you operate. They are short films — a phantom
 * cursor reaches for a button, something happens, and the point lands — and a film
 * needs a timeline rather than event handlers. So each demo declares its beats as
 * data, this hook advances through them, and the markup renders whatever the
 * current beat says. That keeps the interesting part of a demo readable as a
 * storyboard instead of scattered across a dozen `setTimeout` calls.
 *
 * Four properties are worth the design:
 *
 * It never runs off screen. Six animated scenes on one page would otherwise burn a
 * phone battery for the five of them nobody is looking at.
 *
 * It restarts from the top rather than resuming. A vignette caught halfway makes no
 * sense to someone who just arrived, so scrolling away and back replays the story
 * from the beginning.
 *
 * React re-renders once per beat, not once per frame. Continuous motion is CSS's
 * job: the hook writes the fraction through the current beat onto the stage element
 * as `--beat-t`, and animation is driven from `data-beat` transitions and keyframes.
 * A six-scene page that re-rendered every scene every frame would be a page that
 * makes a laptop fan audible.
 *
 * It used to read `prefers-reduced-motion` and hold a single frame instead of
 * looping. It no longer does, deliberately — see the "Motion" note in
 * `globals.css`. A visitor whose machine reports `reduce` got seven captioned
 * stills describing motion that never arrived, and on Windows that setting is
 * turned on by performance options, battery savers and remote sessions rather than
 * by anyone choosing it.
 *
 * The still frame is back, and it is now reached the way that note said it should be:
 * by a control on the page a visitor can find and press. `stillBeat` was declared by
 * every scene the whole time it was going unread — each had already nominated the one
 * frame that carries its argument — so plugging the control in was a matter of reading
 * what was already there. See `demos/scene/hold.ts` for the control's other half, and
 * `.dock-hold` in the stylesheet for the button.
 *
 * Held is not paused. Pausing would stop each scene wherever it happened to be, which
 * for six of the seven is a transitional frame that argues nothing — a cursor halfway
 * to a button, a card mid-flight. Held jumps to the frame the scene was built around
 * and leaves every accumulated label up, so the page becomes a set of annotated
 * diagrams rather than a set of freeze-frames.
 */

import {
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { useHeld } from "./hold";

export interface Beat<Name extends string = string> {
  /** Referenced by the markup, the stylesheet and the tests. */
  readonly name: Name;
  /** How long this beat holds, in milliseconds. */
  readonly ms: number;
}

export interface SceneState<Name extends string = string> {
  /** The beat now showing. */
  readonly beat: Name;
  /** Its index, so markup can use `>=` for states that accumulate. */
  readonly index: number;
  /** How many times the scene has played, for use as a React key to restart CSS. */
  readonly run: number;
  /**
   * True when a single frame has been placed and nothing will move.
   *
   * Always false now that the reduced-motion path is gone. Kept because the scenes
   * gate their phantom cursor on it — a cursor reaching for a button in a frozen
   * frame is a cursor stranded mid-air — and that is exactly the behaviour an
   * on-page motion control would need back.
   */
  readonly still: boolean;
}

export interface StoryboardOptions<Name extends string> {
  /** The scene advances only while this is true. */
  readonly running: boolean;
  /** Written to as `--beat-t`, every frame, without re-rendering. */
  readonly stage?: RefObject<HTMLElement | null>;
  /**
   * The one frame that carries this scene's argument.
   *
   * Read by the hold control: pressing it places this frame and stops the clock. A
   * scene that does not name one holds its last beat instead, which is the closest
   * thing to an argument frame a storyboard has by default — every scene on this page
   * is built to end on its point.
   */
  readonly stillBeat?: Name;
  /** Pause between the last beat and starting over. */
  readonly loopGapMs?: number;
}

/** Total run time of a storyboard. Used by the tests to keep loops watchable. */
export function sceneDuration(beats: readonly Beat[]): number {
  return beats.reduce((total, beat) => total + beat.ms, 0);
}

/**
 * The shortest time any line of caption may be on screen.
 *
 * Beat durations answer "how long does this movement take". Caption durations answer
 * "how long does it take to read this". Those are different questions, and every scene
 * on this page was answering the second with the first — one line of prose per beat,
 * including beats sized for a 320ms button press or a 600ms cursor glide. Measured
 * across the seven scenes, twenty-one captions were on screen for under 1.4 seconds and
 * six of those carried nine words or more. The worst asked for 771 words a minute;
 * comfortable silent reading is 200 to 250.
 *
 * The fix is not slower beats — that would make every scene sag in the middle. It is
 * that a caption may span several beats. A scene groups its transitional beats under
 * the line belonging to the beat they lead into, by giving them the *identical* caption
 * text, and the reader gets the sum of their durations. Nothing flickers, because
 * identical text renders identically and no caption element on this page has an
 * entrance animation.
 *
 * `tests/rendered-html.test.mjs` enforces this by reading the beat lists and caption
 * maps back out of the source and computing the dwell of every group. It deliberately
 * does not count the 1100ms loop gap, which would otherwise excuse whatever the final
 * beat happens to be.
 */
export const MIN_CAPTION_MS = 1400;

export function useStoryboard<Name extends string>(
  beats: readonly Beat<Name>[],
  { running, stage, stillBeat, loopGapMs = 1100 }: StoryboardOptions<Name>,
): SceneState<Name> {
  const [state, setState] = useState<SceneState<Name>>(() => ({
    beat: beats[0].name,
    index: 0,
    run: 0,
    still: false,
  }));
  const held = useHeld();

  /* The scene's origin in animation-frame time. Held in a ref so the cleanup can
     clear it, which is what makes re-entry restart the story from the top. */
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;

    /* Held: place the argument frame and stop asking for animation frames.
       `--beat-t` goes to 1 so anything reading the fraction lands on the end of that
       beat rather than freezing at whatever fraction the last tick happened to write.

       The index falls back to the last beat rather than the first: a storyboard that
       has not nominated a still is one whose point is where it ends.

       `run` is deliberately carried over rather than bumped. Scenes key their heavier
       layers on it — `key={`deluge-${run}`}` in Decaf, and others like it — so bumping
       it tears the layer down and builds a fresh one, which arrives at the still frame
       having never played the motion that frame is the end of. Decaf is the clearest
       case: its forty-two rewards are supposed to be caught by the extension and drain
       away where they hang, and a remounted layer has nothing to drain. Keeping `run`
       lets the scene glide from wherever it actually is into the frame it is being
       asked to hold, which is both better looking and the honest version.

       And a held film is not only parked, it is in your hands: drag across the stage
       and the storyboard scrubs, left edge to right edge mapping the first beat to the
       last. A running scene is a film, and films are watched; a held scene is a strip
       of frames, and a strip of frames is a thing you crank through at your own pace,
       backwards included. The state a scrub writes is exactly the state the clock
       would have written at that elapsed time, so a scrubbed frame is never a new
       claim — it is a frame the film already contains. The phantom cursor stays hidden
       throughout (`still` is set, and every scene gates its cursor on it), which is
       right twice over: a hand frozen mid-reach reads as a fault, and the hand doing
       the scrubbing is the visitor's own. */
    if (held) {
      const node = stage?.current ?? null;
      const total = sceneDuration(beats);
      /* Where the scrub is now. Kept here rather than read back off React state,
         because a keypress has to act on the frame currently shown and a state read
         inside a handler registered once would be a stale closure over the first. */
      let heldIndex = 0;

      const placeAt = (elapsed: number) => {
        let cursor = 0;
        let index = beats.length - 1;
        let progress = 1;
        for (let i = 0; i < beats.length; i++) {
          const end = cursor + beats[i].ms;
          if (elapsed < end) {
            index = i;
            progress = (elapsed - cursor) / beats[i].ms;
            break;
          }
          cursor = end;
        }
        heldIndex = index;
        node?.style.setProperty("--beat-t", progress.toFixed(4));
        setState((previous) =>
          previous.index === index && previous.still
            ? previous
            : { beat: beats[index].name, index, run: previous.run, still: true },
        );
      };

      const nominated = stillBeat
        ? beats.findIndex((beat) => beat.name === stillBeat)
        : -1;
      placeAt(
        nominated >= 0
          ? beats.slice(0, nominated + 1).reduce((sum, beat) => sum + beat.ms, 0) - 1
          : total - 1,
      );

      if (!node) return;

      /* Absolute, not relative: the stage is the timeline while the film is held.
         Down anywhere seeks there at once, which is what makes the mapping teachable
         in one touch. Clamped a hair under the end so the right edge shows the last
         beat's own frame rather than a wrapped start. */
      const seek = (clientX: number) => {
        const rect = node.getBoundingClientRect();
        if (rect.width <= 0) return;
        const fraction = Math.min(0.9999, Math.max(0, (clientX - rect.left) / rect.width));
        placeAt(fraction * total);
      };

      let scrubbing = false;
      const down = (event: PointerEvent) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        scrubbing = true;
        node.setPointerCapture(event.pointerId);
        seek(event.clientX);
        // Blocks text selection only; vertical panning survives via touch-action.
        event.preventDefault();
      };
      const move = (event: PointerEvent) => {
        if (scrubbing) seek(event.clientX);
      };
      const up = (event: PointerEvent) => {
        scrubbing = false;
        if (node.hasPointerCapture(event.pointerId)) {
          node.releasePointerCapture(event.pointerId);
        }
      };

      /* The same thing from the keyboard, because a drag is not something everyone can
         do and this was pointer-only when it shipped. A held stage takes focus and
         steps a beat at a time on the arrows, jumping to either end on Home and End —
         the shape of every scrubber and slider a browser already has, so nothing has
         to be explained. Beats rather than pixels: the beat is the unit the storyboard
         is written in, and stepping one lands on a frame the film was composed around
         rather than somewhere between two of them. */
      const stepTo = (index: number) => {
        const clamped = Math.max(0, Math.min(beats.length - 1, index));
        const start = beats.slice(0, clamped).reduce((sum, beat) => sum + beat.ms, 0);
        // A hair inside the beat, so the frame shown is that beat's own.
        placeAt(start + Math.max(0, beats[clamped].ms - 1));
      };

      const keys = (event: KeyboardEvent) => {
        switch (event.key) {
          case "ArrowLeft": stepTo(heldIndex - 1); break;
          case "ArrowRight": stepTo(heldIndex + 1); break;
          case "Home": stepTo(0); break;
          case "End": stepTo(beats.length - 1); break;
          default: return;
        }
        // Only once a key we handle has actually been handled, so PageUp and the
        // space bar still scroll the page from inside a focused stage.
        event.preventDefault();
      };

      /* A sideways gesture is the scrub; a vertical one must stay the page's. Same
         contract as the gallery rail, and set inline because the seven stages share
         no class for a stylesheet rule to hang on. */
      const previousTouchAction = node.style.touchAction;
      const previousTabIndex = node.getAttribute("tabindex");
      const previousLabel = node.getAttribute("aria-label");
      node.style.touchAction = "pan-y";
      node.tabIndex = 0;
      /* Appended, not replacing. Several stages carry a written description of what
         the scene shows — the one thing a listener cannot get any other way — and
         swapping it for a sentence about arrow keys would trade the content for its
         controls. */
      const heldHint = "Held. Arrow keys step through it a frame at a time.";
      node.setAttribute(
        "aria-label",
        previousLabel ? `${previousLabel} ${heldHint}` : heldHint,
      );

      node.addEventListener("pointerdown", down);
      node.addEventListener("pointermove", move);
      node.addEventListener("pointerup", up);
      node.addEventListener("pointercancel", up);
      node.addEventListener("keydown", keys);

      return () => {
        node.removeEventListener("pointerdown", down);
        node.removeEventListener("pointermove", move);
        node.removeEventListener("pointerup", up);
        node.removeEventListener("pointercancel", up);
        node.removeEventListener("keydown", keys);
        /* Handed back exactly as found. A stage left focusable once the film is
           running again is a tab stop that does nothing. */
        if (previousTabIndex === null) node.removeAttribute("tabindex");
        else node.setAttribute("tabindex", previousTabIndex);
        if (previousLabel === null) node.removeAttribute("aria-label");
        else node.setAttribute("aria-label", previousLabel);
        node.style.touchAction = previousTouchAction;
      };
    }

    const total = sceneDuration(beats) + loopGapMs;
    let frame = requestAnimationFrame(function tick(now) {
      startRef.current ??= now;
      const since = now - startRef.current;
      const run = Math.floor(since / total);
      const elapsed = since % total;

      let cursor = 0;
      let index = beats.length - 1;
      let progress = 1;
      for (let i = 0; i < beats.length; i++) {
        const end = cursor + beats[i].ms;
        if (elapsed < end) {
          index = i;
          progress = (elapsed - cursor) / beats[i].ms;
          break;
        }
        cursor = end;
      }

      // Every frame, but only on the DOM node — no React work.
      stage?.current?.style.setProperty("--beat-t", progress.toFixed(4));

      setState((previous) =>
        previous.index === index && previous.run === run && !previous.still
          ? previous
          : { beat: beats[index].name, index, run, still: false },
      );

      frame = requestAnimationFrame(tick);
    });

    return () => {
      cancelAnimationFrame(frame);
      startRef.current = null;
    };
  }, [running, beats, stage, loopGapMs, held, stillBeat]);

  return state;
}
