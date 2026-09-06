/**
 * The room, as data.
 *
 * One drawing, read twice. `frame.tsx` renders it as SVG, and `light.ts` samples it into
 * an RGBA buffer so the extension's own `computeSceneStats` can measure it — which is
 * what lets the popup beside the panels print a meter reading that is *about this frame*
 * rather than about a frame in general. Writing the shapes out twice, once in JSX and once
 * in a sampler, would have been two drawings that agree today and drift tomorrow, and the
 * whole method of this scene is that nothing printed on it is a memory of a measurement.
 *
 * Coordinates are in the 320×200 viewBox the frame is drawn in.
 *
 * WHAT THE COMPOSITION IS DOING
 *
 * The near-black objects — the picture, the chair, the bottle on the sill — sit at 4, 9
 * and 14 out of 255. On an untreated panel they are the same black as the wall. Through
 * the extension's curve they separate. That is the "you cannot see the quiet scenes" half
 * of the argument, and it needs objects that genuinely exist in the signal rather than
 * objects drawn brighter on one side.
 *
 * The explosion is outside the window rather than in the room. A window is a bright
 * rectangle with a hard edge, which is the worst case for a display with no shoulder: the
 * untreated panel clips the whole thing to a flat white slab, and the treated panel keeps
 * the fireball's gradient because the knee rolls it off instead of clipping it.
 *
 * The figure stands in front of the window, so it reads as a silhouette the moment the
 * blast lands — which is what tells you the room got brighter without having to brighten
 * the room.
 *
 * The bookcase is the clearest single demonstration in the scene. Four spines at four
 * levels a couple of units apart: on the untreated panel one undifferentiated block,
 * through the curve four objects, because the curve's steepest section is exactly where
 * they live. The eye is very bad at judging two greys and very good at counting things.
 */

/**
 * Grey levels for the things that are supposed to be almost invisible.
 *
 * Every value is between 3 and 18 out of 255. That band is chosen, not picked: anything in
 * it is genuinely below the threshold of "I can see that" on a dimmed untreated panel and
 * comfortably above it on a treated one. Push a value to 30 and it becomes visible on both
 * panels, which quietly removes it from the argument.
 */
export const DARK = {
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
} as const;

export type GradientName = "wall" | "sky" | "fireball" | "spill" | "lamp";

/** `[offset, colour, opacity]`. */
export type Stop = readonly [number, string, number?];

export type Gradient =
  | {
      readonly kind: "linear";
      readonly x1: number;
      readonly y1: number;
      readonly x2: number;
      readonly y2: number;
      readonly stops: readonly Stop[];
    }
  | {
      readonly kind: "radial";
      readonly cx: number;
      readonly cy: number;
      readonly r: number;
      readonly stops: readonly Stop[];
    };

/**
 * The gradients, in `objectBoundingBox` units, which is the SVG default and the one the
 * sampler evaluates them in.
 *
 * The fireball is a white core with a long graded falloff: the shape a display without a
 * shoulder cannot render. The spill is kept weak on purpose — at half opacity across the
 * whole frame it lit the room into a pale fog and the panels stopped looking like night,
 * which threw away the premise to sell the explosion.
 */
export const GRADIENTS: Record<GradientName, Gradient> = {
  wall: {
    kind: "linear",
    x1: 0,
    y1: 0,
    x2: 1,
    y2: 1,
    stops: [
      [0, "#05070c"],
      [0.55, "#090d15"],
      [1, "#04060a"],
    ],
  },
  sky: {
    kind: "linear",
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 1,
    stops: [
      [0, "#151f33"],
      [1, "#0a0f1a"],
    ],
  },
  fireball: {
    kind: "radial",
    cx: 0.42,
    cy: 0.62,
    r: 0.72,
    stops: [
      [0, "#ffffff"],
      [0.16, "#fffbea"],
      [0.3, "#ffe08a"],
      [0.48, "#ff9e2e"],
      [0.68, "#c0430a"],
      [1, "#3a1000"],
    ],
  },
  spill: {
    kind: "radial",
    cx: 0.5,
    cy: 0.5,
    r: 0.5,
    stops: [
      [0, "#ffd2a0", 0.3],
      [0.55, "#ffd2a0", 0.12],
      [1, "#ffd2a0", 0],
    ],
  },
  lamp: {
    kind: "radial",
    cx: 0.5,
    cy: 0.5,
    r: 0.5,
    stops: [
      [0, "#ffce8a", 0.42],
      [1, "#ffce8a", 0],
    ],
  },
};

