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
 * and stays out of it.
 *
 * The two panels are not playing at the same volume, and that is the audio argument rather
 * than a hole in it. See `SOUND`.
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
 * The line under both panels is `describeVideoEffect` and `describeAudioEffect`, verbatim
 * from `core/readings.ts` — and it is the only place a number about the extension is
 * quoted, which is why the audio half of it now prints both of the sentences that
 * function returns rather than only the first. The gap between quiet and loud is what
 * this scene is about; leaving it off the page meant the scene's central claim was the
 * one figure the extension's own account of itself did not get to state.
 *
 * WHAT IS STAGED
 *
 * The film. There is no video file on this site; the shot is a few gradients and
 * silhouettes, composed to have something in the shadows worth being able to see.
 * The meters are not a real audio graph — they are the shape of what the compressor
 * does, not a measurement of it.
 *
 * The listener. Which volume a person would have chosen is a premise, not a measurement:
 * `BEFORE_VOLUME` is a guess at what it takes to hear a whispered line on a laptop at
 * midnight. What is *not* a guess is the distance between the two dials — that is the
 * lift the extension applies, converted to a volume setting. See `SOUND`.
 */

import "./demo.css";
import { useRef } from "react";
import { useSectionBeat } from "../scene/section-beat";
import { useStoryboard, type Beat } from "../scene/storyboard";
import { useSceneRun } from "../scene/use-scene-run";
import { useOnScreen } from "../use-on-screen";
import { useSectionFocused } from "../use-section-focus";
import { NightFrame } from "./frame";
import { buildToneCurve, curveToTableValues, staticAdaptState } from "./core/tone-curve";
import { mapVideoStrength } from "./core/strength";
import { describeAudioEffect, describeVideoEffect } from "./core/readings";

/** The extension's default. Not a number picked to make the demo look good. */
const STRENGTH = 45;
/**
 * The other half of the extension's default, and it used to be wrong.
 *
 * `DEFAULT_SETTINGS.nightEq` is `false` in `core/types.ts`. This scene passed `true`, which
 * made it a half-default: the strength above is what the extension ships with, the tone
 * shaping was not, and nothing said so. The two figures then disagreed by 1.8 dB — the
 * page printed a lift of +8 dB for a configuration nobody installing the extension gets,
 * where the real default lifts +9.
 *
 * Both premises are literals rather than reads of `DEFAULT_SETTINGS` because this file's
 * whole method is that the numbers a scene is drawn on are legible next to the table they
 * produce. What stops a literal drifting is not writing it as an expression, it is a test:
 * "the Night Neutralizer scene runs at the extension's own defaults" holds both of these
 * to `DEFAULT_SETTINGS` in the vendored core, so shipping a different default over there
 * fails the build here rather than quietly re-basing the page onto a setting.
 */
const NIGHT_EQ = false;

/* Computed once, at module scope: with no frame analysis the curve never changes,
   so there is nothing for a render to recompute. */
const VIDEO_PARAMS = mapVideoStrength(STRENGTH);
const TONE_TABLE = curveToTableValues(
  buildToneCurve(VIDEO_PARAMS, staticAdaptState(VIDEO_PARAMS)),
);
const SATURATION = VIDEO_PARAMS.saturation.toFixed(3);
const [VIDEO_READING] = describeVideoEffect(STRENGTH);
/* Destructured to two names because `describeAudioEffect` returns two sentences and both
   belong on the page: the second — the loud-to-quiet gap — is the figure every number in
   `SOUND` is built on. The second *argument* is `nightEq`, not a request for both
   sentences; a comment here once implied otherwise, which is how `true` survived in it. */
const [LIFT_READING, GAP_READING] = describeAudioEffect(STRENGTH, NIGHT_EQ);

type BeatName = "night" | "dark" | "whisper" | "blast" | "boom" | "settle" | "hold";

