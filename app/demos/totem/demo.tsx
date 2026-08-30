"use client";

/**
 * Totem — "the switch, and what it does to the list".
 *
 * The only phone on a page of nine browsers, so it is staged as a phone: one device,
 * held still, running its own screens. That contrast is worth having and it costs
 * nothing to keep.
 *
 * WHAT THE FILM SHOWS
 *
 * An ordinary todo list with ordinary titles. A switch, off. The switch goes on and the
 * titles dissolve into the symbols that were beside them the whole time. Then one of
 * those symbols is practised, and the two grade buttons print the interval each of them
 * will produce.
 *
 * The switch is on screen *beside* the list rather than a screen away from it, because
 * the product is the relationship between the two and a film that shows them in sequence
 * shows a weaker thing than one that shows them together. It is drawn as the Settings
 * card it belongs to — four rows, its own section heading — so it reads as a control that
 * exists rather than as a prop invented for the film. It sits there from the first frame,
 * off, which is the state the README is emphatic about: an app that can hide your todo
 * list from you has to be an app you chose.
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
 * So the plate on the right is that grid, and each of the four totems on the list is a
 * dot on it. Nothing about the plate is a screen in the application — it is this film's
 * diagram of the mapping, the way Night Neutralizer's meters are the shape of a
 * compressor rather than a measurement of one. The four coordinates are real:
 *
 *   Violet Owl     colour index 16 -> 16 % 12 = 4  -> A3    owl         -> hoot
 *   Jade Rabbit    colour index  8 ->  8           -> G4    rabbit      -> thud
 *   Crimson Key    colour index  0 ->  0           -> C3    key-variant -> bell
 *   Aqua Fish      colour index 11 -> 11           -> D5    fish        -> bubble
 *
 * read out of `COLORS` and `FAMILY_BY_ICON` in the repository, with the wrap taken from
 * `audio.ts` (`colorIndex % TONE_RATES.length`).
 *
 * WHAT IS ACCURATE, AND WHAT IS STAGED
 *
 * The palette is the app's dark theme exactly: page `#0B0B10`, cards `#16161E`, accent
 * `#8A83FF`. The four hues are the named ones — Crimson `#FF2D55`, Jade `#10CB68`, Aqua
 * `#1FC3F7`, Violet `#AB39E8` — and all four are left alone by `displayColor`, whose
 * job is to pull a hue between 3.2:1 and 9:1 against a `#16161E` card; run against these
 * four it returns them unchanged, at 4.93, 8.36, 8.74 and 3.84 to one. So the scene can
 * print the raw hexes and still be showing what the phone would show.
 *
 * The four motions are four of the five a totem can actually be dealt — spin, tick,
 * flip, hop — at the loop lengths `components/motion.ts` gives them. The Settings rows,
 * the drill's question, its sub-line, the two grade buttons and the skip line are the
 * app's own wording. The interval on each button is what `applyGrade` really produces
 * for a totem at its opening one-day interval: naming it cold multiplies by an ease that
 * has just risen to 2.3, which `gapLabel` rounds to `2d`; needing the text resets to
 * `1d`.
 *
 * The artwork is not. There is no icon font on this page, so the owl, the rabbit, the
 * key and the fish are drawn here — silhouettes in the shape the real ones have, not
 * copies of them. The tasks are invented. This is a film about the app, not the app: you
 * cannot press this switch.
 */

import { useRef, type CSSProperties } from "react";
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
  /** The row's date line. Overdue rows draw it in the danger colour, larger. */
  readonly due: string;
  readonly late?: boolean;
  /** `!`–`!!!` in the quick-add grammar; drawn as the checkbox's ring colour. */
  readonly priority?: 1 | 2 | 3;
  readonly repeat?: string;
  readonly tag?: string;
  readonly subtasks?: [number, number];
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
 * arbitrary on purpose. It also fixes a legibility problem the first arrangement had —
 * `spin` really is a full rigid turn in the app, so the card the drill deals was being
 * photographed upside down at a hundred and thirty pixels.
 */
