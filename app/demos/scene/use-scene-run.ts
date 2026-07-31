"use client";

import { useEffect, useState } from "react";

/**
 * When a scene is allowed to play.
 *
 * Scenes used to run on `useOnScreen`, which reports true as soon as one pixel of the
 * stage crosses the viewport *plus* 120px of lead margin. So a film started while its
 * section was still most of a screen away, and by the time a visitor had scrolled to it
 * the opening beats — the ones that establish what they are looking at — had already
 * gone. Decaf is the clearest case: its first two seconds are a still, ordinary feed,
 * and arriving to find the flood already at full height is arriving after the setup.
 *
 * So a scene starts when the visitor is actually standing in front of it:
 * `useSectionFocused`, which is the page's own `is-active` decision plus a coverage
 * test. `useStoryboard` clears its clock whenever `running` goes false, so this also
 * means every scene plays from its first frame rather than from wherever it had got to.
 *
 * The latch is the part that matters. Focus is a threshold — 45% of the viewport — and
 * anything derived from a threshold can sit on it. Gating directly on focus would let a
 * visitor parked at that boundary restart the film every time the number crossed back
 * and forth, which reads as a scene that cannot make up its mind. So focus only ever
 * *starts* a scene; what keeps it running is being on screen at all, and what resets it
 * is leaving. Entering is a decision, continuing is not.
 *
 * That also matches what was actually reported. The complaint was about scenes starting
 * too early, not about them stopping too late.
 */
export function useSceneRun(focused: boolean, onScreen: boolean): boolean {
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (focused && !started) {
      // Neither of these can be derived during render: both are observer results.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStarted(true);
    } else if (!onScreen && started) {
      setStarted(false);
    }
  }, [focused, onScreen, started]);

  return started && onScreen;
}
