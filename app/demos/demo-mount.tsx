"use client";

/**
 * Loads a demo's code when its section nears the viewport, and not before.
 *
 * Seven running applications on one page is a real cost, not a theoretical one:
 * one of them drives a requestAnimationFrame loop that reads pixels back off a
 * canvas every frame, and another is an entire embedded web app. Shipping all of
 * that in the initial bundle would make the hero wait for code the visitor may
 * never scroll to.
 *
 * So each demo is a separate chunk, requested 300px before it is needed. The
 * demos themselves are responsible for going idle when scrolled away — that is
 * their business, not this component's, because only they know what they are
 * running.
 *
 * The registry is a total `Record<DemoId, …>` on purpose. Adding a project to
 * `projects.ts` without building its demo is then a compile error rather than a
 * hole discovered in the browser.
 */

import {
  Suspense,
  lazy,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type LazyExoticComponent,
} from "react";
import type { DemoId } from "../projects";

const registry: Record<DemoId, LazyExoticComponent<ComponentType>> = {
  "night-neutralizer": lazy(() =>
    import("./night-neutralizer/demo").then((m) => ({ default: m.NightNeutralizerDemo })),
  ),
  "grt-next-bus": lazy(() =>
    import("./grt-next-bus/demo").then((m) => ({ default: m.GrtNextBusDemo })),
  ),
  "n-back": lazy(() => import("./n-back/demo").then((m) => ({ default: m.NBackDemo }))),
  pagepack: lazy(() => import("./pagepack/demo").then((m) => ({ default: m.PagePackDemo }))),
  decaf: lazy(() => import("./decaf/demo").then((m) => ({ default: m.DecafDemo }))),
  "pdf-explainer": lazy(() =>
    import("./pdf-explainer/demo").then((m) => ({ default: m.PdfExplainerDemo })),
  ),
  "choir-practice": lazy(() =>
    import("./choir-practice/demo").then((m) => ({ default: m.ChoirPracticeDemo })),
  ),
};

/** Reserves the demo's rough height so nothing jumps when the chunk lands. */
function DemoSkeleton() {
  return (
    <div className="demo-skeleton" aria-hidden="true">
      <span />
    </div>
  );
}

export function DemoMount({ demo }: { demo: DemoId }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // No IntersectionObserver (or a very old engine): load it rather than leave
    // an empty box. A missing demo is worse than an early one. Deliberately after
    // mount so the server and the first client render agree.
    if (typeof IntersectionObserver !== "function") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNear(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px 0px" },
    );
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  const Demo = registry[demo];

  return (
    <div className="demo-host" ref={hostRef}>
      {near ? (
        <Suspense fallback={<DemoSkeleton />}>
          <Demo />
        </Suspense>
      ) : (
        <DemoSkeleton />
      )}
    </div>
  );
}
