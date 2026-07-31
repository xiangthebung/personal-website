"use client";

/**
 * PDF Explainer, in four acts.
 *
 * It used to be one: the notes overlay fading as a pointer approached it. That is
 * the product's signature interaction and it was worth showing, but showing only
 * that made a study workspace look like a single hover effect. The app has a
 * floating notes overlay, a tutor you can ask about the slide you are on, and a
 * practice panel with quizzes, cloze cards, worked examples and a matching game.
 * A section that shows one of those is under-selling four.
 *
 * So the scene runs through four of them, and says so: the rail across the top
 * names the parts and lights the one you are watching, which is how a visitor
 * learns there are four without being asked to click anything.
 *
 * What is real. The overlay's numbers are the app's own — 0.26 at rest, 1.0 awake,
 * a 300ms ease-out — and the card prints its own opacity so the mechanism is
 * legible rather than merely felt. The practice cards keep their real tints
 * (violet for quizzes, teal for matching, cyan for the tutor), the tutor's
 * three-dot "Thinking" state and its `Ask about slide N…` placeholder are the
 * real ones, and the deck content is the GPS lecture that ships in the repository.
 * The arrangement is staged: this is a film about the app, not the app.
 */

import { useRef } from "react";
import { PhantomCursor } from "../scene/cursor";
import { useSectionBeat } from "../scene/section-beat";
import { SpecTags, type SpecTag } from "../scene/spec";
import { useStoryboard, type Beat } from "../scene/storyboard";
import { useSceneRun } from "../scene/use-scene-run";
import { useOnScreen } from "../use-on-screen";
import { useSectionFocused } from "../use-section-focus";

/** From `src/demo/demoDeck.ts` — slide 2 of the bundled GPS lecture. */
const SLIDE = {
  number: 2,
  total: 10,
  title: "Measuring Distance via Signal Time-of-Flight",
  bullets: [
    "Pseudorange from transit time",
    "Timing error → position error",
    "1 ns ≈ 30 cm of range",
  ],
};

const NOTE = {
  summary: "Distance is just time, times light",
  lead:
    "GPS measures the time a radio wave takes to reach you. Everything else in the system exists to make that one measurement trustworthy.",
  sensitivity: [
    ["1 millisecond", "300 kilometres"],
    ["1 microsecond", "300 metres"],
    ["3 nanoseconds", "1 metre"],
  ] as Array<[string, string]>,
};

const CHAT = {
  chips: ["Why four satellites?", "Explain pseudorange", "Worked example"],
  asked: "Why four satellites?",
  reply:
    "Three ranges fix you in space. The fourth solves for your receiver's own clock error — the one term you cannot measure directly. That is why a cheap receiver can still keep time to a few nanoseconds.",
};

const QUIZ = {
  question:
    "A GPS timing measurement is off by 1 microsecond. How large is the position error?",
  options: ["300 metres", "3 metres", "30 kilometres", "0.3 millimetres"],
  answer: 0,
  explanation:
    "1 microsecond × the speed of light ≈ 300 m. Timing error and range error are the same quantity in different units.",
};

const MATCH = {
  title: "Terms in this lecture",
  pairs: [
    ["Pseudorange", "A distance that still contains your clock error"],
    ["Ephemeris", "The satellite's own orbit, broadcast to you"],
    ["Ionospheric delay", "Signal slowed by charged particles overhead"],
  ] as Array<[string, string]>,
};

/* --------------------------------- storyboard ------------------------------- */

type BeatName =
  | "slide"
  | "arrive"
  | "resting"
  | "reach"
  | "awake"
  | "split"
  | "ask"
  | "thinking"
  | "answer"
  | "to-quiz"
  | "pick"
  | "verdict"
  | "to-match"
  | "pair-a"
  | "pair-b"
  | "matched"
  | "hold";

/**
 * Four acts, in one list so the pacing is visible.
 *
 * The overlay act is the shortest of the four despite being the signature one: it
 * lands in a second and a half and holding it longer only delays the reveal that
 * there is more here than a hover effect.
 *
 * That reasoning still holds against the other three acts and did not hold against a
 * visitor who has never seen the app. Seventeen beats in sixteen seconds is a beat a
 * second, and four of those beats carry a paragraph of real text — a tutor's answer,
 * a quiz explanation — that cannot be read in a second. The split is now sharper
 * rather than uniformly slower: the seven beats that are a pointer moving or a panel
 * swapping are close to where they were, and the six that ask you to *read something*
 * got most of the extra time. 20.6s, which makes this the longest scene on the page and
 * the one the lap window in `scripts/drive-site.mjs` is sized against.
 *
 * Lengthening the reading beats fixed the panels and left the caption broken, which was
 * reported next: the text under the frame was still changing seventeen times, and ten of
 * those changes were on beats too short to read a sentence in. `split` was the worst —
 * nine words in 700ms, about 771 words a minute. Beat durations are answers to "how long
 * does this movement take" and were being used as answers to "how long does it take to
 * read this". Those are now separate: the beats below are unchanged apart from `hold`,
 * and `CAPTION` groups them into nine lines whose shortest exposure is 1,750ms. See
 * `MIN_CAPTION_MS` in the storyboard hook.
 */
