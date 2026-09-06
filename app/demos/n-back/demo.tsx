"use client";

/**
 * N-Back, as the game's own play screen running a new player's first round.
 *
 * This scene used to be a diagram: a board, a strip of held cues and two keys, drawn in
 * the site's own furniture, because the game had nothing on screen that taught the rule
 * and the diagram was the only way to show it. The game has that now. Version 1.1 grew
 * a memory strip under the board for a new player's first round — the last n cues and
 * the one on screen, the slot n back lighting as each cue lands, a bracket snapping
 * between the two when a stream matches, the matching key glowing before it is pressed,
 * and a caption under the keys saying what the comparison found. That is this scene's
 * idea, adopted by the product, so the scene is now a film of the product doing it.
 *
 * Every string in the frame is the game's: the strip's heading and slot labels, the
 * bracket's words, the key names, the captions (`stripCaption` in `src/lib/strip.ts`),
 * the results card's lure line (`lureNote` in `src/lib/scoring.ts`), and the ledger's
 * row. The palette, the type and the radii are the game's too — Plus Jakarta Sans is
 * served from this scene's own folder so the column sets in the face the app sets in.
 * The claims the site makes about what it is watching are pinned labels in the site's
 * voice, outside the column; see `SPECS`.
 *
 * What is staged: the phantom cursor pressing the keys, the time cut from the second
 * scored trial to a finished session's results, and the letter printed on the lit tile.
 * The last is a real setting rather than an invention — "Name the cue on the tile" in the
 * game's preferences — chosen because this page does not speak, and the label pinned to
 * the strip says what the game actually does with the letter.
 */

import { useRef, type CSSProperties } from "react";
import { PhantomCursor } from "../scene/cursor";
import { usePressGate } from "../scene/press-gate";
import { useSectionBeat } from "../scene/section-beat";
import { SpecTags, type SpecTag } from "../scene/spec";
import { useStoryboard, type Beat } from "../scene/storyboard";
import { useSceneRun } from "../scene/use-scene-run";
import { useOnScreen } from "../use-on-screen";
import { useSectionFocused } from "../use-section-focus";
import "./demo.css";

/**
 * The project's letter set, copied from `n-back/src/lib/stimuli.ts`.
 *
 * It was the usual n-back set — C H K L Q R S T — and upstream stopped being that in
 * `2a769ad`: C was swapped for O, because "see" and "tee" are the same rime through a small
 * speaker at one cue every two seconds, which makes a miss a hearing failure wearing a
 * memory failure's clothes. `tests/stimuli.test.ts` over there holds every letter's rime
 * and fails if two collide again.
 *
 * This matters here beyond tidiness: the set is spliced into the stage's `aria-label`, so
 * a stale copy tells a screen-reader user the game draws from a set containing a letter it
 * does not use and missing one it does — the one description of this scene its reader
 * cannot check against the picture. `tests/rendered-html.test.mjs` compares this constant
 * with the game's; recopy it rather than editing it.
 */
const LETTERS = ["H", "K", "L", "O", "Q", "R", "S", "T"] as const;

type BeatName =
  | "empty"
  | "cue-1"
  | "cue-2"
  | "cue-3"
  | "match-square"
  | "cue-4"
  | "match-letter"
  | "hold"
  | "results"
  | "ledger";

/**
 * Ten beats, 19.8 seconds.
 *
 * The first eight are the lesson, at a lesson's pace rather than the game's. The real
 * game shows a cue for 700ms and goes dark for 1650ms; somebody meeting the two-back
 * rule for the first time has to look at the new cue, find the slot two places back and
 * hold both in mind before the bracket answers them, and a second is not enough for the
 * first of those. So a cue holds for 1.5s and the two beats where the bracket and the
 * verdict are up get 2.4s. The count-in is the one thing kept at the game's own pace:
 * `COUNTDOWN_TICK_MS` is 700, three ticks.
 *
 * The last two are a cut. Nobody arrives at a portfolio willing to concentrate for four
 * minutes, so the film jumps from the second scored trial to the card the game prints
 * when a session ends, and then to the home screen's ledger — the two screens that carry
 * what the game does with a score, which the play screen cannot show.
 */