/**
 * Seven beats, thirteen seconds.
 *
 * Every beat in this scene asks for a *comparison* — two panels, and the difference
 * between them is the whole product — and a comparison takes about twice as long to
 * make as a change takes to notice. The eye has to go left, go right, and come back.
 * At 1.7s `boom` was showing the most important frame on the page for less time than
 * that round trip, and `settle` was shorter than the 1.5s fade the stylesheet runs
 * across it, so the shot was still moving when the beat ended.
 *
 * The cut in the middle is the exception and stays a cut.
 *
 * The scene runs the product's four claims in order, one per beat, and each one is a pair
 * of short verdicts under two panels: dark scenes brighter, the dialogue costs less volume
 * to hear, the bang therefore arrives lower, and nothing to adjust. "Loud parts quieter"
 * used to be the third of those and it is not a claim this software can make — see `SOUND`.
 *
 * There was a `look` beat here that drew dashed rings around three objects in the dark and
 * counted them. It was a reading aid for a comparison that was not landing, and it made
 * things worse: a visitor met two dark rectangles covered in dotted boxes and had to work
 * out what the boxes were before they could use them. The comparison did not need
 * scaffolding, it needed an honest exposure and a plain sentence, which is what `dark` is.
 */
const BEATS: readonly Beat<BeatName>[] = [
  // Two dark panels and two labels. Nothing is happening yet, on purpose: this is
  // where a visitor works out that they are looking at the same shot twice.
  { name: "night", ms: 2000 },
  // Claim one, and the one the section is named for. Long enough to look left, look
  // right and come back, which is what any comparison costs.
  { name: "dark", ms: 2600 },
  // Claim two: a line of dialogue printed at the size it sounds, the same size on both
  // panels, over two volume dials that read 30% and 10%. The quietest beat in the scene
  // and the one that needs the longest look, because what differs is a number.
  { name: "whisper", ms: 2800 },
  /* A cut is a cut. It should feel like an assault — but the white flash it fires is
     a 190ms transition, so anything under about 300ms cut off its own punch.
     It shares `boom`'s caption rather than carrying one of its own: 300ms was the
     shortest caption exposure anywhere on the site, and "Then something explodes" is
     the one line on this page that a picture says better than prose can. */
  { name: "blast", ms: 300 },
  // Claim three, and the frame the whole section exists to produce: one panel blown to
  // white with `[EXPLOSION]` at forty pixels and a meter pinned into the red, one panel
  // intact with it at twenty-six and a meter a segment short of the red band.
  { name: "boom", ms: 2600 },
  // Longer than the 1400–1500ms fades the stylesheet runs on the fire and the spill,
  // so the room is actually back to dark before the beat is over.
  { name: "settle", ms: 2000 },
  // Claim four: the summary, which is the sentence a visitor should leave with.
  { name: "hold", ms: 1800 },
];

