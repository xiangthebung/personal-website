"use client";

/**
 * PDF Explainer, in three parts.
 *
 * It used to be one: the notes overlay fading as a pointer approached it. That is
 * the product's signature interaction and it was worth showing, but showing only
 * that made a study workspace look like a single hover effect. The app has a
 * floating notes overlay, a tutor you can ask about the slide you are on, and a
 * practice panel that builds a review set out of the whole deck.
 *
 * So the scene runs through all three, and says so: the rail across the top names the
 * parts and lights the one you are watching, which is how a visitor learns there are
 * three without being asked to click anything.
 *
 * IT WAS FOUR, AND THE FOURTH WAS A MISREADING
 *
 * The rail read "Notes overlay · Tutor · Quiz · Matching", which tells a visitor the
 * application has a matching feature standing beside its quiz feature. Reading
 * `src/workspace/PracticePanel.tsx` settles it: there is one Practice panel, it plans a
 * mixed set across the deck, and `KINDS` gives that set three kinds of item — multiple
 * choice, match the pairs, fill in the blank — which the panel itself surfaces as a filter
 * row that counts each kind. So matching is not a peer of the quiz; it is one of the
 * shapes a question can take. The practice act is one act now and it plays all three,
 * with the panel's own header and filters above them saying what they are.
 *
 * What is real. The overlay's numbers are the app's own — 0.26 at rest, 1.0 awake, a 300ms
 * ease-out — and the card prints its own opacity so the mechanism is legible rather than
 * merely felt. The three item kinds keep their real tints and labels from `KINDS` (violet,
 * teal, amber), the matching game is the real interaction — tap a term, tap its
 * definition, three times over — the cloze card's `?????`, its "Type the missing term"
 * field and its "That is it" are the real ones, the tutor's three-dot "Thinking" state and
 * its `Ask about slide N…` placeholder are the real ones, and the deck content is the GPS
 * lecture that ships in the repository. The arrangement is staged: this is a film about
 * the app, not the app.
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

/**
 * The tutor panel's furniture, and the chips are the app's rather than this scene's.
 *
 * They used to read "Why four satellites?", "Explain pseudorange", "Worked example" — three
 * plausible questions about this deck, and three strings `ChatPanel.tsx` never puts on
 * screen. Its `SUGGESTIONS` are four fixed prompts that do not vary with the document,
 * which is a real design decision the scene was overwriting with a better-looking one.
 *
 * `asked` is `chips[0]` because the cursor presses the first chip; the two have to agree or
 * the bubble that appears is not the one that was clicked. The reply is staged — it comes
 * out of a model in the real app — but it now answers the prompt actually pressed.
 */
const CHAT = {
  chips: [
    "Explain this slide as simply as possible",
    "Why does this matter?",
    "Walk me through the maths step by step",
    "Give me a concrete example",
  ],
  asked: "Explain this slide as simply as possible",
  reply:
    "A satellite says when it sent a signal. Your phone notes when it arrived, multiplies the difference by the speed of light, and that is the distance. Everything else in the system exists to make that one subtraction trustworthy.",
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
  /* Deliberately out of order — a matching exercise where the rows line up is not an
     exercise. These are display positions holding pair indices, so `[1, 2, 0]` puts
     Ephemeris's definition first and Pseudorange's last. The real game shuffles both
     columns with `shuffle()`; a film cannot, because the pointer's route has to be the
     same every lap. */
  order: [1, 2, 0],
};

/**
 * The third practice kind, from `src/practice/ClozeCard.tsx`.
 *
 * It answers the same question the tutor did two acts earlier, on purpose: a review set
 * is drawn from the deck you have been reading, so being asked to recall the thing that
 * was just explained is the mechanism working rather than the scene repeating itself.
 */
const CLOZE = {
  before: "Three satellite ranges fix you in space. The fourth solves for your receiver's own",
  answer: "clock error",
  after: ".",
};

