"use client";

/**
 * PDF Explainer, as the product is now: a deck that is explained before you reach it.
 *
 * The previous film was three acts about three panels — a notes overlay fading up on
 * approach, a tutor, a practice set — and it was a faithful film of the workspace it
 * described. That workspace has moved on. The overlay is gone; notes live in a 460px
 * panel beside the slide, and three things the application did not do when the old
 * scene was staged are now the reason to show it at all:
 *
 *   it explains *ahead* of you. Notes arrive in batches of three to twelve slides, and
 *   after the first batch the next is requested when the reader is two slides from the
 *   first unexplained one (`READ_AHEAD_DISTANCE`). The filmstrip's 3px rail pulses over
 *   the slides a running batch may cover and fills in when it lands — so by the time a
 *   slide is reached its notes are there;
 *
 *   you ask by highlighting. The slide has a real text layer now, a selection raises an
 *   "Ask about this" chip, and the Ask panel quotes the phrase back before answering,
 *   with the two neighbouring slides as context;
 *
 *   and it runs on your own key, in your own browser — sessions in IndexedDB, the key in
 *   session storage unless you opt in to keeping it — which no frame can show and one
 *   label has to say.
 *
 * So the film is those things, in the order a reader meets them. A deck opens on slide 1
 * with the first batch (slides 1–3) explained; stepping to slide 2 brings the reader
 * within two slides of the gap, read-ahead starts on slides 4–5, and the batch lands
 * while they read slide 3; Review's set has a question from that slide and the card
 * leaves the panel for the section; then the pointer drags across a phrase on the slide,
 * the chip appears, and the panel answers with the phrase quoted. Review comes before
 * Ask, which is the one place this departs from the reading order the product suggests,
 * and it is for the hold frame: the still is the answer, and the flown-out question has
 * to be resting under the window when the film stops for all four claims to be on screen.
 *
 * What is real. Every string the chrome prints is one the application prints —
 * "Continue from 4", "Explaining ahead…", "Explaining ahead from slide 4…", "Ask about
 * this", "Explain this.", "Ask about slide 3…", "Re-explain", "0/2 practice", "Check
 * yourself", "Enter to send · Shift + Enter for a new line", the Notes / Ask / Review
 * control, the All / To do / Quiz / Match / Blanks filters — and the dimensions are the
 * workspace's: a 56px top bar, a 176px filmstrip with a 3px rail, a `#f2f2f5` stage under
 * a floating pill toolbar, a 460px panel, all scaled to the pod. The rail's colours are
 * the product's: violet explained, violet at 45% pulsing for the batch in flight,
 * hairline otherwise; the top bar's ring turns green once every slide is explained. The
 * slide is a made-up lecture on gradient descent and the notes are the shape the app
 * writes — chips, a summary heading in the "Topic, slide N" form of the app's smoke-test
 * notes, a paragraph, an INTUITION callout, a CHECK YOURSELF section. The reply is
 * staged: it comes out of a model in the real app.
 */

