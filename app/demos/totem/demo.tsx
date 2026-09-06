"use client";

/**
 * Totem — "a totem is dealt, the words go, and the app asks for them back".
 *
 * The only phone on a page of nine browsers, so it is staged as a phone: one device,
 * held still, running its own screens. That contrast is worth having and it costs
 * nothing to keep.
 *
 * WHAT THE FILM SHOWS
 *
 * The app's own first-run tour, on its first step: "Every task gets a totem." A totem is
 * dealt — a violet owl, drawn large with its bloom — and tapped, and its sound rings out
 * of the phone as rings of its own colour while the plate beside the device lights the
 * one point on its grid that sound is. Then the Today list, four ordinary titles, and
 * the eye in its header pressed: the titles dissolve into large glowing symbols with
 * their phrases demoted to a line of small italics, the symbols' ghosts drift out past
 * the device's edge, and a card slides in asking whether you can name these three. Then
 * a row is tapped and the recall card asks "What is this one?", prices its two answers,
 * and gives the title back when told to.
 *
 * Every screen, string and control here is one the app has at version 1.1.0, read out
 * of `src/app/onboarding.tsx`, `components/RecallNudge.tsx`, `app/recall/[id].tsx`,
 * `components/TaskRow.tsx` and `app/(tabs)/index.tsx`: the tour step and its two pills,
 * the eye button whose accessible names are "Hide task names" and "Show task names", the
 * 40pt hidden-row glyph with its bloom, the nudge's two lines, the recall card's
 * question, sub-line, two priced answers, foot line and revealed card. The one thing in
 * the frame that is not a screen of the application is the tone plate, which is this
 * film's diagram of a mapping the app makes but never draws — see below.
 *
 * THE SOUND, ON A PAGE WITH NO SOUND
 *
 * Every totem has a tone, and this page cannot play it. Night Neutralizer met the same
 * wall and got over it by printing its soundtrack at the size it sounds — the channel it
 * used was not the words but the type.
 *
 * Totem's own design hands over a better channel, because its sound is not one quantity
 * but two independent ones. `lib/soundmap.ts` maps the *object* to a sample family — an
 * owl hoots, a key rings, a rabbit thuds — and `lib/tone-assets.ts` maps the *colour*,
 * by index, onto twelve steps of a C major pentatonic ladder. So a totem's sound is a
 * coordinate: one of fourteen timbres crossed with one of twelve pitches. A coordinate
 * can be plotted, and a plot is legible in a still frame with the volume off.
 *
 * So the plate beside the phone is that grid, and each of the four totems on the list
 * is a dot on it. The four coordinates are real:
 *
 *   Violet Owl     colour index 16 -> 16 % 12 = 4  -> A3    owl         -> hoot
 *   Jade Rabbit    colour index  8 ->  8           -> G4    rabbit      -> thud
 *   Crimson Key    colour index  0 ->  0           -> C3    key-variant -> bell
 *   Aqua Fish      colour index 11 -> 11           -> D5    fish        -> bubble
 *
 * read out of `COLORS` and `FAMILY_BY_ICON` in the repository, with the wrap taken from
 * `audio.ts` (`colorIndex % TONE_RATES.length`).
 *
 * The sound also leaves the phone. When the dealt totem is tapped, rings in its colour
 * expand out of the glyph, across the device's edge and over the well, at a period set
 * by its rung on the ladder — a higher pitch rings faster — and the section behind the
 * well washes in the same colour on the same clock (`#totem[data-scene-beat="deal"]` in
 * `globals.css`). The recall card sounds the tone again on arrival, as the app does, and
 * rings again, quieter.
 *
 * WHAT IS ACCURATE, AND WHAT IS STAGED
 *
 * The palette is the app's dark theme exactly (`lib/palette.ts`): page `#0B0B10`, cards
 * `#16161E`, accent `#8A83FF`, and the darkened `#706ACF` the app fills a button with so
 * white can sit on it. The screen is laid out at the app's own 390x844 and scaled down as
 * one piece, so every size in `demo.css` — the 34pt title, the 17pt body, the 16pt card
 * radius, the 44pt slots, the 24pt and 40pt glyphs, the 56pt composer button — is the
 * app's own number rather than a miniature of it. The four hues are the named ones —
 * Crimson `#FF2D55`, Jade `#10CB68`, Aqua `#1FC3F7`, Violet `#AB39E8` — and all four are
 * left alone by `displayColor`, whose job is to pull a hue between 3.2:1 and 9:1 against
 * a `#16161E` card; run against these four it returns them unchanged. The tour's "Next"
 * is painted in the totem's own hue through `fillPair`, which leaves violet alone too:
 * white on `#AB39E8` is 4.7:1.
 *
 * The four motions are four of the five a totem can be dealt — spin, tick, flip, hop —
 * at the loop lengths `components/motion.ts` gives them; the module defines thirteen,
 * and `verify:motion` holds the dealt five apart from each other. The intervals on the
 * recall card are what `applyGrade` really produces for a totem at its opening one-day
 * interval: naming it cold multiplies by an ease that has just risen to 2.3, which
 * `nextGap` prints as two days; needing the text resets to one.
 *
 * The artwork is not. There is no icon font on this page, so the owl, the rabbit, the
 * key and the fish are drawn here — silhouettes in the shape the real ones have, not
 * copies of them. The tasks are invented. This is a film about the app, not the app: you
 * cannot press this eye.
 */

import { useEffect, useRef, type CSSProperties } from "react";
import { useSectionBeat } from "../scene/section-beat";
import { SpecTags, type SpecTag } from "../scene/spec";
import { useStoryboard, type Beat } from "../scene/storyboard";
import { useSceneRun } from "../scene/use-scene-run";
import { useOnScreen } from "../use-on-screen";
import { useSectionFocused } from "../use-section-focus";
import "./demo.css";

/* --------------------------------- the app ---------------------------------- */

/**
 * The twelve pitches, in the order `TONE_RATES` declares them: a C major pentatonic
 * ladder centred on D4. Twenty-four colours wrap onto twelve rungs, so the ladder rises
 * through the first twelve hues and starts again at Sky.
 */
const PITCHES = [
  "C3", "D3", "E3", "G3", "A3", "C4",
  "D4", "E4", "G4", "A4", "C5", "D5",
] as const;

/** The fourteen sample families, in `TONE_FAMILY_NAMES` order. An object picks one. */
const FAMILIES = [
  "bell", "blip", "bubble", "buzz", "chime", "chirp", "crunch",
  "engine", "growl", "hoot", "horn", "pluck", "thud", "whoosh",
] as const;

type Family = (typeof FAMILIES)[number];
type Pitch = (typeof PITCHES)[number];
type Shape = "owl" | "rabbit" | "key" | "fish";
type Motion = "spin" | "tick" | "flip" | "hop";