/**
 * The practice panel's three kinds, with the labels and tints the application uses.
 *
 * From `KINDS` and `FILTERS` in `src/workspace/PracticePanel.tsx`. Worth copying exactly,
 * because getting this wrong is what this scene previously got wrong: it presented
 * matching as a fourth part of the application, a peer of the notes overlay and the
 * tutor. It is not. There is one Practice panel, it builds a mixed set out of the whole
 * deck, and multiple choice, matching and blanks are three kinds of item inside it —
 * which the panel says out loud with a filter row that counts each kind.
 */
const KINDS = [
  { id: "quiz", filter: "Quiz", label: "Multiple choice", tint: "violet" },
  { id: "match", filter: "Match", label: "Match the pairs", tint: "teal" },
  { id: "cloze", filter: "Blanks", label: "Fill in the blank", tint: "amber" },
] as const;

type Kind = (typeof KINDS)[number]["id"];

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
  | "to-practice"
  | "pick"
  | "verdict"
  | "to-match"
  | "term-a"
  | "pair-a"
  | "term-b"
  | "pair-b"
  | "term-c"
  | "pair-c"
  | "matched"
  | "to-blank"
  | "typing"
  | "check"
  | "solved";

/**
 * Three parts, in one list so the pacing is visible.
 *
 * It was four, and the fourth was wrong. The rail read "Notes overlay · Tutor · Quiz ·
 * Matching", which says the application has a matching feature standing beside its quiz
 * feature. It does not: there is a Practice panel, it builds one mixed review set from
 * the whole deck, and multiple choice, matching and blanks are three *kinds of item* in
 * that set — see `KINDS`, copied from the panel's own filter row. So the practice act is
 * one act now and it plays all three kinds, which also fixes the smaller half of the same
 * report: the matching game is three pairs and six taps, and the scene was doing one.
 *
 * The overlay act is the shortest despite being the signature one: it lands in a second
 * and a half and holding it longer only delays the reveal that there is more here than a
 * hover effect.
 *
 * The beats that ask you to *read something* carry the time; the ones that are a pointer
 * moving or a panel swapping stay short. That split was the fix for a report that the
 * page moved text too fast, and none of those figures have been touched here: `resting`
 * is 1500ms because 0.26 opacity is the whole mechanism, `answer` is 2300ms because it is
 * three lines of prose, `verdict` 2100ms because it is a question, four options and the
 * reasoning at once.
 *
 * 24.6s, which makes this comfortably the longest scene on the page and the one the lap
 * window in `scripts/drive-site.mjs` is sized against. It is long because it is now
 * showing five things rather than four, and the alternative — trimming the reading beats
 * to buy the room — is undoing a fix that was asked for twice.
 *
 * The twelve short beats in the practice act are all the same shape and are all sized the
 * same way: a flight, 90ms to settle, 150ms of press, and enough of the 460ms ring to see
 * it before the next click's ring replaces it. See the note in `scene/cursor.tsx` for why
 * that arithmetic lives here at all.
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
  // III. practice, first item: multiple choice
  /* Not a bare cut, because this is the beat that presses the Practice tab. At 600ms the
     panel had already swapped while the pointer was still crossing the frame — filming it
     showed the cursor 45px under the tab it was supposed to be clicking. It is the
     longest flight in the scene, being the only one that starts from outside the frame. */
  { name: "to-practice", ms: 1150 },
  // Practice tab to the answer, which is a short hop, then the press.
  { name: "pick", ms: 900 },
  // A question, four options and the reasoning underneath, all at once.
  { name: "verdict", ms: 2100 },
  // III. practice, second item: match the pairs
  /* The card swaps in and the pointer crosses to the first term. It does not press here —
     the press is the next beat — because a card that mounts with a 340ms entrance
     transform is a card that has not finished arriving when the beat starts. */
  { name: "to-match", ms: 700 },
  /* Six taps: a term, then its definition, three times over. The real game is exactly
     this — `pickConcept` then `pickDefinition`, and a matching pair locks green — and the
     scene used to do one of the six, which is what got reported.
     600ms each. Long enough for a cross-column hop (about 250ms), the settle and the
     press, and to leave the ring most of its 460ms before the next tap starts a new one. */
  { name: "term-a", ms: 600 },
  { name: "pair-a", ms: 600 },
  { name: "term-b", ms: 600 },
  { name: "pair-b", ms: 600 },
  { name: "term-c", ms: 600 },
  { name: "pair-c", ms: 600 },
  // "Matched with no misses", and the board green.
  { name: "matched", ms: 1300 },
  // III. practice, third item: fill in the blank
  // The pointer crosses to the field and clicks into it.
  { name: "to-blank", ms: 700 },
  // The answer typed, on a `steps()` reveal. See `.pdfx-typed`.
  { name: "typing", ms: 1100 },
  { name: "check", ms: 700 },
  // The blank filled, and the last of the three items done.
  { name: "solved", ms: 1600 },
];