const BEATS: readonly Beat<BeatName>[] = [
  // The count-in: 3, 2, 1 on the empty board at the game's 700ms tick, and the strip
  // with nothing in it.
  { name: "empty", ms: 2100 },
  { name: "cue-1", ms: 1600 },
  { name: "cue-2", ms: 1500 },
  // The repeat has already happened here and nothing has pointed it out yet. That gap
  // is the teaching, so it needs long enough for the visitor to spot it first.
  { name: "cue-3", ms: 1500 },
  // The cue goes dark, the bracket snaps, the key lights and is pressed.
  { name: "match-square", ms: 2400 },
  { name: "cue-4", ms: 1500 },
  { name: "match-letter", ms: 2400 },
  // The tail: everything the lesson has said, on screen at once.
  { name: "hold", ms: 1400 },
  // The session's results card, with the lure line under each stream.
  { name: "results", ms: 2800 },
  // The home screen's ledger, with the session just played as its one row.
  { name: "ledger", ms: 2600 },
];

/** How many steps back the game compares against. `DEFAULT_SETTINGS.n`. */
const N = 2;
/** Scored trials at the default 2.5s pace — "93 scored trials at this pace." on the home screen. */
const SCORED_TRIALS = 93;

/**
 * The cues, and why these ones.
 *
 * Cue 3 repeats cue 1's square but not its letter. Cue 4 repeats cue 2's letter but
 * not its square. So four cues demonstrate that the two streams are scored
 * independently — which is the single most misunderstood thing about dual n-back and
 * cannot be shown with a sequence where both match at once.
 */
interface Cue {
  cell: number;
  letter: (typeof LETTERS)[number];
}

const CUES: readonly Cue[] = [
  { cell: 2, letter: "K" },
  { cell: 6, letter: "R" },
  { cell: 2, letter: "T" },
  { cell: 4, letter: "R" },
];

/** How many cues have arrived by each beat. */
const ARRIVED: Record<BeatName, number> = {
  empty: 0,
  "cue-1": 1,
  "cue-2": 2,
  "cue-3": 3,
  "match-square": 3,
  "cue-4": 4,
  "match-letter": 4,
  hold: 4,
  results: 4,
  ledger: 4,
};

/**
 * Which stream the cue now repeats from two back, on the beats where the cue has gone
 * dark and the strip is allowed to say so. `matchingStreams` in the game, for this
 * sequence.
 */
const MATCH: Partial<Record<BeatName, "square" | "letter">> = {
  "match-square": "square",
  "match-letter": "letter",
  hold: "letter",
};

/** The game's names for the streams. `MODALITY_LABEL` in `src/lib/stimuli.ts`. */
const MODALITY_LABEL = { square: "Square", sound: "Sound", colour: "Colour" } as const;

/** The words on the bracket. `bracketLabel` in `src/lib/strip.ts`. */
const SAME = { square: "same square", letter: "same letter" } as const;

/** "now", "1 back", "2 back". `slotLabel` in `src/lib/strip.ts`. */
const slotLabel = (back: number) => (back === 0 ? "now" : `${back} back`);

/**
 * The caption under the keys, one line per beat, and every line is the game's.
 *
 * These are what `stripCaption(trialIndex, n, revealed, streams)` returns for this
 * sequence: nothing to compare against until two cues are held, a pointer at which slot
 * to look at while a cue is up, and once it has gone dark, what the comparison found and
 * which key that means. The tuple shape is what `tests/rendered-html.test.mjs` parses;
 * the second string is empty because the game's caption is one sentence.
 *
 * This is the one scene on the page that keeps a caption, and it keeps it because the
 * product has one: n-back is a rule rather than an interface, and what a first-time
 * visitor needs is to be told which slot to look at right now, which changes every beat
 * and is the one thing a pinned label cannot say. The coda's two screens carry no
 * caption, because the game's do not.
 */
const CAPTION: Record<BeatName, readonly [string, string]> = {
  empty: ["Nothing to compare against yet.", ""],
  "cue-1": ["Nothing to compare against yet.", ""],
  "cue-2": ["Nothing to compare against yet.", ""],
  "cue-3": ["Compare this cue with the one 2 back.", ""],
  "match-square": ["Same square as 2 back — press Square.", ""],
  "cue-4": ["Compare this cue with the one 2 back.", ""],
  "match-letter": ["Same letter as 2 back — press Sound.", ""],
  hold: ["Same letter as 2 back — press Sound.", ""],
  results: ["", ""],
  ledger: ["", ""],
};

/**
 * The streams, named, in the site's voice under the column.
 *
 * "Watch a square and hear a letter. Triple adds a colour." was a written note beside this
 * scene, and two thirds of it are the first thing the film does. The third could never be
 * shown: there is no colour stream in a dual round, so nothing in the frame could hint
 * that the game has one. Three chips, one of them explicitly off, put the whole shape of
 * the game on screen for six words. `data-off` is doing real work rather than styling: it
 * says *this exists and is not what you are watching*.
 */
