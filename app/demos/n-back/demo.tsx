"use client";

/**
 * N-Back, as a diagram that moves.
 *
 * This one had the furthest to fall. It used to be the game: mode and steps-back
 * and pace controls, a real twenty-trial session, keyboard handling, scoring on
 * balanced accuracy. All of that worked, and all of it was the wrong thing to put
 * on a page whose job is to make someone curious enough to open the project.
 * Nobody arrives at a portfolio willing to concentrate for four minutes.
 *
 * What is worth showing instead is the one idea the whole game rests on, which
 * almost every description of n-back fails to convey in words: you are not
 * remembering a list, you are comparing the cue on screen now against the cue from
 * exactly two steps ago, and the cue in between is noise you have to hold anyway.
 *
 * So the memory strip is the star. Cues arrive into it, it slides, and when the
 * new cue matches the one two places back a bracket snaps between them and the
 * answer key lights. It shows both streams — a square and a spoken letter, scored
 * separately — and it shows a match in one stream that is not a match in the
 * other, because that asymmetry is the part people get wrong.
 *
 * Nothing here is the game's code. The session engine, the sequence planner, the
 * scoring and the audio shim were all deleted along with the playable version;
 * keeping them to drive an animation would have been carrying a car engine to
 * push a trolley. The letters are the project's own set, chosen for not rhyming.
 */

import { useRef } from "react";
import { useSectionBeat } from "../scene/section-beat";
import { useStoryboard, type Beat } from "../scene/storyboard";
import { useSceneRun } from "../scene/use-scene-run";
import { useOnScreen } from "../use-on-screen";
import { useSectionFocused } from "../use-section-focus";

/** The project's letter set: eight consonants picked for not sounding alike. */
const LETTERS = ["C", "H", "K", "L", "Q", "R", "S", "T"] as const;

type BeatName =
  | "empty"
  | "cue-1"
  | "cue-2"
  | "cue-3"
  | "match-square"
  | "cue-4"
  | "match-letter"
  | "hold";

/**
 * Eight beats, thirteen and a half seconds.
 *
 * This scene is a lesson rather than a demonstration, and a lesson has to give you
 * time to do the comparison yourself. The four cue beats were around a second each,
 * which is roughly the real game's pace — and the real game is a thing you have
 * already learned the rules of. Somebody meeting the two-back rule for the first time
 * has to look at the new cue, find the slot two places back, and hold both in mind
 * before the bracket tells them the answer. A second is not enough for the first of
 * those, let alone all three.
 *
 * So the cue beats are 1.5s, the two beats where the bracket and the verdict are on
 * screen are 2.4s, and `empty` is long enough to read the strip's own heading — "what
 * you are holding", "2 back" — before anything starts arriving into it. Up from 10s.
 */
const BEATS: readonly Beat<BeatName>[] = [
  // Four empty slots and the rule, before there is anything to apply it to.
  { name: "empty", ms: 1400 },
  { name: "cue-1", ms: 1600 },
  { name: "cue-2", ms: 1500 },
  // The repeat has already happened here and nothing has pointed it out yet. That
  // gap is the teaching, so it needs long enough for the visitor to spot it first.
  { name: "cue-3", ms: 1500 },
  // Long enough to read the bracket and the verdict. This is the beat that
  // teaches, so it gets the most time on screen.
  { name: "match-square", ms: 2400 },
  { name: "cue-4", ms: 1500 },
  { name: "match-letter", ms: 2400 },
  /* 1400 rather than 1200 so the closing line clears the caption floor on its own,
     instead of borrowing the storyboard's 1100ms loop gap to get there. */
  { name: "hold", ms: 1400 },
];

/**
 * The cues, and why these ones.
 *
 * Cue 3 repeats cue 1's square but not its letter. Cue 4 repeats cue 2's letter
 * but not its square. So the sequence demonstrates, in four cues, that the two
 * streams are scored independently — which is the single most misunderstood thing
 * about dual n-back and cannot be shown with a sequence where both match at once.
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

/** How many cues have arrived by the end of each beat. */
const ARRIVED: Record<BeatName, number> = {
  empty: 0,
  "cue-1": 1,
  "cue-2": 2,
  "cue-3": 3,
  "match-square": 3,
  "cue-4": 4,
  "match-letter": 4,
  hold: 4,
};

/** Which stream is being answered, if any. */
const ANSWERING: Partial<Record<BeatName, "square" | "letter">> = {
  "match-square": "square",
  "match-letter": "letter",
};