const BEATS: readonly Beat<BeatName>[] = [
  // I. the notes overlay
  // The slide alone, and the only chance to take in what the deck is about before
  // something covers half of it.
  { name: "slide", ms: 1800 },
  { name: "arrive", ms: 600 },
  // 0.26 opacity is the whole mechanism, and 900ms was not long enough for anyone to
  // notice the card was faint before it stopped being faint.
  { name: "resting", ms: 1500 },
  { name: "reach", ms: 600 },
  { name: "awake", ms: 2100 },
  // II. the tutor
  { name: "split", ms: 700 },
  { name: "ask", ms: 950 },
  { name: "thinking", ms: 850 },
  // Three lines of answer. At 1800ms it was gone before the last one was read.
  { name: "answer", ms: 2300 },
  // III. the quiz
  /* Not a bare cut, because this is the beat that presses the Practice tab, and
     `.ghost-cursor` transitions its travel over 620ms. At 600ms the panel had already
     swapped while the pointer was still crossing the frame — filming it showed the
     cursor 45px under the tab it was supposed to be clicking, which is the "cursor
     stranded mid-air" failure the storyboard's own notes warn about. 1000ms is the
     620ms trip plus enough of the 460ms click ring to see it. */
  { name: "to-quiz", ms: 1000 },
  { name: "pick", ms: 750 },
  // A question, four options and the reasoning underneath, all at once.
  { name: "verdict", ms: 2100 },
  // IV. matching
  { name: "to-match", ms: 600 },
  { name: "pair-a", ms: 750 },
  // Same 620ms travel, and this one carries a press too.
  { name: "pair-b", ms: 900 },
  { name: "matched", ms: 1700 },
  /* 800ms, and the line it carries is the one that says there are four parts to this
     app — the single most useful sentence in the scene, on screen for less time than any
     other. It was only clearing the caption floor by borrowing the loop gap. */
  { name: "hold", ms: 1400 },
];

/** Which act each beat belongs to. Drives the rail and the panel's contents. */
const ACT: Record<BeatName, 0 | 1 | 2 | 3> = {
  slide: 0,
  arrive: 0,
  resting: 0,
  reach: 0,
  awake: 0,
  split: 1,
  ask: 1,
  thinking: 1,
  answer: 1,
  "to-quiz": 2,
  pick: 2,
  verdict: 2,
  "to-match": 3,
  "pair-a": 3,
  "pair-b": 3,
  matched: 3,
  hold: 3,
};

const ACT_NAMES = ["Notes overlay", "Tutor", "Quiz", "Matching"] as const;

/**
 * Where the pointer is. Reaching for a thing is what makes it happen.
 *
 * `to-quiz` used to send it to `figure`, which is a diagram on the slide that nothing
 * in that beat has anything to do with. The panel swapped from a tutor conversation
 * to a quiz card with the pointer parked on an unrelated drawing, so the one beat in
 * the scene where the whole right-hand side changes had no cause on screen. It goes
 * to the Practice tab instead, and presses it — which is what a person would have
 * done, and the tab was already there lighting up on its own.
 */
const CURSOR: Partial<Record<BeatName, string>> = {
  reach: "notes",
  awake: "notes",
  ask: "chip",
  thinking: "chip",
  "to-quiz": "practice-tab",
  pick: "option",
  verdict: "option",
  /* Aimed at the first term one beat before it is paired, so the pointer is standing
     on it when the tick appears rather than arriving at it afterwards. Its travel is a
     fixed 620ms whatever the distance, so the only way to have it settled by the beat
     that matters is to send it a beat early. */
  "to-match": "concept",
  "pair-a": "concept",
  "pair-b": "definition",
};