const STREAMS = [
  { name: MODALITY_LABEL.square, on: true },
  { name: MODALITY_LABEL.sound, on: true },
  { name: MODALITY_LABEL.colour, on: false },
] as const;

/**
 * The finished session the coda cuts to.
 *
 * Authored, but not freely. Every figure has to be one the game's `scoreSession` could
 * produce for a default session — 93 scored trials at 2.5s, of which `TARGET_RATE` makes
 * 28 targets and 65 non-targets per stream — and the lines around them have to be what
 * the game prints for those figures. Balanced accuracy is the mean of the hit rate and
 * the correct-rejection rate: 23/28 against 60/65 is 87%, 26/28 against 63/65 is 95%,
 * and their mean is 91%, which `accuracyNote` reads as "Steady tracking" and `suggestNext`
 * answers with the offer of 3-back. A stream's lure false alarms cannot exceed its false
 * presses, and the lure counts are the share the game's sequence planner plants — about
 * a quarter of the scored trials, which is what its own results screens show.
 */
const RESULT = {
  setup: `${N}-back · Dual · 2.5s · ${SCORED_TRIALS} scored trials`,
  percent: 91,
  note: "Steady tracking. A few slips, nothing more.",
  streams: [
    {
      name: MODALITY_LABEL.square,
      percent: 87,
      lure: "4 of 26 lures caught you.",
      hits: 23,
      targets: 28,
      misses: 5,
      falseAlarms: 5,
    },
    {
      name: MODALITY_LABEL.sound,
      percent: 95,
      lure: "1 of 25 lures caught you.",
      hits: 26,
      targets: 28,
      misses: 2,
      falseAlarms: 2,
    },
  ],
  suggestion: `Comfortable at ${N}-back. ${N + 1}-back is the next step if you want it.`,
  switchTo: `Switch to ${N + 1}-back`,
} as const;

/**
 * The ledger after that session, which is the ledger after a *first* session: one row.
 *
 * A film of the guided first round cannot honestly end on a ledger full of history — the
 * strip is on because the player has never played — so the home screen shows what the
 * game shows after one round: "Last session", a tick per stream where a line will grow,
 * and the row itself. The date is a literal rather than a `toLocaleDateString` call for the
 * reason PagePack's is: the game formats it in whoever's locale is asking, and a server
 * render and a client render that disagree are a worse bug than a fixed date in a film.
 */
const LEDGER = {
  when: "4 Sept, 19:06",
  setup: `${N}-back · Dual · 2.5s`,
  streams: [
    { name: MODALITY_LABEL.square, accuracy: 0.87, lures: "4/26 lures" },
    { name: MODALITY_LABEL.sound, accuracy: 0.95, lures: "1/25 lures" },
  ],
} as const;

/**
 * The preferences card above the ledger, in the state this round was played in.
 *
 * "Name the cue on the tile" is on, because it is on in the frames above: that is the
 * setting that prints the letter on the lit square. "Show me the rule" is off, because
 * the strip was up as a first-round lesson rather than because it was asked for — which
 * is also why the strip's own button reads "Keep it on".
 */
const TOGGLES = [
  {
    label: "Show me the rule",
    caption: "Draws the memory strip under the board for the whole session.",
    on: false,
  },
  { label: "Feedback sounds", caption: "A soft cue for each answer.", on: true },
  {
    label: "Name the cue on the tile",
    caption: "Prints the letter, and the colour name in triple mode.",
    on: true,
  },
] as const;

/**
 * Where the pointer is. `null` means it has left the frame.
 *
 * It enters on the beat the first comparison becomes possible, and it enters at the slot
 * being compared against rather than at a key: a pointer that set off for the Square key
 * while the cue was still up would give the answer away before the bracket does. It waits
 * on the strip, then crosses to the key the strip has just lit.
 */
const CURSOR: Partial<Record<BeatName, string>> = {
  "cue-3": "slot-back",
  "match-square": "key-square",
  "cue-4": "slot-back",
  "match-letter": "key-sound",
  hold: "key-sound",
};

/**
 * The two beats that carry a press, and what waits for it. See `usePressGate`.
 *
 * Not everything on these beats is the press's doing. The cue going dark, the bracket
 * snapping and the key starting to glow are the strip's hint — they happen *before* a
 * player presses anything, so they are keyed on `beat`. What the press causes is the key's
 * "✓ Match", and that is keyed on `did`, which is this clock a beat behind until the pointer
 * has landed.
 */
