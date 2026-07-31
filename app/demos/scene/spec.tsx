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
 */

import type { CSSProperties } from "react";
import type { Beat } from "./storyboard";

/** Which way a label reads out of the point it is pinned to. */
export type SpecSide = "left" | "right" | "above" | "below";

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
  /** Where it is pinned, as a percentage of the layer. */
  readonly x: number;
  readonly y: number;
  /** Default `right`: the label extends right from its anchor dot. */
  readonly side?: SpecSide;
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

export function SpecTags<Name extends string>({
  beats,
  beat,
  tags,
  origin,
  className,
}: SpecTagsProps<Name>) {
  const now = beats.findIndex((entry) => entry.name === beat);
  const at = (name: Name) => beats.findIndex((entry) => entry.name === name);

  return (
    <div
      className={className ? `speclayer ${className}` : "speclayer"}
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
        const side = SIDES[tag.side ?? "right"];
        const shown =
          now >= at(tag.at) && (tag.until === undefined || now < at(tag.until));

        return (
          <span
            className="spectag"
            key={tag.text}
            data-shown={shown}
            /* The stylesheet needs this as well as the offsets: which side the label
               reads out of also decides which end of it the anchor dot belongs on. */
            data-side={tag.side ?? "right"}
            style={
              {
                "--spec-x": `${tag.x}%`,
                "--spec-y": `${tag.y}%`,
                "--spec-tx": side.tx,
                "--spec-ty": side.ty,
                "--spec-origin": side.origin,
                /* Positional: the stagger is the order they burst out in, so an index
                   is the right thing here rather than a key. */
                "--spec-order": order,
              } as CSSProperties
            }
          >
            <span className="spectag-body">
              {/* The dot *and* the line to the plate, in one element.
                  It was a bare dot and a flex gap, which is not an association — at six
                  labels on one frame a reader has to guess which nearby thing each one is
                  about. A drawn connector removes the guess, and it costs nothing extra:
                  the pin owns the lead, so the gap between it and the plate is zero. */}
              <i className="spectag-pin" />
              <b className="spectag-text">{tag.text}</b>
            </span>
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
