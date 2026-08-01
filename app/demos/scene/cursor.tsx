"use client";

/**
 * The hand in the frame.
 *
 * A vignette where a button simply depresses on its own reads as a glitch. The
 * same vignette with a pointer that travels to the button, lands, and clicks reads
 * as somebody using software — and that is the whole difference between an
 * animation and a demonstration.
 *
 * It moves to a *named target* rather than to coordinates. Each scene marks its
 * targets with `data-target="save"` and names one per beat; this measures the
 * target against the stage when the beat changes and glides there. Coordinates
 * would have been less code and would have drifted the moment a card wrapped at a
 * narrower width, leaving the cursor clicking empty space beside the button — the
 * exact class of bug that a demo cannot survive, because nobody reports it.
 *
 * It is `aria-hidden` and it is not a control. Nothing here responds to a real
 * pointer, so a screen reader is told about the scene through its caption instead.
 *
 * WHY THE CLICK IS TIMED HERE AND NOT BY THE STORYBOARD
 *
 * It used to be the scene's job: `pressing` was a boolean the caller set for the beat
 * the click belonged to, and it went straight onto the element. That is wrong whenever
 * the pointer arrives and clicks on the *same* beat, which was four of the five presses
 * on the page — and the failure is unusually deceptive, because a still frame of it
 * looks right. Reported as "the mouse seems to hover over things and not click on them":
 * the press and the ring fired at the start of the beat, while the pointer was still
 * mid-flight, so the click played out over empty space and the pointer reached its
 * target a third of a second after the only evidence of a click had finished. PDF
 * Explainer clicked four things and landed none of them.
 *
 * A caller cannot fix that, because the travel time is not a fact a caller has. So this
 * owns the whole gesture instead: the caller says *this beat contains a click* and this
 * decides when, which is after the pointer has actually arrived.
 *
 * That in turn means the travel time has to be a number here rather than a duration in
 * the stylesheet, so it is computed from the distance and written back out as
 * `--ghost-travel`. Distance-proportional is also the better motion: a fixed 620ms for
 * every move made a 30px hop between two rows of a list take as long as a diagonal
 * crossing of a browser window, and the hop read as reluctance.
 */

import { useEffect, useRef, useState, type CSSProperties } from "react";

export interface PhantomCursorProps {
  /** The element the coordinates are measured inside. */
  stage: React.RefObject<HTMLElement | null>;
  /** `data-target` of the element to point at, or null to leave the frame. */
  target: string | null;
  /** True on the beat the click belongs to. *When* inside that beat is decided here. */
  pressing?: boolean;
  /**
   * Called at the moment the button goes down, which is the moment a scene may draw
   * whatever the click did.
   *
   * This closes the other half of the problem described above. Moving the *press* off the
   * beat boundary fixed the pointer; it did not fix the thing being pressed, because a
   * scene's state is derived from the beat and a beat starts when it starts. So the ring
   * was landing on the button 370ms after the option it was clicking had already gone
   * green. Reported, again, as clicks happening before the pointer got there — and this
   * time correctly about the *effect* rather than the gesture.
   *
   * A scene cannot schedule that itself for the same reason it cannot schedule the press:
   * the travel time is not a fact a caller has. So this reports, and `usePressGate` turns
   * the report into "the beat has happened". See `press-gate.ts`.
   */
  onPress?: () => void;
  /**
   * Multiplies the travel time, for a scene that wants a more deliberate pointer.
   *
   * Decaf is the one that does: it crosses the diagonal of a whole browser window with
   * a flood of animation going on around it, and at the shared pace the movement was
   * reported twice as too easy to miss. This was a `transition` override in its own
   * stylesheet, which stopped being possible the moment the click had to be scheduled
   * against the same number.
   */
  pace?: number;
  /** Re-measured when this changes, so a loop re-reads a re-laid-out stage. */
  token?: string | number;
}

interface Spot {
  x: number;
  y: number;
}

/** Where the cursor waits before it enters, and returns to when it leaves. */
const OFF_STAGE: Spot = { x: 104, y: 108 };

/* --- the flight ------------------------------------------------------------
   Percentage points of the stage, so a full diagonal is about 141 of them. The floor
   is what stops a two-point nudge looking like a teleport; the ceiling is the old
   fixed duration, which was tuned against the longest move on the page and is still
   right for it. */