const TASKS: readonly Task[] = [
  {
    id: "passport",
    title: "Renew passport",
    due: "Yesterday",
    late: true,
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
    due: "9am",
    repeat: "Weekdays",
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
    due: "5pm",
    priority: 2,
    tag: "work",
    subtasks: [1, 3],
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

/**
 * How the Today screen groups them: overdue above what is due, which is the sort the app
 * runs and the reason the screen is worth opening.
 */
const SECTIONS = [
  { title: "Overdue", tone: "late", tasks: TASKS.filter((task) => task.late === true) },
  { title: "Due today", tone: "plain", tasks: TASKS.filter((task) => task.late !== true) },
] as const;

/** The card the drill deals. Row three, so the answer is the longest title on the list. */
const DRILLED = TASKS[2];

/**
 * The Symbols card in Settings, as the app lists it.
 *
 * All four rows, because a switch shown alone is a prop and a switch shown in its own
 * section of its own settings screen is a control. The third row is worth its space
 * twice over: it is the one that says these things have sounds at all, which is what the
 * plate on the other side of the frame is a diagram of.
 */
const SETTINGS_ROWS = [
  { key: "hide", label: "Hide task names behind their symbol", control: "switch" },
  { key: "legend", label: "What the symbols mean", control: "chevron" },
  { key: "sound", label: "Play each symbol's sound", control: "on" },
  { key: "motion", label: "Reduce motion", control: "off" },
] as const;

/* -------------------------------- storyboard -------------------------------- */

type BeatName =
  | "list"
  | "flip"
  | "dissolve"
  | "hidden"
  | "open"
  | "ask"
  | "named";

/**
 * Seven beats, sixteen and a half seconds.
 *
 * The long ones are the ones that ask you to read something — a list of four titles, the
 * same list again in a language you are being taught, a question with two answers priced
 * differently. The short ones are a tap and a transition.
 *
 * `flip` is one beat, not two, and that is the difference between a phone and every other
 * scene here. The rest of the page gives a click its own beat of approach because a
 * pointer has to travel; a finger does not, so contact and consequence belong in the same
 * beat, 180ms apart, which is what a tap actually is.
 *
 * `dissolve` is sized against its own choreography rather than against a reading speed:
 * four rows crossfading at 620ms with a 150ms stagger finish at 1070ms, so the beat is
 * over about seven hundred milliseconds after the last title has gone.
 */
const BEATS: readonly Beat<BeatName>[] = [
  // An ordinary todo list. Four titles you can read, and four symbols you have no
  // reason to look at yet.
  { name: "list", ms: 2800 },
  // The tap, and the switch. The list does not change: the cause is on screen a beat
  // before the effect, which is the one bit of sequencing this scene does need.
  { name: "flip", ms: 1900 },
  // The titles go. Row by row, blurring out as the phrase underneath fades up.
  { name: "dissolve", ms: 1800 },
  // The whole argument, held: a list you cannot read, made of things you can.
  { name: "hidden", ms: 3000 },
  // The drill bar pressed. Three symbols are due for practice and it says so.
  { name: "open", ms: 1400 },
  // The drill: one glyph, one question, and two answers with their prices on them.
  { name: "ask", ms: 3000 },
  // And the name comes back.
  { name: "named", ms: 2800 },
];

/**
 * Four claims, each on the thing making it.
 *
 * "Off until you turn it on" arrives on the beat the switch is operated rather than on
 * the first frame, because that is the moment a reader is looking at the switch — and it
 * has no `until`, because the Settings card never leaves. That matters more here than in
 * most scenes: the still frame this scene nominates is the hidden list, and a still of a
 * todo app with its words taken away, with nothing saying who took them, would be
 * describing a different and worse product.
 *
 * "Hides task names behind learned symbols" leaves on `ask`, with the list it is about.
 *
 * There is no fifth label naming the vocabulary. The plate prints `24 colours · 200
 * objects · 5 motions` along its own foot, and a label restating something already
 * printed in the frame is the exact failure this component exists to remove.
 */
const SPECS: readonly SpecTag<BeatName>[] = [
  /* Above the switch, into the air over the Settings card. It read `below` first, and
     `below` on a card whose four rows are a solid block of type puts the plate squarely
     across the second row — pointing, in a component whose whole purpose is that the
     claim and its evidence are in the same place, at the wrong row. The card is centred
     in its column precisely so there is somewhere for this to go. */
  { at: "flip", text: "Off until you turn it on", x: 12, y: 22, anchor: "switch", grip: "top", side: "above" },
  /* Under the list, inside the device, in the room the list itself leaves above the
     button and the tab bar. It hung off the left edge and read outward first, which is
     the natural place for it and is wrong for one reason that only shows up at a narrow
     window: a plate reading left from a phone needs about two hundred pixels to the left
     of that phone, and there is no arrangement of a device and two panels in a 600px
     well that leaves them. Photographed at 1024 the claim read "…ymbols" off the side of
     the page. Inside, it is the same distance from its evidence at every width. */
  { at: "hidden", text: "Hides task names behind learned symbols", x: 50, y: 78, anchor: "list", grip: "bottom", side: "below", until: "ask" },
  /* Under the whole plate, not under the grid. Anchored to the grid it landed on the
     readout directly beneath it — the two lines that are the worked example of exactly
     what this label says. */
  { at: "hidden", text: "Colour picks pitch, object picks timbre", x: 84, y: 62, anchor: "tone", grip: "bottom", side: "below" },
  /* Above the buttons and inside the device, for the same reason as the one above: the
     drill card leaves a clear band between what it is asking and what it is offering,
     and that band is there at every width. */
  { at: "ask", text: "Practice spaces itself out", x: 50, y: 62, anchor: "grades", grip: "top", side: "above" },
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
 * The eyes are cut in the ground colour rather than left as outlines, because they are
 * what makes an owl an owl at twenty-two pixels. `--tot-ground` is set by whatever the
 * glyph is sitting on — a row's card, or the drill's page.
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
        <path d="M12 4.4c4.6 0 7.7 3.7 7.7 8.7 0 5.4-3.3 9.3-7.7 9.3s-7.7-3.9-7.7-9.3c0-5 3.1-8.7 7.7-8.7Z" />
        <circle cx="8.9" cy="10.8" r="2.6" fill="var(--tot-ground)" />
        <circle cx="15.1" cy="10.8" r="2.6" fill="var(--tot-ground)" />
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
        <circle cx="12" cy="12.6" r="4.35" />
        <ellipse cx="11.4" cy="18.1" rx="5.3" ry="3.3" />
        <circle cx="17.5" cy="18.6" r="1.55" />
        <circle cx="10.4" cy="12.2" r="0.8" fill="var(--tot-ground)" />
        <circle cx="13.6" cy="12.2" r="0.8" fill="var(--tot-ground)" />
      </g>
    );
  }
  if (shape === "key") {
    return (
      <g>
        <circle cx="12" cy="6.6" r="4.3" />
        <circle cx="12" cy="6.6" r="1.75" fill="var(--tot-ground)" />
        <rect x="10.7" y="9.7" width="2.6" height="11.6" rx="1.1" />
        <rect x="13.3" y="15" width="3.3" height="2.1" rx="0.7" />
        <rect x="13.3" y="18.5" width="2.4" height="2.1" rx="0.7" />
      </g>
    );
  }
  return (
    <g>
      <ellipse cx="13.1" cy="12" rx="7.3" ry="4.6" />
      <path d="M6.4 12 1.9 8.1v7.8Z" />
      <path d="M12.7 7.5 15.4 4.6 15.8 8Z" />
      <circle cx="17.3" cy="10.7" r="0.95" fill="var(--tot-ground)" />
    </g>
  );
}

