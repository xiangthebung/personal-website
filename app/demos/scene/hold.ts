"use client";

/**
 * Whether the films on this page are held on a single frame.
 *
 * The README carried an IOU for this for a long time. The site did not honour
 * `prefers-reduced-motion`, on purpose and with a written argument: the ten scenes
 * *are* the content, so a visitor whose machine reports `reduce` was left reading
 * captions about motion that never arrived — and on Windows that setting is turned on
 * by performance options, battery savers and remote desktop sessions far more often
 * than by anyone choosing it. The note ended: "Bringing motion control back should mean
 * a control on the page a visitor can find and press, not an ambient setting read
 * behind their back."
 *
 * That control is what this file is. It also settled the media query: see
 * `adoptReducedMotionPreference` at the foot, which is where the setting is finally
 * honoured, and honoured as a starting position rather than as a permanent verdict.
 *
 * The seam the button plugs into was left in place the whole time — every scene still
 * declares `stillBeat`, the one frame that carries its argument, and `SceneState.still`
 * is still threaded down to the phantom cursor so a pointer is never stranded
 * mid-flight in a frozen frame. Nothing read either of them until the button existed.
 *
 * Held outside React because the ten scenes are ten independently lazy client
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

export function setHeld(next: boolean, settleMs: number = SETTLE_MS): void {
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
       drifting ambient backdrops, the ten living marks in the hero index, the drop
       running down the descend cue — knows nothing about beats, and somebody who asked
       for the motion to stop meant those too.

       `settleMs` is a parameter for exactly one caller. The wait exists to let a
       *running* page come to rest, and the reduced-motion landing below runs before the
       page has started — there is nothing to come to rest from, and making somebody who
       asked for less motion watch 1.6 seconds of it first would be the setting honoured
       and disregarded in the same breath. */
    if (settleMs <= 0) {
      root.classList.add("is-held-settled");
    } else {
      settleTimer = window.setTimeout(() => {
        root.classList.add("is-held-settled");
      }, settleMs);
    }
  } else {
    /* Released in the same breath, both of them. Letting the page run again is not
       something anybody wants staged. */
    root.classList.remove("is-held-settled");
  }

  emit();
}

/**
 * Where a visitor who asked for less motion lands.
 *
 * The note this file used to quote refused `prefers-reduced-motion` and set a condition
 * for its return: a control on the page that a visitor can find and press, rather than
 * an ambient setting read behind their back. That control now exists, a few inches away
 * in the dock, which changes the question. The objection was never to the setting. It
 * was that obeying it produced a broken page — ten captions about motion that never
 * arrived, with nothing on screen to ask for the motion back.
 *
 * So the setting decides the starting position and nothing else. A machine reporting
 * `reduce` lands on ten still frames — each scene's own `stillBeat`, the frame it
 * nominated as the one carrying its argument — with every label pinned to its evidence
 * and the button sitting there, pressed, saying what it does. Nothing is withheld and
 * nothing has to be guessed at: the page a `reduce` visitor gets is the page anybody
 * gets after pressing one button, and one press puts it back.
 *
 * Three properties make this a landing rather than an ambient setting, and all three
 * are the point:
 *
 * - **Once.** A module-level latch, not a `matchMedia` listener. Read at first mount and
 *   never again, so a visitor who presses Run is never overruled by their own operating
 *   system a moment later. Fighting the button would be the exact behaviour the note
 *   objected to, wearing a better hat.
 * - **Never on the server.** `serverSnapshot` stays `false` and has to: Cloudflare has
 *   no idea what the machine at the other end prefers, and a server render that guessed
 *   would be a hydration mismatch for every visitor it guessed wrong about. This is a
 *   client effect on the first commit, which is the earliest honest moment.
 * - **Only ever toward held.** It cannot release a hold, so it can never surprise
 *   somebody who arrived wanting the films to run.
 *
 * Called from `MotionHold` in `page-chrome.tsx`, which mounts with the dock on the
 * page's first commit — before any scene chunk has loaded, so the scenes come up held
 * rather than starting and then being stopped.
 */
let adoptedPreference = false;

export function adoptReducedMotionPreference(): void {
  if (adoptedPreference) return;
  adoptedPreference = true;

  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  setHeld(true, 0);
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