interface Totem {
  readonly colour: string;
  /** The hue as the app draws it. See the note on `displayColor` at the top. */
  readonly hex: string;
  readonly object: string;
  readonly shape: Shape;
  readonly motion: Motion;
  readonly pitch: Pitch;
  readonly family: Family;
  /** "Hopping violet owl" — `totemPhrase`, capitalised the way `TaskRow` capitalises it. */
  readonly phrase: string;
}

interface Task {
  readonly id: string;
  readonly title: string;
  readonly totem: Totem;
  /**
   * A time, printed by `formatTime` after a calendar mark. Empty for a date-only task:
   * the Today screen passes `showDue={false}`, so a task due today with no time prints
   * nothing on its row and a "Today" chip on its recall card.
   */
  readonly due: string;
  /** `!`–`!!!` in the quick-add grammar; drawn as the checkbox's ring colour. */
  readonly priority?: 1 | 2 | 3;
  /** A repeat, as `shortRecurrence` prints it — `3d` for every three days. The checkbox
      becomes a rounded square with a repeat mark. */
  readonly repeat?: string;
  readonly tag?: string;
}

/**
 * Four tasks, each with a totem of its own.
 *
 * Chosen so the four sounds land in four different corners of the grid — C3 through D5,
 * four unrelated timbres — because the plate's job is to show that two totems are told
 * apart by ear as readily as by eye, and four dots in a cluster would show the opposite.
 *
 * The rabbit spins and the owl hops, which is the right way round and was not the first
 * way round. A hopping rabbit is the one pairing on this list a reader would not have to
 * construct anything for, and constructing it is the entire mechanism: the deal is
 * arbitrary on purpose.
 */
const TASKS: readonly Task[] = [
  {
    id: "passport",
    title: "Renew passport",
    due: "5 PM",
    priority: 3,
    tag: "travel",
    totem: {
      colour: "Crimson",
      hex: "#FF2D55",
      object: "Key",
      shape: "key",
      motion: "tick",
      pitch: "C3",
      family: "bell",
      phrase: "Ticking crimson key",
    },
  },
  {
    id: "standup",
    title: "Standup notes",
    due: "9 AM",
    totem: {
      colour: "Aqua",
      hex: "#1FC3F7",
      object: "Fish",
      shape: "fish",
      motion: "flip",
      pitch: "D5",
      family: "bubble",
      phrase: "Flipping aqua fish",
    },
  },
  {
    id: "lease",
    title: "Email Dana about the lease",
    due: "",
    totem: {
      colour: "Violet",
      hex: "#AB39E8",
      object: "Owl",
      shape: "owl",
      motion: "hop",
      pitch: "A3",
      family: "hoot",
      phrase: "Hopping violet owl",
    },
  },
  {
    id: "plants",
    title: "Water the plants",
    due: "",
    repeat: "3d",
    totem: {
      colour: "Jade",
      hex: "#10CB68",
      object: "Rabbit",
      shape: "rabbit",
      motion: "spin",
      pitch: "G4",
      family: "thud",
      phrase: "Spinning jade rabbit",
    },
  },
];

/**
 * The four totems as one clause, for the stage's `aria-label`.
 *
 * Built from `TASKS` rather than typed out beside it, and that is the whole point of its
 * existing. The label used to carry the list as prose — "a spinning violet owl, a hopping
 * jade rabbit" — written when the owl did spin, and left behind when the two motions were
 * deliberately swapped a few lines above. So the one description of this scene that a
 * sighted visitor cannot check was the one describing objects that no longer move that
 * way, and it stayed wrong precisely because nothing rendered it.
 *
 * `phrase` is `totemPhrase`'s output, which is motion, colour and object in the app's own
 * order. Lower-cased because it arrives capitalised for the row it is drawn in, and this
 * is mid-sentence. "Totem's aria-label is built from the motions TASKS actually gives" in
 * `tests/rendered-html.test.mjs` holds each `phrase` to its own `motion`/`colour`/`object`,
 * so a swap cannot get through by editing the phrase to match.
 */
const TOTEM_CLAUSE = TASKS.map((task) => `a ${task.totem.phrase.toLowerCase()}`).join(", ");

/** The titles, the same way, so the label lists what the list lists. */
const TITLE_CLAUSE = TASKS.map(
  (task) => task.title.charAt(0).toLowerCase() + task.title.slice(1),
).join(", ");

/**
 * The totem the tour deals, and the row the finger later taps: the owl. One totem does
 * both jobs so the film has one subject — the sound that rings out of the phone at the
 * start is the symbol asked back at the end, and the plate's readout never has to change
 * what it is describing.
 */
const DEALT = TASKS[2];

/** Its rung on the ladder, which is what sets how fast its colour rings out. */
const DEALT_RUNG = PITCHES.indexOf(DEALT.totem.pitch);

/** The first of `LIST_COLORS`, which is the colour a tag is dealt by default. */
const TAG_HUE = "#5B54DE";

/** What the Today screen prints under its title: `weekdayName, monthName date`. */
const DATE = "Saturday, September 5";

/**
 * The tour's first step, in the app's own words (`src/app/onboarding.tsx`). The other two
 * steps exist and are not shown: the film cuts from the deal to the list, because the
 * list is where the eye is, and the eye is the control this version of the app is about.
 */
const TOUR = {
  head: "Every task gets a totem.",
  body:
    "A colour, an object, a way of moving — and a sound. Tap it to hear it. Deal again " +
    "until it's one you'd remember.",
  deal: "Deal a different one",
  next: "Next",
} as const;

/** "sounds like a hoot" — the article chosen the way the tour chooses it. */
const SOUNDS_LIKE = `sounds like ${/^[aeiou]/i.test(DEALT.totem.family) ? "an" : "a"} ${DEALT.totem.family}`;

/** The nudge Today draws once a third live task exists (`shouldNudge`). */
const NUDGE = {
  head: "Can you name these three?",
  body: "Twenty seconds, nothing graded. The real practice comes in a few hours.",
} as const;

/**
 * The recall card (`src/app/recall/[id].tsx`), as it reads while names are hidden: the
 * question, the sentence under it, the two answers with `nextGap` printed on them, and
 * the foot line that says what each one costs.
 */
const RECALL = {
  ask: "What is this one?",
  sub: "Say it before you look. Either answer below is fine — it only sets when this comes back.",
  know: "I know this one · back in 2 days",
  show: "Show me what it is",
  was: "That was it · back in a day",
  strength: "Not practised yet",
  done: "Mark it done",
} as const;

/* -------------------------------- storyboard -------------------------------- */

