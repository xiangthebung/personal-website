"use client";

/**
 * Night Neutralizer, as the same night-time shot run twice, with the extension's popup
 * beside it saying what it is doing.
 *
 * The pitch is a complaint everyone recognises: at midnight the quiet scenes are too
 * dark to see and the loud ones are loud enough to wake the house, and turning either
 * knob makes the other worse. A screenshot cannot say that. Two panels playing the same
 * shot can, because the argument is a comparison and a comparison needs both halves on
 * screen at once. They are labelled Before and After — not left and right, because the
 * split stacks on a narrow screen.
 *
 * The film: the room is dark, someone whispers, something explodes outside the window,
 * the room settles. Then the popup's new proof: the phantom cursor holds "Hold to
 * compare" and the After panel drops back to the site's own sound and picture for as
 * long as it is held — the room goes dark again, the whispered line falls below hearing
 * at the lower volume, the section's own night wash pulls off — and comes back when it is
 * let go. A coda moves the tab to a protected player, where the extension cannot read
 * frames and applies its fixed curve at the shipped brightness instead.
 *
 * WHAT IS REAL HERE
 *
 * The After panel is not a hand-tuned CSS approximation. It is an SVG
 * `feComponentTransfer` whose 33-entry lookup table comes from `buildToneCurve` in the
 * vendored copy of the extension's own `core/tone-curve.ts` — the same function, feeding
 * the same filter primitive the extension installs on a real `<video>`. The state that
 * function is given is not a guess either: `light.ts` samples the drawn room, hands the
 * pixels to the extension's `computeSceneStats`, and runs its adaptation loop until it
 * settles, so the curve is what the engine converges on *for this frame*. The blast beats
 * get the curve the engine is on a third of a second after the cut; the coda gets the
 * fixed curve a protected player is given.
 *
 * The popup's meter is `describeMeter` from the extension's `core/meter.ts`, fed the
 * same curve and the same frame histogram. The summary, the pill, the chips and the
 * cards print the popup's own strings; the strength word is `describeStrength`, the
 * preset line is `core/presets.ts`, the protected brightness is `DEFAULT_SETTINGS`.
 *
 * The line under the panels is `describeVideoEffect` and `describeAudioEffect`, verbatim
 * from `core/readings.ts`.
 *
 * WHAT IS STAGED
 *
 * The film. There is no video file on this site; the shot is a few gradients and
 * silhouettes, composed to have something in the shadows worth being able to see. The
 * level meters beside the panels are the shape of what arrives in the room, not an audio
 * graph. And the listener: which volume a person would have chosen is a premise, not a
 * measurement — see `BEFORE_VOLUME`. What is *not* a guess is the distance between the
 * two dials, which is the lift the extension applies converted to a volume setting.
 */

import "./demo.css";
import { useRef, type CSSProperties } from "react";
import { PhantomCursor } from "../scene/cursor";
import { usePressGate } from "../scene/press-gate";
import { useSectionBeat } from "../scene/section-beat";
import { SpecTags, type SpecTag } from "../scene/spec";
import { useStoryboard, type Beat } from "../scene/storyboard";
import { useSceneRun } from "../scene/use-scene-run";
import { useOnScreen } from "../use-on-screen";
import { useSectionFocused } from "../use-section-focus";
import { NightFrame, RoomDefs } from "./frame";
import { NightPopup } from "./popup";
import { deriveScene, type CurveName, type FramePremise } from "./light";
import { LOUD_DB, audioEffect, describeAudioEffect, describeVideoEffect } from "./core/readings";

/** The extension's default. Not a number picked to make the demo look good. */
const STRENGTH = 45;
/**
 * The other half of the extension's default. `DEFAULT_SETTINGS.nightEq` is `false` in
 * `core/types.ts`, and both premises are literals rather than reads of it because this
 * file's whole method is that the numbers a scene is drawn on are legible next to the
 * tables they produce. What stops a literal drifting is a test: "the Night Neutralizer
 * scene runs at the extension's own defaults" holds both to `DEFAULT_SETTINGS`.
 */
const NIGHT_EQ = false;

