"use client";

/**
 * One frame of the film, drawn as SVG.
 *
 * A room at night with a window in it, and something going off outside that
 * window. The composition is doing specific work rather than being decorative:
 *
 * The near-black objects — the picture, the chair, the bottle on the sill — sit at
 * 4, 9 and 14 out of 255. On an untreated panel they are the same black as the
 * wall. Through the extension's curve they separate. That is the "you cannot see
 * the quiet scenes" half of the argument, and it needs objects that genuinely
 * exist in the signal rather than objects drawn brighter on one side.
 *
 * The explosion is outside the window rather than in the room. A window is a
 * bright rectangle with a hard edge, which is the worst case for a display with no
 * shoulder: the untreated panel clips the whole thing to a flat white slab, and
 * the treated panel keeps the fireball's gradient because the knee rolls it off
 * instead of clipping it. Putting the blast in the room would have lit everything
 * evenly and hidden exactly the difference worth showing.
 *
 * The figure stands in front of the window, so it reads as a silhouette the moment
 * the blast lands — which is what tells you the room got brighter without having
 * to brighten the room.
 *
 * Gradients live once in the document (see `.nn-defs` in the demo) and are
 * referenced from both copies of this frame. Two inline copies of the same
 * `<defs>` would mean duplicate ids in one document, which is invalid and resolves
 * to whichever came first anyway.
 */

/**
 * Grey levels for the things that are supposed to be almost invisible.
 *
 * Every value is between 3 and 18 out of 255. That band is chosen, not picked: the
 * extension's curve at strength 45 maps 6/255 to about 44/255 and 14/255 to about
 * 60/255, so anything in here is genuinely below the threshold of "I can see that" on
 * an untreated panel and comfortably above it on a treated one. Push a value to 30 and
 * it becomes visible on both panels, which quietly removes it from the argument.
 */
const DARK = {
  picture: "rgb(14,14,18)",
  chair: "rgb(9,9,12)",
  bottle: "rgb(4,4,7)",
  wall: "rgb(6,7,11)",
  floor: "rgb(3,4,6)",
  shelf: "rgb(12,12,16)",
  rug: "rgb(7,8,11)",
  clock: "rgb(15,15,19)",
  cat: "rgb(10,10,13)",
  plant: "rgb(8,9,12)",
};

/**
 * The books, which are the clearest single demonstration in the scene.
 *
 * Four spines at four levels a couple of units apart. On the untreated panel they are
 * one undifferentiated black block; through the curve they separate into four objects,
 * because the curve's steepest section is exactly where they live. Reading them as
 * separate books is a thing a visitor can do or not do, which makes it a better test
 * than "is the wall lighter" — the eye is very bad at judging two greys and very good
 * at counting things.
 */
const BOOKS = [
  { x: 9, h: 30, fill: "rgb(11,11,15)" },
  { x: 14, h: 34, fill: "rgb(16,15,13)" },
  { x: 19, h: 27, fill: "rgb(9,10,16)" },
  { x: 24, h: 32, fill: "rgb(14,13,11)" },
];

/**
 * There were three dashed rings drawn over this room, one around the bookcase, one around
 * the clock and one around the cat, with labels naming them and a "0 of 3 / 3 of 3" count
 * in the corner.
 *
 * They went because they confused the thing they were meant to clarify. A visitor arriving
 * at two dark rectangles wrapped in dotted boxes has to work out what the boxes *are* before
 * they can use them — are those part of the film, is this a detection demo, is the extension
 * drawing them? — and the answer is "they are a reading aid a designer added", which is a
 * thing you should never have to deduce. Reported plainly: *the boxing of things in the scene
 * would just confuse the user.*
 *
 * The comparison did not need scaffolding. It needed the exposure to be honest — both panels
 * now run at the dimmed setting the pod's own dial claims, so the untreated room is genuinely
 * crushed rather than merely darker — and it needed one plain line under each panel saying
 * what you are looking at. Two panels and two sentences.
 */

