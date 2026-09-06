/**
 * A small living mark per project, for the index in the hero.
 *
 * The hero says all ten things are running on this page, and until now the
 * index under it was a list of names in a box — the one element on the page that
 * could have been lifted from any other site. These are the ten scenes in
 * miniature, so the claim is already true in the first viewport instead of being
 * a promise the visitor has to scroll to collect.
 *
 * Rules they all follow:
 *
 *   - No canvas, no client component, no timers. Every mark is a handful of
 *     divs animated by CSS keyframes in `globals.css`, which means ten of them
 *     run at once for the cost of compositing and the server renders them whole.
 *   - Each is a *sign* of its project, not a claim about it. The abstraction is
 *     the point: a mark that tried to be a screenshot at 44px would only be an
 *     unreadable screenshot. The section further down does the explaining.
 *   - Decorative, so `aria-hidden`. The link's own text carries the meaning, and
 *     a screen reader gets the name and number with nothing spelled out at it.
 *   - Anything that repeats is timed to be prime-ish against its neighbours, so
 *     the ten never fall into step and start looking like one animation.
 *
 * `prefers-reduced-motion` stops all of them dead in the stylesheet; each mark is
 * composed so its resting frame still reads as the right shape.
 */

import type { CSSProperties } from "react";

/** Position 0-8 in a 3x3 grid, and the two cells that repeat two steps apart. */
const NBACK_CELLS = [0, 4, 2, 7, 4, 1, 8, 3, 5];

function step(index: number): CSSProperties {
  return { "--step": index } as CSSProperties;
}

/**
 * Choir Practice: a stave, a passage marked on it, and a voice moving over it.
 *
 * The band is the application's loop, in its own loop blue — the newest thing the
 * scene below shows, and the one mark on the stave that is not a line. First in the
 * markup so it paints under the ruling and the voice crosses it.
 */
function ChoirMark() {
  return (
    <span className="imark imark--choir">
      <span className="imark-band" />
      {[0, 1, 2, 3].map((line) => (
        <span className="imark-stave" key={line} style={step(line)} />
      ))}
      <span className="imark-voice" />
    </span>
  );
}

/** Decaf: a feed with the colour going out of it. */
function DecafMark() {
  return (
    <span className="imark imark--decaf">
      {[0, 1, 2].map((row) => (
        <span className="imark-swatch" key={row} style={step(row)} />
      ))}
    </span>
  );
}

/**
 * PDF Explainer: the filmstrip's rail filling in ahead of the reader.
 *
 * It was a note settling onto a slide, which was the overlay the old scene was about.
 * The product's centrepiece now is that notes are written before you reach the slide,
 * and the filmstrip shows it as a rail that fills a slide or two ahead of where you are
 * reading — so that is the mark: four rails going violet in turn, and a pale bar stepping
 * down the page behind them.
 */
function PdfMark() {
  return (
    <span className="imark imark--pdf">
      {[0, 1, 2, 3].map((rail) => (
        <span className="imark-rail" key={rail} style={step(rail)} />
      ))}
      <span className="imark-slide" />
      <span className="imark-note" />
    </span>
  );
}

/** PagePack: a page dropping onto the stack that is already saved. */
function PagepackMark() {
  return (
    <span className="imark imark--pagepack">
      {[0, 1, 2].map((sheet) => (
        <span className="imark-sheet" key={sheet} style={step(sheet)} />
      ))}
      <span className="imark-falling" />
    </span>
  );
}

/** GRT Next Bus: the road, and the thing the countdown is counting. */
function GrtMark() {
  return (
    <span className="imark imark--grt">
      <span className="imark-road" />
      <span className="imark-pole" />
      <span className="imark-bus" />
    </span>
  );
}

/** N-Back: cues landing in a grid, and one of them coming back. */
function NbackMark() {
  return (
    <span className="imark imark--nback">
      {Array.from({ length: 9 }, (_, cell) => {
        const order = NBACK_CELLS.indexOf(cell);
        return (
          <span
            className="imark-cell"
            key={cell}
            style={order >= 0 ? step(order) : undefined}
            data-lit={order >= 0 ? "" : undefined}
          />
        );
      })}
    </span>
  );
}

/** Night Neutralizer: a bright frame coming down, and the level with it. */
function NightMark() {
  return (
    <span className="imark imark--night">
      <span className="imark-frame" />
      {[0, 1, 2, 3].map((bar) => (
        <span className="imark-level" key={bar} style={step(bar)} />
      ))}
    </span>
  );
}

/** 2FA Paster: six boxes, and the code landing in them one at a time. */
function PasterMark() {
  return (
    <span className="imark imark--tfa">
      {[0, 1, 2, 3, 4, 5].map((box) => (
        <span className="imark-digit" key={box} style={step(box)} />
      ))}
    </span>
  );
}

/** Totem: the word going, and the symbol that has to stand in for it. */
function TotemMark() {
  return (
    <span className="imark imark--totem">
      <span className="imark-word" />
      <span className="imark-glyph" />
    </span>
  );
}

/**
 * Byte Budget: a bar filling toward a cap, with its last stretch in the amber the
 * extension itself uses for a figure it inferred rather than measured. The two-tone bar
 * is the product's actual argument, at 44px.
 */
function BytesMark() {
  return (
    <span className="imark imark--bytes">
      <span className="imark-cap" />
      <span className="imark-measured" />
      <span className="imark-inferred" />
    </span>
  );
}

const MARKS: Record<string, () => React.JSX.Element> = {
  "choir-practice": ChoirMark,
  decaf: DecafMark,
  "pdf-explainer": PdfMark,
  pagepack: PagepackMark,
  "grt-next-bus": GrtMark,
  "n-back": NbackMark,
  "night-neutralizer": NightMark,
  "two-factor-paster": PasterMark,
  totem: TotemMark,
  "byte-budget": BytesMark,
};

export function IndexMark({ project }: { project: string }) {
  const Mark = MARKS[project];
  if (!Mark) return null;
  return (
    <span className="imark-slot" aria-hidden="true">
      <Mark />
    </span>
  );
}

/** Used by the test that checks every project has one. */
export const markedProjects = Object.keys(MARKS);