/**
 * There is no caption under this scene, and getting to that took three attempts.
 *
 * It began as one line per act, which described four acts rather than seventeen frames.
 * That became one line per beat, which put a fresh sentence under beats sized for a
 * 600ms cursor glide. Then the narration was stripped out and what remained was worse
 * than either: "It wakes on approach", "Nobody had to tell it which slide you are on" —
 * implementation notes, phrased as though a visitor might be impressed that software
 * knows which page it is displaying.
 *
 * The real problem was never the wording. This section already carries a headline, a
 * reason, an invitation and three notes, and the notes say "Notes sit over the slide,
 * faint until you move towards them" and "Ask it questions about the slide you are
 * looking at" — so the caption was a fifth layer of prose restating the fourth, four
 * inches away, while the scene demonstrated it. And the rail across the top of the frame
 * already names the four parts and lights the one playing.
 *
 * So it is gone. The `ACT_NAMES` rail is the label.
 */
/**
 * Two claims, on the two things making them.
 *
 * The act rail names the four parts and lights the one playing, which is why this scene
 * never needed a caption. What it did need, and what was sitting in a column beside it
 * instead, was the *point* of two of those parts. "Notes sit over the slide, faint until
 * you move towards them" is a description of a mechanism the frame performs but does not
 * name — the card prints `0.26` and then `1.00`, which is the number, not the reason. And
 * "It writes quizzes and flashcards from your own deck" is the one claim in this section
 * that nothing on screen can support: a quiz card looks exactly the same whether a person
 * typed it or the deck produced it.
 *
 * Both leave when their act does, because both are pinned to a panel the next act
 * replaces.
 *
 * Coordinates are percentages of `.pdfx-stage`, not of the pod. The stage is the
 * positioned box the slide and the panel live in — the same box `PhantomCursor` is handed,
 * for the same reason, and there is a long note on `frameRef` below about what happens when
 * something in this scene is measured against the wrong one.
 */
/* Both are anchored a couple of pixels *outside* the left edge of the panel they are about
   and read away from it, into the slide. Inside, they cover the thing they are pointing at:
   the notes card is a solid block of type with no gap big enough, and on the quiz the only
   free space was the kicker row, where the label landed squarely on the "Quiz" chip. The
   slide beside them is a title and three short bullets with room to spare. */
const SPECS: readonly SpecTag<BeatName>[] = [
  { at: "resting", text: "Faint until you reach for it", x: 56, y: 62, side: "left", until: "split" },
  /* "your own deck" is what somebody who works on slide software calls a set of slides. */
  /* Low enough to clear the slide's title. At y 30 the plate ran straight through "Signal
     Time-of-Flight", which is the one piece of text on that side of the frame a visitor is
     actually reading; down here it crosses the figure, which is decorative line art. */
  { at: "to-quiz", text: "Quizzes made from your slides", x: 57, y: 55, side: "left", until: "to-match" },
];

/**
 * The pseudorange equation, typeset.
 *
 * It was the string `"dᵢ = c · (t_receive − t_transmit)"`, and printing a LaTeX source
 * fragment is a strange thing for this section of all sections to do: the app it is a film
 * about renders maths with KaTeX, so a visitor is being shown the one place its output
 * would look wrong. Underscores are the notation you type, not the notation you read.
 *
 * Real `<sub>` elements rather than Unicode subscripts, because the alphabet does not go
 * far enough — there is no subscript r, c or v, so "receive" cannot be spelled that way at
 * all. Which is presumably how it ended up as an underscore.
 */
function RangeEquation() {
  return (
    <>
      d<sub>i</sub> = c · (t<sub>receive</sub> − t<sub>transmit</sub>)
    </>
  );
}

const LETTERS = ["A", "B", "C", "D"];