type BeatName =
  | "deal"
  | "today"
  | "eye"
  | "dissolve"
  | "hidden"
  | "tap"
  | "ask"
  | "named";

/**
 * Eight beats, seventeen seconds.
 *
 * The long ones are the ones that ask you to read something — a tour step, a list of
 * four titles, the same list again in a language you are being taught, a question with
 * two answers priced differently. The short ones are a tap and a transition.
 *
 * A tap and its consequence share a beat, a little apart, which is what a tap is: a
 * finger does not travel across a frame the way the page's phantom cursor does, so there
 * is no flight to give its own beat to. The gap lives in the stylesheet as a transition
 * delay on the thing that was pressed.
 *
 * `dissolve` is sized against its own choreography rather than against a reading speed:
 * four rows crossfading at 620ms with a 150ms stagger finish at 1070ms, and the ghosts
 * of the four symbols are still drifting out of the phone when `hidden` begins.
 *
 * `hidden` and `ask` keep their names on purpose: `scripts/spec-anchors.mjs` measures
 * this scene's labels on those two beats by name.
 */
const BEATS: readonly Beat<BeatName>[] = [
  // The tour's first step. A totem is dealt, tapped, and heard — as far as a silent
  // page can hear anything: rings of its colour, out of the phone, on its pitch.
  { name: "deal", ms: 2900 },
  // The tour goes and the list is underneath it. Four titles you can read, four
  // symbols you have no reason to look at yet, and an eye in the header.
  { name: "today", ms: 2100 },
  // The tap, and the eye. The list does not change yet: the cause is on screen a
  // beat before the effect, which is the one bit of sequencing this scene needs.
  { name: "eye", ms: 1000 },
  // The titles go. Row by row, blurring out as the phrase underneath fades up and the
  // symbol grows into its bloom; the symbols' ghosts drift out past the phone's edge.
  { name: "dissolve", ms: 1600 },
  // The whole argument, held: a list you cannot read, made of things you can, and a
  // card asking whether you can name them.
  { name: "hidden", ms: 3000 },
  // A row is tapped. The recall card comes in from the right, and rings.
  { name: "tap", ms: 1100 },
  // The question, and two answers with their prices on them.
  { name: "ask", ms: 3000 },
  // "Show me what it is", and the name comes back.
  { name: "named", ms: 2400 },
];

/**
 * Five claims, each on the thing making it.
 *
 * "Off until you turn it on" arrives on the beat the eye is pressed rather than on
 * the first frame, because that is the moment a reader is looking at the eye; it is
 * true — `revealAll` is `true` in `store.ts`, under a comment saying that hiding your own
 * list is the remarkable thing this app can do, not the price of using it.
 *
 * Three of the five leave with their subjects. The eye and the nudge are on the Today
 * screen, which slides away when a row is tapped; the question is replaced by the answer.
 * A label left pinned over the thing that replaced its subject is a label pointing at
 * nothing, which is the one failure this component cannot survive.
 *
 * The three that read leftward out of the phone need air on that side, and the layout
 * in `demo.css` is arranged around exactly that: an empty first column beside the
 * device at every width where the labels are still pinned.
 */
const SPECS: readonly SpecTag<BeatName>[] = [
  /* Under the whole plate, not under the grid. Anchored to the grid it landed on the
     readout directly beneath it — the two lines that are the worked example of exactly
     what this label says. */
  { at: "deal", text: "Colour picks pitch, object picks timbre", x: 84, y: 56, anchor: "tone", grip: "bottom", side: "below" },
  /* Straight above the eye, with a lead down to it, lifted clear of the status bar so
     the plate floats over the device's top edge rather than across its clock. */
  { at: "eye", text: "Off until you turn it on", x: 60, y: 4, anchor: "eye", grip: "top", nudge: { y: -10 }, side: "above", until: "tap" },
  /* Off the nudge's left edge, reading away from it into the air beside the phone. */
  { at: "hidden", text: "Nothing graded on day one", x: 34, y: 20, anchor: "nudge", grip: "left", side: "left", until: "tap" },
  /* Off the question's own left edge. The question is centred type, so its left edge
     is a third of the way across the screen and the plate has the empty margin beside
     it to lie in before it needs any air at all. */
  { at: "ask", text: "Asked back hours later, nothing locked", x: 42, y: 50, anchor: "ask", grip: "left", side: "left", until: "named" },
  /* Off the answer card, which is the words, back. */
  { at: "named", text: "Words come back on a tap", x: 34, y: 62, anchor: "answer", grip: "left", side: "left" },
];

/* ---------------------------------- artwork ---------------------------------- */

/**
 * The four objects, as silhouettes.
 *
 * Flat single-hue shapes with a soft same-hue bloom behind them, which is what the app
 * draws: `TotemGlyph` dropped a rounded tile early on because a white glyph on a coloured
 * square is the shape of an app icon and reads as generic, and because the colour has to
 * belong to the object rather than to a container behind it. A violet owl is a violet
 * owl.
 *
 * The eyes are holes rather than outlines, because they are what makes an owl an owl at
 * twenty-two pixels — and holes rather than a fill in the ground colour, because the
 * glyph sits on its own bloom, and an icon font's counters show whatever is behind them.
 */
