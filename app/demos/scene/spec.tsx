"use client";

/**
 * What a scene claims, printed on the thing that is doing it.
 *
 * This exists because of a plain observation about the page it is on: nobody reads a
 * column of prose next to something that is moving. Seven scenes were each accompanied
 * by three written notes naming the features, and the features were also being
 * performed, four inches away, in colour, with a cursor. The writing lost that fight
 * every time — which meant the page was explaining itself in the one place a visitor
 * was guaranteed not to be looking.
 *
 * So the claim moves into the frame and attaches to its evidence. "Notifications muted"
 * appears beside the notification badge at the moment the badge loses its red. There is
 * no jump between reading a sentence and finding the thing it is about, because the
 * sentence is on the thing.
 *
 * WHY THIS IS NOT A CAPTION
 *
 * A caption replaces itself. Every line it has ever shown is gone, so a visitor who
 * looked away has lost it, and the reading time available for any one line is however
 * long that beat happens to be — which is the mistake `MIN_CAPTION_MS` in the storyboard
 * hook exists to catch.
 *
 * These accumulate instead. A label arrives on its beat and stays for the rest of the
 * scene unless the thing it points at leaves, so by the last frame the scene is a
 * labelled diagram of itself: every claim on screen at once, each next to its proof. The
 * reading time for a label is therefore the whole tail of the scene rather than one beat
 * of it, and a visitor who joins late still gets all of it.
 *
 * HOW THE MOVEMENT WORKS
 *
 * A label flies from a common origin — usually the control that was just pressed — to
 * its own resting point, on a stagger. That is deliberate theatre: several claims
 * bursting out of one button reads as *the thing you just clicked did all of this*,
 * which is the actual product, whereas five labels fading up in place reads as
 * annotation applied afterwards by a designer.
 *
 * The flight is a transition on `left`/`top` between two percentages of the layer, which
 * is the one way to move between two points expressed in the coordinate space of the
 * parent rather than of the element. Percentage `translate` is relative to the element's
 * own size and cannot express "from there to here" on a layer.
 *
 * Two elements per label, because there are two independent movements: the outer one
 * travels, the inner one pops and carries the anchor offset. One element cannot do both
 * — they would be fighting over `transform`, which is the same trap the Decaf deluge
 * documents.
 *
 * WHERE A LABEL IS PINNED, AND WHY IT IS NO LONGER A NUMBER
 *
 * It was a percentage of the layer, hand-tuned per label, under a comment in every scene
 * claiming the pods were fixed geometry so a percentage would land on the same element at
 * any width. That claim was false, and `scripts/spec-anchors.mjs` was written to measure
 * it: every pod here has a `minmax(0, 1fr)` column in it, so everything to the right of
 * that column moves as a *fraction* of the layer when the layer changes width. Decaf's
 * notification bell sits at 72.7% of its layer at a 1440px window and 75.7% at 2560. The
 * label about it was authored at 72 and was therefore thirty-six pixels out on the wider
 * screen, sitting on the search field — pointing, in a component whose entire purpose is
 * that the claim and its evidence are in the same place, at the wrong thing.
 *
 * Height moved too, and worse. PDF Explainer's stage is 519px tall before the workspace
 * splits and 370px after, so a `y` authored on one beat means a different row of the
 * picture on the next.
 *
 * So a label may name an element instead: `anchor` is matched against
 * `data-spec-anchor` inside the pod and measured, exactly as `PhantomCursor` measures
 * `data-target`. The coordinate stays, as the fallback — see `x`.
 */

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Beat } from "./storyboard";

/** Which way a label reads out of the point it is pinned to. */
export type SpecSide = "left" | "right" | "above" | "below";

/**
 * Which point of a measured element the dot goes on.
 *
 * Not always the middle, and the exceptions are the interesting ones. Three of these
 * labels are about a panel that is a solid block of type with no gap in it big enough to
 * sit on, so they hang a few pixels off its left edge and read away from it — which is
 * `left` here plus `side: "left"` on the label, the pin's own lead providing the standoff.
 * A label on a wide image wants a corner rather than the centre, so the plate lies along
 * an edge instead of across the middle of the evidence.
 */
export type SpecGrip =
  | "center"
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top left"
  | "top right"
  | "bottom left"
  | "bottom right";

/**
 * How long after a beat to look again, for anchors that are still arriving.
 *
 * See the note on `useSpecAnchors`. Longer than any entrance a pod runs on something a
 * label is pinned to, and shorter than the shortest beat one arrives on.
 */
const SETTLE_MS = 420;