/**
 * Which act each beat belongs to. Drives the rail and the panel's contents.
 *
 * Every practice beat is act 2, which is the correction: twelve of these used to be
 * spread across acts 2 and 3 as though a quiz and a matching game were different parts of
 * the application.
 */
const ACT: Record<BeatName, 0 | 1 | 2> = {
  slide: 0,
  arrive: 0,
  resting: 0,
  reach: 0,
  awake: 0,
  split: 1,
  ask: 1,
  thinking: 1,
  answer: 1,
  "to-practice": 2,
  pick: 2,
  verdict: 2,
  "to-match": 2,
  "term-a": 2,
  "pair-a": 2,
  "term-b": 2,
  "pair-b": 2,
  "term-c": 2,
  "pair-c": 2,
  matched: 2,
  "to-blank": 2,
  typing: 2,
  check: 2,
  solved: 2,
};

const ACT_NAMES = ["Notes overlay", "Tutor", "Practice"] as const;

/** Which kind of practice item is on screen, for the beats inside act 2. */
const MODE: Partial<Record<BeatName, Kind>> = {
  "to-practice": "quiz",
  pick: "quiz",
  verdict: "quiz",
  "to-match": "match",
  "term-a": "match",
  "pair-a": "match",
  "term-b": "match",
  "pair-b": "match",
  "term-c": "match",
  "pair-c": "match",
  matched: "match",
  "to-blank": "cloze",
  typing: "cloze",
  check: "cloze",
  solved: "cloze",
};

/**
 * Where the pointer is. Reaching for a thing is what makes it happen.
 *
 * The beat that opens the practice panel used to send it to `figure`, a diagram on the
 * slide that nothing in that beat has anything to do with. The panel swapped from a tutor
 * conversation to a quiz card with the pointer parked on an unrelated drawing, so the one
 * beat in the scene where the whole right-hand side changes had no cause on screen. It
 * goes to the Practice tab instead, and presses it.
 *
 * The matching run is twelve entries for six taps, and it is written out rather than
 * generated because the pointer's route is the design: the definitions are shown out of
 * order (`MATCH.order`), so each pair is a diagonal across the card rather than a step
 * down a list, and it is worth being able to read that route off the page.
 *
 * Each pair is aimed a beat early — `to-match` sends the pointer to the first term, and
 * `term-a` is the beat that presses it. The component times a press against its own
 * flight now, so this is no longer strictly necessary; it is kept because a card that
 * mounts with an entrance transform has not finished arriving when its beat begins, and a
 * beat of approach absorbs that.
 */
const CURSOR: Partial<Record<BeatName, string>> = {
  reach: "notes",
  awake: "notes",
  ask: "chip",
  thinking: "chip",
  "to-practice": "practice-tab",
  pick: "option",
  verdict: "option",
  "to-match": "term-0",
  "term-a": "term-0",
  "pair-a": "def-0",
  "term-b": "term-1",
  "pair-b": "def-1",
  "term-c": "term-2",
  "pair-c": "def-2",
  // Stays on the last pair while the finished board is read, rather than leaving and
  // coming back for the sake of it.
  matched: "def-2",
  "to-blank": "field",
  typing: "field",
  check: "check",
  /* Nothing on `solved`: the Check button is replaced by "That is it" the moment the
     answer lands, so a pointer aimed at it would be aimed at an element that no longer
     exists — which the component handles by leaving the frame, but leaving the frame is
     the right thing to *say* rather than to fall into. The set is done. */
};