/**
 * One totem at a given size.
 *
 * `--phase` is a negative animation delay, so four rows of the same list are never in
 * step — the same thing `phaseFromId` does in the app, for the same reason: four glyphs
 * hopping together read as one animation rather than four objects.
 */
function TotemGlyph({
  totem,
  size,
  phase = 0,
  bloom = 1,
}: {
  totem: Totem;
  size: number;
  phase?: number;
  bloom?: number;
}) {
  return (
    <span
      className="tot-glyph"
      data-motion={totem.motion}
      style={
        {
          "--hue": totem.hex,
          "--glyph": `${size}px`,
          "--phase": `${-phase}ms`,
          "--bloom": bloom,
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

/** The tap. A contact point that survives a still frame, and a ring that does not. */
function Touch({ lap }: { lap: number }) {
  return (
    <span className="tot-touch" aria-hidden="true">
      <i className="tot-touch-ring" key={lap} />
    </span>
  );
}

/* ----------------------------------- icons ----------------------------------- */

/** The Settings rows' leading icons, in the shapes the app's own icon set draws. */
function RowIcon({ name }: { name: string }) {
  return (
    <svg className="tot-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {name === "hide" && (
        <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <path d="M2.6 12S6 6.6 12 6.6 21.4 12 21.4 12 18 17.4 12 17.4 2.6 12 2.6 12Z" />
          <circle cx="12" cy="12" r="2.7" />
          <path d="M4 20 20 4" />
        </g>
      )}
      {name === "legend" && (
        <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
          <path d="M12 3.4 20 9.2 17 18.6H7L4 9.2Z" />
        </g>
      )}
      {name === "sound" && (
        <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <path d="M9.6 17.2V5.4l8-1.6v11.6" />
          <circle cx="7.2" cy="17.8" r="2.4" />
          <circle cx="15.2" cy="15.8" r="2.4" />
        </g>
      )}
      {name === "motion" && (
        <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <path d="M3.4 8.6h11.2M3.4 12.6h8.4M3.4 16.6h13" />
          <path d="M18 6.6 21.4 12 18 17.4" />
        </g>
      )}
    </svg>
  );
}

/* ----------------------------------- scene ----------------------------------- */

export function TotemDemo() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const onScreen = useOnScreen(stageRef);
  /* Starts on focus. The first two seconds are an ordinary todo list, and arriving at
     the hidden one without having seen the readable one is arriving after the setup. */
  const running = useSceneRun(useSectionFocused(stageRef), onScreen);
  const { beat, index, run, still } = useStoryboard(BEATS, {
    running,
    stage: stageRef,
    /* The hidden list. Every other frame in this film is either the setup for it or a
       consequence of it, and it is the one frame that is an argument on its own: a todo
       app you cannot read, which you asked for, made of things you can. */
    stillBeat: "hidden",
  });

  const at = (name: BeatName) => BEATS.findIndex((entry) => entry.name === name);

  const switchOn = index >= at("flip");
  const hidden = index >= at("dissolve");
  const drilling = index >= at("ask");
  const revealed = index >= at("named");
  /* Which control has a finger on it. Nothing here is gated behind the press — there is
     no flight to wait for, so the tap and its consequence are the same beat. */
  const pressing = beat === "flip" ? "switch" : beat === "open" ? "drill" : null;

  return (
    <div
      className="tot"
      ref={stageRef}
      data-beat={beat}
      data-lap={run}
      data-hidden={hidden}
      data-screen={drilling ? "drill" : "today"}
      role="img"
      aria-label={
        "A phone running a todo app, beside the settings card that changes it and a " +
        "diagram of the sounds its symbols make. The list holds four tasks — renew " +
        "passport, standup notes, email Dana about the lease, water the plants — each " +
        `with a small coloured symbol beside it: ${TOTEM_CLAUSE}. A switch reading hide ` +
        "task names behind their symbol is off, then turned on, and the four titles dissolve " +
        "away leaving only the symbols and their names. One symbol is then practised: " +
        "the owl is drawn large under the question what is this one, above two answers " +
        "that print what each will do to the schedule — I had it, two days, and show " +
        "me, one day — and the task's real title comes back underneath. The diagram " +
        "beside the phone plots each symbol as one point on a grid of fourteen timbres " +
        "against twelve pitches, because the object a symbol is decides how it sounds " +
        "and the colour it is decides how high."
      }
    >
      <div className="tot-frame">
        {/* ------------------------------------------------- the settings card */}
        {/* Not a screen of the phone: the one card out of Settings that this film is
            about, stood beside the device so the control and its effect are in the same
            frame. It is here from the first frame with the switch off, which is the
            state that has to be seen rather than asserted. */}
        <aside className="tot-settings" data-on={switchOn} aria-hidden="true">
          <p className="tot-settings-head">Settings · Symbols</p>
          <ul className="tot-settings-rows">
            {SETTINGS_ROWS.map((row) => (
              <li className="tot-settings-row" key={row.key} data-key={row.key}>
                <RowIcon name={row.key} />
                <span className="tot-settings-label">{row.label}</span>
                {row.control === "chevron" ? (
                  <span className="tot-chev" />
                ) : row.control === "switch" ? (
                  <span className="tot-switch" data-spec-anchor="switch" data-on={switchOn}>
                    <i />
                    {pressing === "switch" && !still && <Touch lap={run} />}
                  </span>
                ) : (
                  <span className="tot-switch" data-on={row.control === "on"}>
                    <i />
                  </span>
                )}
              </li>
            ))}
          </ul>
          {/* The app's own sentence about what the switch is for, trimmed to its first
              clause. It is on the settings screen under this card, and it is the only
              place in the frame that says the totems keep working either way. */}
          <p className="tot-settings-note">
            Turn hiding on and your lists show only the symbols. Turn it off and task
            names sit in plain sight, like any other list.
          </p>
        </aside>

        {/* --------------------------------------------------------- the phone */}
        <div className="tot-phone" aria-hidden="true">
          <span className="tot-phone-shell" />
          <div className="tot-phone-screen">
            <div className="tot-status">
              <b>9:41</b>
              <span className="tot-status-icons">
                <i className="tot-sig" />
                <i className="tot-wifi" />
                <i className="tot-batt" />
              </span>
            </div>

            {/* Two screens in one positioned box: Today leaves to the left as the drill
                arrives from the right, which is the push a phone does. */}
            <div className="tot-screens">
            {/* ------------------------------------------------ Today */}
            <section className="tot-today" data-on={!drilling}>
              <header className="tot-today-head">
                <span>
                  <h4>Today</h4>
                  <p>Tuesday, March 4</p>
                </span>
                <span className="tot-cog" />
              </header>

              {/* The drill bar, which the app only draws when something is actually due
                  for practice, and which promises the number the drill will deliver. */}
              <div className="tot-drillbar" data-pressed={beat === "open"}>
                <span className="tot-brain" />
                <b>3 symbols to practise</b>
                <em>Holding</em>
                <span className="tot-chev" />
                {pressing === "drill" && !still && <Touch lap={run} />}
              </div>

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
                  crossfading backwards out of the hidden ones during the loop gap.
                  Overdue above due, which is the order the Today screen sorts in and
                  the reason the screen exists. */}
              <div className="tot-sections" data-spec-anchor="list" key={`list-${run}`}>
                {SECTIONS.map((section) => (
                  <div className="tot-section" key={section.title}>
                    <p className="tot-section-head" data-tone={section.tone}>
                      {section.title}
                    </p>
                    <ul className="tot-list">
                      {section.tasks.map((task) => {
                        const order = TASKS.indexOf(task);
                        return (
                          <li
                            className="tot-row"
                            key={task.id}
                            data-late={task.late === true}
                            style={{ "--row": order } as CSSProperties}
                          >
                            <span className="tot-check" data-priority={task.priority ?? 0} />
                            <span className="tot-row-glyph">
                              <TotemGlyph
                                totem={task.totem}
                                size={30}
                                phase={order * 470}
                                bloom={0}
                              />
                            </span>
                            <span className="tot-row-body">
                              <span className="tot-title">
                                <b className="tot-title-plain">{task.title}</b>
                                <b className="tot-title-hidden">{task.totem.phrase}</b>
                              </span>
                              <span className="tot-row-meta">
                                {task.due !== "" && (
                                  <em className="tot-due" data-late={task.late === true}>
                                    {task.due}
                                  </em>
                                )}
                                {task.repeat !== undefined && (
                                  <em className="tot-repeat">{task.repeat}</em>
                                )}
                                {task.subtasks !== undefined && (
                                  <em className="tot-subs">
                                    {task.subtasks[0]}/{task.subtasks[1]}
                                  </em>
                                )}
                                {/* Named while the titles are, collapsed to one mark in
                                    its own colour while they are not: the grouping stays
                                    visible without being spelled out. */}
                                {task.tag !== undefined && (
                                  <em className="tot-tag">
                                    <i />
                                    <span>{task.tag}</span>
                                  </em>
                                )}
                              </span>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>

              <span className="tot-fab" />
            </section>

            {/* ------------------------------------------------- the drill */}
            <section className="tot-drill" data-on={drilling} data-revealed={revealed}>
              <header className="tot-drill-head">
                <span className="tot-close" />
                <b>1 of 3</b>
                <span className="tot-pencil" />
              </header>
              <span className="tot-drill-track">
                <i />
              </span>

              <div className="tot-drill-stage">
                <TotemGlyph totem={DRILLED.totem} size={132} bloom={1} />
              </div>

              <div className="tot-drill-ask">
                <p className="tot-ask">What is this one?</p>
                <p className="tot-asksub">
                  Answer before you tap — committing to one is the part that does the
                  work.
                </p>
              </div>

              <div className="tot-drill-said">
                <p className="tot-phrase">{DRILLED.totem.phrase}</p>
                <div className="tot-answer">
                  <b>{DRILLED.title}</b>
                </div>
                <p className="tot-asksub">
                  Whichever fits what just happened. It only sets when this comes back.
                </p>
              </div>

              {/* Each button prints what pressing it would do to the schedule. That is
                  the spacing being operated rather than described, and the two numbers
                  are what `applyGrade` returns for a totem at its opening interval. */}
              <div className="tot-grades" data-spec-anchor="grades">
                <span className="tot-grade" data-solid={!revealed}>
                  <i className="tot-tick" />
                  I had it · 2d
                </span>
                <span className="tot-grade tot-grade--alt">
                  <i className="tot-eye" />
                  Show me · 1d
                </span>
                <span className="tot-grade tot-grade--said">I needed the text · 1d</span>
              </div>

              <p className="tot-skip">Skip — records nothing, stays due</p>
            </section>
            </div>

            <nav className="tot-tabs">
              {["Today", "Upcoming", "Browse", "Search"].map((tab, order) => (
                <span className="tot-tab" key={tab} data-on={order === 0}>
                  <i />
                  {tab}
                </span>
              ))}
            </nav>
          </div>
        </div>

        {/* ---------------------------------------------------- the tone plate */}
        {/* This is the film's diagram, not one of the app's screens. It is drawn on the
            well rather than on a card so it cannot be mistaken for part of the phone. */}
        <aside className="tot-tone" data-spec-anchor="tone" data-solo={drilling} aria-hidden="true">
          <p className="tot-tone-head">
            <b>Tone</b>
            <span>timbre × pitch</span>
          </p>

          <div className="tot-grid">
            <span className="tot-grid-corner" />
            {/* Both axes light the values actually in play, and light only the drilled
                one once the drill has dealt a card. That is what makes the plate read as
                two facts meeting rather than as a lattice with dots on it: at `ask` the
                only bright things on it are `A3`, `hoot` and the point where they cross. */}
            <div className="tot-grid-pitches">
              {PITCHES.map((pitch) => (
                <span
                  key={pitch}
                  data-on={TASKS.some((task) => task.totem.pitch === pitch)}
                  data-focus={pitch === DRILLED.totem.pitch}
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
                  data-focus={family === DRILLED.totem.family}
                >
                  {family}
                </span>
              ))}
            </div>
            {/* Keyed per lap so the four dots plot themselves again on every run,
                each one landing as its own row is read. */}
            <div className="tot-grid-field" key={`field-${run}`}>
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
                      data-focus={hit?.id === DRILLED.id}
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
              them. It is the owl throughout — the card the drill deals — rather than
              changing per beat, because a readout that moves while nothing has been
              chosen is a readout describing nothing. */}
          <dl className="tot-readout">
            <div>
              <dt>
                <i
                  className="tot-swatch"
                  style={{ "--hue": DRILLED.totem.hex } as CSSProperties}
                />
                {DRILLED.totem.colour}
              </dt>
              <dd>{DRILLED.totem.pitch}</dd>
            </div>
            <div>
              <dt>
                {/* The object itself rather than a bullet, so the second row is the same
                    kind of statement as the first: this thing, that sound. */}
                <svg
                  className="tot-swatch tot-swatch--art"
                  viewBox="0 0 24 24"
                  style={{ "--hue": DRILLED.totem.hex } as CSSProperties}
                  aria-hidden="true"
                  focusable="false"
                >
                  <GlyphArt shape={DRILLED.totem.shape} />
                </svg>
                {DRILLED.totem.object}
              </dt>
              <dd>{DRILLED.totem.family}</dd>
            </div>
          </dl>

          <p className="tot-deck">24 colours · 200 objects · 5 motions</p>
        </aside>
      </div>

      {/* No caption. The switch says what it does, the list shows it done, the drill's
          buttons print their own prices, and the plate names its own axes. */}
      <SpecTags beats={BEATS} beat={beat} tags={SPECS} className="tot-specs" />
    </div>
  );
}
