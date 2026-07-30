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
import { useOnScreen } from "../use-on-screen";

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

const BEATS: readonly Beat<BeatName>[] = [
  { name: "empty", ms: 1000 },
  { name: "cue-1", ms: 1150 },
  { name: "cue-2", ms: 1150 },
  { name: "cue-3", ms: 1000 },
  // Long enough to read the bracket and the verdict. This is the beat that
  // teaches, so it gets the most time on screen.
  { name: "match-square", ms: 1900 },
  { name: "cue-4", ms: 1000 },
  { name: "match-letter", ms: 1900 },
  { name: "hold", ms: 900 },
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
  const { beat, run } = useStoryboard(BEATS, {
    running: onScreen,
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
                data-target={Boolean(answering) && isTarget}
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
      <div className="nb-answers">
        <span className="nb-answer" data-lit={answering === "letter"}>
          <kbd>A</kbd>
          <span className="nb-answer-name">Sound</span>
          <span className="nb-answer-verdict">
            {answering === "letter" ? "Hit" : ""}
          </span>
        </span>
        <span className="nb-answer" data-lit={answering === "square"}>
          <kbd>L</kbd>
          <span className="nb-answer-name">Square</span>
          <span className="nb-answer-verdict">
            {answering === "square" ? "Hit" : ""}
          </span>
        </span>
      </div>

      <p className="nb-caption" aria-hidden="true">
        {answering === "square" ? (
          <>
            <strong>Cue 3 is cue 1&apos;s square.</strong> Different letter, so only one
            of the two answers is right.
          </>
        ) : answering === "letter" ? (
          <>
            <strong>Cue 4 is cue 2&apos;s letter.</strong> Different square. The streams
            are scored separately.
          </>
        ) : (
          <>
            <strong>Hold two.</strong> Compare what arrives against what arrived two
            cues ago, then let the oldest one go.
          </>
        )}
      </p>
    </div>
  );
}