const [VIDEO_READING] = describeVideoEffect(STRENGTH);
/* Both sentences belong on the page: the second — the loud-to-quiet gap — is the figure
   every number in `SOUND` is built on. The second *argument* is `nightEq`. */
const [LIFT_READING, GAP_READING] = describeAudioEffect(STRENGTH, NIGHT_EQ);
const LIFT_DB = audioEffect(STRENGTH, NIGHT_EQ).liftDb;

type BeatName =
  | "night"
  | "dark"
  | "whisper"
  | "blast"
  | "boom"
  | "settle"
  | "compare"
  | "release"
  | "protected"
  | "hold";

/**
 * Ten beats, eighteen seconds.
 *
 * Every beat here asks for a *comparison* — two panels, and the difference between them
 * is the product — and a comparison takes about twice as long to make as a change takes
 * to notice: the eye has to go across and come back. The blast is the exception and stays
 * a cut.
 *
 * The first six are the film. The next two are the popup's proof — the hold, and the
 * release — and they carry the scene's one press, so `settle` is also where the pointer
 * sets off, so that it is standing on the pill when `compare` begins. The last two are the
 * coda on a protected player and the closing pair of verdicts.
 */
const BEATS: readonly Beat<BeatName>[] = [
  // Two dark panels, a popup, two labels. Nothing is happening yet, on purpose.
  { name: "night", ms: 1600 },
  // Claim one, and the one the section is named for.
  { name: "dark", ms: 2200 },
  // Claim two: a line of dialogue printed at the size it sounds, the same size on both
  // panels, over two volume dials that read 30% and 10%.
  { name: "whisper", ms: 2400 },
  // A cut is a cut. Long enough for its own 190ms flash and nothing more.
  { name: "blast", ms: 300 },
  // Claim three: one panel blown to white with the level pinned into the red, one panel
  // intact with it a segment short of the red band.
  { name: "boom", ms: 2200 },
  // Longer than the fades the stylesheet runs on the fire and the spill. The pointer
  // crosses to the popup during this.
  { name: "settle", ms: 1500 },
  // The press. The After panel reverts to the site's own output for as long as it lasts.
  { name: "compare", ms: 2400 },
  // Let go, and the softening comes back.
  { name: "release", ms: 1800 },
  // The coda: a player whose frames cannot be read gets the fixed curve.
  { name: "protected", ms: 2400 },
  // Claim four: the sentence a visitor should leave with.
  { name: "hold", ms: 1600 },
];

/**
 * How the frame is lit on each beat: the scene's premises, which the sampler measures and
 * the stylesheet applies, from one table so that they cannot disagree.
 *
 * `exposure` is the `brightness()` both panels share. On the quiet beats it is *under*
 * one, because nobody watches a film at midnight with the screen at full brightness —
 * the pod's own dial says 38% — and the extension's job is to make a dimmed display still
 * show shadow detail. Measured at 0.6, wall against clock: 5 → 9 untreated, which is the
 * definition of crushed. The blast beats run it over one because the highlight half of
 * the argument needs a frame that is genuinely over-exposed.
 *
 * `flash` is the white sheet over the cut. It sits inside the filter chain, so it is part
 * of the signal: on `boom` it is what lights the room enough for the extension's exposure
 * servo to engage, which is the "glare pulled back" the popup's meter then reports. A
 * sustained sheet at the cut's own 0.3 flattened the room to a rectangle; a tenth reads as
 * a room lit by something outside it.
 */
const PREMISE: Record<BeatName, FramePremise> = {
  night: { exposure: 0.6, fire: 0, flash: 0 },
  dark: { exposure: 0.6, fire: 0, flash: 0 },
  whisper: { exposure: 0.6, fire: 0, flash: 0 },
  blast: { exposure: 1.45, fire: 1, flash: 0.3 },
  boom: { exposure: 1.3, fire: 1, flash: 0.12 },
  settle: { exposure: 1.1, fire: 0, flash: 0 },
  compare: { exposure: 0.6, fire: 0, flash: 0 },
  release: { exposure: 0.6, fire: 0, flash: 0 },
  protected: { exposure: 0.6, fire: 0, flash: 0 },
  hold: { exposure: 0.6, fire: 0, flash: 0 },
};