function GlyphArt({ shape }: { shape: Shape }) {
  if (shape === "owl") {
    /* Tufts first and drawn well clear of the crown, because they are the whole
       difference between an owl and a ghost at thirty pixels — the first pass had
       them tucked inside the body outline and the row read as a skull. The two
       discs and the beak between them are the other half of it. */
    return (
      <g>
        <path d="M7.6 7.6 5.4 1.7 10.4 4.9Z" />
        <path d="M16.4 7.6 18.6 1.7 13.6 4.9Z" />
        {/* The body with the two eyes cut out of it — one path, even-odd — and the
            pupils laid back in. A counter in an icon font is a hole, and a hole shows
            the bloom behind it; a disc painted in a ground colour would not. */}
        <path
          fillRule="evenodd"
          d="M12 4.4c4.6 0 7.7 3.7 7.7 8.7 0 5.4-3.3 9.3-7.7 9.3s-7.7-3.9-7.7-9.3c0-5 3.1-8.7 7.7-8.7ZM6.3 10.8a2.6 2.6 0 1 0 5.2 0 2.6 2.6 0 1 0-5.2 0ZM12.5 10.8a2.6 2.6 0 1 0 5.2 0 2.6 2.6 0 1 0-5.2 0Z"
        />
        <circle cx="8.9" cy="10.8" r="1.1" />
        <circle cx="15.1" cy="10.8" r="1.1" />
        <path d="M12 11.2 13.5 14.4h-3Z" />
      </g>
    );
  }
  if (shape === "rabbit") {
    return (
      <g>
        <ellipse cx="9.7" cy="6.2" rx="1.55" ry="4.1" transform="rotate(-13 9.7 6.2)" />
        <ellipse cx="14.3" cy="6.2" rx="1.55" ry="4.1" transform="rotate(13 14.3 6.2)" />
        <path
          fillRule="evenodd"
          d="M7.65 12.6a4.35 4.35 0 1 0 8.7 0 4.35 4.35 0 1 0-8.7 0ZM9.6 12.2a.8.8 0 1 0 1.6 0 .8.8 0 1 0-1.6 0ZM12.8 12.2a.8.8 0 1 0 1.6 0 .8.8 0 1 0-1.6 0Z"
        />
        <ellipse cx="11.4" cy="18.1" rx="5.3" ry="3.3" />
        <circle cx="17.5" cy="18.6" r="1.55" />
      </g>
    );
  }
  if (shape === "key") {
    return (
      <g>
        <path
          fillRule="evenodd"
          d="M7.7 6.6a4.3 4.3 0 1 0 8.6 0 4.3 4.3 0 1 0-8.6 0ZM10.25 6.6a1.75 1.75 0 1 0 3.5 0 1.75 1.75 0 1 0-3.5 0Z"
        />
        <rect x="10.7" y="9.7" width="2.6" height="11.6" rx="1.1" />
        <rect x="13.3" y="15" width="3.3" height="2.1" rx="0.7" />
        <rect x="13.3" y="18.5" width="2.4" height="2.1" rx="0.7" />
      </g>
    );
  }
  return (
    <g>
      <path
        fillRule="evenodd"
        d="M5.8 12a7.3 4.6 0 1 0 14.6 0 7.3 4.6 0 1 0-14.6 0ZM16.35 10.7a.95.95 0 1 0 1.9 0 .95.95 0 1 0-1.9 0Z"
      />
      <path d="M6.4 12 1.9 8.1v7.8Z" />
      <path d="M12.7 7.5 15.4 4.6 15.8 8Z" />
    </g>
  );
}

/**
 * One totem, on its stage.
 *
 * Sized by the caller in the app's own points, or by the stylesheet when no size is
 * given — the rows do the latter, because a row's glyph is 24pt while the names show and
 * 40pt once they are hidden, and that growth is a transition the stylesheet owns. The
 * artwork is drawn at seven tenths of the stage with the bloom sized off the artwork,
 * which is `TotemGlyph`'s own arithmetic: the stage is the box, the art is smaller so
 * its motion has somewhere to go.
 *
 * `--phase` is a negative animation delay, so four rows of the same list are never in
 * step — the same thing `phaseFromId` does in the app, for the same reason: four glyphs
 * hopping together read as one animation rather than four objects.
 */
function TotemGlyph({
  totem,
  size,
  phase = 0,
}: {
  totem: Totem;
  size?: number;
  phase?: number;
}) {
  return (
    <span
      className="tot-glyph"
      data-motion={totem.motion}
      style={
        {
          "--hue": totem.hex,
          ...(size !== undefined ? { "--glyph": `${size}px` } : {}),
          "--phase": `${-phase}ms`,
        } as CSSProperties
      }
    >
      <span className="tot-glyph-move">
        <span className="tot-glyph-bloom" />
        <svg className="tot-glyph-art" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <GlyphArt shape={totem.shape} />
        </svg>
      </span>
    </span>
  );
}

/**
 * The tap. A contact point that survives a still frame, and a ring that does not.
 *
 * Not a phantom cursor: every other scene on the page is a browser and gets an arrow
 * that travels to a control and lands on it. A finger does not travel across a frame,
 * and an arrow on a phone would be the wrong hand entirely. `delay` is how long after
 * the beat begins the finger lands — the tour's tap waits for the eye to find the totem.
 */
function Touch({ lap, delay = 0 }: { lap: number; delay?: number }) {
  return (
    <span className="tot-touch" aria-hidden="true" style={{ "--tap": `${delay}ms` } as CSSProperties}>
      <i className="tot-touch-ring" key={lap} />
    </span>
  );
}

/* ----------------------------------- icons ----------------------------------- */

type IconName =
  | "eye"
  | "eye-off"
  | "cog"
  | "close"
  | "calendar"
  | "repeat"
  | "tag"
  | "check-circle"
  | "folder"
  | "search"
  | "volume"
  | "refresh"
  | "arrow"
  | "bulb"
  | "check"
  | "double-check"
  | "chevron-down"
  | "chevron-right"
  | "pencil"
  | "brain"
  | "plus";

/**
 * The app's controls and marks, in the shapes its icon set draws them. Stroked, on a 24
 * grid, so one component covers the eye, the cog, the tab bar and the chips. The eye is
 * `eye-outline`, the pressed eye `eye-off-outline`, which are the two the toggle uses.
 */