/** Each grip as a fraction of the anchor's box: 0 is its left or top edge, 1 the other. */
const GRIPS: Record<SpecGrip, readonly [number, number]> = {
  center: [0.5, 0.5],
  top: [0.5, 0],
  bottom: [0.5, 1],
  left: [0, 0.5],
  right: [1, 0.5],
  "top left": [0, 0],
  "top right": [1, 0],
  "bottom left": [0, 1],
  "bottom right": [1, 1],
};

export interface SpecTag<Name extends string = string> {
  /** The beat it arrives on. It stays from then on, unless `until` says otherwise. */
  readonly at: Name;
  /**
   * Four or five words at the outside.
   *
   * A label competes with the picture it is sitting on, so it has to be readable at a
   * glance or it is worse than nothing — it becomes something covering the evidence.
   * If a claim needs a sentence, the scene is not showing it and no label will fix that.
   */
  readonly text: string;
  /**
   * Where it is pinned if it cannot be measured, as a percentage of the layer.
   *
   * Still required, and still every label's job to get roughly right, for two reasons
   * that have nothing to do with each other. It is what the server renders and what a
   * visitor with no JavaScript keeps — a label that needs a script to have a position is
   * a label that is sometimes in the corner. And it is the frame before the measurement
   * lands, so a coordinate that is close means the correction is invisible rather than a
   * visible jump.
   *
   * With `anchor` set, this is *only* those two things: the measurement wins on every
   * frame after the first. Without it, this is the position, and it is subject to the
   * width drift described at the top of this file.
   */
  readonly x: number;
  readonly y: number;
  /** Default `right`: the label extends right from its anchor dot. */
  readonly side?: SpecSide;
  /**
   * The element this label is about, matched against `data-spec-anchor` inside the pod.
   *
   * This is how a label points at the right thing at every window width, and it is the
   * same mechanism, for the same reason, as the cursor's `data-target`: where a DOM node
   * is cannot be expressed as a constant. Measured against the layer, so what comes out
   * is a percentage and everything downstream — the flight, the stagger, the mobile
   * fallback — is unchanged.
   *
   * Names are matched with `~=`, so one element can answer to several: Decaf's media
   * block is both what lost its colour and what stopped playing by itself.
   *
   * Omitted, the coordinate above is used, which is right for a label about something
   * with no element of its own to point at.
   */
  readonly anchor?: string;
  /** Which point of `anchor` the dot sits on. Default `center`. */
  readonly grip?: SpecGrip;
  /**
   * Which axes the measurement replaces. Default both.
   *
   * `"x"` exists for the labels whose horizontal position is a fact about an element and
   * whose vertical position is a decision about the picture. PDF Explainer has two: both
   * hang off the left edge of a panel — which moves with the window, and is what the
   * measurement is for — but the *height* was chosen to cross a decorative diagram
   * instead of the slide's title, and no element's box knows that. Measuring both axes
   * would put them back at the panel's vertical centre, straight through the one line of
   * text on that side of the frame a visitor is reading.
   */
  readonly axis?: "both" | "x" | "y";
  /**
   * A standoff from the gripped point, in CSS pixels, applied before the measurement is
   * turned into percentages.
   *
   * `--spec-lead` already holds the plate off its dot along the direction it reads. This
   * is the other axis, and one label genuinely needs it: "Likes and views hidden" points
   * at a row of numbers 16px tall inside a post, and the plate is 25px tall, so anything
   * reading sideways at the row's own height covers the numbers it is about. It sits a
   * plate-half above them instead.
   *
   * Pixels rather than percentages because the thing being cleared is a row of type,
   * which is a pixel height. Converted against the measured layer, so it stays a fixed
   * visual distance at any width — which is the whole point of measuring.
   */
  readonly nudge?: { readonly x?: number; readonly y?: number };
  /**
   * The beat it leaves on, for the labels whose subject leaves.
   *
   * Decaf's "Views and likes hidden" points at a counter in a post, and the post is
   * replaced by a notice card two beats later. A label left pinned over the notice is a
   * label pointing at nothing, which is the one thing this component must never do — the
   * whole reason it exists is that the claim and its evidence are in the same place.
   */
  readonly until?: Name;
}

const SIDES: Record<SpecSide, { tx: string; ty: string; origin: string }> = {
  right: { tx: "0", ty: "-50%", origin: "left center" },
  left: { tx: "-100%", ty: "-50%", origin: "right center" },
  above: { tx: "-50%", ty: "-100%", origin: "center bottom" },
  below: { tx: "-50%", ty: "0", origin: "center top" },
};