/** Which of the three curves the After panel is drawn through on each beat. */
const CURVE: Record<BeatName, CurveName> = {
  night: "night",
  dark: "night",
  whisper: "night",
  blast: "cut",
  boom: "cut",
  settle: "night",
  compare: "night",
  release: "night",
  protected: "fixed",
  hold: "fixed",
};

/* Computed once, at module scope: the extension run on the two frames it will see. */
const SCENE = deriveScene(STRENGTH, NIGHT_EQ, { night: PREMISE.night, cut: PREMISE.boom });

/**
 * The two volume settings, which are the audio argument.
 *
 * The extension does not make loud things quieter. Run the vendored core: at its defaults
 * a whisper at −45 dBFS comes out at −35.1, and a full-scale peak comes out at −0.087. It
 * lifts the quiet, which closes the gap, which is the thing that lets *you* turn the
 * volume down. So the volume is the second variable, per panel: both panels are playing at
 * the setting it takes to hear the whispered line, and because the extension has lifted
 * that line by 10 dB, that setting is 10 dB lower on the treated side.
 *
 * `film` is the beat's level in the soundtrack itself, in dBFS: the premise. `db` is
 * where that lands in the room, on one scale for both panels, with 0 dB at the untreated
 * panel's peak: the untreated column is the film's own level, the treated column is that
 * level through `audioTransferDb` and then through the lower volume. `loud` is the same
 * figure from 0 to 1, halving every 10 dB, and it drives everything the eye gets — the
 * size of the printed line, the lit segments on the meter, the solidity of the text.
 *
 * Every figure is checked against the vendored core by "the Night Neutralizer scene still
 * prints what the extension actually does" in `tests/rendered-html.test.mjs`. The table
 * is written out rather than computed so that the premises and the measurements are
 * legible side by side; the test is what stops the measurements drifting.
 *
 * `[EXPLOSION]` in brackets because that is how a subtitle track prints a sound that is
 * not speech. The second whispered line, on the compare beats, is there so the hold has
 * an audio half: at the lower volume and with the lift gone it falls below hearing —
 * see `HELD_AFTER` — and comes back at the same size when the pill is released.
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
  // Room tone, under the dialogue. No line to print; the meters idle at one segment.
  night: { say: "", film: -48, before: { db: "", loud: 0.04 }, after: { db: "", loud: 0.04 } },
  dark: { say: "", film: -48, before: { db: "", loud: 0.04 }, after: { db: "", loud: 0.04 } },
  /* The same reading on both panels, which is the point: the line is exactly as audible
     on the treated side, at a volume 10 dB lower. */
  whisper: {
    say: "…did you hear that?",
    film: -45,
    before: { db: "−45 dB", loud: 0.045 },
    after: { db: "−45 dB", loud: 0.045 },
  },
  /* The cut and the frame after it are one event. `0 dB` is the top of the scale, and the
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
  /* A second whispered line, through the extension. While the pill is held the After
     panel does not print this row; it prints `HELD_AFTER`. */
  compare: {
    say: "…it's quiet now.",
    film: -45,
    before: { db: "−45 dB", loud: 0.045 },
    after: { db: "−45 dB", loud: 0.045 },
  },
  release: {
    say: "…it's quiet now.",
    film: -45,
    before: { db: "−45 dB", loud: 0.045 },
    after: { db: "−45 dB", loud: 0.045 },
  },
  protected: { say: "", film: -48, before: { db: "", loud: 0.04 }, after: { db: "", loud: 0.04 } },
  hold: { say: "", film: -48, before: { db: "", loud: 0.04 }, after: { db: "", loud: 0.04 } },
};

/**
 * One line under each panel: what you are looking at, in the plainest words available.
 *
 * `[before, after]`, always a matched pair, so a visitor reads across rather than down.
 * Between them they are the whole product: dark scenes brighter, the dialogue costs less
 * volume to hear, the bang therefore arrives lower, the hold shows the site's own output
 * and the release brings the softening back, a protected player still gets a curve, and
 * nothing to adjust. Seven words at most; a test holds them to it.
 */