function Icon({ name }: { name: IconName }) {
  return (
    <svg className="tot-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {name === "eye" && (
          <>
            <path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6S2.5 12 2.5 12Z" />
            <circle cx="12" cy="12" r="3" />
          </>
        )}
        {name === "eye-off" && (
          <>
            <path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6S2.5 12 2.5 12Z" />
            <circle cx="12" cy="12" r="3" />
            <path d="M4 20 20 4" />
          </>
        )}
        {name === "cog" && (
          <>
            <path d="M19.05 9.76L21.47 10.42L21.47 13.58L19.05 14.24L18.57 15.40L19.81 17.58L17.58 19.81L15.40 18.57L14.24 19.05L13.58 21.47L10.42 21.47L9.76 19.05L8.60 18.57L6.42 19.81L4.19 17.58L5.43 15.40L4.95 14.24L2.53 13.58L2.53 10.42L4.95 9.76L5.43 8.60L4.19 6.42L6.42 4.19L8.60 5.43L9.76 4.95L10.42 2.53L13.58 2.53L14.24 4.95L15.40 5.43L17.58 4.19L19.81 6.42L18.57 8.60Z" />
            <circle cx="12" cy="12" r="3" />
          </>
        )}
        {name === "close" && <path d="M6 6l12 12M18 6 6 18" />}
        {name === "calendar" && (
          <>
            <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
            <path d="M3.5 10h17M8 3v4M16 3v4" />
          </>
        )}
        {name === "repeat" && (
          <path d="M17 3l3 3-3 3M20 6H8.5A4.5 4.5 0 0 0 4 10.5V12M7 21l-3-3 3-3M4 18h11.5a4.5 4.5 0 0 0 4.5-4.5V12" />
        )}
        {name === "tag" && (
          <>
            <path
              d="M20.6 12.6 12.6 20.6a2 2 0 0 1-2.8 0L3 13.8V3h10.8l6.8 6.8a2 2 0 0 1 0 2.8ZM6.2 7.6a1.4 1.4 0 1 0 2.8 0 1.4 1.4 0 1 0-2.8 0Z"
              fill="currentColor"
              fillRule="evenodd"
              stroke="none"
            />
          </>
        )}
        {name === "check-circle" && (
          <>
            <circle cx="12" cy="12" r="8.6" />
            <path d="M8.3 12.3l2.5 2.5 4.9-5.2" />
          </>
        )}
        {name === "folder" && (
          <path d="M3 7.5a2 2 0 0 1 2-2h4.2l2 2.4H19a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
        )}
        {name === "search" && (
          <>
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="M15.5 15.5 21 21" />
          </>
        )}
        {name === "volume" && (
          <>
            <path d="M4 9.5v5h3.4L12 18.6V5.4L7.4 9.5Z" fill="currentColor" stroke="none" />
            <path d="M15.4 8.9a4.4 4.4 0 0 1 0 6.2M18.2 6.2a8 8 0 0 1 0 11.6" />
          </>
        )}
        {name === "refresh" && <path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v4.6h-4.6" />}
        {name === "arrow" && <path d="M4 12h16M13 5l7 7-7 7" />}
        {name === "bulb" && (
          <path d="M9.2 18.2h5.6M10.2 21h3.6M12 3a6 6 0 0 0-3.4 10.9c.7.6 1 1.2 1 2.1h4.8c0-.9.3-1.5 1-2.1A6 6 0 0 0 12 3Z" />
        )}
        {name === "check" && <path d="M5 12.5l4.5 4.5L19 7.5" />}
        {name === "double-check" && <path d="M2.5 12.5l4 4L14 8.5M10 16.5l1 1L20 8.5" />}
        {name === "chevron-down" && <path d="M6 9.5l6 6 6-6" />}
        {name === "chevron-right" && <path d="M9.5 6l6 6-6 6" />}
        {name === "pencil" && <path d="M4 20h4L18.6 9.4a2.1 2.1 0 0 0-3-3L5 17v3ZM13.5 8.5l2 2" />}
        {name === "brain" && (
          <>
            <path d="M11.4 4.5a3.2 3.2 0 0 0-5.7 2.2A3 3 0 0 0 4.3 12a3 3 0 0 0 1.5 5 3.1 3.1 0 0 0 5.6 1.4Z" />
            <path d="M12.6 4.5a3.2 3.2 0 0 1 5.7 2.2A3 3 0 0 1 19.7 12a3 3 0 0 1-1.5 5 3.1 3.1 0 0 1-5.6 1.4Z" />
          </>
        )}
        {name === "plus" && <path d="M12 5v14M5 12h14" />}
      </g>
    </svg>
  );
}

/** The 44pt pressable with the 36pt chip inside it — `IconButton`, `tone="filled"`. */
function IconButton({
  icon,
  className,
  children,
  ...rest
}: {
  icon: IconName | readonly IconName[];
  className?: string;
  children?: React.ReactNode;
} & Record<`data-${string}`, string | boolean | undefined>) {
  const icons = typeof icon === "string" ? [icon] : icon;
  return (
    <span className={className ? `tot-iconbtn ${className}` : "tot-iconbtn"} {...rest}>
      <i className="tot-iconbtn-chip">
        {icons.map((name) => (
          <Icon name={name} key={name} />
        ))}
      </i>
      {children}
    </span>
  );
}

/**
 * The app's icon: a glowing white owl on the indigo `app.json` gives the splash, drawn
 * after `assets/expo.icon/Assets/totem.svg`. The scene's mark, in the corner of the well
 * — where the device never covers it, which is not true of anywhere in the section
 * behind the well, whose height is the window's.
 */
function AppMark() {
  return (
    <span className="tot-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        <path
          d="M6.9 8.2 4.6 2.6l5.3 3.1M17.1 8.2l2.3-5.6-5.3 3.1"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path
          d="M12 4.6c5 0 8.3 3.6 8.3 8.4 0 5.4-3.6 9.4-8.3 9.4s-8.3-4-8.3-9.4c0-4.8 3.3-8.4 8.3-8.4Z"
          fill="currentColor"
        />
        <circle cx="8.6" cy="11.4" r="3.1" fill="var(--tot-mark-eye)" />
        <circle cx="15.4" cy="11.4" r="3.1" fill="var(--tot-mark-eye)" />
        <circle cx="8.6" cy="11.4" r="1.35" fill="currentColor" />
        <circle cx="15.4" cy="11.4" r="1.35" fill="currentColor" />
        <path d="M12 12.6 13.9 15.2 12 17.6 10.1 15.2Z" fill="var(--tot-mark-eye)" />
      </svg>
    </span>
  );
}

/* ----------------------------------- scene ----------------------------------- */

