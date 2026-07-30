"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * Whether this scene's section is the one the visitor is actually standing in.
 *
 * `useOnScreen` is the wrong signal for anything that leaves its own box. It reports
 * true as soon as a single pixel of the element crosses the viewport — plus a
 * `rootMargin` of lead time on top — which is exactly right for "start the loop, the
 * visitor is nearly here" and exactly wrong for "take over their screen". The
 * symptom was reported and it was fair: reading Choir Practice and scrolling a little
 * put Decaf's hearts across the page, because Decaf's stage had come within 120px of
 * the bottom edge.
 *
 * The page already knows the answer. `ProjectFocusManager` scores every section on how
 * much of it is visible *and* how close its middle is to the middle of the screen, then
 * puts `is-active` on the winner — one section at a time, and only the one you are
 * really looking at. This reads that decision rather than inventing a second one, so
 * the scroll trail's colour, the dimming of the other headings and the viewport-level
 * effects can never disagree about which project you are in.
 *
 * A `MutationObserver` on the class attribute rather than another
 * `IntersectionObserver`: the work is already done, and observing the result costs one
 * callback per focus change instead of a second set of thresholds to keep in step.
 */
export function useSectionFocused(
  ref: RefObject<Element | null>,
  /**
   * How much of the visitor's screen this section has to hold before it is allowed to
   * draw on all of it.
   *
   * `is-active` alone was not enough, and a screenshot showed why: halfway between two
   * projects the lower one wins the focus score while the upper one still fills half the
   * window, so Decaf's hearts and notifications landed all over Choir Practice and looked
   * like they belonged to it. Being the active section says "this is the one you mean".
   * It does not say "you can no longer see the last one".
   *
   * Deliberately not high. The first attempt asked for 0.72 and the effects then almost
   * never appeared: these sections are 84svh, so a section only clears that when it is
   * squared up against the top of the window, and any ordinary reading position leaves it
   * short. Screenshots came back with nothing on them at all.
   *
   * 0.45 means "this project has more of the screen than anything else, by a clear
   * margin", which is the honest threshold for calling it the one you are looking at. The
   * bleed onto the neighbouring project is not prevented by raising this — it is prevented
   * by clipping each effect layer to its own section, which is where a boundary problem
   * belongs. See the clip loop in the Decaf demo.
   */
  minCoverage = 0.45,
): boolean {
  const [active, setActive] = useState(false);
  const [covers, setCovers] = useState(false);

  useEffect(() => {
    const section = ref.current?.closest("[data-project-section]");
    if (!section) return;

    const read = () => setActive(section.classList.contains("is-active"));
    read();

    const observer = new MutationObserver(read);
    observer.observe(section, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, [ref]);

  useEffect(() => {
    const section = ref.current?.closest("[data-project-section]");
    if (!section || typeof IntersectionObserver !== "function") return;

    /* `intersectionRect` against the viewport height rather than `intersectionRatio`,
       which is a fraction of the *element* — a section twice the height of the window
       reports 0.5 while filling the screen completely, which is the opposite of what is
       being asked here. */
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (!entry) return;
        setCovers(entry.intersectionRect.height / window.innerHeight >= minCoverage);
      },
      // Enough stops to catch the crossing without watching every pixel.
      { threshold: Array.from({ length: 21 }, (_, step) => step / 20) },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [ref, minCoverage]);

  return active && covers;
}