const VERDICT: Partial<Record<BeatName, readonly [string, string]>> = {
  dark: ["too dark to see", "dark scenes brighter"],
  whisper: ["turned up to hear this", "audible with the volume down"],
  boom: ["blown out, over the line", "in shape, under the line"],
  compare: ["turned up to hear this", "held: too dark, too quiet"],
  release: ["turned up to hear this", "let go: bright and audible again"],
  protected: ["too dark to see", "still brighter on a protected player"],
  hold: ["you'd be adjusting all night", "nothing to adjust"],
};

/**
 * The two controls this product exists to stop you reaching for.
 *
 * BRIGHTNESS is shared, above both panels, and never moves. That is load-bearing: the
 * honest objection to a before/after of this shape is *you just turned it up on the
 * right*, and the answer is structural — both panels take one `--exposure` and the only
 * asymmetry in the document is one `url(#nn-tone-curve…)` in a filter chain.
 *
 * VOLUME is per panel, because it is the thing under discussion. `BEFORE_VOLUME` is the
 * premise: a guess at the setting a whispered line needs on a laptop at midnight. The
 * distance to `AFTER_VOLUME` is not a guess. `HTMLMediaElement.volume` is a linear
 * amplitude gain, so a percentage is a dB figure: 30% is −10.5 dB, 10% is −20.0 dB, and
 * the 9.5 dB between them is the lift the extension applies to quiet material at its
 * defaults — 9.87 dB, which the dials carry to within a third of a dB. A test holds them
 * to it.
 */
const BRIGHTNESS = 38;
const BEFORE_VOLUME = 30;
const AFTER_VOLUME = 10;
const DIAL_STEPS = 8;

/** `HTMLMediaElement.volume` as a level. */
const volumeDb = (percent: number) => 20 * Math.log10(percent / 100);

/**
 * What the After panel reads while Compare is held: the second whispered line at the
 * treated panel's volume with nothing lifting it. Derived, because it is the one row of
 * the table that describes the extension *not* running, and the test that polices the
 * table only knows how to check the rows where it is.
 */
const HELD_AFTER: Level = (() => {
  const film = SOUND.compare.film;
  const level = film + volumeDb(AFTER_VOLUME) - (LOUD_DB + volumeDb(BEFORE_VOLUME));
  const rounded = Math.round(level);
  return {
    db: `${rounded < 0 ? "−" : ""}${Math.abs(rounded)} dB`,
    loud: Math.min(1, 2 ** (level / 10)),
  };
})();

/** The popup's meter line on each beat, worded by the extension. */
const METER: Record<BeatName, string> = Object.fromEntries(
  BEATS.map(({ name }) => [name, SCENE.meter(CURVE[name], SOUND[name].film)]),
) as Record<BeatName, string>;

/** Where the phantom cursor is on each beat. It sets off for the pill during `settle`. */
const CURSOR: Partial<Record<BeatName, string>> = {
  settle: "compare",
  compare: "compare",
  release: "compare",
};

/** The one beat whose visible change is caused by the press. See `usePressGate`. */
const CLICKS: ReadonlySet<BeatName> = new Set<BeatName>(["compare"]);

/**
 * The site's claims, pinned to the After panel — the thing that is different.
 *
 * Coordinates are the fallback for a frame the layer has not measured yet; the anchor is
 * the position. All three sit on the After frame's corners, over wall and floor rather
 * than over the objects the comparison is about, and read towards its middle; the
 * bottom-right corner is used twice in sequence, by the held label until the release and
 * by the coda's label from `protected`, because two plates on a 360px frame's bottom edge
 * met in the middle. The release itself is said by the verdict pair under the panels.
 * The popup carries no labels: everything it says, it says in the product's own words.
 *
 * The bottom pair are lifted 46px off the frame's edge, which is what clears the printed
 * line of dialogue that sits along it on the compare beats.
 */