/**
 * The label itself: a dot on the evidence, a lead, and the words.
 *
 * Separated from `SpecTags` because not every claim on this page can be pinned to a
 * percentage of a layer. GRT's alert label is the case that forced it: the thing it is
 * about is a notification portalled to the corner of the visitor's real window, which is
 * nowhere inside the pod's coordinate space — so that one hangs off the notification
 * itself and this is what it hangs.
 *
 * Anything that can name a coordinate should still go through `SpecTags`, which adds the
 * flight, the stagger and the arrival timing on top of this.
 *
 * It pops in place from `data-shown`, and it does not travel: travel belongs to the
 * point it is hung on, for the reason in the note at the top of this file.
 */
export function SpecPlate({
  text,
  side = "right",
  shown = true,
}: {
  readonly text: string;
  readonly side?: SpecSide;
  readonly shown?: boolean;
}) {
  const geometry = SIDES[side];

  return (
    <span
      className="spectag-body"
      /* The stylesheet needs this as well as the offsets: which side the label reads out
         of also decides which end of it the anchor dot belongs on. */
      data-side={side}
      data-shown={shown}
      style={
        {
          "--spec-tx": geometry.tx,
          "--spec-ty": geometry.ty,
          "--spec-origin": geometry.origin,
        } as CSSProperties
      }
    >
      {/* The dot *and* the line to the plate, in one element.
          It was a bare dot and a flex gap, which is not an association — at six labels on
          one frame a reader has to guess which nearby thing each one is about. A drawn
          connector removes the guess, and it costs nothing extra: the pin owns the lead,
          so the gap between it and the plate is zero. */}
      <i className="spectag-pin" />
      <b className="spectag-text">{text}</b>
    </span>
  );
}

export interface SpecTagsProps<Name extends string> {
  /** The scene's storyboard, for turning beat names into an order. */
  readonly beats: readonly Beat<Name>[];
  /** The beat now showing. */
  readonly beat: Name;
  readonly tags: readonly SpecTag<Name>[];
  /**
   * Where the labels come from, as a percentage of the layer.
   *
   * Usually the control the scene just pressed. Omitted, each label simply pops in
   * where it belongs, which is right for the scenes with nothing to have come out of.
   */
  readonly origin?: { readonly x: number; readonly y: number };
  /** The scene's own class, for tinting. See `.speclayer` in globals.css. */
  readonly className?: string;
}

/** A point on the layer, in the percentages the stylesheet wants. */
interface Spot {
  readonly x: number;
  readonly y: number;
}

/** Whether two sets of measurements are the same to within a tenth of a percent. */
function settled(before: Record<string, Spot>, after: Record<string, Spot>): boolean {
  const names = Object.keys(after);
  if (names.length !== Object.keys(before).length) return false;
  return names.every((name) => {
    const was = before[name];
    return (
      was !== undefined &&
      Math.abs(was.x - after[name].x) < 0.1 &&
      Math.abs(was.y - after[name].y) < 0.1
    );
  });
}

/**
 * Where each anchored label actually belongs, as percentages of the layer.
 *
 * Re-measured when the beat changes and when anything is resized, and deliberately not
 * on a frame loop. A label is pinned to something the scene has stopped doing things to
 * — that is what makes it a label rather than a tracker — so the beat boundary is the
 * only moment its subject can have moved. The one scene whose subject is genuinely in
 * motion is Decaf's feed, and its reel is a paused CSS animation by the frame the first
 * label arrives, which `getBoundingClientRect` reads correctly because a frozen
 * transform is still a transform.
 *
 * Measured twice: once in a frame callback, and once more when the entrances are over.
 * The beat that shows a label is often the beat that mounts or opens the thing it is
 * about, and one frame is nowhere near enough for that. GRT is the case that proved it,
 * and it took two harnesses disagreeing to find: `spec-anchors.mjs` reported the transit
 * label clear of the popup it hangs off and `beat-shot.mjs` photographed it lying across
 * the popup's first stop, because the popup opens on the beat before the label arrives and
 * `getBoundingClientRect` includes a transform that is still running. Whichever frame you
 * sample, a label placed from a moving box is placed wrong; the second pass is what makes
 * it not matter which frame you sample.
 *
 * A fixed delay rather than a `transitionend` listener, for the same reason `cursor.tsx`
 * checks its target once instead of subscribing: a scene that points at something moving
 * for longer than this is describing the wrong thing, and a listener on a layer full of
 * animation fires constantly. Long enough for the longest entrance in the pods — GRT's
 * popup at 320ms, PDF Explainer's practice cards at 340ms — and short enough to be over
 * inside the shortest beat that shows a label.
 *
 * Anchors are looked up inside the layer's parent, which is the pod. The layer is
 * `inset: 0` of it, so the two share a coordinate space by construction and there is no
 * second box for a percentage to be resolved against by mistake — which is the failure
 * `frameRef` exists to prevent in PDF Explainer.
 */
