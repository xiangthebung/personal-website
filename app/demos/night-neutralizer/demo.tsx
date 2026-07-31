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

/* Computed once, at module scope: with no frame analysis the curve never changes,
   so there is nothing for a render to recompute. */
const VIDEO_PARAMS = mapVideoStrength(STRENGTH);
const TONE_TABLE = curveToTableValues(
  buildToneCurve(VIDEO_PARAMS, staticAdaptState(VIDEO_PARAMS)),
);
const SATURATION = VIDEO_PARAMS.saturation.toFixed(3);
const [VIDEO_READING] = describeVideoEffect(STRENGTH);
const [AUDIO_READING] = describeAudioEffect(STRENGTH, true);

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
 * of three-word verdicts under two panels: dark scenes brighter, quiet parts louder, loud
 * parts quieter, and nothing to adjust. That order is deliberate — the two video beats
 * bracket the two audio ones, so the last thing a visitor sees is the summary rather than
 * a bang.
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
  // Claim two: a line of dialogue printed at the size it sounds. Ten pixels against
  // twenty-three, which is the whole audio argument in one glance.
  { name: "whisper", ms: 2800 },
  /* A cut is a cut. It should feel like an assault — but the white flash it fires is
     a 190ms transition, so anything under about 300ms cut off its own punch.
     It shares `boom`'s caption rather than carrying one of its own: 300ms was the
     shortest caption exposure anywhere on the site, and "Then something explodes" is
     the one line on this page that a picture says better than prose can. */
  { name: "blast", ms: 300 },
  // Claim three, and the frame the whole section exists to produce: one panel blown to
  // white with `[EXPLOSION]` at forty pixels, one panel intact with it at twenty-eight.
  { name: "boom", ms: 2600 },
  // Longer than the 1400–1500ms fades the stylesheet runs on the fire and the spill,
  // so the room is actually back to dark before the beat is over.
  { name: "settle", ms: 2000 },
  // Claim four: the summary, which is the sentence a visitor should leave with.
  { name: "hold", ms: 1800 },
];

/**
 * The soundtrack, per beat, per panel — and the one table that drives every audio thing
 * on screen.
 *
 * `loud` is a level from 0 to 1. It sets the size of the printed line, the number of lit
 * segments on that panel's meter, and how solid the line looks. One number rather than
 * three, because the three are the same fact and the previous version had them declared in
 * three different places: a `level: "low" | "peak"` here, a `--lit-raw` per beat in the
 * stylesheet, and no size channel at all.
 *
 * WHY THE LINE IS PRINTED AT ALL
 *
 * An earlier version of this scene deleted it, and the reasoning was that this page has no
 * audio, so a printed line of dialogue reads identically whether it is whispered or
 * shouted, so it cannot demonstrate anything about volume. Every step of that is true and
 * the conclusion is still wrong: it assumes the only channel available is the words. Set
 * the whisper at ten pixels and the explosion at forty and loudness is on screen, in a
 * form a reader decodes without being told.
 *
 * And it shows the product better than a meter does. Untreated, the two lines are 10px and
 * 40px. Treated, they are 23px and 28px. A four-fold difference becoming a slight one is
 * exactly what a compressor is, and here it is a thing you see rather than a claim.
 *
 * `[EXPLOSION]` in brackets because that is how a real subtitle track prints a sound that
 * is not speech — so the convention does the work of explaining why a noise has words.
 */
interface Level {
  readonly db: string;
  readonly loud: number;
}

const SOUND: Record<BeatName, { readonly say: string; readonly before: Level; readonly after: Level }> = {
  // Room tone. No line, and the meters idle rather than sitting at zero.
  night: { say: "", before: { db: "", loud: 0.08 }, after: { db: "", loud: 0.2 } },
  dark: { say: "", before: { db: "", loud: 0.08 }, after: { db: "", loud: 0.2 } },
  whisper: {
    say: "…did you hear that?",
    before: { db: "−38 dB", loud: 0.08 },
    after: { db: "−21 dB", loud: 0.46 },
  },
  /* The cut and the frame after it are one event, so they carry one reading. `0 dB` is
     the top of the scale, which is why it is the number that reads as a problem. */
  blast: { say: "[EXPLOSION]", before: { db: "0 dB", loud: 1 }, after: { db: "−9 dB", loud: 0.62 } },
  boom: { say: "[EXPLOSION]", before: { db: "0 dB", loud: 1 }, after: { db: "−9 dB", loud: 0.62 } },
  settle: { say: "", before: { db: "", loud: 0.12 }, after: { db: "", loud: 0.22 } },
  hold: { say: "", before: { db: "", loud: 0.08 }, after: { db: "", loud: 0.2 } },
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
  whisper: ["too quiet to hear", "quiet parts louder"],
  boom: ["blown out to white", "bright scenes darker"],
  settle: ["you'd be adjusting all night", "nothing to adjust"],
  hold: ["you'd be adjusting all night", "nothing to adjust"],
};