export function PdfExplainerDemo() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  /**
   * The box the cursor is *positioned inside*, which is not the box the scene is
   * measured by.
   *
   * `PhantomCursor` converts its target's position into percentages of whatever
   * element it is handed, and writes them as `left`/`top` — which the browser then
   * resolves against the nearest positioned ancestor. Here the cursor is rendered
   * inside `.pdfx-stage` while every other hook wants the root `.pdfx`, and the root
   * is taller than the stage by an act rail and a caption. Handing it the root meant
   * every percentage was computed against one box and applied to a shorter one, so
   * the pointer landed progressively further below its target the nearer the target
   * was to the top of the frame. It was tolerable while the highest thing it aimed at
   * was the notes card, which sits near the middle; it became obvious the moment it
   * was asked to press a tab in the panel's top row and landed 45px under it.
   *
   * Two refs, then. This one for the cursor's geometry, `stageRef` for everything
   * else — `--beat-t`, the intersection observer and the section's beat attributes all
   * belong to the root.
   */
  const frameRef = useRef<HTMLDivElement | null>(null);
  const onScreen = useOnScreen(stageRef);
  /* Starts on focus, not on approach. Four acts in twenty seconds is a scene a visitor
     has to catch from the top; joining it at the tutor is joining it halfway. */
  const running = useSceneRun(useSectionFocused(stageRef), onScreen);
  const { beat, index, run, still } = useStoryboard(BEATS, {
    running,
    stage: stageRef,
    // The still that carries the argument: notes awake, slide still visible.
    stillBeat: "awake",
  });

  // Notes, tutor, quiz and matching fragments reorganise around the whole section.
  useSectionBeat(stageRef, beat, BEATS);

  const at = (name: BeatName) => BEATS.findIndex((entry) => entry.name === name);
  const act = ACT[beat];

  const notesPresent = index >= at("arrive") && act === 0;
  const awake = beat === "reach" || beat === "awake";
  const split = act > 0;

  const asked = index >= at("ask");
  const thinking = beat === "thinking";
  const answered = index >= at("answer") && act === 1;

  const picked = index >= at("pick");
  const revealed = index >= at("verdict");

  const pairedA = index >= at("pair-a");
  const pairedB = index >= at("pair-b");
  const pairedC = index >= at("matched");

  return (
    <div
      className="pdfx"
      ref={stageRef}
      data-beat={beat}
      data-act={act}
      data-lap={run}
      role="img"
      aria-label={
        "Four parts of a lecture-study workspace in sequence. A notes card floats " +
        "over a slide at a quarter opacity and becomes fully legible when the " +
        "pointer approaches it. A tutor panel answers a question about the slide. " +
        "A quiz question is answered and marked. A matching exercise pairs three " +
        "terms with their definitions."
      }
    >
      {/* The rail. Not navigation — a label, so four parts read as four parts. */}
      <ol className="pdfx-acts" aria-hidden="true">
        {ACT_NAMES.map((name, order) => (
          <li key={name} data-on={order === act} data-done={order < act}>
            <span className="pdfx-act-dot" />
            {name}
          </li>
        ))}
      </ol>

      <div className="pdfx-stage" ref={frameRef} data-split={split}>
        {/* The slide never gives up a pixel to the overlay; it makes room only when
            the workspace splits for a panel, which is what the app does too. */}
        <div className="pdfx-slide">
          <span className="pdfx-slide-rule" aria-hidden="true" />
          <h4>{SLIDE.title}</h4>
          <ul>
            {SLIDE.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>

          {/* The thing the notes must not cover up. */}
          <div className="pdfx-figure" data-target="figure" aria-hidden="true">
            <svg viewBox="0 0 260 120" role="presentation">
              <g fill="none" stroke="currentColor" strokeWidth="1.4">
                <circle cx="42" cy="26" r="9" />
                <circle cx="130" cy="18" r="9" />
                <circle cx="216" cy="30" r="9" />
                <path d="M42 35 L128 98" strokeDasharray="4 4" />
                <path d="M130 27 L130 96" strokeDasharray="4 4" />
                <path d="M216 39 L132 98" strokeDasharray="4 4" />
                <rect x="118" y="98" width="24" height="14" rx="3" />
              </g>
              <text x="130" y="70" fontSize="9" textAnchor="middle" fill="currentColor">
                d = c · Δt
              </text>
            </svg>
          </div>

          <span className="pdfx-slide-number" aria-hidden="true">
            {SLIDE.number} / {SLIDE.total}
          </span>
        </div>

        {/* ------------------------------------------------- I. notes overlay */}
        <div
          className="pdfx-notes"
          data-present={notesPresent}
          data-awake={awake}
          data-target="notes"
          aria-hidden="true"
        >
          <span className="pdfx-notes-backing" />

          <div className="pdfx-notes-bar">
            <span className="pdfx-notes-eyebrow">Notes overlay</span>
            <span className="pdfx-opacity">{awake ? "1.00" : "0.26"}</span>
          </div>

          <div className="pdfx-notes-body">
            <div className="pdfx-chips">
              <span className="pdfx-chip pdfx-chip--violet">Slide {SLIDE.number}</span>
            </div>
            <h5>{NOTE.summary}</h5>
            <p>{NOTE.lead}</p>
            <p className="pdfx-equation">
              <RangeEquation />
            </p>
            <dl className="pdfx-sensitivity">
              {NOTE.sensitivity.map(([error, effect]) => (
                <div key={error}>
                  <dt>{error} of clock error</dt>
                  <dd>{effect}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* ------------------------------- II–IV. the panel beside the slide */}
        <aside className="pdfx-panel" data-open={split} aria-hidden="true">
          <div className="pdfx-panel-tabs">
            <span data-on={act === 1}>Tutor</span>
            {/* Named as a cursor target so the beat that swaps this panel's whole
                contents has something visible causing it. See `CURSOR`. */}
            <span data-on={act >= 2} data-target="practice-tab">
              Practice
            </span>
          </div>

          {act === 1 && (
            <div className="pdfx-chat" key={`chat-${run}`}>
              {asked && (
                <p className="pdfx-bubble pdfx-bubble--user">{CHAT.asked}</p>
              )}

              {thinking && (
                <p className="pdfx-bubble pdfx-bubble--bot pdfx-thinking">
                  <i />
                  <i />
                  <i />
                </p>
              )}

              {answered && (
                <p className="pdfx-bubble pdfx-bubble--bot">{CHAT.reply}</p>
              )}

              <div className="pdfx-suggest">
                {CHAT.chips.map((chip, order) => (
                  <span
                    key={chip}
                    data-target={order === 0 ? "chip" : undefined}
                    data-picked={order === 0 && asked}
                  >
                    {chip}
                  </span>
                ))}
              </div>

              <p className="pdfx-composer">Ask about slide {SLIDE.number}…</p>
            </div>
          )}

          {act === 2 && (
            <section className="pdfx-card pdfx-card--violet" key={`quiz-${run}`}>
              <p className="pdfx-card-kicker">
                <span className="pdfx-chip pdfx-chip--violet">Quiz</span>
                Slide {SLIDE.number}
              </p>
              <p className="pdfx-question">{QUIZ.question}</p>

              <div className="pdfx-options">
                {QUIZ.options.map((option, order) => {
                  const isAnswer = order === QUIZ.answer;
                  const chosen = picked && isAnswer;
                  const state = revealed && isAnswer ? "reveal" : revealed ? "dim" : chosen ? "chosen" : "idle";
                  return (
                    <span
                      key={option}
                      className="pdfx-option"
                      data-state={state}
                      data-target={isAnswer ? "option" : undefined}
                    >
                      <span className="pdfx-option-letter">
                        {revealed && isAnswer ? "✓" : LETTERS[order]}
                      </span>
                      {option}
                    </span>
                  );
                })}
              </div>

              {revealed && (
                <p className="pdfx-verdict">
                  <strong>Correct.</strong> {QUIZ.explanation}
                </p>
              )}
            </section>
          )}

          {act === 3 && (
            <section className="pdfx-card pdfx-card--teal" key={`match-${run}`}>
              <p className="pdfx-card-kicker">
                <span className="pdfx-chip pdfx-chip--teal">Matching</span>
                {MATCH.title}
              </p>

              <div className="pdfx-match">
                <ul>
                  {MATCH.pairs.map(([term], order) => (
                    <li
                      key={term}
                      data-matched={[pairedA, pairedB, pairedC][order]}
                      data-target={order === 0 ? "concept" : undefined}
                    >
                      {term}
                      <i className="pdfx-tick">✓</i>
                    </li>
                  ))}
                </ul>
                {/* Definitions are deliberately out of order — a matching exercise
                    where the rows line up is not an exercise. */}
                <ul>
                  {[1, 2, 0].map((source, order) => (
                    <li
                      key={MATCH.pairs[source][1]}
                      data-matched={[pairedB, pairedC, pairedA][order]}
                      data-target={source === 0 ? "definition" : undefined}
                    >
                      {MATCH.pairs[source][1]}
                      <i className="pdfx-tick">✓</i>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </aside>

        {!still && (
          <PhantomCursor
            stage={frameRef}
            target={CURSOR[beat] ?? null}
            pressing={
              beat === "ask" || beat === "to-quiz" || beat === "pick" || beat === "pair-b"
            }
            token={`${run}-${beat}`}
          />
        )}

        {/* Inside the stage, for the same reason the cursor is: these are percentages of
            the box the slide and the panel are laid out in, and the pod around it is taller
            by an act rail. See `SPECS`. */}
        <SpecTags beats={BEATS} beat={beat} tags={SPECS} className="pdfx-specs" />
      </div>

      {/* Still no caption. The act rail across the top names the four parts and lights the
          one you are watching, and the two labels inside the stage carry the only claims
          the frame cannot make on its own. */}
    </div>
  );
}