const CLICKS: ReadonlySet<BeatName> = new Set<BeatName>(["match-square", "match-letter"]);

/**
 * What the site says about what it is watching, pinned to the thing it is about.
 *
 * Six claims, none of them in the game's voice. The column already narrates itself in
 * the game's words, so these are the facts a first-time visitor cannot get from the
 * frame: that the letter is a sound in the real thing, what the lit slot is, that the
 * two streams answer separately, that the lures on the results card were planted, and
 * what the ledger deliberately does not do.
 *
 * Every one names the element it is about and is measured against it. The coordinates
 * are the server's guess and the no-script fallback, close enough that the correction
 * is invisible. The five on the play screen leave on `results`, with the screen they
 * are pinned to; the one on the results card leaves with it.
 */
const SPECS: readonly SpecTag<BeatName>[] = [
  /* On the "now" slot, reading right out of the strip card: the letter in that slot is
     the one the game has just said aloud. The slot is the only thing that shows every
     letter and never moves, which is what a label wants — anchoring the lit tile instead
     would send the plate gliding across the board each time the cue changed square. */
  {
    at: "cue-1",
    text: "Each letter is spoken aloud",
    x: 66,
    y: 61,
    anchor: "now",
    grip: "right",
    until: "results",
  },
  /* The slot the strip lights as each cue lands, reading left out of the card. */
  {
    at: "cue-3",
    text: "Lights as each new cue lands",
    x: 34,
    y: 61,
    anchor: "target",
    grip: "left",
    side: "left",
    until: "results",
  },
  /* On the key that stays dark while the other one glows. The bracket says what matched;
     this says what did not, which is the half of the lesson the frame is quiet about. */
  {
    at: "match-square",
    text: "The letter did not repeat",
    x: 34,
    y: 79,
    anchor: "key-sound",
    grip: "left",
    side: "left",
    until: "cue-4",
  },
  {
    at: "match-letter",
    text: "Two streams, scored separately",
    x: 66,
    y: 79,
    anchor: "key-square",
    grip: "right",
    until: "results",
  },
  /* On the lure line of the first stream. The game's sequence planner plants them —
     `isLure` — and the card is the line that says whether they worked. */
  {
    at: "results",
    text: "Lures are planted on purpose",
    x: 34,
    y: 60,
    anchor: "lures",
    grip: "left",
    side: "left",
    until: "ledger",
  },
  /* On the ledger's heading. Its component says it in as many words: "No best, no
     streak, and nothing that reads the numbers back to the player as anything other
     than numbers." */
  {
    at: "ledger",
    text: "No best, no streak, no praise",
    x: 34,
    y: 62,
    anchor: "ledger",
    grip: "left",
    side: "left",
  },
];

/** A 3×3 board at strip size, one cell lit. `MiniBoard` in the game's `MemoryStrip`. */
function Mini({ cell }: { cell: number }) {
  return (
    <span className="nb-mini" aria-hidden="true">
      {Array.from({ length: 9 }, (_, index) => (
        <span key={index} data-on={index === cell} />
      ))}
    </span>
  );
}

/** The game's header mark: nine dots, the middle one sage. */
function Mark() {
  return (
    <span className="nb-mark" aria-hidden="true">
      {Array.from({ length: 9 }, (_, index) => (
        <span key={index} data-centre={index === 4} />
      ))}
    </span>
  );
}

/** The game's session progress line: "Warm-up" until the first scored trial. */
function positionLabel(trialIndex: number): string {
  const scoredIndex = trialIndex - N + 1;
  return scoredIndex < 1
    ? "Warm-up"
    : `Trial ${Math.min(scoredIndex, SCORED_TRIALS)} of ${SCORED_TRIALS}`;
}

/**
 * One stream's line through the sessions shown, as the ledger draws it: a 100×24 box,
 * a dashed line at chance, and a tick on the latest value. With one session there is no
 * line yet, only the tick — which is what the game shows after a first round.
 */