/**
 * The two volume settings, which are the audio argument.
 *
 * THE THING THIS TABLE USED TO GET WRONG
 *
 * It said the extension lifts a whisper by 17 dB and pulls an explosion down to −9 dB.
 * Neither is true. Run the vendored core: at the extension's defaults — strength 45, night
 * EQ off — a whisper at −45 dBFS comes out at −35.1, and a full-scale peak comes out at
 * −0.087. The peak does not move — not here, and not at any strength; with the EQ off it is
 * −0.6 dB at 70 and −1.2 dB at 100, and the project's own offline render measured −0.18
 * dBFS after a full-scale burst. The extension does not make loud things quieter. It lifts
 * the quiet, which closes the gap, which is the thing that lets *you* turn the volume down.
 *
 * Those two peak figures are the default's. Switching the night EQ on moves them — to −2.0
 * at 70 and −4.7 at 100 — which is still not levelling, but it is a different number, and
 * quoting one configuration's peaks under another's heading is exactly the error this
 * comment was carrying: it opened "with the night EQ on" and then listed the EQ-off column.
 *
 * So the levelling the old table drew — a whisper and an explosion landing within five
 * pixels of each other — was not an exaggeration of the effect, it was a different effect.
 * The real one is 9 dB out of 45: real, and much smaller.
 *
 * WHAT IS DRAWN INSTEAD
 *
 * A one-variable comparison cannot state this product, because the product is not "the
 * soundtrack changes shape". It is "you can turn it down and still hear the dialogue" —
 * two variables, the film and the volume. So the volume is the second variable, and it is
 * per panel rather than shared: both panels are playing at the setting it takes to hear
 * the whispered line, and because the extension has lifted that line by 9 dB, that setting
 * is 9 dB lower on the right.
 *
 * Which lands the whisper at the same size on both panels — that is the constant being
 * held, and it is the promise — and lands the explosion 10 dB down on the right, at a
 * smaller size, on a meter that stays out of the red. Nothing in that frame is the
 * extension turning an explosion down. It is a viewer who could afford to turn the
 * volume down, which is the honest version and the one they would actually experience.
 *
 * HOW THE NUMBERS ARE MADE
 *
 * `film` is the beat's level in the soundtrack itself, in dBFS: the premise.
 *
 * `db` is where that lands in the room, on one scale for both panels, with 0 dB at the
 * untreated panel's peak. So the untreated column is the film's own level, and the treated
 * column is that level through `audioTransferDb` and then through the lower volume.
 *
 * `loud` is the same figure as a fraction from 0 to 1, and it drives everything the eye
 * gets: the size of the printed line, the lit segments on the meter, the solidity of the
 * text. It is `2 ** (db / 10)`, because loudness halves for every 10 dB — which is also,
 * as it happens, the curve the old hand-written table was already on at its untreated end
 * (0.08 at −38 dB, 1 at 0 dB). Only its treated end had left it.
 *
 * Every one of those is checked against the vendored core by "the Night Neutralizer scene
 * still prints what the extension actually does" in `tests/rendered-html.test.mjs`. The
 * table is written out rather than computed so that the premises and the measurements are
 * legible side by side; the test is what stops the measurements drifting again.
 *
 * WHY THE LINE IS PRINTED AT ALL
 *
 * An earlier version of this scene deleted it, and the reasoning was that this page has no
 * audio, so a printed line of dialogue reads identically whether it is whispered or
 * shouted, so it cannot demonstrate anything about volume. Every step of that is true and
 * the conclusion is still wrong: it assumes the only channel available is the words. Set
 * the whisper at nine pixels and the explosion at forty and loudness is on screen, in a
 * form a reader decodes without being told.
 *
 * `[EXPLOSION]` in brackets because that is how a real subtitle track prints a sound that
 * is not speech — so the convention does the work of explaining why a noise has words.
 */
interface Level {
  /** Where this lands in the room, on the shared scale. `""` when there is nothing to read. */
  readonly db: string;
  /** The same figure from 0 to 1: size, meter, opacity. */
  readonly loud: number;
}

interface Cue {
  readonly say: string;
  /** The soundtrack's own level for this beat, in dBFS. Everything else is derived from it. */
  readonly film: number;
  readonly before: Level;
  readonly after: Level;
}

const SOUND: Record<BeatName, Cue> = {
  // Room tone, under the dialogue. No line to print, and the meters idle at one segment
  // rather than sitting dead at zero.
  night: { say: "", film: -48, before: { db: "", loud: 0.04 }, after: { db: "", loud: 0.04 } },
  dark: { say: "", film: -48, before: { db: "", loud: 0.04 }, after: { db: "", loud: 0.04 } },
  /* The same reading on both panels, which is the point: the line is exactly as audible
     on the right, at a volume 9 dB lower. */
  whisper: {
    say: "…did you hear that?",
    film: -45,
    before: { db: "−45 dB", loud: 0.045 },
    after: { db: "−45 dB", loud: 0.045 },
  },
  /* The cut and the frame after it are one event, so they carry one reading. `0 dB` is the
     top of the scale, which is why it is the number that reads as a problem — and the
     treated panel is 10 dB under it because of the dial, not because of a limiter. */
  blast: {
    say: "[EXPLOSION]",
    film: 0,
    before: { db: "0 dB", loud: 1 },
    after: { db: "−10 dB", loud: 0.513 },
  },
  boom: {
    say: "[EXPLOSION]",
    film: 0,
    before: { db: "0 dB", loud: 1 },
    after: { db: "−10 dB", loud: 0.513 },
  },
  // The fire still burning, on its way out.
  settle: { say: "", film: -30, before: { db: "", loud: 0.13 }, after: { db: "", loud: 0.13 } },
  hold: { say: "", film: -48, before: { db: "", loud: 0.04 }, after: { db: "", loud: 0.04 } },
};

