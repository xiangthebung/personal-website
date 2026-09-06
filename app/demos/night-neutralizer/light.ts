/**
 * What the extension would do to this frame, worked out from the extension.
 *
 * The scene shows the same drawn room twice, one copy through the extension's tone curve,
 * with the extension's popup beside them printing a live meter. For that meter to be a
 * measurement rather than a caption, something has to *measure the frame*, and the
 * extension's own core can: `computeSceneStats` wants an RGBA buffer, `updateAdaptState`
 * wants those statistics and a timestep, `buildToneCurve` wants the state that produces,
 * and `meter.ts` turns a curve and a histogram into the words the popup prints. All of
 * that is vendored under `core/`, byte for byte, and all of it is pure — so this module
 * gives it pixels.
 *
 * The pixels come from `room.ts`, sampled on a grid by a very small software rasteriser
 * below: axis-aligned boxes, circles, ellipses, and the five gradients evaluated the way
 * SVG evaluates them, painted back to front. It is not a pixel-exact render of the SVG —
 * paths are their bounding boxes and hairlines are skipped — but the extension bins luma
 * into sixty-four buckets and smooths the result, and the difference between this and a
 * `getImageData` of the real element is well inside what it is built to ignore.
 *
 * Everything here runs once, at module scope, when the scene's chunk loads: two frames
 * sampled, a few hundred steps of the adaptation loop, three lookup tables. It is a
 * fraction of a millisecond's work and it is what lets every number on the popup be
 * something the extension said about the picture next to it.
 */

import { describeMeter, lightRatio } from "./core/meter";
import { audioTransferDb, mapAudioStrength, mapVideoStrength } from "./core/strength";
import {
  buildToneCurve,
  computeSceneStats,
  createAdaptState,
  curveToTableValues,
  resolveCurve,
  staticAdaptState,
  updateAdaptState,
  type AdaptState,
  type SceneStats,
} from "./core/tone-curve";
import {
  GRADIENTS,
  ROOM,
  ROOM_CROP,
  type Box,
  type Fill,
  type Gradient,
  type Shape,
} from "./room";

/**
 * How a frame is lit, which is the scene's premise rather than the extension's doing.
 *
 * `exposure` is the `brightness()` both panels share — the dimmed display on the night
 * beats, the room genuinely getting brighter on the blast beats. `fire` is how far the
 * fireball and its spill are faded in. `flash` is the white shock sheet over the cut. The
 * stylesheet reads the same three numbers off the stage as custom properties, so what the
 * sampler measures is what the filter chain receives.
 */
export interface FramePremise {
  readonly exposure: number;
  readonly fire: number;
  readonly flash: number;
}

/* --- a very small rasteriser ----------------------------------------------- */

type Rgb = readonly [number, number, number];

/** Samples across the visible crop. 128×72 is 9,216 points, and the histogram has 64 bins. */
const COLUMNS = 128;
const ROWS = 72;

