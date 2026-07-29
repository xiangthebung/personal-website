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
 */

import { useEffect, useRef, useState } from "react";

export interface PhantomCursorProps {
  /** The element the coordinates are measured inside. */
  stage: React.RefObject<HTMLElement | null>;
  /** `data-target` of the element to point at, or null to leave the frame. */
  target: string | null;
  /** True on the beat where the click should register. */
  pressing?: boolean;
  /** Re-measured when this changes, so a loop re-reads a re-laid-out stage. */
  token?: string | number;
}

interface Spot {
  x: number;
  y: number;
}

/** Where the cursor waits before it enters, and returns to when it leaves. */
const OFF_STAGE: Spot = { x: 104, y: 108 };

export function PhantomCursor({ stage, target, pressing = false, token }: PhantomCursorProps) {
  const [spot, setSpot] = useState<Spot | null>(null);
  const lastTarget = useRef<string | null>(null);

  useEffect(() => {
    const host = stage.current;
    if (!host) return;

    if (target === null) {
      lastTarget.current = null;
      // Where a DOM node is cannot be known during render, so this is an effect
      // whose whole job is to set state from a measurement.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSpot(null);
      return;
    }

    /* Measured after paint. On the first beat of a scene the stage has only just
       been laid out, and reading it in the same frame gives a zero-size box. */
    let frame = requestAnimationFrame(() => {
      const node = host.querySelector<HTMLElement>(`[data-target="${target}"]`);
      if (!node) {
        setSpot(null);
        return;
      }
      const stageBox = host.getBoundingClientRect();
      const box = node.getBoundingClientRect();
      if (stageBox.width === 0 || box.width === 0) {
        // Not laid out yet. Try once more on the next frame rather than parking
        // the cursor at the origin, which looks like a bug.
        frame = requestAnimationFrame(() => {
          const retry = node.getBoundingClientRect();
          const again = host.getBoundingClientRect();
          if (retry.width > 0 && again.width > 0) {
            setSpot({
              x: ((retry.left + retry.width / 2 - again.left) / again.width) * 100,
              y: ((retry.top + retry.height / 2 - again.top) / again.height) * 100,
            });
          }
        });
        return;
      }
      lastTarget.current = target;
      setSpot({
        x: ((box.left + box.width / 2 - stageBox.left) / stageBox.width) * 100,
        y: ((box.top + box.height / 2 - stageBox.top) / stageBox.height) * 100,
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [stage, target, token]);

  const at = spot ?? OFF_STAGE;

  return (
    <span
      className="ghost-cursor"
      aria-hidden="true"
      data-visible={spot !== null}
      data-pressing={pressing}
      style={{ left: `${at.x}%`, top: `${at.y}%` }}
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
      <span className="ghost-cursor-ring" />
    </span>
  );
}
