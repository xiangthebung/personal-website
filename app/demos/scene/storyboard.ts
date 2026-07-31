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
 * `stillBeat` survives the removal and is still declared by every scene, because it
 * is the seam a real on-page control would use: each scene has already nominated
 * the one frame that carries its argument. Nothing reads it at the moment.
 */

import { useEffect, useRef, useState, type RefObject } from "react";

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
   * Nothing reads it at the moment — it drove the reduced-motion still, which has
   * been removed. It stays declared, and stays declared by every scene, because
   * choosing that frame is the hard part and the choices are worth keeping: an
   * on-page motion control, a poster frame or an OG image would all want them.
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- see `stillBeat`.
  { running, stage, stillBeat, loopGapMs = 1100 }: StoryboardOptions<Name>,
): SceneState<Name> {
  const [state, setState] = useState<SceneState<Name>>(() => ({
    beat: beats[0].name,
    index: 0,
    run: 0,
    still: false,
  }));

  /* The scene's origin in animation-frame time. Held in a ref so the cleanup can
     clear it, which is what makes re-entry restart the story from the top. */
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;

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
  }, [running, beats, stage, loopGapMs]);

  return state;
}