function parseColour(text: string): Rgb {
  if (text.startsWith("#")) {
    return [
      parseInt(text.slice(1, 3), 16),
      parseInt(text.slice(3, 5), 16),
      parseInt(text.slice(5, 7), 16),
    ];
  }
  const parts = text.match(/\d+/g);
  if (!parts || parts.length < 3) return [0, 0, 0];
  return [Number(parts[0]), Number(parts[1]), Number(parts[2])];
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** A gradient's colour and opacity at `t`, interpolating between its stops. */
function stopAt(gradient: Gradient, t: number): { colour: Rgb; alpha: number } {
  const stops = gradient.stops;
  const first = stops[0];
  if (t <= first[0]) return { colour: parseColour(first[1]), alpha: first[2] ?? 1 };
  for (let i = 1; i < stops.length; i++) {
    const [t1, c1, a1] = stops[i];
    if (t <= t1) {
      const [t0, c0, a0] = stops[i - 1];
      const fraction = t1 === t0 ? 1 : (t - t0) / (t1 - t0);
      return {
        colour: mix(parseColour(c0), parseColour(c1), fraction),
        alpha: (a0 ?? 1) + ((a1 ?? 1) - (a0 ?? 1)) * fraction,
      };
    }
  }
  const last = stops[stops.length - 1];
  return { colour: parseColour(last[1]), alpha: last[2] ?? 1 };
}

/** A fill evaluated at a point, in the shape's own bounding box. */
function evaluate(fill: Fill, box: Box, x: number, y: number): { colour: Rgb; alpha: number } {
  if (typeof fill === "string") return { colour: parseColour(fill), alpha: 1 };
  const gradient = GRADIENTS[fill.gradient];
  const u = (x - box[0]) / box[2];
  const v = (y - box[1]) / box[3];
  if (gradient.kind === "linear") {
    const dx = gradient.x2 - gradient.x1;
    const dy = gradient.y2 - gradient.y1;
    const t = ((u - gradient.x1) * dx + (v - gradient.y1) * dy) / (dx * dx + dy * dy);
    return stopAt(gradient, t);
  }
  return stopAt(gradient, Math.hypot(u - gradient.cx, v - gradient.cy) / gradient.r);
}

function boxOf(shape: Shape): Box | null {
  switch (shape.kind) {
    case "rect":
      return [shape.x, shape.y, shape.w, shape.h];
    case "circle":
      return [shape.cx - shape.r, shape.cy - shape.r, shape.r * 2, shape.r * 2];
    case "ellipse":
      return [shape.cx - shape.rx, shape.cy - shape.ry, shape.rx * 2, shape.ry * 2];
    case "path":
      return shape.box;
    case "stroke":
      return null;
  }
}

function contains(shape: Shape, box: Box, x: number, y: number): boolean {
  if (shape.kind === "circle" || shape.kind === "ellipse") {
    const rx = box[2] / 2;
    const ry = box[3] / 2;
    const dx = (x - (box[0] + rx)) / rx;
    const dy = (y - (box[1] + ry)) / ry;
    return dx * dx + dy * dy <= 1;
  }
  return x >= box[0] && x < box[0] + box[2] && y >= box[1] && y < box[1] + box[3];
}

/** A shape with area: everything but a stroke. */
type Filled = Exclude<Shape, { kind: "stroke" }>;

/** Every layer's filled shapes with their boxes resolved once, rather than per sample. */
const PAINTED = ROOM.map((layer) => ({
  lit: layer.lit ?? false,
  shapes: layer.shapes
    .filter((shape): shape is Filled => shape.kind !== "stroke")
    .map((shape) => ({ shape, box: boxOf(shape) }))
    .filter((entry): entry is { shape: Filled; box: Box } => entry.box !== null),
}));

/** The room under a premise, as the RGBA bytes `computeSceneStats` reads. */
export function sampleRoom(premise: FramePremise): Uint8ClampedArray {
  const out = new Uint8ClampedArray(COLUMNS * ROWS * 4);
  const white: Rgb = [255, 255, 255];
  let at = 0;
  for (let row = 0; row < ROWS; row++) {
    const y = ROOM_CROP[1] + ((row + 0.5) / ROWS) * ROOM_CROP[3];
    for (let column = 0; column < COLUMNS; column++) {
      const x = ROOM_CROP[0] + ((column + 0.5) / COLUMNS) * ROOM_CROP[2];
      let colour: Rgb = [0, 0, 0];
      for (const layer of PAINTED) {
        const opacity = layer.lit ? premise.fire : 1;
        if (opacity <= 0) continue;
        for (const { shape, box } of layer.shapes) {
          if (!contains(shape, box, x, y)) continue;
          const paint = evaluate(shape.fill, box, x, y);
          colour = mix(colour, paint.colour, paint.alpha * opacity);
        }
      }
      if (premise.flash > 0) colour = mix(colour, white, premise.flash);
      out[at++] = Math.min(255, colour[0] * premise.exposure);
      out[at++] = Math.min(255, colour[1] * premise.exposure);
      out[at++] = Math.min(255, colour[2] * premise.exposure);
      out[at++] = 255;
    }
  }
  return out;
}

/* --- the extension, run on it ------------------------------------------------ */

/** One curve, ready for `feComponentTransfer` and `feColorMatrix`. */
export interface Curve {
  readonly values: readonly number[];
  readonly table: string;
  readonly saturation: string;
}

/** Which of the three curves a beat is drawn through. */
export type CurveName = "night" | "cut" | "fixed";

export interface Derived {
  readonly curves: Record<CurveName, Curve>;
  /**
   * The meter line for a frame drawn through `curve` while the soundtrack sits at
   * `inputDb`, worded by the extension's own `describeMeter`.
   */
  readonly meter: (curve: CurveName, inputDb: number) => string;
  /** What the meter says while Compare is held. */
  readonly held: string;
}

/**
 * The adaptation loop's timestep, and how long it is run.
 *
 * A frame at 60Hz, which is what the engine advances at. Twelve seconds on the night
 * frame is enough for the slowest constant in the loop — the white-point ceiling arms
 * over `DARK_ADAPT_TAU` = 2.5s — to be within a percent of its target, which is what
 * "the extension has settled on this scene" means. The cut is then a further third of a
 * second on the blast frame, which is where the `boom` beat begins: the snap has happened,
 * the servo has moved, and the flash guard is decaying.
 */
const STEP = 1 / 60;
const SETTLE_FRAMES = 720;
const CUT_FRAMES = 18;

function settle(from: AdaptState, stats: SceneStats, params: ReturnType<typeof mapVideoStrength>, frames: number) {
  let state = from;
  for (let i = 0; i < frames; i++) state = updateAdaptState(state, stats, params, STEP);
  return state;
}

function curveOf(params: ReturnType<typeof mapVideoStrength>, state: AdaptState): Curve {
  const values = buildToneCurve(params, state);
  return {
    values,
    table: curveToTableValues(values),
    /* The saturation compensation scales with how engaged the shadow lift is, which is
       the extension's own arithmetic rather than a per-curve guess. */
    saturation: resolveCurve(params, state).saturation.toFixed(3),
  };
}

/**
 * Everything the panels and the popup print about the picture, derived once.
 *
 * `night` is the room as it sits on the quiet beats, and the curve is what the engine
 * converges on after watching it. `cut` is the blast frame, and its curve is where the
 * engine is a third of a second after cutting to it from the night. `fixed` is the curve a
 * protected player gets — no frame is ever read, so no histogram, and its exposure is the
 * brightness setting rather than a measurement — which is also why its meter figure is
 * computed with no histogram: that is the figure the real popup prints on such a player.
 */
export function deriveScene(
  strength: number,
  nightEq: boolean,
  frames: { readonly night: FramePremise; readonly cut: FramePremise },
): Derived {
  const params = mapVideoStrength(strength);
  const audio = mapAudioStrength(strength, nightEq);

  const nightStats = computeSceneStats(sampleRoom(frames.night));
  const cutStats = computeSceneStats(sampleRoom(frames.cut));

  const nightState = settle(createAdaptState(), nightStats, params, SETTLE_FRAMES);
  const cutState = settle(nightState, cutStats, params, CUT_FRAMES);
  const fixedState = staticAdaptState(params);

  const curves: Record<CurveName, Curve> = {
    night: curveOf(params, nightState),
    cut: curveOf(params, cutState),
    fixed: curveOf(params, fixedState),
  };
  const histograms: Record<CurveName, Float32Array | null> = {
    night: nightStats.histogram ? Float32Array.from(nightStats.histogram) : null,
    cut: cutStats.histogram ? Float32Array.from(cutStats.histogram) : null,
    fixed: null,
  };

  /* The gain on the signal at this instant: the settled transfer function's net effect at
     the level the soundtrack is sitting at, which is what the popup's `audioGainNowDb`
     reads off the compressor once it has settled — pre-gain, the reduction, both make-ups
     and the limiter's take, in one number. */
  const gainNow = (inputDb: number) => audioTransferDb(audio, inputDb) - inputDb;

  return {
    curves,
    meter: (curve, inputDb) =>
      describeMeter({
        held: false,
        audio: { active: true, gainDb: gainNow(inputDb) },
        video: { active: true, lightRatio: lightRatio(curves[curve].values, histograms[curve]) },
      }),
    held: describeMeter({
      held: true,
      audio: { active: true, gainDb: 0 },
      video: { active: true, lightRatio: 1 },
    }),
  };
}