const TRAVEL_FLOOR = 190;
const TRAVEL_PER_POINT = 3.1;
const TRAVEL_CEILING = 620;
/** Under this, the target has not really moved — a reflow jitter, not a journey. */
const STILL_ENOUGH = 0.6;

/**
 * A beat between landing and pressing. Nobody clicks the instant they arrive.
 *
 * Exported, because it is the shortest a click can be after its beat starts and one scene
 * has to do arithmetic against that: PagePack's saved pages leave the Save button when the
 * click lands and have to finish arriving as `finish` ends, so their stagger is derived
 * from the save window less this. See `FLYER_STAGGER`.
 */
export const SETTLE_MS = 90;
/** How long the button stays down. A real click is over almost immediately. */
const HOLD_MS = 150;
/**
 * The correction, if the target has moved by the time the pointer gets there.
 *
 * Shorter than `SETTLE_MS`, so it is over before the press. Things in these scenes
 * mount with a short entrance transform — PDF Explainer's practice cards arrive 10px
 * to the right of where they end up — and a target named by the beat it appears on is
 * therefore first measured while it is still moving.
 */
const CORRECT_MS = 80;

/** Whether two points are far enough apart to be a journey rather than a reflow. */
function moved(from: Spot, to: Spot): boolean {
  return Math.hypot(to.x - from.x, to.y - from.y) >= STILL_ENOUGH;
}

/** How long the travel between two points should take, in milliseconds. */
function flightMs(from: Spot, to: Spot, pace: number): number {
  if (!moved(from, to)) return 0;
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  return Math.round(
    Math.min(TRAVEL_CEILING, TRAVEL_FLOOR + distance * TRAVEL_PER_POINT) * pace,
  );
}

/**
 * Where a target sits inside the stage, as percentages of it, or null when it cannot
 * be measured yet.
 *
 * Both boxes are checked for width. On the first beat of a scene the stage has only
 * just been laid out, and reading it in the same frame gives a zero-size box — which
 * would put the cursor at the stage's top-left corner, a position that looks like a
 * rendering fault rather than like a missing measurement.
 */
function measure(host: HTMLElement, node: HTMLElement): Spot | null {
  const stage = host.getBoundingClientRect();
  const box = node.getBoundingClientRect();
  if (stage.width === 0 || stage.height === 0 || box.width === 0) return null;
  return {
    x: ((box.left + box.width / 2 - stage.left) / stage.width) * 100,
    y: ((box.top + box.height / 2 - stage.top) / stage.height) * 100,
  };
}