/**
 * The caption, one line per beat.
 *
 * It had three lines: one for each of the two match beats, and one shared by the four
 * beats where cues are arriving. That shared line — "hold two, compare what arrives
 * against what arrived two cues ago, then let the oldest one go" — is a statement of
 * the rule, and it was on screen through `empty`, when nothing had arrived, and
 * through `cue-1` and `cue-2`, when there was nothing two cues back to compare
 * against. It described the scene in general and none of those frames in particular.
 *
 * The rule is still stated, but only where a frame is showing it. The rest of the time
 * the caption counts along with the strip, which is the thing a first-time visitor
 * needs help doing: knowing which slot they are supposed to be looking at.
 */
/**
 * The only scene on the page that still has a caption, and the only one that needs one.
 *
 * Every other scene lost its caption because the section around it already said the same
 * thing three times over. This one is different in kind: n-back is a *rule*, not an
 * interface, and no amount of watching squares light up will tell a first-time visitor
 * that they are supposed to be comparing each cue against the one two before it. A
 * static bullet cannot do it either, because the interesting part is *which slot* to look
 * at *right now* — which changes every beat and is the whole difficulty of the task.
 *
 * So these lines point. What went were the announcements — "Cue 1 arrives", "Cue 2.",
 * "Cue 3." — which read the strip aloud to somebody already looking at it, and the strip
 * numbers its own slots.
 */
const CAPTION: Record<BeatName, readonly [string, string]> = {
  empty: ["Compare each cue against the one two back.", ""],
  "cue-1": ["", ""],
  "cue-2": ["Nothing to compare against yet.", ""],
  "cue-3": ["Two back from here is cue 1.", ""],
  "match-square": [
    "Same square as cue 1. Different letter.",
    "So one of the two answers is right and the other is not.",
  ],
  "cue-4": ["Two back from here is cue 2.", ""],
  "match-letter": ["Same letter as cue 2. Different square.", "The streams score apart."],
  hold: ["One key for the square, one for the sound.", ""],
};

/**
 * The streams, named.
 *
 * "Watch a square and hear a letter. Triple adds a colour." was a written note beside this
 * scene, and two thirds of it were already on screen — the board and the spoken letter are
 * the first thing the scene does. The third was not, and could not be: there is no colour
 * stream in this demonstration, so nothing in the frame could ever hint that the game has
 * one. Naming all three in a row of chips costs six words and puts the whole shape of the
 * game on screen.
 *
 * `data-off` on the third is doing real work rather than styling: it says *this exists and
 * is not what you are watching*, which is the only honest way to show a mode the scene is
 * not running.
 */
const STREAMS = [
  { name: "Square", on: true },
  { name: "Sound", on: true },
  { name: "Colour", on: false },
] as const;

const N = 2;

/** A 3×3 board with one cell lit. `cell` of -1 lights nothing. */
function Board({ cell, small = false }: { cell: number; small?: boolean }) {
  return (
    <span className={small ? "nb-mini" : "nb-board"} aria-hidden="true">
      {Array.from({ length: 9 }, (_, index) => (
        <span key={index} data-on={index === cell} />
      ))}
    </span>
  );
}