/** The beats that carry a click. Eleven of them, which is what the scene is about. */
const PRESSES: ReadonlySet<BeatName> = new Set<BeatName>([
  "ask",
  "to-practice",
  "pick",
  "term-a",
  "pair-a",
  "term-b",
  "pair-b",
  "term-c",
  "pair-c",
  "to-blank",
  "check",
]);

/**
 * The beats whose visible change is *caused* by that click, and which therefore wait for
 * it. See `usePressGate`.
 *
 * This is the subset of `PRESSES` above, and the two entries missing from it are the
 * interesting part.
 *
 * `to-blank` clicks into the field inside the blanks card, and the blanks card is what that
 * beat swaps in. Gating it would deadlock the gesture — the card would be waiting for a
 * press aimed at an element not in the document. The card arriving is the setup for the
 * click, not its consequence.
 *
 * `check` presses the Check button and the answer lands on `solved`, a beat later, so there
 * is nothing on `check` to hold back. Gating it would render `check` as `typing` and take
 * the typed answer off the screen until the button was pressed, which is a new fault rather
 * than a fix for the old one.
 *
 * Nine of the remaining beats are the ones the old choreography could not pay for: the
 * pointer crosses the card and clicks in the same 600ms, and the term used to light up
 * about 370ms before the pointer reached it.
 */
const CLICK_EFFECTS: ReadonlySet<BeatName> = new Set<BeatName>([
  "ask",
  "to-practice",
  "pick",
  "term-a",
  "pair-a",
  "term-b",
  "pair-b",
  "term-c",
  "pair-c",
]);

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
 * already names the parts and lights the one playing.
 *
 * So it is gone. The `ACT_NAMES` rail is the label.
 */
/**
 * Two claims, on the two things making them.
 *
 * The act rail names the parts and lights the one playing, which is why this scene never
 * needed a caption. What it did need, and what was sitting in a column beside it instead,
 * was the *point* of two of those parts. "Notes sit over the slide, faint until you move
 * towards them" is a description of a mechanism the frame performs but does not name — the
 * card prints `0.26` and then `1.00`, which is the number, not the reason. And "It writes
 * quizzes and flashcards from your own deck" is the one claim in this section that nothing
 * on screen can support: a practice card looks exactly the same whether a person typed it
 * or the deck produced it.
 *
 * There is no third label naming the three kinds of practice item, and that is deliberate:
 * the panel's own filter row prints `Quiz 1 · Match 1 · Blanks 1` in the three tints the
 * cards are drawn in. A label restating a control that is already on screen is the exact
 * failure this component was built to remove.
 *
 * Coordinates are percentages of `.pdfx-stage`, not of the pod. The stage is the
 * positioned box the slide and the panel live in — the same box `PhantomCursor` is handed,
 * for the same reason, and there is a long note on `frameRef` below about what happens when
 * something in this scene is measured against the wrong one.
 */
/* Both are anchored a couple of pixels *outside* the left edge of the panel they are about
   and read away from it, into the slide. Inside, they cover the thing they are pointing at:
   the notes card is a solid block of type with no gap big enough, and on the quiz the only
   free space was the kicker row, where the label landed squarely on the chip. The slide
   beside them is a title and three short bullets with room to spare. */
/* Both take their x from the panel and keep their own y — `axis: "x"`. The edge they hang
   off moves with the window, which is what the measurement is for; the height is a
   decision about the picture that no element's box knows, which is the paragraph below.
   Measured, the notes card's left edge is at 55.8% of the stage at a 1440px window and
   57.1% at 2560, so the pair of hand-tuned 56 and 57 were each right at one width and
   inside the panel they are supposed to be pointing at from outside at the other. */