/** A solid colour, or the name of one of the gradients above. */
export type Fill = string | { readonly gradient: GradientName };

/** `[x, y, width, height]` in viewBox units. */
export type Box = readonly [number, number, number, number];

export type Shape =
  | {
      readonly kind: "rect";
      readonly x: number;
      readonly y: number;
      readonly w: number;
      readonly h: number;
      readonly rx?: number;
      readonly fill: Fill;
    }
  | { readonly kind: "circle"; readonly cx: number; readonly cy: number; readonly r: number; readonly fill: Fill }
  | {
      readonly kind: "ellipse";
      readonly cx: number;
      readonly cy: number;
      readonly rx: number;
      readonly ry: number;
      readonly fill: Fill;
    }
  /**
   * A filled path, sampled as its bounding box. The paths here are a chair, a cat, a pot
   * and a figure — small, near-black, and within a few units of their boxes — so the
   * approximation moves the frame's statistics by less than the sampling grid does.
   */
  | { readonly kind: "path"; readonly d: string; readonly fill: Fill; readonly box: Box }
  /** A stroked line or outline. Drawn, not sampled: a hairline has no area to speak of. */
  | {
      readonly kind: "stroke";
      readonly d: string;
      readonly stroke: string;
      readonly width: number;
      readonly round?: boolean;
    };

export interface Layer {
  /** Class on the `<g>`, for the stylesheet to drive. */
  readonly className?: string;
  /**
   * Whether this layer is only on while something is burning outside. The stylesheet
   * fades these in on the blast beats; the sampler multiplies them by the same amount.
   */
  readonly lit?: boolean;
  readonly shapes: readonly Shape[];
}

/** The books: four spines a couple of levels apart, on two shelves. */
export const BOOKS = [
  { x: 9, h: 30, fill: "rgb(11,11,15)" },
  { x: 14, h: 34, fill: "rgb(16,15,13)" },
  { x: 19, h: 27, fill: "rgb(9,10,16)" },
  { x: 24, h: 32, fill: "rgb(14,13,11)" },
] as const;

const WINDOW: Box = [176, 26, 120, 94];

