"use client";

/**
 * Night Neutralizer, as the same ten seconds of film run twice.
 *
 * The pitch is a complaint everyone recognises: at midnight the quiet scenes are
 * too dark to see and the loud ones are loud enough to wake the house, and turning
 * either knob makes the other worse. A screenshot cannot say that. Two panels
 * playing the same shot can, because the argument is a comparison and a comparison
 * needs both halves on screen at once.
 *
 * One panel is the shot as it shipped, the other is the shot through the extension, and
 * they are labelled Before and After — which is also how the captions refer to them,
 * because the split stacks on a narrow screen and "left" stops being true. The scene
 * goes dark, someone says something quietly, and then something explodes: Before blows
 * out to flat white and its meter slams into the red, After keeps the shape of the blast
 * and stays under a ceiling.
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
import { useSectionBeat } from "../scene/section-beat";
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

/**
 * Six beats, ten and a half seconds.
 *
 * Every beat in this scene asks for a *comparison* — two panels, and the difference
 * between them is the whole product — and a comparison takes about twice as long to
 * make as a change takes to notice. The eye has to go left, go right, and come back.
 * At 1.7s `boom` was showing the most important frame on the page for less time than
 * that round trip, and `settle` was shorter than the 1.5s fade the stylesheet runs
 * across it, so the shot was still moving when the beat ended.
 *
 * The cut in the middle is the exception and stays a cut.
 */
const BEATS: readonly Beat<BeatName>[] = [
  // Two dark panels and four labels. Nothing is happening yet, on purpose: this is
  // where a visitor works out that they are looking at the same shot twice.
  { name: "night", ms: 2400 },
  // The subtitle and the level meter beside it, which is a second comparison inside
  // the first one.
  { name: "whisper", ms: 2100 },
  // A cut is a cut. It should feel like an assault — but the white flash it fires is
  // a 190ms transition, so anything under about 300ms cut off its own punch.
  { name: "blast", ms: 300 },
  // The frame the whole section exists to produce: one panel blown to white with its
  // meter pinned, one panel intact under a ceiling.
  { name: "boom", ms: 2400 },
  // Longer than the 1400–1500ms fades the stylesheet runs on the fire and the spill,
  // so the room is actually back to dark before the beat is over.
  { name: "settle", ms: 2300 },
  { name: "hold", ms: 1200 },
];

/**
 * The line of dialogue nobody can hear.
 *
 * This was "…we should not be here.", and it was asked about — which is the whole
 * problem with it. Dropped into a portfolio with nothing around it to say "this is a
 * subtitle of the shot above", an ominous sentence fragment just reads as a stray
 * string, and a visitor spends their attention wondering what it means instead of
 * noticing that they cannot hear it.
 *
 * Two changes. The line is now plainly mundane film dialogue — nobody wonders what a
 * missed phone call is a metaphor for — and it is set with a speaker dash beside a
 * level meter that shows *why* it is a subtitle: the sound is at the bottom of its
 * range. The explosion then pins the same meter. The volume war stops being something
 * the caption claims and becomes something on screen.
 */
const SUBTITLE: Partial<Record<BeatName, string>> = {
  whisper: "— I said I'd call you when we landed.",
};

/**
 * What is making noise, and how much of it.
 *
 * `level` drives the meter beside the subtitle. The pair is the argument in miniature:
 * dialogue mixed so low you would reach for the volume, and then an explosion on the
 * same setting.
 */
const SOUND: Partial<Record<BeatName, { level: "low" | "peak"; what: string }>> = {
  whisper: { level: "low", what: "dialogue" },
  blast: { level: "peak", what: "explosion" },
  boom: { level: "peak", what: "explosion" },
};

const VOL_BARS = 7;

/**
 * The caption, one line per beat.
 *
 * There were two: one for the explosion, one for everything else. Both were written
 * for somebody who already knows what a transfer curve and a limiter ceiling are —
 * "the transfer curve separates shadow detail before it rolls off the highlights" is
 * a sentence about the mechanism, and the panels underneath were already showing the
 * mechanism. What they were not saying was the plain thing: these are the same shot,
 * and one of them you can see.
 *
 * So the numbers stay where they belong, under each panel, where they are derived from
 * the extension's own `describeVideoEffect`. The caption's job is to say which frame
 * this is. One line each: the stylesheet reserves `min-height: 1.5em`, so a caption
 * that wraps shifts the panels above it.
 */
/* Named by their labels rather than by their positions. These said "left" and "right",
   which is true at a desktop width and false on a phone, where the split stacks and
   "left blows out to white" points at a panel that is above rather than beside. Using
   the words already printed on the two panels — Before and After — is correct in both
   layouts and saves the reader working out which is which. */