const SPECS: readonly SpecTag<BeatName>[] = [
  {
    at: "resting",
    text: "Faint until you reach for it",
    x: 56,
    y: 62,
    anchor: "notes",
    grip: "left",
    axis: "x",
    side: "left",
    until: "split",
  },
  /* Low enough to clear the slide's title. At y 30 the plate ran straight through "Signal
     Time-of-Flight", which is the one piece of text on that side of the frame a visitor is
     actually reading; down here it crosses the figure, which is decorative line art.
     It read "Quizzes made from your slides", which named one of the three kinds as though
     it were the whole panel. */
  {
    at: "to-practice",
    text: "Practice written from your slides",
    x: 57,
    y: 55,
    anchor: "practice",
    grip: "left",
    axis: "x",
    side: "left",
    until: "to-match",
  },
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
  /* Starts on focus, not on approach. Three parts in twenty-five seconds is a scene a
     visitor has to catch from the top; joining it at the tutor is joining it halfway. */
  const running = useSceneRun(useSectionFocused(stageRef), onScreen);
  const state = useStoryboard(BEATS, {
    running,
    stage: stageRef,
    // The still that carries the argument: notes awake, slide still visible.
    stillBeat: "awake",
  });
  /* No `index` here on purpose: every accumulating state in this scene is measured by
     `reached` below, because nine of its eleven clicks are what cause the thing they
     accumulate. See `CLICK_EFFECTS`. */
  const { beat, run, still } = state;

  // Notes, tutor and practice fragments reorganise around the whole section.
  useSectionBeat(stageRef, beat, BEATS);

  const at = (name: BeatName) => BEATS.findIndex((entry) => entry.name === name);

  /**
   * Everything below is derived from `did`/`reached` rather than from `beat`/`index`, and
   * the difference is one beat while a click is in the air. See `usePressGate` and
   * `CLICK_EFFECTS`.
   *
   * `beat` itself is still the truth about *where the pointer is going* — `CURSOR` and
   * `PRESSES` are read from it, and the section's own ambience follows it — because the
   * pointer has to set off at the start of the beat in order to arrive during it. Only
   * what the press does waits for the press.
   */
  const { did, reached, onPress } = usePressGate(BEATS, state, CLICK_EFFECTS);
  const act = ACT[did];
  const mode = MODE[did];

  const notesPresent = reached >= at("arrive") && act === 0;
  /* Not gated: reaching for something is the beat, not a consequence of a click. */
  const awake = beat === "reach" || beat === "awake";
  const split = act > 0;

  const asked = reached >= at("ask");
  const thinking = beat === "thinking";
  const answered = reached >= at("answer") && act === 1;

  const picked = reached >= at("pick");
  const revealed = reached >= at("verdict");

  /**
   * The matching board, as two numbers.
   *
   * `paired` is how many pairs are locked in, `holding` is the term that has been tapped
   * and is waiting for its definition. That is the real game's state exactly —
   * `matched: number[]` and `pickedConcept: number | null` in `MatchGame.tsx` — and
   * expressing it this way is what makes six taps six taps: each odd beat sets `holding`,
   * each even one clears it and increments `paired`.
   *
   * It used to be three booleans read off three beats, which could only ever describe a
   * board that filled itself in.
   */
  const paired =
    reached >= at("pair-c") ? 3 : reached >= at("pair-b") ? 2 : reached >= at("pair-a") ? 1 : 0;
  const holding = did === "term-a" ? 0 : did === "term-b" ? 1 : did === "term-c" ? 2 : null;

  const typed = reached >= at("typing");
  const solved = reached >= at("solved");

  /* How much of the review set is done, which is the line the real panel leads with. It
     is also the only thing on screen that ties the three cards together into one set. */
  const done = (revealed ? 1 : 0) + (paired === 3 ? 1 : 0) + (solved ? 1 : 0);

  return (
    <div
      className="pdfx"
      ref={stageRef}
      data-beat={beat}
      data-act={act}
      data-lap={run}
      data-mode={mode}
      role="img"
      aria-label={
        "Three parts of a lecture-study workspace in sequence. A notes card floats " +
        "over a slide at a quarter opacity and becomes fully legible when the " +
        "pointer approaches it. A tutor panel answers a question about the slide. " +
        "A practice panel then works through a review set built from the deck: a " +
        "multiple-choice question is answered and marked, three terms are matched " +
        "to their definitions one tap at a time, and a missing term is typed into a " +
        "fill-in-the-blank sentence."
      }
    >
      {/* The rail. Not navigation — a label, so three parts read as three parts. */}
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
          data-spec-anchor="notes"
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
        <aside
          className="pdfx-panel"
          data-spec-anchor="practice"
          data-open={split}
          aria-hidden="true"
        >
          {/* `STUDY_TABS` in `src/workspace/StudyPanel.tsx`, verbatim and in its order.
              This strip read "Tutor · Practice", which named the two acts the scene plays
              rather than the two tabs the application draws — the app has three, and calls
              them Notes, Ask and Review. The act names live on the rail above the stage,
              which is the scene's own device and may use the scene's own words; a control
              drawn inside a reconstruction of the interface may not.
              `Notes` lights during act 0, when the overlay on the slide is what is being
              read, so all three carry a state rather than one sitting permanently dead. */}
          <div className="pdfx-panel-tabs">
            <span data-on={act === 0}>Notes</span>
            <span data-on={act === 1}>Ask</span>
            {/* Named as a cursor target so the beat that swaps this panel's whole
                contents has something visible causing it. See `CURSOR`. */}
            <span data-on={act >= 2} data-target="practice-tab">
              Review
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

          {/* --------------------------------------------- III. the review set
              One panel, one set, three kinds of item. The header is what says so: the
              real panel leads with how much of the set is done and a filter row that
              counts each kind, and those two lines are the reason this act no longer
              needs to pretend that matching is a separate feature.

              The selected filter follows the card on screen, which is a small liberty
              taken for a reason: filtering to `Match` in the application shows exactly
              what this frame shows, one matching card, so the state is consistent with
              the picture rather than decorative. */}
          {act === 2 && (
            <div className="pdfx-practice">
              <div className="pdfx-practice-head">
                <p className="pdfx-practice-score">
                  {done} of 3 done
                  {/* `{correct}/{quizzes} correct`, which is the chip `PracticePanel.tsx`
                      prints beside "n of m done" once anything has been answered. It said
                      "set complete", which is not a string the application has. One of the
                      three items in this set is `kind: "quiz"` — `stats.quizzes` counts only
                      those — and the scene answers it correctly, so the app's own figure
                      here is 1/1. */}
                  {done === 3 && <span className="pdfx-practice-all">1/1 correct</span>}
                </p>
                <span className="pdfx-progress" aria-hidden="true">
                  <i style={{ width: `${(done / 3) * 100}%` }} />
                </span>
                <div className="pdfx-filters">
                  <span data-on={false}>
                    All<b>3</b>
                  </span>
                  {KINDS.map((kind) => (
                    <span
                      key={kind.id}
                      className={`pdfx-chip--${kind.tint}`}
                      data-on={mode === kind.id}
                    >
                      {kind.filter}
                      <b>1</b>
                    </span>
                  ))}
                </div>
              </div>

              {mode === "quiz" && (
                <section className="pdfx-card pdfx-card--violet" key={`quiz-${run}`}>
                  <p className="pdfx-card-kicker">
                    {/* `Q1` rather than the kind's name: that is the label the real
                        `QuizCard` is handed, and the kind is named by the filter row. */}
                    <span className="pdfx-chip pdfx-chip--violet">Q1</span>
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
                      {/* No full stop. `QuizCard.tsx` renders the bare word. */}
                      <strong>Correct</strong> {QUIZ.explanation}
                    </p>
                  )}
                </section>
              )}

              {mode === "match" && (
                <section className="pdfx-card pdfx-card--teal" key={`match-${run}`}>
                  <p className="pdfx-card-kicker">
                    {MATCH.title}
                    {/* The counter the real game leads with, and the only thing on screen
                        that proves six taps happened rather than one. */}
                    <span className="pdfx-card-count">
                      {paired === 3 ? "Matched with no misses" : `${paired} of 3 matched`}
                    </span>
                  </p>

                  <div className="pdfx-match">
                    <ul>
                      {MATCH.pairs.map(([term], pair) => (
                        <li
                          key={term}
                          data-matched={pair < paired}
                          data-held={pair === holding}
                          data-target={`term-${pair}`}
                        >
                          {term}
                          <i className="pdfx-tick">✓</i>
                        </li>
                      ))}
                    </ul>
                    {/* Shown out of order, so each pair is a diagonal across the card.
                        `MATCH.order` holds pair indices in display positions. */}
                    <ul>
                      {MATCH.order.map((pair) => (
                        <li
                          key={MATCH.pairs[pair][1]}
                          data-matched={pair < paired}
                          data-target={`def-${pair}`}
                        >
                          {MATCH.pairs[pair][1]}
                          <i className="pdfx-tick">✓</i>
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>
              )}

              {mode === "cloze" && (
                <section className="pdfx-card pdfx-card--amber" key={`cloze-${run}`}>
                  <p className="pdfx-card-kicker">
                    <span className="pdfx-chip pdfx-chip--amber">Fill in the blank</span>
                    Slide {SLIDE.number}
                  </p>

                  <p className="pdfx-cloze">
                    {CLOZE.before}{" "}
                    {solved ? (
                      <b className="pdfx-cloze-filled">{CLOZE.answer}</b>
                    ) : (
                      /* The blank is a control in the real card — the most obvious thing
                         to press when you are stuck is the thing you are stuck on. */
                      <span className="pdfx-cloze-blank">?????</span>
                    )}
                    {CLOZE.after}
                  </p>

                  {solved ? (
                    <p className="pdfx-cloze-verdict">
                      <i>✓</i> That is it
                    </p>
                  ) : (
                    <div className="pdfx-cloze-row">
                      <span className="pdfx-field" data-target="field" data-typed={typed}>
                        {typed ? (
                          /* A `steps()` reveal of the answer's own width, keyed per lap so
                             it retypes each time round. Nothing here simulates keystrokes;
                             the width is the typing. */
                          <b
                            className="pdfx-typed"
                            key={`typed-${run}`}
                            /* The reveal animates to this many characters wide. Published
                               rather than written into the stylesheet, so editing `CLOZE`
                               cannot leave the animation stopping short of its own text. */
                            style={{ "--chars": CLOZE.answer.length } as CSSProperties}
                          >
                            {CLOZE.answer}
                          </b>
                        ) : (
                          <em>Type the missing term</em>
                        )}
                      </span>
                      <span className="pdfx-check" data-target="check">
                        Check
                      </span>
                    </div>
                  )}
                </section>
              )}
            </div>
          )}
        </aside>

        {!still && (
          <PhantomCursor
            stage={frameRef}
            target={CURSOR[beat] ?? null}
            pressing={PRESSES.has(beat)}
            onPress={onPress}
            token={`${run}-${beat}`}
          />
        )}

        {/* Inside the stage, for the same reason the cursor is: these are percentages of
            the box the slide and the panel are laid out in, and the pod around it is taller
            by an act rail. See `SPECS`. */}
        <SpecTags beats={BEATS} beat={beat} tags={SPECS} className="pdfx-specs" />
      </div>

      {/* Still no caption. The act rail across the top names the three parts and lights
          the one you are watching, the practice panel's own filter row names its three
          kinds of item, and the two labels inside the stage carry the only claims the
          frame cannot make on its own. */}
    </div>
  );
}
