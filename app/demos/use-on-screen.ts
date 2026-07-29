"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * Whether an element is on screen and its tab is in the foreground.
 *
 * Demos that run a loop use this to stop running one. A tone mapper analysing
 * canvas pixels every frame is a fine thing to do while someone is looking at it
 * and an unreasonable thing to do in a background tab three sections up.
 *
 * Both conditions matter. Visibility alone is not enough because a background tab
 * still reports its elements as intersecting; `visibilitychange` alone is not
 * enough because scrolling past a demo does not hide the page.
 *
 * Defaults to true when `IntersectionObserver` is unavailable: an unobservable
 * demo should work, not sit frozen.
 *
 * `rootMargin` is a plain string rather than a full `IntersectionObserverInit` so
 * it can sit in the dependency array without a fresh object rebuilding the
 * observer on every render.
 */
export function useOnScreen<T extends Element>(
  ref: RefObject<T | null>,
  rootMargin = "120px 0px",
): boolean {
  const [intersecting, setIntersecting] = useState(false);
  const [foreground, setForeground] = useState(true);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (typeof IntersectionObserver !== "function") {
      // Cannot observe, so assume visible. Deliberately after mount: deciding
      // this during render would make the server and client disagree.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIntersecting(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (entry) setIntersecting(entry.isIntersecting);
      },
      { rootMargin },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, rootMargin]);

  useEffect(() => {
    const read = () => setForeground(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", read);
    read();
    return () => document.removeEventListener("visibilitychange", read);
  }, []);

  return intersecting && foreground;
}