function useSpecAnchors<Name extends string>(
  layer: React.RefObject<HTMLDivElement | null>,
  tags: readonly SpecTag<Name>[],
  beat: Name,
): Record<string, Spot> {
  const [spots, setSpots] = useState<Record<string, Spot>>({});

  useEffect(() => {
    const node = layer.current;
    const host = node?.parentElement;
    if (!node || !host || !tags.some((tag) => tag.anchor)) return;

    let frame = 0;
    let settle = 0;
    const measure = () => {
      frame = 0;
      const frameBox = node.getBoundingClientRect();
      if (frameBox.width === 0 || frameBox.height === 0) return;

      const found: Record<string, Spot> = {};
      for (const tag of tags) {
        if (!tag.anchor) continue;
        const subject = host.querySelector<HTMLElement>(
          `[data-spec-anchor~="${tag.anchor}"]`,
        );
        const box = subject?.getBoundingClientRect();
        /* An anchor that is absent, or present but not laid out, is not an error: half
           of these are about things that only exist for part of a scene. The declared
           coordinate carries the label until the element turns up. */
        if (!box || box.width === 0 || box.height === 0) continue;
        const [fx, fy] = GRIPS[tag.grip ?? "center"];
        const dx = tag.nudge?.x ?? 0;
        const dy = tag.nudge?.y ?? 0;
        const axis = tag.axis ?? "both";
        found[tag.text] = {
          x:
            axis === "y"
              ? tag.x
              : ((box.left + box.width * fx + dx - frameBox.left) / frameBox.width) * 100,
          y:
            axis === "x"
              ? tag.y
              : ((box.top + box.height * fy + dy - frameBox.top) / frameBox.height) * 100,
        };
      }

      // Only when something moved. This runs on every beat of every scene on the page.
      setSpots((previous) => (settled(previous, found) ? previous : found));
    };

    const request = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    request();
    settle = window.setTimeout(request, SETTLE_MS);
    window.addEventListener("resize", request);
    /* Catches a layout change, which is most of them. It cannot catch a transform —
       nothing observes those — which is the other half of why the second pass above
       exists. */
    const observer = new ResizeObserver(request);
    observer.observe(host);

    return () => {
      window.removeEventListener("resize", request);
      observer.disconnect();
      window.clearTimeout(settle);
      cancelAnimationFrame(frame);
    };
  }, [layer, tags, beat]);

  return spots;
}

export function SpecTags<Name extends string>({
  beats,
  beat,
  tags,
  origin,
  className,
}: SpecTagsProps<Name>) {
  const now = beats.findIndex((entry) => entry.name === beat);
  const at = (name: Name) => beats.findIndex((entry) => entry.name === name);
  const layerRef = useRef<HTMLDivElement | null>(null);
  const measured = useSpecAnchors(layerRef, tags, beat);

  return (
    <div
      className={className ? `speclayer ${className}` : "speclayer"}
      ref={layerRef}
      style={
        origin
          ? ({
              "--spec-from-x": `${origin.x}%`,
              "--spec-from-y": `${origin.y}%`,
            } as CSSProperties)
          : undefined
      }
      aria-hidden="true"
    >
      {tags.map((tag, order) => {
        const shown = now >= at(tag.at) && (tag.until === undefined || now < at(tag.until));
        const spot = measured[tag.text] ?? tag;

        return (
          <span
            className="spectag"
            key={tag.text}
            data-shown={shown}
            data-measured={measured[tag.text] !== undefined}
            style={
              {
                "--spec-x": `${spot.x.toFixed(2)}%`,
                "--spec-y": `${spot.y.toFixed(2)}%`,
                /* Positional: the stagger is the order they burst out in, so an index
                   is the right thing here rather than a key. */
                "--spec-order": order,
              } as CSSProperties
            }
          >
            <SpecPlate text={tag.text} side={tag.side} shown={shown} />
          </span>
        );
      })}
    </div>
  );
}

/**
 * The total time a label is on screen, from the beat it arrives on to the beat it
 * leaves on — or to the end of the scene, whichever comes first.
 *
 * Exported for `tests/rendered-html.test.mjs`, which holds these to the same reading
 * floor the captions are held to. A label that flashes past is the failure this
 * component was built to avoid, and "it accumulates so it must be fine" is an argument,
 * not a measurement.
 */
export function specDwell<Name extends string>(
  beats: readonly Beat<Name>[],
  tag: SpecTag<Name>,
): number {
  const from = beats.findIndex((entry) => entry.name === tag.at);
  if (from === -1) return 0;
  const to =
    tag.until === undefined
      ? beats.length
      : beats.findIndex((entry) => entry.name === tag.until);
  return beats
    .slice(from, to === -1 ? beats.length : to)
    .reduce((total, entry) => total + entry.ms, 0);
}