export function TotemDemo() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const pulseRef = useRef<HTMLDivElement | null>(null);
  const onScreen = useOnScreen(stageRef);
  /* Starts on focus. The first three seconds are the tour dealing a symbol, and
     arriving at the hidden list without having seen the deal is arriving after the
     setup. */
  const running = useSceneRun(useSectionFocused(stageRef), onScreen);
  const { beat, index, run, still } = useStoryboard(BEATS, {
    running,
    stage: stageRef,
    /* The hidden list. Every other frame in this film is either the setup for it or a
       consequence of it, and it is the one frame that is an argument on its own: a todo
       app you cannot read, which you asked for, made of things you can, with a card
       asking whether you can name them. */
    stillBeat: "hidden",
  });

  /* The section around the well answers the deal: a wash of the dealt totem's colour on
     its pitch, and the vocabulary in the backdrop brightening once the names are hidden.
     See `#totem[data-scene-beat]` in `globals.css`. */
  useSectionBeat(stageRef, beat, BEATS);

  const at = (name: BeatName) => BEATS.findIndex((entry) => entry.name === name);

  const listed = index >= at("today");
  const switchOn = index >= at("eye");
  const hidden = index >= at("dissolve");
  const nudged = index >= at("hidden");
  const recalling = index >= at("tap");
  const revealed = index >= at("named");
  const screen = !listed ? "tour" : !recalling ? "today" : "recall";
  /* How much of the plate is lit. One point while the tour is dealing one totem; all
     four once the list is on screen; the dealt one alone again once it is the card. */
  const toneMode = !listed ? "deal" : !recalling ? "all" : "solo";
  /* Which control has a finger on it. Nothing here is gated behind a press — there is no
     flight to wait for, so the tap and its consequence are the same beat. Gated on
     `running` so a scene sitting 300px below the fold does not tap its own tour, and on
     `still` so a held frame never shows a hand frozen mid-press. */
  const pressing = !running || still
    ? null
    : beat === "deal"
      ? "dealt"
      : beat === "eye"
        ? "eye"
        : beat === "tap"
          ? "row"
          : beat === "named"
            ? "show"
            : null;
  /* The sound, as rings. Once out of the tour's tap, once out of the recall card as it
     arrives — the two moments the app plays the tone unasked. Never on a still frame: a
     ring caught halfway is a picture of nothing. */
  const pulsing = running && !still && (index <= at("today") || beat === "tap" || beat === "ask");

  /**
   * The section gets the dealt totem's hue, so the wash it throws on the deal is the
   * colour of the thing being dealt rather than a hex copied into the stylesheet.
   */
  useEffect(() => {
    const section = stageRef.current?.closest<HTMLElement>("[data-project-section]");
    if (!section) return;
    section.style.setProperty("--totem-hue", DEALT.totem.hex);
    return () => {
      section.style.removeProperty("--totem-hue");
    };
  }, []);

  /**
   * Where the rings come from.
   *
   * The tour centres its content vertically, so the dealt glyph's position on the
   * screen depends on how the body copy wraps — not a number the stylesheet can know.
   * Measured once, when the pulse mounts, against the phone the rings are drawn on. The
   * recall card's stage is a fixed 200pt under a fixed header, so that one is a number
   * in the stylesheet (`[data-recall="true"]`) and needs no measuring.
   */
  useEffect(() => {
    if (!pulsing || recalling) return;
    const root = stageRef.current;
    const pulse = pulseRef.current;
    if (!root || !pulse) return;

    const frame = requestAnimationFrame(() => {
      const phone = root.querySelector<HTMLElement>(".tot-phone")?.getBoundingClientRect();
      const disc = root.querySelector<HTMLElement>(".tot-disc--tour .tot-glyph")?.getBoundingClientRect();
      if (!phone || !disc || disc.width === 0) return;
      pulse.style.setProperty("--px", `${(disc.left + disc.width / 2 - phone.left).toFixed(1)}px`);
      pulse.style.setProperty("--py", `${(disc.top + disc.height / 2 - phone.top).toFixed(1)}px`);
    });
    return () => cancelAnimationFrame(frame);
  }, [pulsing, recalling, run, running]);

  /**
   * Where the four symbols leave the phone from.
   *
   * The ghosts that drift out of the device on `dissolve` are drawn on the stage rather
   * than inside the phone, because the screen clips — it has to, for the corners and the
   * pushes — and a thing that is supposed to cross the phone's edge cannot live inside it.
   * So each ghost is placed over the row glyph it is leaving, measured once as the
   * dissolve begins, and told how far it is to the device's left edge; the rest of its
   * journey is authored in the stylesheet as an offset beyond that edge.
   *
   * Measured again per lap, because the list is keyed per lap and comes back laid out
   * fresh; and once, not on a loop, because the rows do not move during the dissolve —
   * the nudge that pushes them down arrives on the beat after.
   */
  useEffect(() => {
    if (!hidden) return;
    const root = stageRef.current;
    if (!root) return;

    const frame = requestAnimationFrame(() => {
      const box = root.getBoundingClientRect();
      const phone = root.querySelector<HTMLElement>(".tot-phone")?.getBoundingClientRect();
      if (!phone || box.width === 0) return;

      for (const ghost of root.querySelectorAll<HTMLElement>(".tot-drift-glyph")) {
        const source = root.querySelector<HTMLElement>(
          `.tot-row-glyph[data-task="${ghost.dataset.task}"] .tot-glyph`,
        );
        const from = source?.getBoundingClientRect();
        if (!from || from.width === 0) continue;
        const cx = from.left + from.width / 2 - box.left;
        const cy = from.top + from.height / 2 - box.top;
        ghost.style.setProperty("--gx", `${cx.toFixed(1)}px`);
        ghost.style.setProperty("--gy", `${cy.toFixed(1)}px`);
        ghost.style.setProperty("--edge", `${(phone.left - box.left - cx).toFixed(1)}px`);
        ghost.dataset.measured = "true";
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [hidden, run]);

  const hue = { "--hue": DEALT.totem.hex } as CSSProperties;

  return (
    <div
      className="tot"
      ref={stageRef}
      data-beat={beat}
      data-lap={run}
      data-running={running}
      data-still={still}
      data-hidden={hidden}
      data-screen={screen}
      role="img"
      aria-label={
        "A phone running Totem, a todo app, beside a diagram of the sounds its symbols make. " +
        "It opens on the app's tour, every task gets a totem, and deals one: a " +
        `${DEALT.totem.colour.toLowerCase()} ${DEALT.totem.object.toLowerCase()}, drawn large ` +
        "with a glow. It is tapped, and its sound rings out of the phone as rings of its own " +
        "colour while the diagram lights the point where its timbre, " +
        `${DEALT.totem.family}, meets its pitch, ${DEALT.totem.pitch}. ` +
        `Then the Today list: ${TITLE_CLAUSE}, each with a small coloured symbol beside ` +
        `it: ${TOTEM_CLAUSE}. A finger presses the eye button in the header, hide task ` +
        "names, and the four titles dissolve into large glowing symbols with their phrases " +
        "demoted to a line of small italics; the symbols drift out past the edge of the " +
        "phone, and a card slides in asking, can you name these three. A tap on the " +
        `${DEALT.totem.object.toLowerCase()}'s row opens the recall card: the symbol drawn ` +
        `large over the question ${RECALL.ask.toLowerCase().replace(/\?$/, "")}, say it ` +
        "before you look, above two answers that print what each will do to the schedule, " +
        `${RECALL.know.toLowerCase()} and ${RECALL.show.toLowerCase()}. The second is ` +
        `pressed and the task's title, ${DEALT.title.charAt(0).toLowerCase()}${DEALT.title.slice(1)}, ` +
        "comes back in a card with its phrase above it. The diagram beside the phone plots " +
        "each symbol as one point on a grid of fourteen timbres against twelve pitches, " +
        "because the object a symbol is decides how it sounds and the colour it is decides " +
        "how high."
      }
    >
      <AppMark />

      <div className="tot-frame">
        {/* --------------------------------------------------------- the phone */}
        <div className="tot-device" aria-hidden="true">
        <div className="tot-phone">
          <div className="tot-phone-screen">
            <div className="tot-status">
              <b>9:41</b>
              <span className="tot-status-icons">
                <i className="tot-sig" />
                <i className="tot-wifi" />
                <i className="tot-batt" />
              </span>
            </div>

            {/* Three screens in one positioned box: the tour drops away to reveal
                Today, and Today leaves to the left as the recall card arrives from
                the right, which is the push a phone does. */}
            <div className="tot-screens">
              {/* ------------------------------------------------ the tour */}
              <section className="tot-tour" data-on={screen === "tour"} style={hue}>
                <header className="tot-tour-head">
                  <span className="tot-dots">
                    <i data-on="true" />
                    <i />
                    <i />
                  </span>
                  <IconButton icon="close" />
                </header>

                <div className="tot-tour-body">
                  <span className="tot-disc tot-disc--tour" data-spec-anchor="dealt">
                    <TotemGlyph totem={DEALT.totem} size={200} />
                    {pressing === "dealt" && <Touch lap={run} delay={760} />}
                  </span>
                  <p className="tot-tour-phrase">{DEALT.totem.phrase}</p>
                  <span className="tot-soundpill">
                    <Icon name="volume" />
                    {SOUNDS_LIKE}
                  </span>
                  <span className="tot-chip">
                    <Icon name="refresh" />
                    {TOUR.deal}
                  </span>
                  <h3 className="tot-tour-title">{TOUR.head}</h3>
                  <p className="tot-tour-copy">{TOUR.body}</p>
                </div>

                <footer className="tot-tour-foot">
                  <span className="tot-btn tot-btn--hue">
                    <Icon name="arrow" />
                    {TOUR.next}
                  </span>
                </footer>
              </section>

              {/* ------------------------------------------------ Today */}
              <section className="tot-today" data-on={screen === "today"}>
                <header className="tot-today-head">
                  <div className="tot-screen-title">
                    <h4>Today</h4>
                    <p>{DATE}</p>
                  </div>
                  <div className="tot-head-btns">
                    {/* The eye. `IconButton` in the Today header, accent-tinted once the
                        names are hidden; its accessible name flips between the two the
                        app gives it. */}
                    <IconButton
                      icon={["eye", "eye-off"]}
                      className="tot-eye"
                      data-on={switchOn}
                      data-spec-anchor="eye"
                      data-label={switchOn ? "Show task names" : "Hide task names"}
                    >
                      {pressing === "eye" && <Touch lap={run} delay={160} />}
                    </IconButton>
                    <IconButton icon="cog" />
                  </div>
                </header>

                {/* The nudge, which the app draws on Today once a third live task
                    exists. Its slot opens from nothing so the list beneath moves down
                    rather than jumping. */}
                <div className="tot-nudge-slot" data-on={nudged}>
                  <div className="tot-nudge" data-spec-anchor="nudge">
                    <span className="tot-nudge-icon">
                      <Icon name="brain" />
                    </span>
                    <span className="tot-nudge-text">
                      <b>{NUDGE.head}</b>
                      <small>{NUDGE.body}</small>
                    </span>
                    <span className="tot-nudge-go">
                      <Icon name="chevron-right" />
                    </span>
                    <span className="tot-nudge-dismiss">
                      <Icon name="close" />
                    </span>
                  </div>
                </div>

                <div className="tot-scroll">
                  <div className="tot-progress">
                    <p>
                      <b>1 of 5 done</b>
                      <em>20%</em>
                    </p>
                    <span className="tot-track">
                      <i />
                    </span>
                  </div>

                  {/* Keyed per lap so a new run opens on readable titles rather than
                      crossfading backwards out of the hidden ones during the loop gap. */}
                  <ul className="tot-list" data-spec-anchor="list" key={`list-${run}`}>
                    {TASKS.map((task, order) => (
                      <li
                        className="tot-row"
                        key={task.id}
                        data-task={task.id}
                        style={{ "--row": order, "--hue": task.totem.hex } as CSSProperties}
                      >
                        <span className="tot-control">
                          <span
                            className="tot-check"
                            data-priority={task.priority ?? 0}
                            data-repeat={task.repeat !== undefined}
                          >
                            {task.repeat !== undefined && <Icon name="repeat" />}
                          </span>
                        </span>
                        <span className="tot-control tot-row-glyph" data-task={task.id}>
                          <TotemGlyph totem={task.totem} phase={order * 470} />
                          {pressing === "row" && task === DEALT && <Touch lap={run} delay={120} />}
                        </span>
                        <span className="tot-row-body">
                          <span className="tot-title">
                            <b className="tot-title-plain">{task.title}</b>
                            <i className="tot-title-hidden">{task.totem.phrase}</i>
                          </span>
                          {(task.due !== "" || task.repeat !== undefined || task.tag !== undefined) && (
                            <span className="tot-row-meta">
                              {task.due !== "" && (
                                <em className="tot-due">
                                  <Icon name="calendar" />
                                  {task.due}
                                </em>
                              )}
                              {task.repeat !== undefined && (
                                <em className="tot-repeat">
                                  <Icon name="repeat" />
                                  {task.repeat}
                                </em>
                              )}
                              {/* A tinted chip while the names show; the bare tag mark
                                  in the tag's colour once they are hidden. */}
                              {task.tag !== undefined && (
                                <em className="tot-tag" style={{ "--tag": TAG_HUE } as CSSProperties}>
                                  <span className="tot-tag-chip">{task.tag}</span>
                                  <span className="tot-tag-mark">
                                    <Icon name="tag" />
                                  </span>
                                </em>
                              )}
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <p className="tot-done-head">
                    <Icon name="double-check" />
                    <span>Completed today</span>
                    <b>1</b>
                    <Icon name="chevron-down" />
                  </p>
                </div>

                <span className="tot-fab">
                  <Icon name="plus" />
                </span>

                <nav className="tot-tabs">
                  {(
                    [
                      ["Today", "check-circle"],
                      ["Upcoming", "calendar"],
                      ["Browse", "folder"],
                      ["Search", "search"],
                    ] as const
                  ).map(([tab, icon], order) => (
                    <span className="tot-tab" key={tab} data-on={order === 0}>
                      <Icon name={icon} />
                      {tab}
                    </span>
                  ))}
                </nav>
              </section>

              {/* ------------------------------------------------ the recall card */}
              <section
                className="tot-recall"
                data-on={screen === "recall"}
                data-revealed={revealed}
                style={hue}
              >
                <header className="tot-recall-head">
                  <IconButton icon="chevron-down" />
                  <IconButton icon="pencil" />
                </header>

                <div className="tot-recall-scroll">
                  <span className="tot-disc tot-disc--recall">
                    <TotemGlyph totem={DEALT.totem} size={200} />
                  </span>
                  <p className="tot-facts">
                    <span className="tot-fact">
                      <Icon name="calendar" />
                      Today
                    </span>
                  </p>
                  <p className="tot-strength">{RECALL.strength}</p>

                  {/* The question leaves as the answer arrives, a beat after the finger
                      lands on "Show me what it is". */}
                  <div className="tot-recall-ask">
                    <p className="tot-ask">
                      <span data-spec-anchor="ask">{RECALL.ask}</span>
                    </p>
                    <p className="tot-asksub">{RECALL.sub}</p>
                  </div>

                  <div className="tot-ladder">
                    <span className="tot-btn tot-btn--primary" data-when="ask">
                      <Icon name="bulb" />
                      {RECALL.know}
                    </span>
                    <span className="tot-btn tot-btn--primary" data-when="named">
                      <Icon name="check" />
                      {RECALL.was}
                    </span>
                    <span className="tot-btn tot-btn--reveal" data-when="ask">
                      <Icon name="eye" />
                      {RECALL.show}
                      {pressing === "show" && <Touch lap={run} delay={140} />}
                    </span>
                    <div className="tot-answer" data-when="named" data-spec-anchor="answer">
                      <em>{DEALT.totem.phrase}</em>
                      <b>{DEALT.title}</b>
                    </div>
                  </div>

                  <p className="tot-recall-foot">
                    Either way is fine. All it decides is how soon the{" "}
                    {DEALT.totem.phrase.toLowerCase()} comes back: named from memory it is 2
                    days away, read off the card it is a day.
                  </p>
                </div>

                <footer className="tot-recall-bar">
                  <span className="tot-btn tot-btn--primary">
                    <Icon name="check" />
                    {RECALL.done}
                  </span>
                </footer>
              </section>
            </div>
          </div>
        </div>

          {/* The sound, leaving the device. Rings out of the dealt glyph, on the period
              its pitch sets, keyed so they play once per lap and once per start — a scene
              sitting below the fold with its clock stopped must not ring. Fewer and
              fainter out of the recall card, which is the tone played a second time. */}
          {pulsing && (
            <div
              className="tot-pulse"
              ref={pulseRef}
              key={`pulse-${run}-${running}-${recalling}`}
              data-recall={recalling}
              style={{ ...hue, "--rung": DEALT_RUNG } as CSSProperties}
            >
              {[0, 1, 2, 3].map((ring) => (
                <i key={ring} style={{ "--i": ring } as CSSProperties} />
              ))}
            </div>
          )}
        </div>

        {/* ---------------------------------------------------- the tone plate */}
        {/* This is the film's diagram, not one of the app's screens. It is drawn on the
            well rather than on a card so it cannot be mistaken for part of the phone. */}
        <aside
          className="tot-tone"
          data-spec-anchor="tone"
          data-mode={toneMode}
          style={{ ...hue, "--rung": DEALT_RUNG } as CSSProperties}
          aria-hidden="true"
        >
          <p className="tot-tone-head">
            <b>Tone</b>
            <span>timbre × pitch</span>
          </p>

          <div className="tot-grid">
            <span className="tot-grid-corner" />
            {/* Both axes light the values in play, and only the dealt one while the tour
                is dealing it or the card is asking about it. That is what makes the plate
                read as two facts meeting rather than as a lattice with dots on it: at
                `deal` the only bright things on it are A3, hoot and the point where they
                cross. */}
            <div className="tot-grid-pitches">
              {PITCHES.map((pitch) => (
                <span
                  key={pitch}
                  data-on={TASKS.some((task) => task.totem.pitch === pitch)}
                  data-focus={pitch === DEALT.totem.pitch}
                >
                  {pitch}
                </span>
              ))}
            </div>
            <div className="tot-grid-families">
              {FAMILIES.map((family) => (
                <span
                  key={family}
                  data-on={TASKS.some((task) => task.totem.family === family)}
                  data-focus={family === DEALT.totem.family}
                >
                  {family}
                </span>
              ))}
            </div>
            {/* Keyed per lap so the four dots plot themselves again on every run: the
                dealt one as the tour deals it, the other three as the list arrives. */}
            <div className="tot-grid-field" key={`field-${run}-${running}`}>
              {FAMILIES.map((family) =>
                PITCHES.map((pitch) => {
                  const hit = TASKS.find(
                    (task) => task.totem.family === family && task.totem.pitch === pitch,
                  );
                  return (
                    <span
                      className="tot-cell"
                      key={`${family}-${pitch}`}
                      data-hit={hit !== undefined}
                      data-focus={hit?.id === DEALT.id}
                      style={
                        hit
                          ? ({
                              "--hue": hit.totem.hex,
                              "--n": TASKS.indexOf(hit),
                            } as CSSProperties)
                          : undefined
                      }
                    />
                  );
                }),
              )}
            </div>
          </div>

          {/* One totem read off the grid, so the two axes have a worked example against
              them. It is the owl throughout — the totem the tour deals and the card asks
              about — rather than changing per beat, because a readout that moves while
              nothing has been chosen is a readout describing nothing. */}
          <dl className="tot-readout">
            <div>
              <dt>
                <i className="tot-swatch" style={hue} />
                {DEALT.totem.colour}
              </dt>
              <dd>{DEALT.totem.pitch}</dd>
            </div>
            <div>
              <dt>
                {/* The object itself rather than a bullet, so the second row is the same
                    kind of statement as the first: this thing, that sound. */}
                <svg
                  className="tot-swatch tot-swatch--art"
                  viewBox="0 0 24 24"
                  style={hue}
                  aria-hidden="true"
                  focusable="false"
                >
                  <GlyphArt shape={DEALT.totem.shape} />
                </svg>
                {DEALT.totem.object}
              </dt>
              <dd>{DEALT.totem.family}</dd>
            </div>
          </dl>

          <p className="tot-deck">24 colours · 200 objects · 5 motions</p>
        </aside>
      </div>

      {/* The symbols, leaving the phone. Four ghosts of the four row glyphs, drawn on the
          stage so they can cross the device's edge, placed over their rows by the effect
          above and drifting out into the air beside the phone as the names go — where
          they hang, faint, until the recall card takes over. The words are gone; the
          shapes are what is left to remember them by. */}
      <div
        className="tot-drift"
        aria-hidden="true"
        data-on={hidden && !recalling}
        key={`drift-${run}`}
      >
        {TASKS.map((task, order) => (
          <span
            className="tot-drift-glyph"
            key={task.id}
            data-task={task.id}
            style={{ "--row": order } as CSSProperties}
          >
            {/* Two elements: the outer one fades on a transition, the inner one flies on
                an animation. A `forwards` animation and a transition cannot share one
                element's opacity — the transition never sees the animated value. */}
            <span className="tot-drift-fly">
              <TotemGlyph totem={task.totem} phase={order * 470 + 900} />
            </span>
          </span>
        ))}
      </div>

      {/* No caption. The tour says what a totem is, the eye says what it does, the list
          shows it done, the recall card prices its own answers, and the plate names its
          own axes. */}
      <SpecTags beats={BEATS} beat={beat} tags={SPECS} className="tot-specs" />
    </div>
  );
}