/**
 * One line under each panel: what you are looking at, in the plainest words available.
 *
 * `[before, after]`, always a matched pair, so a visitor reads across rather than down.
 * Three or four words each, and between them they are the whole product: dark scenes
 * brighter, quiet parts louder, loud parts quieter, nothing to adjust.
 *
 * This wording is the third attempt and the first one written for somebody who has not
 * seen the extension. The first said "shadows crushed" against "shadow detail recovered",
 * which is a comparison between two pieces of colourist vocabulary. The second said "one
 * black mass" against "a room with things in it", which is better prose and still leaves a
 * reader to infer the general rule from one example. These state the rule.
 *
 * `settle` and `hold` share their pair on purpose: 3,800ms on the closing statement, which
 * is the one worth leaving with. It answers the objection the whole section exists for —
 * the alternative to this extension is not a worse picture, it is spending the film with
 * your hand on the remote.
 */
const VERDICT: Partial<Record<BeatName, readonly [string, string]>> = {
  dark: ["too dark to see", "dark scenes brighter"],
  /* Not "too quiet to hear" any more, because on this frame it is not: both panels are at
     the volume it takes to hear the line, and the left one had to climb to 30% to get
     there. What the pair has to name is the dial, since on this beat the dial is the only
     thing that differs — the whole claim being that the line costs less to hear. */
  whisper: ["turned up to hear this", "audible with the volume down"],
  /* Both halves of the frame in one line each. "Over the line" and "under the line" point
     at the meter beside each panel, which is where the audio difference actually is. */
  boom: ["blown out, over the line", "in shape, under the line"],
  settle: ["you'd be adjusting all night", "nothing to adjust"],
  hold: ["you'd be adjusting all night", "nothing to adjust"],
};

/**
 * The two controls this product exists to stop you reaching for, and they no longer sit in
 * the same place as each other.
 *
 * BRIGHTNESS is shared, above both panels, and never moves. That is load-bearing: the
 * honest objection to a before/after of this shape is *you just turned it up on the right*,
 * and the answer is structural — both panels take one `--exposure` and the only asymmetry
 * in the document is one `url(#nn-tone-curve)` in a filter chain. A number that visibly
 * sits still while the panels visibly stop matching says that in a way a sentence cannot.
 *
 * VOLUME moved into the panels, because it is the thing under discussion rather than a
 * control of the experiment. Both dials answer the same question — what does it take to
 * hear the dialogue — and they answer it differently, which is the product.
 *
 * `BEFORE_VOLUME` is the premise: a guess at the setting a whispered line needs. The
 * distance to `AFTER_VOLUME` is not a guess. `HTMLMediaElement.volume` is a linear
 * amplitude gain, so a percentage is a dB figure: 30% is −10.5 dB, 10% is −20.0 dB, and
 * the 9.5 dB between them is the lift the extension applies to quiet material, measured
 * at the extension's defaults — 9.87 dB, which the dials carry to within a third of a dB.
 * Turning the knob down by exactly what the extension gave you is what leaves the
 * dialogue where it was and takes the explosion with it.
 *
 * A note on why the volume dial no longer sits still. It used to, and the pair of frozen
 * dials was the whole of the audio argument's furniture — which meant the argument had one
 * variable and the product has two. A dial that moves *down* on the treated side does not
 * weaken the "you just turned it up" answer; it inverts it. The right-hand panel is the
 * quieter one and still legible.
 */
const BRIGHTNESS = 38;
const BEFORE_VOLUME = 30;
const AFTER_VOLUME = 10;
const DIAL_STEPS = 8;

/** One labelled readout: a name, eight steps, a percentage. */
function Dial({ name, percent }: { name: string; percent: number }) {
  return (
    <span className="nn-dial">
      <span className="nn-dial-name">{name}</span>
      <span className="nn-dial-track">
        {Array.from({ length: DIAL_STEPS }, (_, step) => (
          <i key={step} data-on={step < Math.round((percent / 100) * DIAL_STEPS)} />
        ))}
      </span>
      <b>{percent}%</b>
    </span>
  );
}

