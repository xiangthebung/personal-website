"use client";

/**
 * One frame of the film, drawn as SVG from `room.ts`.
 *
 * The drawing itself lives in `room.ts` as data, because two things read it: this
 * renderer, and the sampler in `light.ts` that measures the frame the way the extension
 * would. What is here is only the mapping from that data to SVG elements, plus the two
 * things a frame carries that are not the room — the shock flash for the cut, and the
 * soundtrack printed at its own volume.
 *
 * Gradients live once in the document (see `RoomDefs`, rendered inside the pod's shared
 * `<defs>`) and are referenced from both copies of this frame. Two inline copies of the
 * same `<defs>` would mean duplicate ids in one document, which is invalid and resolves
 * to whichever came first anyway.
 */

import type { CSSProperties } from "react";
import { GRADIENTS, ROOM, ROOM_HEIGHT, ROOM_WIDTH, type Fill, type Shape } from "./room";

/** How a fill in the data becomes a `fill` attribute. */
function paint(fill: Fill): string {
  return typeof fill === "string" ? fill : `url(#nn-${fill.gradient})`;
}

function Drawn({ shape }: { shape: Shape }) {
  switch (shape.kind) {
    case "rect":
      return (
        <rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={shape.rx} fill={paint(shape.fill)} />
      );
    case "circle":
      return <circle cx={shape.cx} cy={shape.cy} r={shape.r} fill={paint(shape.fill)} />;
    case "ellipse":
      return <ellipse cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} fill={paint(shape.fill)} />;
    case "path":
      return <path d={shape.d} fill={paint(shape.fill)} />;
    case "stroke":
      return (
        <path
          d={shape.d}
          fill="none"
          stroke={shape.stroke}
          strokeWidth={shape.width}
          strokeLinecap={shape.round ? "round" : undefined}
        />
      );
  }
}

/**
 * The gradients, as SVG. Rendered once, inside the pod's `<defs>`, from the same tables
 * the sampler evaluates.
 */
export function RoomDefs() {
  return (
    <>
      {(Object.keys(GRADIENTS) as (keyof typeof GRADIENTS)[]).map((name) => {
        const gradient = GRADIENTS[name];
        const stops = gradient.stops.map(([offset, color, opacity]) => (
          <stop key={offset} offset={offset} stopColor={color} stopOpacity={opacity} />
        ));
        return gradient.kind === "linear" ? (
          <linearGradient
            key={name}
            id={`nn-${name}`}
            x1={gradient.x1}
            y1={gradient.y1}
            x2={gradient.x2}
            y2={gradient.y2}
          >
            {stops}
          </linearGradient>
        ) : (
          <radialGradient key={name} id={`nn-${name}`} cx={gradient.cx} cy={gradient.cy} r={gradient.r}>
            {stops}
          </radialGradient>
        );
      })}
    </>
  );
}

export function NightFrame({
  treated,
  /**
   * The soundtrack, as a line of subtitle whose size is its loudness.
   *
   * This page has no audio, and an earlier version of this scene concluded from that
   * that the audio half of the product could not be shown at all. The way out is the one
   * every silent medium uses: set the whisper at ten pixels and the explosion at forty
   * and the page has a loudness channel a reader interprets without being taught.
   *
   * The size channel is not the argument; it is the evidence the argument acts on. The
   * whispered line is the *same* size in both panels, over volume dials reading 30% and
   * 10% — the constant being held is the promise — and the explosion is smaller on the
   * treated side because that panel is genuinely playing quieter. See `SOUND` in
   * `demo.tsx`, and the test that derives every printed reading from the extension's own
   * transfer function so this cannot drift.
   */
  say,
  /** 0 to 1. Drives the size, the weight and the opacity of the line above. */
  loud,
  /** A `data-spec-anchor` name, for the labels pinned to this frame's corners. */
  anchor,
}: {
  treated: boolean;
  say: string;
  loud: number;
  anchor?: string;
}) {
  return (
    <div className="nn-frame" data-treated={treated} data-spec-anchor={anchor}>
      {/* The filter chain is in the stylesheet: both panels share an exposure the
          beats drive, and only the treated one has the extension's curve after it. */}
      <div className="nn-shot">
        {/* `slice`, not the default `meet`: the artwork is 16:10 and the panel is 16:9,
            so `meet` letterboxed it with a band down each side of every panel — a tenth
            of the width of the thing the section exists to let you compare, spent on
            nothing. See `ROOM_CROP` for what the crop costs, which is nothing. */}
        <svg
          viewBox={`0 0 ${ROOM_WIDTH} ${ROOM_HEIGHT}`}
          preserveAspectRatio="xMidYMid slice"
          className="nn-svg"
          aria-hidden="true"
          focusable="false"
        >
          {ROOM.map((layer, order) => (
            <g className={layer.className} key={layer.className ?? order}>
              {layer.shapes.map((shape, index) => (
                <Drawn shape={shape} key={index} />
              ))}
            </g>
          ))}
        </svg>

        {/* One shock frame across the whole picture, for the cut itself — and inside the
            filter chain, so the treated panel's curve gets to answer it. */}
        <span className="nn-flash" />
      </div>

      {/* The soundtrack, printed at its own volume.
          Outside `.nn-shot` on purpose. Everything in that element goes through
          `brightness()` and, on the treated panel, the extension's lookup table — which is
          the point for the room and exactly wrong for a caption about it. */}
      <span
        className="nn-say"
        data-showing={say !== ""}
        style={{ "--loud": loud } as CSSProperties}
        aria-hidden="true"
      >
        {say}
      </span>
    </div>
  );
}