import {
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { PhantomCursor } from "../scene/cursor";
import { cssZoom } from "../scene/css-zoom";
import { usePressGate } from "../scene/press-gate";
import { useSectionBeat } from "../scene/section-beat";
import { SpecTags, type SpecTag } from "../scene/spec";
import { useStoryboard, type Beat } from "../scene/storyboard";
import { useSceneRun } from "../scene/use-scene-run";
import { useOnScreen } from "../use-on-screen";
import { useSectionFocused } from "../use-section-focus";
import "./demo.css";

/* ------------------------------------- the deck ------------------------------------ */

/**
 * A five-slide lecture, invented. The session takes its name from the file, which is
 * what the application does — `lecture4.pdf` opens as "lecture4".
 */
const DECK = {
  name: "lecture4",
  foot: "Intro to Machine Learning · Lecture 4",
  slides: [
    {
      title: "Lecture 4: Gradient Descent",
      bullets: [
        "Why optimisation is the engine of learning",
        "Batch, stochastic and mini-batch variants",
        "Choosing a learning rate",
      ],
    },
    {
      title: "The update rule",
      equation: true,
      bullets: [
        "Step against the gradient of the loss",
        "The learning rate η sets the stride",
        "Stop when the gradient vanishes",
      ],
    },
    {
      title: "Stochastic vs batch",
      figure: true,
      bullets: [
        "Batch: one step per pass over the data",
        "Stochastic: one step per example, noisy but cheap",
        "Mini-batch: 32–256 examples, the usual default",
      ],
    },
    {
      title: "Choosing a learning rate",
      bullets: [
        "Too large: the iterates overshoot and diverge",
        "Too small: convergence crawls",
        "Schedules: decay η as training goes on",
      ],
    },
    {
      title: "Summary",
      bullets: [
        "Gradient descent follows the negative gradient",
        "The learning rate is the knob that matters most",
        "Mini-batches trade noise for throughput",
      ],
    },
  ],
} as const;

const TOTAL = DECK.slides.length;

/** How many practice items each explained slide contributes to the review set. */
const PRACTICE_PER_SLIDE = 2;

/**
 * The phrase the pointer drags across, and where it is. Slide 3, the second bullet, at
 * the end of the line so the chip that pops above it lands over nothing the eye needs.
 */
const SELECTION = { slide: 3, bullet: 1, phrase: "noisy but cheap" } as const;

/**
 * The first question in Review's set, from slide 3. The same question is also that
 * slide's CHECK YOURSELF card. In the application these are two sources — each note
 * carries its own practice items, and Review is a separately built, deck-wide set whose
 * items carry a slide number — so a question can sit in both.
 */
const QUIZ = {
  kicker: "Q1",
  slide: 3,
  question: "Which variant takes one step per training example?",
  options: ["Batch gradient descent", "Stochastic gradient descent", "Mini-batch, 256 examples"],
} as const;

/**
 * Review's set, already built: counts for the header and the filter chips. The filters
 * hide any kind with no items, and "To do" counts what is unanswered — all of it here.
 */
const REVIEW = { quiz: 4, match: 2, cloze: 2 } as const;
const REVIEW_TOTAL = REVIEW.quiz + REVIEW.match + REVIEW.cloze;

/** The second card in the review set, from `src/practice/ClozeCard.tsx`. */
const CLOZE = {
  slide: 2,
  before: "The",
  after: "decides how far each step moves.",
} as const;

/**
 * What the Ask panel prints. The quoted line and "Explain this." are what `ChatPanel.tsx`
 * puts in the bubble when a selection is sent; the reply is staged, and mentions slide 4
 * because the tutor is now handed the two slides either side.
 */
const ASK = {
  quote: SELECTION.phrase,
  ask: "Explain this.",
  reply:
    "One example per step makes each gradient a rough guess, so the path zig-zags. But a step costs one example rather than a pass over the whole set — which is why slide 4 pairs it with a smaller η.",
} as const;

type Question = { question: string; options: readonly string[] };

/**
 * The notes for the three slides the reader visits, written to the shape the app
 * writes. Every note with practice items ends in a CHECK YOURSELF section with them in
 * it — `NotesPanel.tsx` always renders it when the "0/2 practice" chip is up — so each
 * slide has its first question; the panel clips the rest, as a scrolled panel would.
 */
const NOTES: Record<
  1 | 2 | 3,
  {
    head: string;
    lead: string;
    equation?: ReactNode;
    body?: string;
    callout?: string;
    check: Question;
  }
> = {
  1: {
    head: "Gradient descent, slide 1",
    lead: "The update rule moves the parameters against the gradient of the loss:",
    equation: (
      <>
        θ<sub>t+1</sub> = θ<sub>t</sub> − η ∇<sub>θ</sub> J(θ<sub>t</sub>)
      </>
    ),
    body: "The learning rate η decides how far each step goes. Too large and the iterates overshoot the minimum; too small and convergence crawls.",
    callout:
      "Picture a ball rolling downhill in fog: it can only feel the slope under its feet, so it takes a step, feels again, and repeats.",
    check: {
      question: "What does the learning rate η control?",
      options: ["The direction of each step", "The size of each step", "The number of passes"],
    },
  },
  2: {
    head: "The update rule, slide 2",
    lead: "Each step subtracts the gradient, scaled by η. The gradient points uphill, so subtracting it walks the parameters toward lower loss.",
    callout: "The slope says which way. η says how far.",
    check: {
      question: "Why is the gradient subtracted rather than added?",
      options: ["It points uphill", "It is always negative", "It keeps η small"],
    },
  },
  3: {
    head: "Stochastic vs batch, slide 3",
    lead: "Batch descent reads the whole dataset before every step, so each step is exact and expensive. Stochastic descent steps after every example: cheap, and noisy enough to shake out of shallow minima.",
    check: QUIZ,
  },
};

/* ------------------------------------ storyboard ----------------------------------- */

type BeatName =
  | "open"
  | "ahead"
  | "next"
  | "next-2"
  | "read"
  | "review"
  | "lift"
  | "landed"
  | "aim"
  | "select"
  | "chip"
  | "ask"
  | "thinking"
  | "answer";

/**
 * Sixteen seconds, four presses and one drag.
 *
 * `open` is long because it is the only beat that shows the whole workspace at rest —
 * the deck, the notes, the first batch's three slides on the rail, read-ahead armed —
 * and everything after it is a change to that picture. `ahead` is still at rest: the
 * reader on slide 1 is three slides from the gap, one more than read-ahead waits for,
 * so nothing is fetched until the first press. That press brings slide 2 and starts the
 * batch for 4–5; the second is short because a press is short, and `read` is where the
 * payoff sits still long enough to be seen: the batch has landed, and slide 3's notes
 * were there first.
 *
 * `lift` is sized to the card's 900ms flight and `landed` exists so that the label about
 * the card is pinned to a card that has stopped moving; a label measured from a box in
 * flight is placed wrong, and the component only re-measures on a beat change.
 *
 * `select` is a drag rather than a click, so it is the one gesture here the cursor does
 * not press for: the pointer lands on the first word during `aim` and travels to the last
 * during `select`, with the highlight following it. `answer` is the still, and the
 * longest beat, because it is a paragraph.
 */
const BEATS: readonly Beat<BeatName>[] = [
  { name: "open", ms: 1600 },
  { name: "ahead", ms: 1300 },
  { name: "next", ms: 900 },
  { name: "next-2", ms: 900 },
  { name: "read", ms: 1600 },
  { name: "review", ms: 900 },
  { name: "lift", ms: 900 },
  { name: "landed", ms: 900 },
  { name: "aim", ms: 700 },
  { name: "select", ms: 900 },
  { name: "chip", ms: 900 },
  { name: "ask", ms: 800 },
  { name: "thinking", ms: 900 },
  { name: "answer", ms: 2600 },
];

/**
 * Where the pointer is.
 *
 * It enters on `ahead`, parked on the toolbar's next button, so the two presses that
 * follow are presses rather than arrivals. It leaves during `read` — the beat is about the
 * panel, not the hand — and comes back for the Review tab. `aim` and `select` are the two
 * ends of the drag; `chip` holds on the last word while the chip pops; `ask` presses it.
 * Nothing after that: the chip is gone once pressed, and the answer needs no hand.
 */
const CURSOR: Partial<Record<BeatName, string>> = {
  ahead: "next",
  next: "next",
  "next-2": "next",
  review: "review-tab",
  lift: "review-tab",
  landed: "review-tab",
  aim: "sel-start",
  select: "sel-end",
  chip: "sel-end",
  ask: "chip",
};

/** The four beats that carry a click. */
const PRESSES: ReadonlySet<BeatName> = new Set<BeatName>(["next", "next-2", "review", "ask"]);

/**
 * All four wait for their press. See `usePressGate`: until the pointer has actually gone
 * down, each of these renders as the beat before it — slide 2 does not arrive before the
 * next button is pressed, the panel does not swap to Review before the tab is, the chat
 * does not open before the chip is. The pointer is already standing on the button for
 * the two `next` presses, so those wait 90ms; the other two wait a short flight.
 */
const CLICK_EFFECTS: ReadonlySet<BeatName> = PRESSES;

/**
 * Four claims, each on the thing making it.
 *
 * "Explained before you get there" hangs off the fifth thumbnail — the last slide, which
 * the reader never reaches and whose rail has filled anyway — and reads into the empty
 * band of the stage under the slide. Fourteen pixels below the thumbnail's middle, still
 * on its edge: at 2560 the stage is wider, the slide taller, and its bottom edge came
 * down to exactly the thumbnail's centre line, so a plate read out at that height lay
 * along the edge of the slide. "Questions written from your own slides" reads out
 * of the card once it has landed under the window, rightward, into the space under the
 * panel it came from. "Highlight a phrase to ask about it" hangs under the answer, inside
 * the Ask panel, which has nothing but air between the reply and the composer; it arrives
 * with the answer rather than with the question because the answer is the element that
 * is there at every width — it hung off the panel's left edge at a height of its own
 * until a 768px frame put it squarely across the rail's label. "Your own key, kept in
 * your browser" is the claim no frame can show. Its dot sits a hair above the settings
 * gear, where the key is entered, and the plate reads left along the window's top edge:
 * centred above the gear it ran off the right of any window narrower than 900px, and
 * reading left at the gear's own height it covered the count beside it.
 */
const SPECS: readonly SpecTag<BeatName>[] = [
  {
    at: "read",
    text: "Explained before you get there",
    x: 14,
    y: 77,
    anchor: "thumb-5",
    grip: "right",
    nudge: { y: 14 },
    side: "right",
  },
  {
    at: "landed",
    text: "Questions written from your own slides",
    x: 62,
    y: 118,
    anchor: "card",
    grip: "right",
    side: "right",
  },
  {
    at: "answer",
    text: "Highlight a phrase to ask about it",
    x: 80,
    y: 56,
    anchor: "answer",
    grip: "bottom",
    side: "below",
  },
  {
    at: "thinking",
    text: "Your own key, kept in your browser",
    x: 95,
    y: 0,
    anchor: "settings",
    grip: "top",
    nudge: { y: -18 },
    side: "left",
  },
];

/* -------------------------------------- icons -------------------------------------- */

function Icon({ d, className }: { d: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const ICON = {
  close: "M6 6l12 12M18 6L6 18",
  download: "M12 4v11m-5-4 5 5 5-5M5 20h14",
  keyboard: "M3 7h18v10H3zM7 11h1m3 0h1m3 0h1m-9 4h8",
  gear: "M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm7.4 3.5-1.6-.4a6 6 0 0 0-.5-1.2l.9-1.4-1.7-1.7-1.4.9a6 6 0 0 0-1.2-.5L13.5 4.6h-3l-.4 1.6a6 6 0 0 0-1.2.5l-1.4-.9-1.7 1.7.9 1.4a6 6 0 0 0-.5 1.2L4.6 12l1.6.4a6 6 0 0 0 .5 1.2l-.9 1.4 1.7 1.7 1.4-.9c.4.2.8.4 1.2.5l.4 1.6h3l.4-1.6c.4-.1.8-.3 1.2-.5l1.4.9 1.7-1.7-.9-1.4c.2-.4.4-.8.5-1.2z",
  collapse: "M4 5h16v14H4zM9 5v14M6.5 12h5m-2-2 2 2-2 2",
  book: "M4 5.5h6a2 2 0 0 1 2 2v11a2 2 0 0 0-2-2H4zm16 0h-6a2 2 0 0 0-2 2v11a2 2 0 0 1 2-2h6z",
  chat: "M5 5h14v10H10l-4 4v-4H5z",
  target: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 4a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 4a1 1 0 1 0 0 2 1 1 0 0 0 0-2z",
  pause: "M8 5v14M16 5v14",
  fastForward: "M4 6l8 6-8 6zM12 6l8 6-8 6z",
  sparkles: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z",
  eye: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z",
  enter: "M20 5v7a3 3 0 0 1-3 3H5m4-4-4 4 4 4",
  jump: "M8 16 16 8M9 8h7v7",
  reset: "M4 12a8 8 0 1 0 2.3-5.7M4 4v5h5",
  refresh: "M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5",
  chevronDown: "M6 9l6 6 6-6",
  chevronLeft: "M15 5l-7 7 7 7",
  chevronRight: "M9 5l7 7-7 7",
  zoomOut: "M10 3.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM7 10h6m2 5 5 5",
  zoomIn: "M10 3.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM7 10h6m-3-3v6m5 2 5 5",
  search: "M10.5 3.5a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm5 12 5 5",
  split: "M4 5h16v14H4zM12 5v14",
  bulb: "M9 18h6m-5 3h4M12 3a6 6 0 0 0-3.5 10.9c.7.6 1 1.3 1 2.1h5c0-.8.3-1.5 1-2.1A6 6 0 0 0 12 3z",
  askChip: "M12 3a9 9 0 0 0-7.8 13.5L3 21l4.5-1.2A9 9 0 1 0 12 3zm-1 5.5a2.3 2.3 0 0 1 3.3 2c0 1.5-2.3 1.7-2.3 3.2M12 16.5v.3",
  send: "M12 19V5m-6 6 6-6 6 6",
  retry: "M4 12a8 8 0 1 0 2.3-5.7M4 4v5h5",
  trash: "M5 7h14M9 7V4h6v3m-7 0v13h8V7",
  edit: "M4 20h4l11-11-4-4L4 16zM13 7l4 4",
} as const;

/* ------------------------------------- the slide ----------------------------------- */

/** Two loss curves: the smooth one is batch, the jagged one is stochastic. */
function LossFigure() {
  return (
    <svg className="pdfx-figure" viewBox="0 0 150 82" aria-hidden="true">
      <path d="M12 6v66h130" className="pdfx-figure-axis" />
      <path d="M14 14 C40 22 60 46 138 56" className="pdfx-figure-batch" />
      <path
        d="M14 12l7 6-2 -5 8 11-3 -3 9 12-4 -2 9 8-2 -5 10 9-3 -1 9 6-1 -3 10 5-2 -2 9 3-1 -2 9 2-2 -3 10 3-1 -1 10 1-1 -2 12 2"
        className="pdfx-figure-sgd"
      />
      <text x="18" y="78" className="pdfx-figure-label">
        steps
      </text>
      <text x="4" y="12" className="pdfx-figure-label">
        J
      </text>
    </svg>
  );
}

/**
 * One slide, drawn the same way at two sizes: full size on the stage, and at a fixed
 * basis scaled down into the filmstrip, which is how the application's thumbnails are
 * made — a render of the page, not a stand-in for one.
 *
 * `live` marks the copy on the stage. Only that one carries the pointer's targets and
 * the selectable phrase; the thumbnails render the same text without them, so a target
 * name never matches twice.
 */
function Slide({
  n,
  live,
  selection,
}: {
  n: number;
  live?: boolean;
  selection?: { ref: RefObject<HTMLSpanElement | null>; chip: boolean };
}) {
  const slide = DECK.slides[n - 1];

  return (
    <div className="pdfx-slide" data-figure={"figure" in slide ? "" : undefined}>
      <span className="pdfx-slide-rule" aria-hidden="true" />
      <h4>{slide.title}</h4>
      {"equation" in slide && (
        <p className="pdfx-slide-eq">
          θ ← θ − η ∇<sub>θ</sub> J(θ)
        </p>
      )}
      <ul>
        {slide.bullets.map((bullet, order) => (
          <li key={bullet}>
            {live && selection && n === SELECTION.slide && order === SELECTION.bullet ? (
              <Selectable text={bullet} selRef={selection.ref} chip={selection.chip} />
            ) : (
              bullet
            )}
          </li>
        ))}
      </ul>
      {"figure" in slide && <LossFigure />}
      <span className="pdfx-slide-foot">
        {DECK.foot} · slide {n} of {TOTAL}
      </span>
    </div>
  );
}

/**
 * The bullet with the phrase in it, split so the phrase is its own span: the highlight is
 * painted on it, the chip pops out of it, and the first and last words are what the
 * pointer aims at — the two ends of a drag.
 */
function Selectable({
  text,
  selRef,
  chip,
}: {
  text: string;
  selRef: RefObject<HTMLSpanElement | null>;
  chip: boolean;
}) {
  const start = text.indexOf(SELECTION.phrase);
  const before = text.slice(0, start);
  const after = text.slice(start + SELECTION.phrase.length);
  const words = SELECTION.phrase.split(" ");

  return (
    <>
      {before}
      <span className="pdfx-sel" ref={selRef}>
        {words.map((word, order) => (
          <span
            key={word}
            data-target={
              order === 0 ? "sel-start" : order === words.length - 1 ? "sel-end" : undefined
            }
          >
            {order > 0 ? " " : ""}
            {word}
          </span>
        ))}
        {/* The chip, from `SlideStage.tsx`: a dark pill centred 8px above the selection,
            with the cyan ask icon. It is a button in the application. */}
        {chip && (
          <span className="pdfx-ask-chip" data-target="chip">
            <Icon d={ICON.askChip} />
            Ask about this
          </span>
        )}
      </span>
      {after}
    </>
  );
}

/* ------------------------------------- the cards ----------------------------------- */

/**
 * `QuizCard`: one header row — the label chip, the question, and, in Review only, the
 * "Slide 3 ↗" jump — then three lettered options. Unanswered here, on purpose. The notes
 * panel's copy has no jump: `NotesPanel.tsx` does not pass one.
 */
function QuizCard({ q = QUIZ, jump }: { q?: Question; jump?: number }) {
  return (
    <section className="pdfx-card pdfx-card--violet">
      <header className="pdfx-card-kicker pdfx-quiz-head">
        <span className="pdfx-chip pdfx-chip--violet">{QUIZ.kicker}</span>
        <span className="pdfx-question">{q.question}</span>
        {jump !== undefined && (
          <span className="pdfx-jump">
            Slide {jump}
            <Icon d={ICON.jump} />
          </span>
        )}
      </header>
      <div className="pdfx-options">
        {q.options.map((option, order) => (
          <span className="pdfx-option" key={option}>
            <span className="pdfx-option-letter">{"ABC"[order]}</span>
            {option}
          </span>
        ))}
      </div>
    </section>
  );
}

/** `ClozeCard`: the chip and jump, the dashed blank, the field, Check and Show answer. */
function ClozeCard() {
  return (
    <section className="pdfx-card pdfx-card--amber">
      <header className="pdfx-card-kicker">
        <span className="pdfx-chip pdfx-chip--amber">
          <Icon d={ICON.edit} />
          Fill in the blank
        </span>
        <span className="pdfx-jump">
          Slide {CLOZE.slide}
          <Icon d={ICON.jump} />
        </span>
      </header>
      <p className="pdfx-cloze">
        {CLOZE.before} <span className="pdfx-cloze-blank">?????</span> {CLOZE.after}
      </p>
      <div className="pdfx-cloze-row">
        <span className="pdfx-field">
          Type the missing term
          <Icon d={ICON.enter} />
        </span>
        <span className="pdfx-check">Check</span>
        <span className="pdfx-check pdfx-check--ghost">
          <Icon d={ICON.eye} />
          Show answer
        </span>
      </div>
    </section>
  );
}

/* --------------------------------------- the pod ------------------------------------ */

export function PdfExplainerDemo() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const onScreen = useOnScreen(stageRef);
  /* Starts on focus. The whole point of the first three seconds is a deck at rest with
     its rail filling; joining at the drag is joining after the setup. */
  const running = useSceneRun(useSectionFocused(stageRef), onScreen);
  const state = useStoryboard(BEATS, {
    running,
    stage: stageRef,
    // The still: the answer in, the phrase quoted, the rail filled, the question landed.
    stillBeat: "answer",
  });
  const { beat, index, run, still } = state;

  // The section's wash follows the panel: violet for notes, amber for review, blue for ask.
  useSectionBeat(stageRef, beat, BEATS);

  const at = (name: BeatName) => BEATS.findIndex((entry) => entry.name === name);
  const { did, reached, onPress } = usePressGate(BEATS, state, CLICK_EFFECTS);

  /**
   * How far the notes have got, in slides. The first batch covered 1–3 when the deck
   * opens. Read-ahead waits until the reader is within two slides of the gap at 4, which
   * is the press to slide 2; that batch covers 4–5 (the rest of the deck) and lands, all
   * at once as batches do, on `read`. After that the deck is covered and read-ahead has
   * nothing left to show.
   */
  const aheadRunning = reached >= at("next") && reached < at("read");
  const explained = reached >= at("read") ? 5 : 3;
  const current: 1 | 2 | 3 = reached >= at("next-2") ? 3 : reached >= at("next") ? 2 : 1;
  const tab = reached >= at("ask") ? "ask" : reached >= at("review") ? "review" : "notes";

  /* The drag and what follows it. `index` rather than `reached` for the highlight,
     because a drag is not a click and nothing gates it; `reached` for where it ends,
     because the press on the chip is what clears it. */
  const selecting = index >= at("select") && reached < at("ask");
  const chipUp = did === "chip";
  const lifted = reached >= at("lift");
  const asked = reached >= at("ask");
  const thinking = did === "thinking";
  const answered = reached >= at("answer");

  const practice = explained * PRACTICE_PER_SLIDE;

  /**
   * The rail beside each thumbnail: `Filmstrip.tsx`'s three states. "In flight" is every
   * unexplained slide the running batch may reach — from its start, up to twelve on.
   */
  const rail = (n: number) => (n <= explained ? "done" : aheadRunning ? "flight" : "todo");

  const selRef = useRef<HTMLSpanElement | null>(null);
  const quoteRef = useRef<HTMLElement | null>(null);
  const phraseRef = useRef<HTMLSpanElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const liftRef = useRef<HTMLDivElement | null>(null);

  /**
   * The phrase leaving the slide for the panel.
   *
   * Where a span of text is cannot be written as a percentage — it depends on the font,
   * the slide's width and the bullet's wrap — so the flight is measured on the beat it
   * happens: the selection's box and the quote's box, both against the pod, written onto
   * the flyer as custom properties before paint. The quote in the bubble holds its ink
   * back until the flyer has arrived; see `.pdfx-quote`.
   */
  useLayoutEffect(() => {
    if (!asked) return;
    const root = stageRef.current;
    const from = selRef.current;
    const to = quoteRef.current;
    const flyer = phraseRef.current;
    if (!root || !from || !to || !flyer) return;
    const box = root.getBoundingClientRect();
    const a = from.getBoundingClientRect();
    const b = to.getBoundingClientRect();
    // Rects are on-screen pixels; the pod lays out in its own, unzoomed ones.
    const z = cssZoom(root);
    flyer.style.setProperty("--from-x", `${(a.left - box.left) / z}px`);
    flyer.style.setProperty("--from-y", `${(a.top - box.top) / z}px`);
    flyer.style.setProperty("--to-x", `${(b.left - box.left) / z}px`);
    flyer.style.setProperty("--to-y", `${(b.top - box.top) / z}px`);
  }, [asked, run]);

  /**
   * The question leaving the panel for the section.
   *
   * Same arrangement: the card in the panel is measured on the beat it lifts and the
   * flyer starts exactly there, then transitions to a landing spot the stylesheet owns.
   * The in-panel card goes `visibility: hidden` rather than unmounting, so it still has
   * the box this reads. On a held frame the panel may already be on Ask and the card
   * gone; the flyer then takes the stylesheet's fallback origin and lands without a
   * flight, which is the honest frame for a still — the world after the gesture.
   */
  useLayoutEffect(() => {
    if (!lifted) return;
    const root = stageRef.current;
    const flyer = liftRef.current;
    if (!root || !flyer) return;
    const from = cardRef.current;
    if (!from) {
      flyer.dataset.settled = "true";
      flyer.dataset.flown = "true";
      return;
    }
    const box = root.getBoundingClientRect();
    const a = from.getBoundingClientRect();
    const z = cssZoom(root);
    flyer.style.setProperty("--from-x", `${(a.left - box.left) / z}px`);
    flyer.style.setProperty("--from-y", `${(a.top - box.top) / z}px`);
    flyer.style.setProperty("--from-w", `${a.width / z}px`);
    const frame = requestAnimationFrame(() => {
      flyer.dataset.flown = "true";
    });
    return () => cancelAnimationFrame(frame);
  }, [lifted, run]);

  const note = NOTES[current];

  return (
    <div
      className="pdfx"
      ref={stageRef}
      data-beat={beat}
      data-did={did}
      data-lap={run}
      data-tab={tab}
      data-selected={selecting}
      role="img"
      aria-label={
        "A lecture-study workspace: a filmstrip of five slides on the left, the current " +
        "slide in the middle, and a notes panel on the right. Notes for slide 1 are open " +
        "with the first three slides explained. As the reader steps to slide 2 the panel " +
        "header reads Explaining ahead and the filmstrip's rail pulses beside the last two " +
        "slides, which fill in before the reader reaches slide 3. Review's set has a " +
        "multiple-choice question from that slide, and the card " +
        "lifts out of the panel to rest under the window. The pointer then drags across a " +
        "phrase on the slide, an Ask about this chip appears above it, and the Ask panel " +
        "answers with the phrase quoted."
      }
    >
      <div className="pdfx-window">
        {/* ------------------------------------------------------------- top bar */}
        <header className="pdfx-top">
          <span className="pdfx-close">
            <Icon d={ICON.close} />
          </span>
          <div className="pdfx-title">
            <b>{DECK.name}</b>
            <small>
              Slide {current} of {TOTAL} · <em>0/{practice} practice done</em>
            </small>
          </div>
          <div className="pdfx-top-tools">
            {/* The ring that counts explained slides, violet until the deck is done and
                green after. */}
            <span
              className="pdfx-ring"
              data-full={explained === TOTAL}
              style={{ "--pdfx-fill": explained / TOTAL } as CSSProperties}
              aria-hidden="true"
            >
              <i />
            </span>
            <span className="pdfx-ring-count">
              {explained}/{TOTAL}
            </span>
            <span className="pdfx-top-icon">
              <Icon d={ICON.download} />
            </span>
            <span className="pdfx-top-icon">
              <Icon d={ICON.keyboard} />
            </span>
            {/* Settings, which is where the key goes. The one label that cannot point at
                a frame points here. */}
            <span className="pdfx-top-icon" data-spec-anchor="settings">
              <Icon d={ICON.gear} />
            </span>
          </div>
        </header>

        <div className="pdfx-body">
          {/* ----------------------------------------------------------- filmstrip */}
          <aside className="pdfx-strip">
            <div className="pdfx-strip-head">
              <span>Slides</span>
              <b className="pdfx-pill">
                {explained}/{TOTAL}
              </b>
              <i className="pdfx-collapse">
                <Icon d={ICON.collapse} />
              </i>
            </div>
            <ol className="pdfx-thumbs">
              {DECK.slides.map((slide, order) => {
                const n = order + 1;
                return (
                  <li
                    key={slide.title}
                    data-current={n === current}
                    data-rail={rail(n)}
                    data-spec-anchor={`thumb-${n}`}
                  >
                    {/* The 3px rail: violet when explained, violet at 45% and pulsing
                        while its batch is in flight, a hairline otherwise. */}
                    <i className="pdfx-rail" />
                    <span className="pdfx-thumb">
                      <span className="pdfx-thumb-scale" aria-hidden="true">
                        <Slide n={n} />
                      </span>
                      <b className="pdfx-thumb-n">{n}</b>
                      {n <= explained && <i className="pdfx-thumb-dot" />}
                    </span>
                  </li>
                );
              })}
            </ol>
          </aside>

          {/* --------------------------------------------------------------- stage */}
          <div className="pdfx-stage">
            <div className="pdfx-stage-slide" key={`slide-${current}`}>
              <Slide n={current} live selection={{ ref: selRef, chip: chipUp }} />
            </div>

            {/* The floating pill: page, zoom, search, split. */}
            <div className="pdfx-tools">
              <span className="pdfx-tool" data-dim={current === 1}>
                <Icon d={ICON.chevronLeft} />
              </span>
              <span className="pdfx-tool-page">
                <b>{current}</b>/ {TOTAL}
              </span>
              <span className="pdfx-tool" data-target="next">
                <Icon d={ICON.chevronRight} />
              </span>
              <i className="pdfx-tool-sep" />
              <span className="pdfx-tool">
                <Icon d={ICON.zoomOut} />
              </span>
              <span className="pdfx-tool-zoom">100%</span>
              <span className="pdfx-tool">
                <Icon d={ICON.zoomIn} />
              </span>
              <i className="pdfx-tool-sep" />
              <span className="pdfx-tool pdfx-tool--label">
                <Icon d={ICON.search} />
                Search
              </span>
              <span className="pdfx-tool pdfx-tool--label">
                <Icon d={ICON.split} />
                Split
              </span>
            </div>
          </div>

          {/* --------------------------------------------------------------- panel */}
          <aside className="pdfx-panel" data-spec-anchor="panel">
            <div className="pdfx-panel-head">
              {/* `STUDY_TABS`, verbatim and in order. */}
              <div className="pdfx-tabs">
                <span data-on={tab === "notes"}>
                  <Icon d={ICON.book} />
                  Notes
                </span>
                <span data-on={tab === "ask"}>
                  <Icon d={ICON.chat} />
                  Ask
                </span>
                <span data-on={tab === "review"} data-target="review-tab">
                  <Icon d={ICON.target} />
                  Review
                </span>
              </div>
              {/* The notes header's right side, from `StudyPanel.tsx`, on the Notes tab
                  only. Idle with a gap ahead: read-ahead's switch, on, and the primary
                  "Continue from 4". While the batch runs: a spinner, the line, and the
                  pause button. Once the deck is covered: nothing. */}
              {tab === "notes" && explained < TOTAL && (
                <div className="pdfx-status">
                  {aheadRunning ? (
                    <>
                      <i className="pdfx-spinner" />
                      Explaining ahead…
                      <span className="pdfx-pause">
                        <Icon d={ICON.pause} />
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="pdfx-readahead-on">
                        <Icon d={ICON.fastForward} />
                      </span>
                      <span className="pdfx-continue">
                        <Icon d={ICON.sparkles} />
                        Continue from {explained + 1}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="pdfx-panel-body">
              {tab === "notes" && (
                <div className="pdfx-notes" key={`notes-${current}-${run}`}>
                  <div className="pdfx-note-head">
                    <span className="pdfx-chip pdfx-chip--violet">Slide {current}</span>
                    <span className="pdfx-chip pdfx-chip--amber">0/{PRACTICE_PER_SLIDE} practice</span>
                    {/* Disabled while any explain job runs, as `NotesPanel.tsx` has it. */}
                    <span className="pdfx-reexplain" data-dim={aheadRunning}>
                      <Icon d={ICON.refresh} />
                      Re-explain
                      <Icon d={ICON.chevronDown} />
                    </span>
                  </div>
                  <h5>{note.head}</h5>
                  <p>{note.lead}</p>
                  {note.equation && <p className="pdfx-equation">{note.equation}</p>}
                  {note.body && <p>{note.body}</p>}
                  {note.callout && (
                    <div className="pdfx-callout">
                      <b>
                        <Icon d={ICON.bulb} />
                        Intuition
                      </b>
                      <p>{note.callout}</p>
                    </div>
                  )}
                  <p className="pdfx-section-head">Check yourself</p>
                  <QuizCard q={note.check} />
                  {/* Only while a batch runs, and after everything else in the panel. */}
                  {aheadRunning && (
                    <p className="pdfx-note-foot">
                      <i className="pdfx-spinner" />
                      Explaining ahead from slide {explained + 1}…
                    </p>
                  )}
                </div>
              )}

              {tab === "review" && (
                <div className="pdfx-review" key={`review-${run}`}>
                  <div className="pdfx-review-head">
                    <div className="pdfx-review-top">
                      <div>
                        <p className="pdfx-review-score">0 of {REVIEW_TOTAL} done</p>
                        <span className="pdfx-progress" aria-hidden="true">
                          <i />
                        </span>
                      </div>
                      <span className="pdfx-review-reset">
                        <Icon d={ICON.reset} />
                        Reset
                      </span>
                    </div>
                    {/* `FILTERS`, in order, counting the kinds in the set. */}
                    <div className="pdfx-filters">
                      <span data-on="true">
                        All<b>{REVIEW_TOTAL}</b>
                      </span>
                      <span className="pdfx-chip--indigo">
                        To do<b>{REVIEW_TOTAL}</b>
                      </span>
                      <span className="pdfx-chip--violet">
                        Quiz<b>{REVIEW.quiz}</b>
                      </span>
                      <span className="pdfx-chip--teal">
                        Match<b>{REVIEW.match}</b>
                      </span>
                      <span className="pdfx-chip--amber">
                        Blanks<b>{REVIEW.cloze}</b>
                      </span>
                    </div>
                  </div>
                  {/* The card that leaves. Hidden rather than unmounted once it has, so it
                      keeps the box the flight is measured from, and collapsed a moment
                      later so the blanks card below moves up into its place. */}
                  <div className="pdfx-card-slot" ref={cardRef} data-lifted={lifted}>
                    <QuizCard jump={QUIZ.slide} />
                  </div>
                  <ClozeCard />
                </div>
              )}

              {tab === "ask" && (
                <div className="pdfx-chat" key={`chat-${run}`}>
                  <div className="pdfx-thread">
                    <p className="pdfx-bubble pdfx-bubble--user">
                      <i className="pdfx-quote" ref={quoteRef}>
                        {ASK.quote}
                      </i>
                      {ASK.ask}
                    </p>
                    {thinking && (
                      <p className="pdfx-bubble pdfx-bubble--bot pdfx-thinking">
                        <i />
                        <i />
                        <i />
                      </p>
                    )}
                    {answered && (
                      <p className="pdfx-bubble pdfx-bubble--bot" data-spec-anchor="answer">
                        {ASK.reply}
                      </p>
                    )}
                  </div>
                  <div className="pdfx-composer">
                    <span className="pdfx-composer-field">Ask about slide {current}…</span>
                    <span className="pdfx-composer-send">
                      <Icon d={ICON.send} />
                    </span>
                  </div>
                  <p className="pdfx-composer-hint">
                    <span>Enter to send · Shift + Enter for a new line</span>
                    <span>
                      <Icon d={ICON.retry} />
                      Retry
                    </span>
                    <span>
                      <Icon d={ICON.trash} />
                      Clear
                    </span>
                  </p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* ------------------------------------------------------------ out of frame
          Both flyers are siblings of the window rather than children of it, because the
          window clips its contents and these have to leave it. */}
      {lifted && (
        <div className="pdfx-lift" ref={liftRef} key={`lift-${run}`} data-spec-anchor="card">
          <QuizCard jump={QUIZ.slide} />
        </div>
      )}
      {asked && !answered && (
        <span className="pdfx-phrase" ref={phraseRef} key={`phrase-${run}`} aria-hidden="true">
          {ASK.quote}
        </span>
      )}

      {!still && (
        <PhantomCursor
          stage={stageRef}
          target={CURSOR[beat] ?? null}
          pressing={PRESSES.has(beat)}
          onPress={onPress}
          token={`${run}-${beat}`}
        />
      )}

      <SpecTags beats={BEATS} beat={beat} tags={SPECS} className="pdfx-specs" />
    </div>
  );
}