export function NBackDemo() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const onScreen = useOnScreen(stageRef);
  /* Starts on focus. This scene teaches a rule in order — cue 1, cue 2, then the first
     comparison — and joining it at cue 3 teaches nothing. */
  const running = useSceneRun(useSectionFocused(stageRef), onScreen);
  const { beat, run } = useStoryboard(BEATS, {
    running,
    stage: stageRef,
    // The still that carries the argument: the bracket drawn between a cue and the
    // cue two places behind it.
    stillBeat: "match-square",
  });

  // Earlier cues remain projected behind the board after the board has moved on.
  useSectionBeat(stageRef, beat, BEATS);

  const arrived = ARRIVED[beat];
  const answering = ANSWERING[beat];
  const current = arrived > 0 ? CUES[arrived - 1] : undefined;

  /* The strip always shows four slots so it does not resize as cues land. Slots
     beyond what has arrived are drawn empty. */
  const slots = Array.from({ length: 4 }, (_, index) =>
    index < arrived ? CUES[index] : undefined,
  );

  return (
    <div
      className="nb"
      ref={stageRef}
      data-beat={beat}
      data-lap={run}
      data-answering={answering ?? "none"}
      role="img"
      aria-label={
        "A demonstration of the two-back rule. Cues arrive one at a time, each a " +
        "square on a three-by-three grid and a spoken letter. The third cue repeats " +
        "the first cue's square, which is a match in the position stream, and the " +
        "fourth repeats the second cue's letter, which is a match in the sound " +
        "stream. The two streams are scored separately. The letters are drawn from " +
        LETTERS.join(", ") +
        " — eight consonants chosen for not sounding alike."
      }
    >
      {/* ------------------------------------------------------------ the cue now */}
      <div className="nb-now">
        <div className="nb-stage">
          <Board cell={current?.cell ?? -1} />
          {/* The spoken letter. The real game says it out loud; a page that starts
              talking because you scrolled to it is a page you close. */}
          <span className="nb-voice" data-on={Boolean(current)}>
            {/* Remounted per beat so this gesture finishes instead of keeping
                three compositor animations alive for the whole scene. */}
            <span className="nb-wave" key={`${run}-${beat}`} aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <strong>{current?.letter ?? ""}</strong>
          </span>
        </div>

        <p className="nb-now-label">
          {arrived === 0 ? "waiting" : `cue ${arrived}`}
        </p>

        {/* What a cue is made of, including the one this demonstration does not run.
            See `STREAMS`. */}
        <p className="nb-streams" aria-hidden="true">
          {STREAMS.map((stream) => (
            <span key={stream.name} data-off={!stream.on}>
              {stream.name}
            </span>
          ))}
          <small>dual, or triple</small>
        </p>
      </div>

      {/* -------------------------------------------------------- the memory strip */}
      <div className="nb-memory">
        <p className="nb-memory-head">
          What you are holding
          <span>{N} back</span>
        </p>

        <ol className="nb-strip">
          {slots.map((cue, index) => {
            const isCurrent = index === arrived - 1;
            const isTarget = index === arrived - 1 - N;
            return (
              <li
                key={`${run}-${index}`}
                data-filled={Boolean(cue)}
                data-current={isCurrent}
                /* Marked from the moment the cue lands, not from the moment the
                   bracket is drawn. It used to be `answering && isTarget`, so on
                   `cue-3` and `cue-4` a new cue appeared and the visitor was left to
                   work out for themselves which of the four slots two-back meant —
                   and then the bracket arrived a beat later and answered it for them,
                   which is the wrong way round for a lesson. Now the slot being
                   compared against lights up with the cue, and the beat after it says
                   what the comparison found. Nothing new in the stylesheet: this is
                   the same attribute and the same tint as before, one beat earlier. */
                data-target={isTarget}
              >
                <Board cell={cue?.cell ?? -1} small />
                <span className="nb-slot-letter">{cue?.letter ?? ""}</span>
                <span className="nb-slot-index">{cue ? index + 1 : ""}</span>
              </li>
            );
          })}
        </ol>

        {/* The bracket: drawn between the current cue and the one two back, and the
            whole reason this layout exists. Its width and offset come from the
            slot geometry, so it lands on the right pair at any size. */}
        <span
          className="nb-bracket"
          data-showing={Boolean(answering)}
          style={{ "--from": Math.max(0, arrived - 1 - N), "--span": N } as React.CSSProperties}
          aria-hidden="true"
        >
          <span className="nb-bracket-label">
            {answering === "square" ? "same square" : "same letter"}
          </span>
        </span>
      </div>

      {/* ------------------------------------------------------------- the answer */}
      {/* The two keys. The verdict column read "Hit", which is the game's own scoring
          word and means nothing to somebody who has not played it — "hit" what? It
          says "Match" now: the same event, named after what is on the strip rather
          than after how it would be scored. */}
      <div className="nb-answers">
        <span className="nb-answer" data-lit={answering === "letter"}>
          <kbd>A</kbd>
          <span className="nb-answer-name">Sound</span>
          <span className="nb-answer-verdict">
            {answering === "letter" ? "Match" : ""}
          </span>
        </span>
        <span className="nb-answer" data-lit={answering === "square"}>
          <kbd>L</kbd>
          <span className="nb-answer-name">Square</span>
          <span className="nb-answer-verdict">
            {answering === "square" ? "Match" : ""}
          </span>
        </span>

        {/* The one rule of this game that a film of it cannot demonstrate.
            Everything else the section used to claim in a column beside the scene is now
            shown by the scene: the square and the letter arrive together, the strip numbers
            its slots, the bracket names the comparison, and the two keys light separately.
            The scoring is the exception, and it is an interesting exception — nobody is
            pressing anything here, so every answer this scene can ever show is a correct
            one. "Pressing everything scores worse than pressing nothing" is therefore
            unshowable and has to be said, and the place to say it is beside the two keys it
            is about rather than four inches to the left of the frame. */}
        <span className="nb-answer-cost">A false press costs more than a miss</span>
      </div>

      <p className="nb-caption" aria-hidden="true">
        <strong>{CAPTION[beat][0]}</strong>
        {CAPTION[beat][1] && ` ${CAPTION[beat][1]}`}
      </p>
    </div>
  );
}
