"use client";

/**
 * Night Neutralizer, as the same eight seconds of film run twice.
 *
 * The pitch is a complaint everyone recognises: at midnight the quiet scenes are
 * too dark to see and the loud ones are loud enough to wake the house, and turning
 * either knob makes the other worse. A screenshot cannot say that. Two panels
 * playing the same shot can, because the argument is a comparison and a comparison
 * needs both halves on screen at once.
 *
 * Left is the shot as it shipped. Right is the shot through the extension. The
 * scene goes dark, someone says something quietly, and then something explodes:
 * the left panel blows out to white and its meter slams into the red, the right
 * panel keeps the shape of the blast and stays under a ceiling.
 *
 * WHAT IS REAL HERE
 *
 * The right panel is not a hand-tuned CSS approximation. It is an SVG
 * `feComponentTransfer` whose 33-entry lookup table comes from `buildToneCurve` in
 * the vendored copy of the extension's own `core/tone-curve.ts` — the same function,
 * producing the same table, feeding the same filter primitive the extension
 * installs on a real `<video>`. The saturation compensation is the extension's
 * figure too, because a curve that opens up shadows desaturates them and the real
 * thing corrects for it.
 *
 * `staticAdaptState` is the honest choice of state. The extension has two modes: it
 * analyses frames when it can, and falls back to a fixed curve when it cannot (DRM,
 * tainted canvas). Nothing is being analysed here, so this uses the fallback rather
 * than pretending to a scene-tracked curve it has not earned.
 *
 * The readings under each panel are `describeVideoEffect` and `describeAudioEffect`,
 * verbatim from `core/readings.ts`.
 *
 * WHAT IS STAGED
 *
 * The film. There is no video file on this site; the shot is a few gradients and
 * silhouettes, composed to have something in the shadows worth being able to see.
 * The meters are not a real audio graph — they are the shape of what the compressor
 * does, not a measurement of it.
 */

import { useRef } from "react";
import { useStoryboard, type Beat } from "../scene/storyboard";
import { useOnScreen } from "../use-on-screen";
import { NightFrame } from "./frame";
import { buildToneCurve, curveToTableValues, staticAdaptState } from "./core/tone-curve";
import { mapVideoStrength } from "./core/strength";
import { describeAudioEffect, describeVideoEffect } from "./core/readings";

/** The extension's default. Not a number picked to make the demo look good. */
const STRENGTH = 45;

/* Computed once, at module scope: with no frame analysis the curve never changes,
   so there is nothing for a render to recompute. */
const VIDEO_PARAMS = mapVideoStrength(STRENGTH);
const TONE_TABLE = curveToTableValues(
  buildToneCurve(VIDEO_PARAMS, staticAdaptState(VIDEO_PARAMS)),
);
const SATURATION = VIDEO_PARAMS.saturation.toFixed(3);
const [VIDEO_READING] = describeVideoEffect(STRENGTH);
const [AUDIO_READING] = describeAudioEffect(STRENGTH, true);

type BeatName = "night" | "whisper" | "blast" | "boom" | "settle" | "hold";

const BEATS: readonly Beat<BeatName>[] = [
  { name: "night", ms: 1900 },
  { name: "whisper", ms: 1500 },
  // A cut is a cut. Two hundred milliseconds, and it should feel like an assault.
  { name: "blast", ms: 220 },
  { name: "boom", ms: 1700 },
  { name: "settle", ms: 1800 },
  { name: "hold", ms: 800 },
];

/** The line of dialogue nobody can hear, and the thing that follows it. */
const SUBTITLE: Partial<Record<BeatName, string>> = {
  whisper: "…we should not be here.",
  blast: "",
  boom: "",
};

/** Level meter. Segment count is the design; the top three are the ones that hurt. */
const SEGMENTS = 14;

function Meter({ treated }: { treated: boolean }) {
  return (
    <div className="nn-meter" data-treated={treated} aria-hidden="true">
      {Array.from({ length: SEGMENTS }, (_, index) => (
        <span
          className="nn-seg"
          key={index}
          style={{ "--seg": index } as React.CSSProperties}
          data-hot={index >= SEGMENTS - 3}
        />
      ))}
      {/* The ceiling the limiter holds. Only the treated side has one. */}
      {treated && <span className="nn-ceiling" />}
    </div>
  );
}