/** Level meter. Fourteen segments, with the red band starting above the ninth. */
const SEGMENTS = 14;

/**
 * Where the red band starts, and therefore which segments are the problem.
 *
 * One constant rather than two, because the line and the red segments are the same
 * statement. They were separate: the line was drawn at `9 / 14` and the red started at
 * `SEGMENTS - 3`, i.e. 11 — so segments 9 and 10 sat above the line and were coloured a
 * reassuring green.
 *
 * It used to be described as the limiter's ceiling. It is not: the meter reads what is
 * arriving in the room rather than what is leaving the extension, and the limiter's own
 * ceiling is a hair under full scale, which the untreated panel reaches too. This is the
 * plainer thing a red band on a meter has always meant — the part of the scale you do not
 * want to be in — and its position was not chosen to make this scene's point. It was
 * already here, and the treated panel's explosion lands at 8 of 14, one segment clear of
 * it, which is where the measurement puts it.
 */
const CEILING = 9;

/**
 * How many segments a level lights.
 *
 * Derived from the same `loud` figure that sets the printed line's size, rather than
 * declared per beat in the stylesheet as it used to be. Two hand-maintained lists of the
 * same numbers is how a meter ends up disagreeing with the thing beside it.
 */
function Meter({ lit }: { lit: number }) {
  return (
    <div className="nn-meter" style={{ "--lit": lit } as React.CSSProperties} aria-hidden="true">
      {Array.from({ length: SEGMENTS }, (_, index) => (
        <span
          className="nn-seg"
          key={index}
          style={{ "--seg": index } as React.CSSProperties}
          data-hot={index >= CEILING}
        />
      ))}
      {/* On both meters now. It marks the scale, not one panel's behaviour, and the whole
          audio point is that one of them crosses it and the other does not — which needs
          the line to be visible on the one doing the crossing. */}
      <span className="nn-ceiling" />
    </div>
  );
}

/** One panel: a label with its volume and its live level, the shot, and one line about it. */
function Panel({
  title,
  treated,
  level,
  volume,
  say,
  verdict,
}: {
  title: string;
  treated: boolean;
  level: Level;
  volume: number;
  say: string;
  verdict: string;
}) {
  const lit = Math.round(level.loud * SEGMENTS);
  return (
    <section className="nn-panel">
      {/* The label row carries this panel's volume and its level reading, which is where
          the static "peaks at maximum" / "held under a ceiling" pair used to sit. Those
          were two different kinds of statement — an alarm and a mechanism — and neither
          changed, so neither said anything about the frame underneath. */}
      <p className="nn-label">
        <span>{title}</span>
        <Dial name="volume" percent={volume} />
        {/* Red when this panel is in the red band, which is the same condition the meter
            beside it is drawing. It used to key off the string `0 dB`, which made the
            colour a fact about the soundtrack rather than about this room — and now that
            both panels can print the same peak at two different volumes, that would have
            put an alarm on the panel whose whole point is that there is no longer one. */}
        <b className="nn-db" data-showing={level.db !== ""} data-hot={lit > CEILING}>
          {level.db}
        </b>
      </p>
      <div className="nn-panel-body">
        <NightFrame treated={treated} say={say} loud={level.loud} />
        <Meter lit={lit} />
      </div>
      <p className="nn-verdict" data-showing={verdict !== ""}>
        {verdict}
      </p>
    </section>
  );
}

