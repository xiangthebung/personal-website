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
 * It respects `prefers-reduced-motion` by holding one frame — the beat the demo
 * nominates as the one that carries the argument — instead of looping. That is a
 * deliberate choice over freezing at the first beat, which for most of these is the
 * "before" picture, i.e. exactly the wrong still to leave up.
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
  /** True when a single frame has been placed and nothing will move. */
  readonly still: boolean;
}

export interface StoryboardOptions<Name extends string> {
  /** The scene advances only while this is true. */
  readonly running: boolean;
  /** Written to as `--beat-t`, every frame, without re-rendering. */
  readonly stage?: RefObject<HTMLElement | null>;
  /**
   * The beat to hold for someone who asked for reduced motion. Should be the beat
   * that makes the project's point, not the first one.
   */
  readonly stillBeat?: Name;
  /** Pause between the last beat and starting over. */
  readonly loopGapMs?: number;
}

/** Total run time of a storyboard. Used by the tests to keep loops watchable. */
export function sceneDuration(beats: readonly Beat[]): number {
  return beats.reduce((total, beat) => total + beat.ms, 0);
}

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

  /* Read once on mount rather than subscribed to. Someone flipping the setting
     mid-scroll is not worth a listener, and the next mount picks it up. */
  const reduced = useRef(false);
  useEffect(() => {
    reduced.current =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  /* The scene's origin in animation-frame time. Held in a ref so the cleanup can
     clear it, which is what makes re-entry restart the story from the top. */
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;

    if (reduced.current) {
      const found = beats.findIndex((beat) => beat.name === stillBeat);
      const index = found >= 0 ? found : beats.length - 1;
      stage?.current?.style.setProperty("--beat-t", "1");
      /* One frame, then nothing moves again. Deliberately after mount: reading the
         media query during render would make the server and the client disagree. */
      setState({ beat: beats[index].name, index, run: 0, still: true });
      return;
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
  }, [running, beats, stage, stillBeat, loopGapMs]);

  return state;
}