export function NightNeutralizerDemo() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const onScreen = useOnScreen(stageRef);
  const { beat, run } = useStoryboard(BEATS, {
    running: onScreen,
    stage: stageRef,
    // The still that carries the argument: one panel blown out, one panel intact.
    stillBeat: "boom",
  });

  return (
    <div
      className="nn"
      ref={stageRef}
      data-beat={beat}
      data-lap={run}
      role="img"
      aria-label={
        "The same night-time shot side by side. On the left, as the film shipped: " +
        "the dark scene is unreadable and an explosion blows the picture to white " +
        "and the sound into clipping. On the right, through Night Neutralizer: the " +
        "shadows are open and the explosion stays inside the picture and under a " +
        "volume ceiling."
      }
    >
      {/* The extension's real transfer function, as the extension installs it.
          Hidden, zero-sized, referenced by `filter: url(...)` above. */}
      <svg className="nn-defs" aria-hidden="true" focusable="false">
        <defs>
          {/* Shared by both copies of the frame. One set of ids in the document
              rather than two, which is both valid and what the browser would have
              done anyway when resolving duplicate ids. */}
          <linearGradient id="nn-wall" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#05070c" />
            <stop offset="0.55" stopColor="#090d15" />
            <stop offset="1" stopColor="#04060a" />
          </linearGradient>
          <linearGradient id="nn-night-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#151f33" />
            <stop offset="1" stopColor="#0a0f1a" />
          </linearGradient>
          {/* The fireball. A white core with a long graded falloff: the shape a
              display without a shoulder cannot render. */}
          <radialGradient id="nn-fireball" cx="0.42" cy="0.62" r="0.72">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.16" stopColor="#fffbea" />
            <stop offset="0.3" stopColor="#ffe08a" />
            <stop offset="0.48" stopColor="#ff9e2e" />
            <stop offset="0.68" stopColor="#c0430a" />
            <stop offset="1" stopColor="#3a1000" />
          </radialGradient>
          {/* Kept weak on purpose. At half opacity across the whole frame this
              lit the room into a pale fog and the panels stopped looking like
              night, which threw away the premise to sell the explosion. */}
          <radialGradient id="nn-spill" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ffd2a0" stopOpacity="0.3" />
            <stop offset="0.55" stopColor="#ffd2a0" stopOpacity="0.12" />
            <stop offset="1" stopColor="#ffd2a0" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="nn-lamp" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ffce8a" stopOpacity="0.42" />
            <stop offset="1" stopColor="#ffce8a" stopOpacity="0" />
          </radialGradient>

          <filter id="nn-tone-curve" colorInterpolationFilters="sRGB">
            <feComponentTransfer>
              <feFuncR type="table" tableValues={TONE_TABLE} />
              <feFuncG type="table" tableValues={TONE_TABLE} />
              <feFuncB type="table" tableValues={TONE_TABLE} />
            </feComponentTransfer>
            {/* Opening up shadows washes the colour out of them; the extension
                puts it back by exactly this much. */}
            <feColorMatrix type="saturate" values={SATURATION} />
          </filter>
        </defs>
      </svg>

      <div className="nn-split">
        <section className="nn-panel">
          <p className="nn-label">
            <span>As shipped</span>
            <small data-alarm>peaks at 0 dB</small>
          </p>
          <div className="nn-panel-body">
            <NightFrame treated={false} />
            <Meter treated={false} />
          </div>
          <p className="nn-reading">Shadows crushed · highlights clipped</p>
        </section>

        <section className="nn-panel">
          <p className="nn-label">
            <span>Night Neutralizer</span>
            <small>strength {STRENGTH}</small>
          </p>
          <div className="nn-panel-body">
            <NightFrame treated />
            <Meter treated />
          </div>
          <p className="nn-reading">
            {VIDEO_READING} · {AUDIO_READING}
          </p>
        </section>
      </div>

      {/* Subtitles, so the quiet beat has something to be too quiet to hear. */}
      <p className="nn-sub" data-showing={Boolean(SUBTITLE[beat])} aria-hidden="true">
        {SUBTITLE[beat] ?? ""}
      </p>

      <p className="nn-caption" aria-hidden="true">
        {beat === "blast" || beat === "boom" ? (
          <>
            <strong>Same explosion.</strong> One of them woke the house.
          </>
        ) : (
          <>
            <strong>Same shot.</strong> One of them you can actually see.
          </>
        )}
      </p>
    </div>
  );
}