function Sparkline({ series }: { series: readonly number[] }) {
  const W = 100;
  const H = 24;
  const pad = 3;
  const x = (i: number) =>
    series.length === 1 ? W / 2 : pad + (i * (W - 2 * pad)) / (series.length - 1);
  const y = (v: number) => H - pad - v * (H - 2 * pad);
  const d = series.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  const last = series.length - 1;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="nb-spark" aria-hidden="true">
      <line x1={0} x2={W} y1={y(0.5)} y2={y(0.5)} className="nb-spark-chance" vectorEffect="non-scaling-stroke" />
      {series.length > 1 && <path d={d.join(" ")} className="nb-spark-line" vectorEffect="non-scaling-stroke" />}
      <line
        x1={x(last)}
        x2={x(last)}
        y1={y(series[last]) - 2.5}
        y2={y(series[last]) + 2.5}
        className="nb-spark-tick"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** The results ring: r=46 in a 108 box, 5px stroke, a chance mark at 50%. */
const RING_RADIUS = 46;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const CHANCE_PERCENT = 50;

export function NBackDemo() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const onScreen = useOnScreen(stageRef);
  /* Starts on focus. This scene teaches a rule in order — count-in, cue 1, cue 2, then
     the first comparison — and joining it at cue 3 teaches nothing. */
  const running = useSceneRun(useSectionFocused(stageRef), onScreen);
  const state = useStoryboard(BEATS, {
    running,
    stage: stageRef,
    // The still that carries the argument: the bracket drawn between a cue and the
    // cue two places behind it, the key lit, and every label pinned.
    stillBeat: "match-square",
  });
  const { beat, index, run, still } = state;
  /* What the two presses did, held until they happened. `beat` decides where the
     pointer goes and what the strip hints; `did` decides what a press has changed. */
  const { did, reached, onPress } = usePressGate(BEATS, state, CLICKS);

  // The trail of held cues behind the column, and the section's pulse on a match.
  useSectionBeat(stageRef, beat, BEATS);

  const at = (name: BeatName) => BEATS.findIndex((entry) => entry.name === name);
  const arrived = ARRIVED[beat];
  const trialIndex = arrived - 1;
  const cue = arrived > 0 ? CUES[arrived - 1] : null;
  /* The cue has gone dark: the strip may say what the comparison found. In the game
     this is `phase === "running" && !stimulusVisible && trialIndex >= n`. */
  const revealed = beat === "match-square" || beat === "match-letter" || beat === "hold";
  const match = MATCH[beat] ?? null;
  const lit = cue && !revealed ? cue.cell : -1;
  const warmup = trialIndex < N;
  /* The two presses. The first clears with the next cue, as the game's feedback does;
     the second stays through the tail. Neither is drawn until the pointer has landed. */
  const squarePressed = did === "match-square";
  const soundPressed = reached >= at("match-letter") && index < at("results");
  const screen = beat === "ledger" ? "home" : index >= at("results") ? "results" : "play";
  const progress = Math.max(0, trialIndex + 1) / (SCORED_TRIALS + N);
  const caption = CAPTION[beat][0];

  return (
    <div
      className="nb"
      ref={stageRef}
      data-beat={beat}
      /* The same clock a beat behind, for the two beats that wait for a press. */
      data-did={did}
      data-lap={run}
      data-screen={screen}
      role="img"
      aria-label={
        "The N-Back play screen running a new player's first round. A count-in, then " +
        "cues arrive one at a time: a square lights on a three-by-three board with its " +
        "letter printed on it, and in the game the letter is spoken aloud. A memory strip " +
        "under the board holds the two cues before and the one now, and lights the slot " +
        "two back as each cue lands. The third cue repeats the first cue's square, so the " +
        "strip brackets the two, reads same square, and the Square key is pressed; the " +
        "fourth repeats the second cue's letter, so the bracket reads same letter and the " +
        "Sound key is pressed. The two streams are scored separately. Then the session's " +
        "results card, with each stream's accuracy and how many of the planted lures drew " +
        "a press, and the home screen's ledger of past sessions, which keeps no best and " +
        "no streak. The letters are drawn from " +
        LETTERS.join(", ") +
        " — eight letters chosen so that no two of them rhyme."
      }
    >
      {/* ------------------------------------------------------------- the trail
          The cues the strip has held, projected out of the board into the empty sides
          of the canvas as each one lands, and staying there faded after the strip has
          let them go. Keyed on the section's `data-scene-reached` so the stylesheet
          can light the matching pair on the beat the bracket does. Not on a phone:
          there is no side there to project into. */}
      <div className="nb-trail" aria-hidden="true">
        {CUES.map((held, order) => (
          <span className={`nb-trail-cue nb-trail-cue--${order + 1}`} key={order}>
            <Mini cell={held.cell} />
            <b>{held.letter}</b>
            <small>{`cue ${order + 1}`}</small>
          </span>
        ))}
        <i className="nb-trail-link nb-trail-link--square" />
        <i className="nb-trail-link nb-trail-link--letter" />
      </div>

      {/* --------------------------------------------------------- the app column
          The game's `max-w-[420px]` column on its canvas: header, HUD, board, strip,
          keys, caption. Everything inside this box is the product's. */}
      {screen === "play" && (
        <div className="nb-app nb-play" key={`play-${run}`}>
          <header className="nb-header">
            <Mark />
            <span>N-Back</span>
          </header>

          <div className="nb-hud">
            <div className="nb-hud-left">
              <span className="nb-progress">
                <i style={{ "--nb-progress": progress } as CSSProperties} />
              </span>
              <span className="nb-hud-line">
                <span>{`${N}-back · Dual`}</span>
                <span aria-hidden="true">·</span>
                <span>{positionLabel(trialIndex)}</span>
              </span>
            </div>
            <span className="nb-pause">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="14" y="4" width="4" height="16" rx="1" />
                <rect x="6" y="4" width="4" height="16" rx="1" />
              </svg>
            </span>
          </div>

          {/* The board. Nine tiles, one lit in the game's sage with the letter printed on
              it, and the count-in over the empty grid before anything arrives. */}
          <div className="nb-board" data-spec-anchor="board">
            {Array.from({ length: 9 }, (_, tile) => (
              <span className="nb-tile" key={tile}>
                <i className="nb-tile-dot" />
                <span className="nb-tile-fill" data-on={tile === lit}>
                  {tile === lit && cue ? cue.letter : ""}
                </span>
              </span>
            ))}
            {beat === "empty" && (
              <span className="nb-count" key={`${run}-${running}`} aria-hidden="true">
                <i>3</i>
                <i>2</i>
                <i>1</i>
              </span>
            )}
          </div>

          {/* --------------------------------------------------- the memory strip
              `MemoryStrip.tsx`, slot for slot: three placeholders that give the row its
              shape, and one card per held cue laid over them. A card's slot is its
              distance from the cue now, so when a cue lands every card slides one slot
              left and the oldest simply goes — which is the rule, drawn. */}
          <section className="nb-strip" aria-label="Memory strip">
            <div className="nb-strip-head">
              <p>
                What you are holding
                <span>{`${N} back`}</span>
              </p>
              <span className="nb-strip-keep">Keep it on</span>
            </div>

            <div className="nb-slots">
              {Array.from({ length: N + 1 }, (_, k) => {
                const back = N - k;
                const filled = arrived >= N + 1 - k;
                return (
                  <span
                    className="nb-slot"
                    key={k}
                    data-filled={filled}
                    /* The slot two back is where the pointer waits, and what a label
                       points at. Named on the placeholder, which never moves. */
                    data-target={back === N ? "slot-back" : undefined}
                    data-spec-anchor={back === N ? "target" : back === 0 ? "now" : undefined}
                  >
                    <Mini cell={-1} />
                    <b />
                    <small>{slotLabel(back)}</small>
                  </span>
                );
              })}

              {CUES.slice(0, arrived).map((held, order) => {
                const pos = order - trialIndex + N;
                if (pos < 0) return null;
                const back = N - pos;
                return (
                  <span
                    className="nb-card"
                    key={`${run}-${order}`}
                    style={{ "--pos": pos } as CSSProperties}
                    data-back={back === N}
                    data-now={back === 0}
                  >
                    <Mini cell={held.cell} />
                    <b>{held.letter}</b>
                    <small>{slotLabel(back)}</small>
                  </span>
                );
              })}

              {/* The bracket: from the slot n back to the slot now, with what matched
                  under it. Its geometry is the slots' geometry, so it lands on the two
                  cues at any width; a bracket pointing between cues would teach the
                  wrong rule. */}
              <span className="nb-bracket" data-showing={match !== null} data-spec-anchor="bracket">
                <span>{match ? SAME[match] : ""}</span>
              </span>

              {/* The snap, ringing out of the bracket across the canvas. Masked to fade
                  before it reaches the well's edge, so it never crosses into the next
                  section. */}
              <span className="nb-ring" aria-hidden="true">
                <i />
              </span>
            </div>
          </section>

          {/* ------------------------------------------------------------- the keys
              `ResponseBar.tsx`: Sound on the left hand, Square on the right, the game's
              fixed order. A key glows once the strip points at it, and reads "✓ Match"
              once it has been pressed. */}
          <div className="nb-keys" data-muted={warmup}>
            <span
              className="nb-key"
              data-target="key-sound"
              data-spec-anchor="key-sound"
              data-hint={match === "letter" && !soundPressed}
              data-hit={soundPressed}
              data-down={did === "match-letter" && beat === "match-letter"}
            >
              <span className="nb-key-name">{MODALITY_LABEL.sound}</span>
              {soundPressed ? (
                <span className="nb-key-outcome">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  Match
                </span>
              ) : (
                <kbd className="nb-kbd">A</kbd>
              )}
            </span>
            <span
              className="nb-key"
              data-target="key-square"
              data-spec-anchor="key-square"
              data-hint={match === "square" && !squarePressed}
              data-hit={squarePressed}
              data-down={squarePressed && beat === "match-square"}
            >
              <span className="nb-key-name">{MODALITY_LABEL.square}</span>
              {squarePressed ? (
                <span className="nb-key-outcome">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  Match
                </span>
              ) : (
                <kbd className="nb-kbd">L</kbd>
              )}
            </span>
          </div>

          <p className="nb-caption" data-live={revealed && match !== null} aria-hidden="true">
            {caption}
          </p>
        </div>
      )}

      {/* ----------------------------------------------------------- the results
          `ResultsScreen.tsx` after a finished session: the app's header with its help
          button, the heading, the ring with its chance mark, the note, a table with the
          lure line under each stream, the explainer, the offer, and the two buttons.
          See `RESULT`. */}
      {screen === "results" && (
        <div className="nb-app nb-results" key={`results-${run}`}>
          <header className="nb-header">
            <Mark />
            <span>N-Back</span>
            <span className="nb-help" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" />
              </svg>
            </span>
          </header>

          <div className="nb-results-head">
            <h4>Session complete</h4>
            <p>{RESULT.setup}</p>
          </div>

          <div className="nb-accuracy">
            <svg viewBox="0 0 108 108" aria-hidden="true">
              <circle className="nb-accuracy-track" cx="54" cy="54" r={RING_RADIUS} />
              <line
                className="nb-accuracy-chance"
                x1={54 + (RING_RADIUS - 4.5) * Math.cos((CHANCE_PERCENT / 100) * 2 * Math.PI)}
                y1={54 + (RING_RADIUS - 4.5) * Math.sin((CHANCE_PERCENT / 100) * 2 * Math.PI)}
                x2={54 + (RING_RADIUS + 4.5) * Math.cos((CHANCE_PERCENT / 100) * 2 * Math.PI)}
                y2={54 + (RING_RADIUS + 4.5) * Math.sin((CHANCE_PERCENT / 100) * 2 * Math.PI)}
              />
              <circle
                className="nb-accuracy-fill"
                cx="54"
                cy="54"
                r={RING_RADIUS}
                style={
                  {
                    "--nb-dash": RING_CIRCUMFERENCE,
                    "--nb-offset": RING_CIRCUMFERENCE * (1 - RESULT.percent / 100),
                  } as CSSProperties
                }
              />
            </svg>
            <span className="nb-accuracy-read">
              <b>{`${RESULT.percent}%`}</b>
              <small>Accuracy</small>
            </span>
          </div>

          <p className="nb-results-note">{RESULT.note}</p>

          <div className="nb-card-panel nb-table">
            <div className="nb-table-head">
              <span>Stream</span>
              <span>Caught</span>
              <span>Missed</span>
              <span>False</span>
            </div>
            {RESULT.streams.map((stream, order) => (
              <div className="nb-table-row" key={stream.name}>
                <span className="nb-table-stream">
                  <b>
                    {stream.name}
                    <small>{`${stream.percent}% accurate`}</small>
                  </b>
                  <span
                    className="nb-table-lure"
                    data-spec-anchor={order === 0 ? "lures" : undefined}
                  >
                    {stream.lure}
                  </span>
                </span>
                <span className="nb-table-caught">
                  {stream.hits}
                  <small>{`/${stream.targets}`}</small>
                </span>
                <span className="nb-table-missed">{stream.misses}</span>
                <span className="nb-table-false">{stream.falseAlarms}</span>
              </div>
            ))}
          </div>

          <p className="nb-results-explainer">
            {`Accuracy is the share of matches caught, averaged with the share of non-matches left alone. ${CHANCE_PERCENT}% is what guessing gets. A lure repeats the cue from one step off the count.`}
          </p>

          <div className="nb-results-actions">
            <div className="nb-offer">
              <p>{RESULT.suggestion}</p>
              <span className="nb-offer-button">
                {RESULT.switchTo}
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </span>
            </div>
            <span className="nb-primary">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              Again
            </span>
            <span className="nb-quiet">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
              </svg>
              Change setup
            </span>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------- the home
          `HomeScreen.tsx` after that session, scrolled to its foot, which is where the
          game leaves a player who has just finished: the tail of the setup card going
          out of the top of the frame, the start button and its estimate, the preferences
          card in the state this round was played in, and the ledger with the round as
          its one row. The home screen is taller than the play screen — 980px against
          705 — so a frame of it is a crop of it, and the crop the game shows after a
          session is this one. See `LEDGER` and `TOGGLES`. */}
      {screen === "home" && (
        <div className="nb-app nb-home" key={`home-${run}`}>
          <div className="nb-card-panel nb-setup" aria-hidden="true">
            <div className="nb-setup-row">
              <span className="nb-setup-head">
                <b>Steps back</b>
                <span>{`${N}-back`}</span>
              </span>
              <span className="nb-steps">
                {Array.from({ length: 6 }, (_, index) => (
                  <i key={index} data-on={index + 1 === N}>
                    {index + 1}
                  </i>
                ))}
              </span>
              <small>{`Compare each cue with the one ${N} steps earlier.`}</small>
            </div>
            <div className="nb-setup-row">
              <span className="nb-setup-head">
                <b>Pace</b>
                <span>2.5s per trial</span>
              </span>
              <span className="nb-pace">
                <i />
              </span>
              <span className="nb-pace-ends">
                <small>Brisk</small>
                <small>Unhurried</small>
              </span>
              <small>{`${SCORED_TRIALS} scored trials at this pace.`}</small>
            </div>
          </div>

          <span className="nb-primary">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m6 3 14 9-14 9z" fill="currentColor" />
            </svg>
            Start session
          </span>
          <p className="nb-estimate">About 4:00, whatever the pace.</p>

          <div className="nb-card-panel nb-toggles">
            {TOGGLES.map((toggle) => (
              <span className="nb-toggle" key={toggle.label}>
                <span className="nb-toggle-text">
                  <b>{toggle.label}</b>
                  <small>{toggle.caption}</small>
                </span>
                <i className="nb-switch" data-on={toggle.on} />
              </span>
            ))}
          </div>

          <div className="nb-card-panel nb-ledger">
            <div className="nb-ledger-head">
              <h4 data-spec-anchor="ledger">Last session</h4>
              <span>Clear history</span>
            </div>
            <div className="nb-ledger-lines">
              {LEDGER.streams.map((stream) => (
                <span className="nb-ledger-line" key={stream.name}>
                  <span>
                    <small>{stream.name}</small>
                    <b>{`${Math.round(stream.accuracy * 100)}%`}</b>
                  </span>
                  <Sparkline series={[stream.accuracy]} />
                </span>
              ))}
            </div>
            <div className="nb-ledger-cols">
              <span>Session</span>
              {LEDGER.streams.map((stream) => (
                <span key={stream.name}>{stream.name}</span>
              ))}
            </div>
            <div className="nb-ledger-row">
              <span className="nb-ledger-when">
                <b>{LEDGER.when}</b>
                <small>{LEDGER.setup}</small>
              </span>
              {LEDGER.streams.map((stream) => (
                <span className="nb-ledger-score" key={stream.name}>
                  <b>{`${Math.round(stream.accuracy * 100)}%`}</b>
                  <small>{stream.lures}</small>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------ the site's foot
          Two lines in the site's own type under the column, because neither is a thing
          the game prints. The streams: see `STREAMS`. And the one rule of this game a
          film of it cannot demonstrate — nobody here ever presses wrongly, so every
          answer this scene can show is a correct one. `scoring.ts` scores balanced
          accuracy, the mean of the hit rate and the correct-rejection rate, so an error
          costs the reciprocal of its own class's size: a miss 1/(2 × 28 targets), a false
          press 1/(2 × 65 non-targets), and the miss is worth about 2.3 of the other. */}
      <div className="nb-foot" aria-hidden="true">
        <p className="nb-streams">
          {STREAMS.map((stream) => (
            <span key={stream.name} data-off={!stream.on}>
              {stream.name}
            </span>
          ))}
          <small>dual, or triple</small>
        </p>
        <p className="nb-answer-cost">A miss costs more than a false press</p>
      </div>

      {!still && (
        <PhantomCursor
          stage={stageRef}
          target={CURSOR[beat] ?? null}
          pressing={CLICKS.has(beat)}
          onPress={onPress}
          token={`${run}-${beat}`}
        />
      )}

      {/* The site's claims, on the things they are about. See `SPECS`. */}
      <SpecTags beats={BEATS} beat={beat} tags={SPECS} className="nb-specs" />
    </div>
  );
}
