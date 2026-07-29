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

/** Grey levels for the things that are supposed to be almost invisible. */
const DARK = {
  picture: "rgb(14,14,18)",
  chair: "rgb(9,9,12)",
  bottle: "rgb(4,4,7)",
  wall: "rgb(6,7,11)",
  floor: "rgb(3,4,6)",
};

export function NightFrame({ treated }: { treated: boolean }) {
  return (
    <div className="nn-frame" data-treated={treated}>
      {/* The filter chain is in the stylesheet: both panels share an exposure the
          beats drive, and only the treated one has the extension's curve after it. */}
      <div className="nn-shot">
        <svg viewBox="0 0 320 200" className="nn-svg" aria-hidden="true" focusable="false">
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

          {/* things in the dark: a picture, a chair, a bottle on the sill */}
          <rect x="34" y="46" width="46" height="34" rx="1" fill={DARK.picture} />
          <rect x="37" y="49" width="40" height="28" rx="1" fill="rgb(8,8,11)" />
          <path d="M96 150v-34h30v34" fill={DARK.chair} />
          <path d="M96 122h30v6H96z" fill="rgb(13,13,17)" />
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
    </div>
  );
}