export function NightFrame({
  treated,
  /**
   * The soundtrack, as a line of subtitle whose size is its loudness.
   *
   * This page has no audio, and an earlier version of this scene concluded from that
   * that the audio half of the product could not be shown at all: a printed line of
   * dialogue is identical whether it is whispered or shouted, so the line was deleted
   * and a bar meter was left to carry it alone.
   *
   * That conclusion was wrong, and the way out is the one every silent medium uses. Set
   * the whisper at ten pixels and the explosion at forty and the page has a loudness
   * channel — one a reader interprets instantly and without being taught.
   *
   * What that channel is *for* was got wrong once, and this comment was where the error
   * outlived its correction. It used to end: on the treated side the two sit at 23px and
   * 28px, and "that gap closing *is* the compressor". It is not, and the extension does
   * not do it. Measured from the vendored core at the default strength, a full-scale peak
   * comes out at −0.09 dB and at maximum strength at −1.2 — it never meaningfully touches
   * loud material. It lifts the quiet by about 8 dB, and the gap closes from 45 dB to 37,
   * which is a real effect and a much smaller one than two lines meeting in the middle.
   *
   * So the size channel is not the argument any more; it is the evidence the argument
   * acts on. The whispered line is the *same* size in both panels, over volume dials
   * reading 30% and 12% — the constant being held is the promise — and the explosion is
   * 40px against 26px because the right-hand panel is genuinely playing quieter. See the
   * note on `SOUND` in `demo.tsx`, and the test that now derives every printed reading
   * from `describeAudioEffect` so this cannot drift again.
   */
  say,
  /** 0 to 1. Drives the size, the weight and the opacity of the line above. */
  loud,
}: {
  treated: boolean;
  say: string;
  loud: number;
}) {
  return (
    <div className="nn-frame" data-treated={treated}>
      {/* The filter chain is in the stylesheet: both panels share an exposure the
          beats drive, and only the treated one has the extension's curve after it. */}
      <div className="nn-shot">
        {/* `slice`, not the default `meet`. The artwork is 16:10 and the panel is
            16:9 (see `#night-neutralizer .nn-frame`), so `meet` letterboxed it with a
            24px black band down each side of every panel — a tenth of the width of the
            thing the section exists to let you compare, spent on nothing. `slice` fills
            the frame and crops five percent off the top and bottom of the viewBox,
            which is wall above y26 and solid floor below y190. Nothing that carries
            any of the argument is within reach of either edge. */}
        <svg
          viewBox="0 0 320 200"
          preserveAspectRatio="xMidYMid slice"
          className="nn-svg"
          aria-hidden="true"
          focusable="false"
        >
          {/* back wall and floor */}
          <rect x="0" y="0" width="320" height="200" fill="url(#nn-wall)" />
          <rect x="0" y="150" width="320" height="50" fill={DARK.floor} />
          <rect x="0" y="148" width="320" height="2" fill="rgb(11,12,17)" />

          {/* the window, and what is happening outside it */}
          <g className="nn-win">
            <rect x="176" y="26" width="120" height="94" rx="2" fill="url(#nn-night-sky)" />
            <g className="nn-fire">
              <rect x="176" y="26" width="120" height="94" rx="2" fill="url(#nn-fireball)" />
            </g>
            {/* mullions, in front of whatever the sky is doing */}
            <g fill={DARK.wall}>
              <rect x="176" y="70" width="120" height="4" />
              <rect x="234" y="26" width="4" height="94" />
            </g>
            <rect
              x="176"
              y="26"
              width="120"
              height="94"
              rx="2"
              fill="none"
              stroke="rgb(18,20,27)"
              strokeWidth="3"
            />
          </g>

          {/* light thrown from the window into the room */}
          {/* Pooled on the floor below the window rather than spread over the
              whole frame, so the room stays a night-time room. */}
          <ellipse className="nn-spill" cx="212" cy="158" rx="128" ry="52" fill="url(#nn-spill)" />

          {/* Things in the dark.
              This half of the room is the "you cannot see the quiet scenes" argument,
              and it only works if there is enough here that its absence is a loss. It
              used to be three objects — a picture, a chair, a bottle — which through
              the curve became three slightly-lighter objects, and a visitor comparing
              two panels could not tell whether they were seeing a difference or
              expecting one.

              It is now a furnished room: a bookcase with four separable spines, a rug,
              a clock, a plant, and a cat on the chair. Untreated, all of it is one
              black mass. Treated, it is a room with things in it. That is a difference
              you notice without being told to look for it. */}

          {/* the rug, taking up most of the floor */}
          <ellipse cx="132" cy="172" rx="104" ry="20" fill={DARK.rug} />
          <ellipse
            cx="132"
            cy="172"
            rx="88"
            ry="14"
            fill="none"
            stroke="rgb(12,12,16)"
            strokeWidth="1.2"
          />

          {/* the bookcase, and four spines a couple of levels apart */}
          <rect x="4" y="84" width="26" height="66" rx="1" fill={DARK.shelf} />
          <rect x="6" y="116" width="22" height="1.6" fill="rgb(17,17,21)" />
          <rect x="6" y="148" width="22" height="1.6" fill="rgb(17,17,21)" />
          {BOOKS.map((book) => (
            <rect
              key={book.x}
              x={book.x}
              y={116 - book.h}
              width={4}
              height={book.h}
              fill={book.fill}
            />
          ))}
          {BOOKS.map((book) => (
            <rect
              key={`low-${book.x}`}
              x={book.x}
              y={148 - book.h * 0.7}
              width={4}
              height={book.h * 0.7}
              fill={book.fill}
            />
          ))}

          {/* the picture on the wall */}
          <rect x="34" y="46" width="46" height="34" rx="1" fill={DARK.picture} />
          <rect x="37" y="49" width="40" height="28" rx="1" fill="rgb(8,8,11)" />

          {/* a clock, which is a shape rather than a rectangle and so reads first */}
          <circle cx="110" cy="42" r="11" fill={DARK.clock} />
          <circle cx="110" cy="42" r="8" fill="rgb(9,9,12)" />
          <path
            d="M110 42v-5M110 42h4"
            stroke="rgb(18,18,22)"
            strokeWidth="1.1"
            strokeLinecap="round"
            fill="none"
          />

          {/* the chair, with a cat on it */}
          <path d="M96 150v-34h30v34" fill={DARK.chair} />
          <path d="M96 122h30v6H96z" fill="rgb(13,13,17)" />
          <path
            d="M104 116c0-5 3-8 7-8s7 3 7 8z"
            fill={DARK.cat}
          />
          <path d="M105 109l2-4 2 4zM115 109l2-4 2 4z" fill={DARK.cat} />

          {/* a plant beside the window */}
          <path d="M84 150v-14h12v14z" fill={DARK.plant} />
          <path
            d="M90 136c-6-6-8-14-6-22M90 136c6-5 9-12 8-20M90 136c-2-8-1-16 2-22"
            stroke="rgb(11,12,15)"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
          />

          <path d="M300 120v-16h6v16z" fill={DARK.bottle} />

          {/* the lamp: a small warm source that must not bloom */}
          <ellipse cx="52" cy="128" rx="34" ry="22" fill="url(#nn-lamp)" />
          <path d="M44 150v-16h16v16z" fill="rgb(20,17,14)" />

          {/* the figure, in front of the window */}
          <g className="nn-figure-g" fill="rgb(5,6,9)">
            <circle cx="150" cy="86" r="11" />
            <path d="M138 150v-42a12 12 0 0 1 24 0v42z" />
          </g>
        </svg>

        {/* One shock frame across the whole picture, for the cut itself. */}
        <span className="nn-flash" />
      </div>

      {/* The soundtrack, printed at its own volume.
          Outside `.nn-shot` on purpose. Everything in that element goes through
          `brightness()` and, on the treated panel, the extension's lookup table — which is
          the point for the room and exactly wrong for a caption about it. Inside the filter
          this would blow out white along with the explosion on one side and be tone-mapped
          on the other, so the one element whose *size* is the whole message would also be
          two different colours for no reason. */}
      <span
        className="nn-say"
        data-showing={say !== ""}
        style={{ "--loud": loud } as React.CSSProperties}
        aria-hidden="true"
      >
        {say}
      </span>
    </div>
  );
}
