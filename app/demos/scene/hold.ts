"use client";

/**
 * Whether the films on this page are held on a single frame.
 *
 * The README has carried an IOU for this for a long time. The site does not honour
 * `prefers-reduced-motion`, on purpose and with a written argument: the seven scenes
 * *are* the content, so a visitor whose machine reports `reduce` was left reading
 * captions about motion that never arrived — and on Windows that setting is turned on
 * by performance options, battery savers and remote desktop sessions far more often
 * than by anyone choosing it. The note ends: "Bringing motion control back should mean
 * a control on the page a visitor can find and press, not an ambient setting read
 * behind their back."
 *
 * This is that control's other half. The seam it plugs into was left in place the whole
 * time — every scene still declares `stillBeat`, the one frame that carries its
 * argument, and `SceneState.still` is still threaded down to the phantom cursor so a
 * pointer is never stranded mid-flight in a frozen frame. Nothing read either of them
 * until now.
 *
 * Held outside React because the seven scenes are seven independently lazy client
 * chunks with no common ancestor short of the page, which is a server component. A
 * context would mean making the page a client component to share one boolean. This is
 * a boolean and a set of callbacks.
 *
 * `useSyncExternalStore` rather than a `useState` + subscribe pair: it is what React
 * has for exactly this, it gives every scene the same value in the same commit, and the
 * server snapshot below is what keeps the server render honest — a page rendered on
 * Cloudflare has no idea what anybody has pressed, so it renders as running.
 */

import { useSyncExternalStore } from "react";

let held = false;
let settleTimer = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function isHeld(): boolean {
  return held;
}

/**
 * How long the page is given to arrive at its still frames before the clocks stop.
 *
 * Not a flourish, and the number is the length of the longest settling motion on the
 * page rather than a taste. Holding is two separate things happening in order: each
 * scene cuts to its argument frame, which is a React render, and then everything that
 * moves by keyframe stops where it stands.
 *
 * Doing both at once is wrong, and Decaf shows why in one frame. Its rewards are meant
 * to be caught by the extension and drain away where they hang — "nothing was taken
 * from you, it just stopped being worth anything" — so stopping the clocks in the same
 * instant leaves forty-two hearts and stars frozen mid-drain, scattered across the
 * reading column and covering the heading. The scene had a settled state and was never
 * allowed to reach it.
 *
 * So the cut happens now and the freeze happens after, which also reads better than
 * either alone: the page visibly comes to rest instead of stopping dead.
 *
 * The number is Decaf's fall: `dc-fall` runs 1450ms and is staggered by a sixteenth of
 * the launch stagger on top, so the last reward lands a little after 1500ms. That is
 * the longest settling motion any scene here has, and this is it plus a margin.
 *
 * 900ms was tried and is visibly wrong — the rewards freeze halfway down, which is both
 * a worse picture than either end of the fall and the one arrangement that puts them
 * across the middle of the section, on top of the heading. 1900 was the first number
 * that cleared it and was simply too generous: this is a button, somebody pressed it,
 * and every extra hundred milliseconds is the page ignoring them.
 */
const SETTLE_MS = 1600;

export function setHeld(next: boolean): void {
  if (held === next) return;
  held = next;

  const root = document.documentElement;
  window.clearTimeout(settleTimer);

  /* The state class goes on immediately: it is what the scenes' still frames and the
     button's own pressed styling key off. */
  root.classList.toggle("is-held", held);

  if (held) {
    /* And the class that stops every remaining clock follows once the page has had
       time to arrive. Everything that moves here and is not a storyboard — the
       drifting ambient backdrops, the seven living marks in the hero index, the drop
       running down the descend cue — knows nothing about beats, and somebody who asked
       for the motion to stop meant those too. */
    settleTimer = window.setTimeout(() => {
      root.classList.add("is-held-settled");
    }, SETTLE_MS);
  } else {
    /* Released in the same breath, both of them. Letting the page run again is not
       something anybody wants staged. */
    root.classList.remove("is-held-settled");
  }

  emit();
}

export function toggleHeld(): boolean {
  setHeld(!held);
  return held;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** False on the server, and on the first client render, which is what it must be. */
const serverSnapshot = () => false;

export function useHeld(): boolean {
  return useSyncExternalStore(subscribe, isHeld, serverSnapshot);
}