export function NightNeutralizerDemo() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const onScreen = useOnScreen(stageRef);
  /* Starts on focus. The whole scene is a comparison between two dark panels and an
     explosion; the dark is the setup and there is no point arriving at the bang. */
  const running = useSceneRun(useSectionFocused(stageRef), onScreen);
  const { beat, run } = useStoryboard(BEATS, {
    running,
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
        "The same night-time shot twice, labelled before and after, at one screen " +
        "brightness that never changes and at two different volume settings. Before: the " +
        "room is too dark to see, the volume has to sit at 30 percent for a whispered " +
        "line to be audible, and an explosion outside the window then blows the picture " +
        "to flat white and pins the level meter into its red band. After, through Night " +
        "Neutralizer: the dark scene is brighter, and because the extension lifts quiet " +
        "material by 8 decibels the same whispered line is just as audible at 12 percent " +
        "— so the same explosion arrives 8 decibels lower, short of the red band, while " +
        "the picture keeps the shape of its fireball. The extension does not make the " +
        "explosion quieter. It makes the volume you can live with lower."
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

      {/* --- what is fixed about this comparison ----------------------------------
          Two statements true of every frame, so they sit above the film rather than
          changing inside it: the panels are one shot, and the screen brightness a person
          would otherwise be riding all evening is set once and never touched.

          The brightness dial is load-bearing. The obvious objection to any before/after of
          this shape is that the right-hand side has simply been turned up, and the answer —
          both panels share one `--exposure`, the only difference in the document is one
          filter primitive — is not something a picture can say. A number that plainly does
          not move while the panels plainly do is.

          The volume dial used to be up here beside it, frozen in the same way. It is in the
          panels now, at two different settings, because it is the audio argument rather
          than a control of it: see `BEFORE_VOLUME`.

          A third chip here read "protected stream · still works". It was true and it was
          for somebody who has already been let down by another extension; a first-time
          visitor reads "protected stream" and has to stop and wonder what that is. */}
      <div className="nn-rig" aria-hidden="true">
        <span className="nn-rig-chip">
          <svg viewBox="0 0 24 24" className="nn-rig-glyph">
            <g fill="none" stroke="currentColor" strokeWidth="1.6">
              <rect x="2.8" y="5.6" width="12.6" height="10" rx="2" />
              <rect x="8.6" y="8.4" width="12.6" height="10" rx="2" />
            </g>
          </svg>
          the same shot, twice
        </span>

        {/* One readout and nothing else. There was a "set once, never touched" caption on
            the end of this plate, and it was the kind of line that tells you what to
            conclude from something you are already watching: the dial sits visibly still
            for fourteen seconds while the panels stop matching, the section's reason says
            you would otherwise spend the film adjusting it, and the closing verdict pair
            is "you'd be adjusting all night" against "nothing to adjust". Saying it a fourth
            time in the furniture only made the furniture argue. */}
        <span className="nn-dials">
          <Dial name="brightness" percent={BRIGHTNESS} />
        </span>
      </div>

      <div className="nn-split">
        {/* "Before" and "After", not "As shipped" and "Night Neutralizer".
            The old pair was accurate and made the reader work: "as shipped" is
            industry shorthand, and putting the product's name on the right half
            meant the two labels were not even the same kind of thing, so nothing
            told you at a glance which one you were supposed to prefer. */}
        <Panel
          title="Before"
          treated={false}
          level={SOUND[beat].before}
          volume={BEFORE_VOLUME}
          say={SOUND[beat].say}
          verdict={VERDICT[beat]?.[0] ?? ""}
        />
        <Panel
          title="After"
          treated
          level={SOUND[beat].after}
          volume={AFTER_VOLUME}
          say={SOUND[beat].say}
          verdict={VERDICT[beat]?.[1] ?? ""}
        />
      </div>

      {/* The extension's own account of what it is doing, from `describeVideoEffect` and
          `describeAudioEffect` in the vendored core. One line, under both panels, because
          it describes the setting rather than either frame — which is why it read oddly
          sitting under the treated panel as though it were that panel's caption.

          It is the only place on this page where the effect is quantified, and it stays
          for that reason: the four verdicts above say what changed, and a reader who wants
          to know by how much should not have to open the repository to find out. */}
      <p className="nn-spec" aria-hidden="true">
        At strength {STRENGTH} · {VIDEO_READING} · {LIFT_READING} · {GAP_READING}
      </p>

      {/* No caption, and nothing left for one to do. Two panels labelled Before and
          After, each printing the soundtrack at the size it sounds, its own volume
          setting and one plain line about what you are looking at; a brightness dial
          above that never moves; and the extension's own figures underneath. */}
    </div>
  );
}
