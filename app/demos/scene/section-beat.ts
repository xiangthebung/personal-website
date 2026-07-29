"use client";

/**
 * Publishes a scene's current beat onto the section that contains it.
 *
 * The scenes are self-contained by default, and for most of them that is right.
 * For some it is exactly wrong: Decaf's whole argument is that a page stops
 * shouting at you, and demonstrating that inside a 900px frame on an otherwise
 * untouched page makes it look like a small effect in a small box. It should be the
 * page that goes quiet.
 *
 * So a scene may opt in, and the section becomes addressable in CSS:
 *
 *   .project[data-scene-beat="drain"] { … }
 *   .project[data-scene-reached~="drain"] { … }   // and every beat after it
 *
 * Two attributes rather than one, because both questions get asked. `data-scene-beat`
 * is the moment, which is what a transition wants. `data-scene-reached` accumulates,
 * which is what "and it stays that way for the rest of the scene" wants — expressed
 * as a space-separated list so `~=` can test membership without CSS needing to know
 * the running order.
 *
 * Written to the DOM rather than lifted into React state on purpose. The section is
 * a server component several levels up; turning it into a client component that
 * re-renders seven times a scene, to change one attribute, would be a poor trade for
 * a class of effect that is entirely presentational.
 */

import { useEffect, type RefObject } from "react";

export function useSectionBeat(
  stage: RefObject<HTMLElement | null>,
  beat: string,
  beats: readonly { name: string }[],
): void {
  useEffect(() => {
    const section = stage.current?.closest<HTMLElement>("[data-project-section]");
    if (!section) return;

    const index = beats.findIndex((entry) => entry.name === beat);
    section.dataset.sceneBeat = beat;
    section.dataset.sceneReached = beats
      .slice(0, index + 1)
      .map((entry) => entry.name)
      .join(" ");

    return () => {
      delete section.dataset.sceneBeat;
      delete section.dataset.sceneReached;
    };
  }, [stage, beat, beats]);
}