const SPECS: readonly SpecTag<BeatName>[] = [
  /* The credibility claim, first: the panel is the extension's own transfer function. */
  { at: "dark", text: "The extension's real curve", x: 39, y: 23, anchor: "after", grip: "top left", nudge: { x: 10, y: 18 } },
  /* While held: what the After panel has become. Leaves with the release. */
  { at: "compare", text: "Held: as the site sends it", x: 71, y: 57, until: "release", anchor: "after", grip: "bottom right", side: "left", nudge: { x: -10, y: -46 } },
  { at: "protected", text: "Works on players it can't read", x: 71, y: 57, anchor: "after", grip: "bottom right", side: "left", nudge: { x: -10, y: -46 } },
];

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
 * Where the red band starts, and therefore which segments are the problem: the part of
 * the scale you do not want to be in. Not the limiter's ceiling — the meter reads what is
 * arriving in the room, not what is leaving the extension. The treated panel's explosion
 * lands at 8 of 14, one segment clear of it, which is where the measurement puts it.
 */
const CEILING = 9;

function Meter({ lit }: { lit: number }) {
  return (
    <div className="nn-meter" style={{ "--lit": lit } as CSSProperties} aria-hidden="true">
      {Array.from({ length: SEGMENTS }, (_, index) => (
        <span
          className="nn-seg"
          key={index}
          style={{ "--seg": index } as CSSProperties}
          data-hot={index >= CEILING}
        />
      ))}
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
  anchor,
}: {
  title: string;
  treated: boolean;
  level: Level;
  volume: number;
  say: string;
  verdict: string;
  anchor?: string;
}) {
  const lit = Math.round(level.loud * SEGMENTS);
  return (
    <section className="nn-panel">
      <p className="nn-label">
        <span>{title}</span>
        <Dial name="volume" percent={volume} />
        {/* Red when this panel is in the red band, which is the same condition the meter
            beside it is drawing. */}
        <b className="nn-db" data-showing={level.db !== ""} data-hot={lit > CEILING}>
          {level.db}
        </b>
      </p>
      <div className="nn-panel-body">
        <NightFrame treated={treated} say={say} loud={level.loud} anchor={anchor} />
        <Meter lit={lit} />
      </div>
      <p className="nn-verdict" data-showing={verdict !== ""}>
        {verdict}
      </p>
    </section>
  );
}

/** The extension's real transfer function, as the extension installs it. */
function ToneFilter({ id, curve }: { id: string; curve: CurveName }) {
  const { table, saturation } = SCENE.curves[curve];
  return (
    <filter id={id} colorInterpolationFilters="sRGB">
      <feComponentTransfer>
        <feFuncR type="table" tableValues={table} />
        <feFuncG type="table" tableValues={table} />
        <feFuncB type="table" tableValues={table} />
      </feComponentTransfer>
      {/* Opening up shadows washes the colour out of them; the extension puts it back by
          exactly this much, scaled by how far the lift is engaged. */}
      <feColorMatrix type="saturate" values={saturation} />
    </filter>
  );
}