/**
 * The two controls this product exists to stop you reaching for.
 *
 * They are on screen, they have numbers, and neither of them changes for the entire scene.
 * That is the point, and it has to be said out loud for two reasons. The honest objection
 * to any before/after of this shape is *you just turned it up on the right* — and the
 * answer is structural: both panels share one `--exposure` and one printed level, and the
 * only asymmetry in the document is one `url(#nn-tone-curve)` in a filter chain. Dials that
 * visibly sit still while the panels visibly stop matching say that in a way a sentence
 * cannot.
 *
 * The second reason is the product itself. What a person actually does at midnight is ride
 * these two knobs for two hours, and "you would not have to" is the pitch.
 */
const DIALS = [
  { name: "brightness", percent: 38 },
  { name: "volume", percent: 30 },
] as const;
const DIAL_STEPS = 8;

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

/**
 * How many segments a level lights.
 *
 * Derived from the same `loud` figure that sets the printed line's size, rather than
 * declared per beat in the stylesheet as it used to be. Two hand-maintained lists of the
 * same numbers is how a meter ends up disagreeing with the thing beside it.
 */
function Meter({ treated, loud }: { treated: boolean; loud: number }) {
  const lit = Math.round(loud * SEGMENTS);
  return (
    <div
      className="nn-meter"
      data-treated={treated}
      style={{ "--lit": lit } as React.CSSProperties}
      aria-hidden="true"
    >
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

/** One panel: a label with its live level, the shot, and one line about what you see. */
function Panel({
  title,
  treated,
  level,
  say,
  verdict,
}: {
  title: string;
  treated: boolean;
  level: Level;
  say: string;
  verdict: string;
}) {
  return (
    <section className="nn-panel">
      {/* The label row carries the level reading, which is where the static
          "peaks at maximum" / "held under a ceiling" pair used to sit. Those were two
          different kinds of statement — an alarm and a mechanism — and neither changed,
          so neither said anything about the frame underneath. */}
      <p className="nn-label">
        <span>{title}</span>
        <b className="nn-db" data-showing={level.db !== ""} data-hot={level.db === "0 dB"}>
          {level.db}
        </b>
      </p>
      <div className="nn-panel-body">
        <NightFrame treated={treated} say={say} loud={level.loud} />
        <Meter treated={treated} loud={level.loud} />
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
        "The same night-time shot twice, labelled before and after, at one brightness " +
        "setting and one volume setting that never change. Before: the room is too dark " +
        "to see, a whispered line reads at minus 38 decibels, and an explosion outside " +
        "the window blows the picture to flat white and peaks at 0 decibels. After, " +
        "through Night Neutralizer: the dark scene is brighter, the whisper is lifted to " +
        "minus 21 decibels, and the same explosion is held to minus 9 decibels under a " +
        "limiter ceiling while the picture keeps the shape of its fireball. Neither the " +
        "brightness nor the volume was adjusted to achieve any of it."
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
          changing inside it: the panels are one shot, and the two knobs a person would
          otherwise be riding all evening are set once and never touched.

          The dials are load-bearing. The obvious objection to any before/after of this
          shape is that the right-hand side has simply been turned up, and the answer —
          both panels share one `--exposure` and one printed level, the only difference in
          the document is one filter primitive — is not something a picture can say. Two
          numbers that plainly do not move while the panels plainly do is.

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

        {/* Two readouts and nothing else. There was a "set once, never touched" caption on
            the end of this plate, and it was the kind of line that tells you what to
            conclude from something you are already watching: the dials sit visibly still
            for fourteen seconds while the panels stop matching, the section's reason says
            you would otherwise spend the film adjusting them, and the closing verdict pair
            is "you'd be adjusting all night" against "nothing to adjust". Saying it a fourth
            time in the furniture only made the furniture argue. */}
        <span className="nn-dials">
          {DIALS.map((dial) => (
            <span className="nn-dial" key={dial.name}>
              <span className="nn-dial-name">{dial.name}</span>
              <span className="nn-dial-track">
                {Array.from({ length: DIAL_STEPS }, (_, step) => (
                  <i key={step} data-on={step < Math.round((dial.percent / 100) * DIAL_STEPS)} />
                ))}
              </span>
              <b>{dial.percent}%</b>
            </span>
          ))}
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
          say={SOUND[beat].say}
          verdict={VERDICT[beat]?.[0] ?? ""}
        />
        <Panel
          title="After"
          treated
          level={SOUND[beat].after}
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
        At strength {STRENGTH} · {VIDEO_READING} · {AUDIO_READING}
      </p>

      {/* No caption, and nothing left for one to do. Two panels labelled Before and
          After, each printing the soundtrack at the size it sounds and one plain line
          about what you are looking at; two dials above that never move; and the
          extension's own figures underneath. */}
    </div>
  );
}