export function PhantomCursor({
  stage,
  target,
  pressing = false,
  pace = 1,
  onPress,
  token,
}: PhantomCursorProps) {
  const [spot, setSpot] = useState<Spot | null>(null);
  const [travel, setTravel] = useState(TRAVEL_CEILING);
  const [down, setDown] = useState(false);
  /** Bumped per click, and used as the ring's key so every ping plays in full. */
  const [click, setClick] = useState(0);
  /** Where the pointer was left, which is what the next flight is measured from. */
  const at = useRef<Spot>(OFF_STAGE);
  /* Held in a ref rather than named as a dependency of the effect below. That effect owns
     a flight in progress and a press scheduled against it, so anything that re-runs it
     mid-beat restarts both — and a callback is exactly the kind of prop that arrives new
     on every render. `usePressGate`'s does, once per beat, by design.

     Synced in its own effect rather than during render, and declared before the effect
     that reads it. Nothing depends on that order in practice: the press is fired from a
     timer hundreds of milliseconds into the beat, long after every effect in the commit
     has run. */
  const report = useRef(onPress);
  useEffect(() => {
    report.current = onPress;
  }, [onPress]);

  /**
   * One effect for the move and the click together, and deliberately not two.
   *
   * The click has to be scheduled against the flight time, and the flight time is only
   * known once the target has been measured — which happens in a `requestAnimationFrame`
   * callback, after every effect for this render has already run. Two effects would put
   * the scheduling before the number it depends on.
   */
  useEffect(() => {
    const host = stage.current;
    if (!host) return;

    let frame = 0;
    const timers: number[] = [];
    const after = (ms: number, run: () => void) => timers.push(window.setTimeout(run, ms));

    /** Move to a measured point, and time everything that follows the arrival. */
    const send = (to: Spot | null) => {
      const ms = flightMs(at.current, to ?? OFF_STAGE, pace);
      at.current = to ?? OFF_STAGE;
      /* Where a DOM node is cannot be known during render, so this is state set from a
         measurement — but always from inside a frame callback or a timer rather than
         from the effect body, which is what keeps it out of the render pass. */
      setTravel(ms);
      setSpot(to);
      if (!to || target === null) return;

      after(ms, () => {
        /* Landed. Check the target is still where it was when this flight was planned,
           and nudge across if it is not — see `CORRECT_MS`.

           One check, not a subscription. It is here for targets that are still arriving,
           which is a matter of a few hundred milliseconds; it is deliberately not a
           `ResizeObserver` chasing a target for the whole beat, because a scene that
           points at something moving that long is describing the wrong thing. PagePack
           made exactly that mistake — see the note on its `CURSOR`. */
        const node = host.querySelector<HTMLElement>(`[data-target="${target}"]`);
        const settled = node && measure(host, node);
        if (settled && moved(at.current, settled)) {
          at.current = settled;
          setTravel(CORRECT_MS);
          setSpot(settled);
        }
        if (!pressing) return;
        after(SETTLE_MS, () => {
          setDown(true);
          setClick((count) => count + 1);
          /* And tell the scene, in the same tick as the ring. Everything the click causes
             is drawn from this rather than from the beat starting. */
          report.current?.();
          after(HOLD_MS, () => setDown(false));
        });
      });
    };

    if (target === null) {
      send(null);
    } else {
      /* Measured after paint, and once more on the following frame if the stage was
         not laid out yet. A node that is simply absent is a different thing from one
         that is not measurable yet: the first means this beat has nothing to point at
         and the cursor should leave, the second means try again. */
      frame = requestAnimationFrame(() => {
        const node = host.querySelector<HTMLElement>(`[data-target="${target}"]`);
        if (!node) return send(null);
        const found = measure(host, node);
        if (found) return send(found);
        frame = requestAnimationFrame(() => {
          const retry = measure(host, node);
          if (retry) send(retry);
        });
      });
    }

    return () => {
      cancelAnimationFrame(frame);
      timers.forEach(clearTimeout);
      /* And lift the button. Clearing the timers above cancels the release as readily as
         anything else, so a press still held when the beat changes would leave the pointer
         depressed for the rest of the loop. It cannot happen at the beat lengths in the
         scenes today — the tightest margin is PagePack's 320ms press against a release at
         266ms — but "cannot happen at today's numbers" is exactly the kind of thing that
         stops being true when somebody shortens a beat by 100ms. */
      setDown(false);
    };
  }, [stage, target, token, pressing, pace]);

  const where = spot ?? OFF_STAGE;

  return (
    <span
      className="ghost-cursor"
      aria-hidden="true"
      data-visible={spot !== null}
      data-pressing={down}
      style={
        {
          left: `${where.x}%`,
          top: `${where.y}%`,
          "--ghost-travel": `${travel}ms`,
        } as CSSProperties
      }
    >
      <svg viewBox="0 0 24 24" className="ghost-cursor-arrow">
        {/* Two paths: a white outline under a dark fill, so the pointer stays
            visible over both a bright popup and a scene that has gone dark. */}
        <path
          d="M5.5 2.6 19.2 12.2l-5.7.5 3.2 6.6-2.5 1.2-3.2-6.6-3.9 4z"
          fill="#fff"
          stroke="#fff"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <path d="M5.5 2.6 19.2 12.2l-5.7.5 3.2 6.6-2.5 1.2-3.2-6.6-3.9 4z" fill="#141414" />
      </svg>
      {/* Keyed, so the ping is a fresh element each time and runs its whole animation.
          It was a single permanent node animated by `[data-pressing]`, which tied the
          ring's life to the length of the press — and PagePack's press beat is 320ms
          against a 460ms ring, so the one unambiguous signal that a click happened was
          cut off two thirds of the way through. */}
      {click > 0 && <span className="ghost-cursor-ring" key={click} />}
    </span>
  );
}