/** The drawing, back to front. */
export const ROOM: readonly Layer[] = [
  {
    shapes: [
      // back wall and floor
      { kind: "rect", x: 0, y: 0, w: 320, h: 200, fill: { gradient: "wall" } },
      { kind: "rect", x: 0, y: 150, w: 320, h: 50, fill: DARK.floor },
      { kind: "rect", x: 0, y: 148, w: 320, h: 2, fill: "rgb(11,12,17)" },
    ],
  },
  {
    // the window, and the night sky in it
    className: "nn-win",
    shapes: [
      { kind: "rect", x: WINDOW[0], y: WINDOW[1], w: WINDOW[2], h: WINDOW[3], rx: 2, fill: { gradient: "sky" } },
    ],
  },
  {
    // what is happening outside it
    className: "nn-fire",
    lit: true,
    shapes: [
      { kind: "rect", x: WINDOW[0], y: WINDOW[1], w: WINDOW[2], h: WINDOW[3], rx: 2, fill: { gradient: "fireball" } },
    ],
  },
  {
    // mullions and frame, in front of whatever the sky is doing
    shapes: [
      { kind: "rect", x: 176, y: 70, w: 120, h: 4, fill: DARK.wall },
      { kind: "rect", x: 234, y: 26, w: 4, h: 94, fill: DARK.wall },
      { kind: "stroke", d: "M177.5 27.5h117v91h-117z", stroke: "rgb(18,20,27)", width: 3 },
    ],
  },
  {
    // light thrown from the window into the room: pooled on the floor below it rather
    // than spread over the whole frame, so the room stays a night-time room
    className: "nn-spill",
    lit: true,
    shapes: [{ kind: "ellipse", cx: 212, cy: 158, rx: 128, ry: 52, fill: { gradient: "spill" } }],
  },
  {
    // things in the dark: a furnished room, so that its absence is a loss
    shapes: [
      { kind: "ellipse", cx: 132, cy: 172, rx: 104, ry: 20, fill: DARK.rug },
      {
        kind: "stroke",
        d: "M44 172a88 14 0 1 0 176 0a88 14 0 1 0 -176 0",
        stroke: "rgb(12,12,16)",
        width: 1.2,
      },
      { kind: "rect", x: 4, y: 84, w: 26, h: 66, rx: 1, fill: DARK.shelf },
      { kind: "rect", x: 6, y: 116, w: 22, h: 1.6, fill: "rgb(17,17,21)" },
      { kind: "rect", x: 6, y: 148, w: 22, h: 1.6, fill: "rgb(17,17,21)" },
      ...BOOKS.map(
        (book): Shape => ({ kind: "rect", x: book.x, y: 116 - book.h, w: 4, h: book.h, fill: book.fill }),
      ),
      ...BOOKS.map(
        (book): Shape => ({
          kind: "rect",
          x: book.x,
          y: 148 - book.h * 0.7,
          w: 4,
          h: book.h * 0.7,
          fill: book.fill,
        }),
      ),
      // the picture on the wall
      { kind: "rect", x: 34, y: 46, w: 46, h: 34, rx: 1, fill: DARK.picture },
      { kind: "rect", x: 37, y: 49, w: 40, h: 28, rx: 1, fill: "rgb(8,8,11)" },
      // a clock, which is a shape rather than a rectangle and so reads first
      { kind: "circle", cx: 110, cy: 42, r: 11, fill: DARK.clock },
      { kind: "circle", cx: 110, cy: 42, r: 8, fill: "rgb(9,9,12)" },
      { kind: "stroke", d: "M110 42v-5M110 42h4", stroke: "rgb(18,18,22)", width: 1.1, round: true },
      // the chair, with a cat on it
      { kind: "path", d: "M96 150v-34h30v34", fill: DARK.chair, box: [96, 116, 30, 34] },
      { kind: "path", d: "M96 122h30v6H96z", fill: "rgb(13,13,17)", box: [96, 122, 30, 6] },
      { kind: "path", d: "M104 116c0-5 3-8 7-8s7 3 7 8z", fill: DARK.cat, box: [104, 108, 14, 8] },
      { kind: "path", d: "M105 109l2-4 2 4zM115 109l2-4 2 4z", fill: DARK.cat, box: [105, 105, 14, 4] },
      // a plant beside the window
      { kind: "path", d: "M84 150v-14h12v14z", fill: DARK.plant, box: [84, 136, 12, 14] },
      {
        kind: "stroke",
        d: "M90 136c-6-6-8-14-6-22M90 136c6-5 9-12 8-20M90 136c-2-8-1-16 2-22",
        stroke: "rgb(11,12,15)",
        width: 1.6,
        round: true,
      },
      { kind: "path", d: "M300 120v-16h6v16z", fill: DARK.bottle, box: [300, 104, 6, 16] },
      // the lamp: a small warm source that must not bloom
      { kind: "ellipse", cx: 52, cy: 128, rx: 34, ry: 22, fill: { gradient: "lamp" } },
      { kind: "path", d: "M44 150v-16h16v16z", fill: "rgb(20,17,14)", box: [44, 134, 16, 16] },
    ],
  },
  {
    // the figure, in front of the window
    className: "nn-figure-g",
    shapes: [
      { kind: "circle", cx: 150, cy: 86, r: 11, fill: "rgb(5,6,9)" },
      { kind: "path", d: "M138 150v-42a12 12 0 0 1 24 0v42z", fill: "rgb(5,6,9)", box: [138, 96, 24, 54] },
    ],
  },
];

/** The viewBox. */
export const ROOM_WIDTH = 320;
export const ROOM_HEIGHT = 200;

/**
 * What the panel actually shows of it. The artwork is 16:10 and the panel is 16:9, drawn
 * with `preserveAspectRatio="xMidYMid slice"`, so the frame crops five percent off the
 * top and bottom — wall above y10 and solid floor below y190. The sampler reads the same
 * crop, because the extension measures the frame on screen, not the file.
 */
export const ROOM_CROP: Box = [0, 10, 320, 180];