const CAPTION: Record<BeatName, readonly [string, string]> = {
  night: ["The same night shot, twice.", "One before the extension, one after it."],
  whisper: ["Someone speaks, quietly.", "The meter beside the line barely moves."],
  blast: ["Then something explodes.", ""],
  boom: ["Before blows out to white and its meter pins.", "After holds the shape of it."],
  settle: ["Back to the dark.", "After still has a room in it. Before has black."],
  hold: ["One film, one volume setting.", "One of them you can watch at midnight."],
};

/** Level meter. Fourteen segments, with a limiter ceiling above the ninth. */
const SEGMENTS = 14;

/**
 * Where the ceiling sits, and therefore which segments are the problem.
 *
 * One constant rather than two, because the ceiling line and the red segments are the
 * same statement. They were separate: the line was drawn at `9 / 14` and the red
 * started at `SEGMENTS - 3`, i.e. 11 — so segments 9 and 10 were above the limiter's
 * ceiling and coloured a reassuring green. The untreated meter therefore pinned at
 * maximum showing three red segments out of fourteen, which is not what "peaks at
 * maximum" looks like, and the treated meter's advantage was two segments narrower
 * than it actually is.
 */
const CEILING = 9;

function Meter({ treated }: { treated: boolean }) {
  return (
    <div className="nn-meter" data-treated={treated} aria-hidden="true">
      {Array.from({ length: SEGMENTS }, (_, index) => (
        <span
          className="nn-seg"
          key={index}
          style={{ "--seg": index } as React.CSSProperties}
          data-hot={index >= CEILING}
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

  // The room, bloom and audio trace behind the demo share this exact state.
  useSectionBeat(stageRef, beat, BEATS);

  return (
    <div
      className="nn"
      ref={stageRef}
      data-beat={beat}
      data-lap={run}
      role="img"
      /* Also free of "left" and "right", for the same reason the captions are, plus one
         that only applies here: the two panels stack on a narrow screen, and a screen
         reader user has no way of knowing which layout they are being described. */
      aria-label={
        "The same night-time shot twice, labelled before and after. Before: the room " +
        "is too dark to make anything out, and an explosion outside the window blows " +
        "the picture to flat white and drives the level meter into the red. After, " +
        "through Night Neutralizer: the same room shows a bookcase, a clock, a plant " +
        "and a rug, and the same explosion keeps the shape of its fireball and stays " +
        "under a volume ceiling."
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
        {/* "Before" and "After", not "As shipped" and "Night Neutralizer".
            The old pair was accurate and made the reader work: "as shipped" is
            industry shorthand, and putting the product's name on the right half
            meant the two labels were not even the same kind of thing, so nothing
            told you at a glance which one you were supposed to prefer. */}
        {/* The small notes beside each label used to be "peaks at 0 dB" and
            "strength 45" — a measurement in units a visitor may not read, paired with
            a slider position for a slider that is not on screen. They are the same
            kind of statement now, both about the thing the meters are doing, so the
            pair can be compared without knowing what 0 dB is. The strength figure was
            the only casualty and it was not carrying its space: nothing here lets you
            change it. */}
        <section className="nn-panel">
          <p className="nn-label">
            <span>Before</span>
            <small data-alarm>peaks at maximum</small>
          </p>
          <div className="nn-panel-body">
            <NightFrame treated={false} />
            <Meter treated={false} />
          </div>
          <p className="nn-reading">Shadows crushed · highlights clipped</p>
        </section>

        <section className="nn-panel">
          <p className="nn-label">
            <span>After</span>
            <small>held under a ceiling</small>
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

      {/* The subtitle row: what is being said, and how loud it is.
          The meter is what makes the line legible as a subtitle rather than as a
          sentence the page decided to print. */}
      <div
        className="nn-subrow"
        data-showing={Boolean(SUBTITLE[beat] || SOUND[beat])}
        aria-hidden="true"
      >
        <span className="nn-vol" data-level={SOUND[beat]?.level ?? "low"}>
          <span className="nn-vol-bars">
            {Array.from({ length: VOL_BARS }, (_, index) => (
              <i key={index} style={{ "--vol": index } as React.CSSProperties} />
            ))}
          </span>
          <small>{SOUND[beat]?.what ?? ""}</small>
        </span>

        <p className="nn-sub" data-showing={Boolean(SUBTITLE[beat])}>
          {SUBTITLE[beat] ?? ""}
        </p>
      </div>

      <p className="nn-caption" aria-hidden="true">
        <strong>{CAPTION[beat][0]}</strong>
        {CAPTION[beat][1] && ` ${CAPTION[beat][1]}`}
      </p>
    </div>
  );
}