export function NightNeutralizerDemo() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const onScreen = useOnScreen(stageRef);
  /* Starts on focus. The whole scene is a comparison between two dark panels and an
     explosion; the dark is the setup and there is no point arriving at the bang. */
  const running = useSceneRun(useSectionFocused(stageRef), onScreen);
  const state = useStoryboard(BEATS, {
    running,
    stage: stageRef,
    /* The still that carries the argument: the settled comparison after everything, with
       the meter reading, every label pinned and the closing pair of verdicts. */
    stillBeat: "hold",
  });
  const { beat, index, run, still } = state;
  /* `beat` decides where the pointer goes; `did` decides what the press has changed. */
  const { did, onPress } = usePressGate(BEATS, state, CLICKS);

  /* The section follows the press rather than the beat, so the night wash behind the
     panels comes off in the same instant the pill goes down. */
  useSectionBeat(stageRef, did, BEATS);

  const at = (name: BeatName) => BEATS.findIndex((entry) => entry.name === name);
  const held = did === "compare";
  const protectedPlayer = index >= at("protected");
  const cue = SOUND[beat];
  const premise = PREMISE[beat];

  return (
    <div
      className="nn"
      ref={stageRef}
      data-beat={beat}
      data-lap={run}
      data-did={did}
      data-held={held}
      data-curve={CURVE[beat]}
      style={
        {
          "--exposure": premise.exposure,
          "--fire": premise.fire,
          "--flash": premise.flash,
        } as CSSProperties
      }
      role="img"
      /* Free of "left" and "right": the two panels stack on a narrow screen, and a screen
         reader user has no way of knowing which layout they are being described. The
         figures are the ones the tables above are drawn from. */
      aria-label={
        "The same night-time shot twice, labelled before and after, at one screen " +
        "brightness that never changes and at two different volume settings, with the " +
        "extension's popup beside them. Before: the room is too dark to see, the volume " +
        `has to sit at ${BEFORE_VOLUME} percent for a whispered line to be audible, and an ` +
        "explosion outside the window then blows the picture to flat white and pins the " +
        "level meter into its red band. After, through Night Neutralizer: the dark scene " +
        `is brighter, and because the extension lifts quiet material by ${Math.round(LIFT_DB)} ` +
        `decibels the same whispered line is just as audible at ${AFTER_VOLUME} percent, so ` +
        `the same explosion arrives ${Math.round(LIFT_DB)} decibels lower, short of the red ` +
        "band, while the picture keeps the shape of its fireball. The popup's meter prints " +
        "the gain and the change in light being applied at that moment. A cursor then holds " +
        "the popup's Hold to compare button: the after panel drops back to the site's own " +
        "sound and picture, too dark and too quiet, until the button is released. Finally " +
        "the tab becomes a protected player whose frames cannot be read, and the popup " +
        "reports a fixed curve at the shipped brightness instead."
      }
    >
      {/* The gradients the room is drawn with and the three transfer functions, hidden,
          zero-sized, referenced by `filter: url(...)` from the stylesheet — and from the
          section's own backdrop, which runs the same curve over the room behind the pod. */}
      <svg className="nn-defs" aria-hidden="true" focusable="false">
        <defs>
          <RoomDefs />
          <ToneFilter id="nn-tone-curve" curve="night" />
          <ToneFilter id="nn-tone-curve-cut" curve="cut" />
          <ToneFilter id="nn-tone-curve-fixed" curve="fixed" />
        </defs>
      </svg>

      {/* What is fixed about this comparison: the panels are one shot, and the screen
          brightness a person would otherwise be riding all evening is set once. */}
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
        <span className="nn-dials">
          <Dial name="brightness" percent={BRIGHTNESS} />
        </span>
      </div>

      <div className="nn-split">
        <Panel
          title="Before"
          treated={false}
          level={cue.before}
          volume={BEFORE_VOLUME}
          say={cue.say}
          verdict={VERDICT[beat]?.[0] ?? ""}
        />
        {/* Reverts to the site's own output while the pill is held: no curve, and the
            second whispered line at the level it would actually arrive at. */}
        <Panel
          title="After"
          treated={!held}
          level={held ? HELD_AFTER : cue.after}
          volume={AFTER_VOLUME}
          say={cue.say}
          verdict={VERDICT[beat]?.[1] ?? ""}
          anchor="after"
        />
      </div>

      {/* The extension's own account of what it is doing, from `describeVideoEffect` and
          `describeAudioEffect` in the vendored core. One line, under both panels, because
          it describes the setting rather than either frame. */}
      <p className="nn-spec" aria-hidden="true">
        At strength {STRENGTH} · {VIDEO_READING} · {LIFT_READING} · {GAP_READING}
      </p>

      <NightPopup
        strength={STRENGTH}
        meter={held ? SCENE.held : METER[beat]}
        held={held}
        protectedPlayer={protectedPlayer}
      />

      {!still && (
        <PhantomCursor
          stage={stageRef}
          target={CURSOR[beat] ?? null}
          pressing={CLICKS.has(beat)}
          onPress={onPress}
          token={`${run}-${beat}`}
        />
      )}

      <SpecTags beats={BEATS} beat={beat} tags={SPECS} className="nn-specs" />
    </div>
  );
}
