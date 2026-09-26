"use client";

/**
 * Loads a demo's code when its section nears the viewport, and not before.
 *
 * Ten running applications on one page is a real cost, not a theoretical one:
 * one of them drives a requestAnimationFrame loop that reads pixels back off a
 * canvas every frame, and another is an entire embedded web app. Shipping all of
 * that in the initial bundle would make the hero wait for code the visitor may
 * never scroll to.
 *
 * The argument only got stronger when the page went from seven to ten. Nothing
 * about the mechanism had to change, which is the point of having had it: a
 * project is a directory and a line in the registry below.
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
  type RefObject,
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
  "two-factor-paster": lazy(() =>
    import("./two-factor-paster/demo").then((m) => ({ default: m.TwoFactorPasterDemo })),
  ),
  totem: lazy(() => import("./totem/demo").then((m) => ({ default: m.TotemDemo }))),
  "byte-budget": lazy(() =>
    import("./byte-budget/demo").then((m) => ({ default: m.ByteBudgetDemo })),
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

/**
 * How much of the window a scene may take, and how small it may be drawn to get there.
 *
 * Every scene is composed at a fixed pixel size — a browser window, a phone, a popup at
 * Chrome's own 600px cap — and several of them came out taller than a laptop screen: on
 * a 1366×768 window GRT's scene was 824px, 2FA Paster's 1159px, Byte Budget's 864px. A
 * scene taller than the window is a scene whose popup is cut off by the bottom of the
 * screen, and one that fills it is one you cannot see the heading beside. So a scene is
 * zoomed down, as a whole, until it fits `FIT_SHARE` of the window's height. It is never
 * zoomed up, and never below `FIT_FLOOR`, under which the scenes' 12px type stops being
 * readable.
 *
 * Choir Practice is exempt: it is the real application in an iframe, it sizes its own
 * frame to the window (see `.choir-frame`), and its leader lines are measured across the
 * iframe boundary, where a zoom would have to be undone twice.
 */
const FIT_SHARE = 0.7;
const FIT_FLOOR = 0.58;
const FIT_MIN_WIDTH = 760;
const FIT_EXEMPT: ReadonlySet<DemoId> = new Set<DemoId>(["choir-practice"]);

/**
 * Writes `--demo-fit` on the host from the scene's natural height and the window's.
 *
 * The natural height is the largest the scene has been at zoom 1, remembered rather than
 * re-read, because a few scenes grow by a card as a beat opens something; following each
 * change would make the whole scene pulse in size on every beat. Measured on-screen and
 * divided by the zoom already applied, since the rect comes back zoomed.
 */
function useFitToViewport(
  hostRef: RefObject<HTMLDivElement | null>,
  active: boolean,
): void {
  useEffect(() => {
    const host = hostRef.current;
    if (!host || !active) return;

    let natural = 0;
    let applied = 1;
    let frame = 0;
    const write = () => {
      frame = 0;
      const scene = host.firstElementChild as HTMLElement | null;
      if (!scene) return;
      const height = scene.getBoundingClientRect().height / applied;
      if (height > natural) natural = height;
      if (natural <= 0) return;
      const room = window.innerHeight * FIT_SHARE;
      /* Not on a phone. Below 760px every scene already has a narrow layout of its own,
         stacked to be scrolled through, and shrinking one that is already a column the
         width of the screen only makes its type too small to read. */
      const fit =
        window.innerWidth < FIT_MIN_WIDTH
          ? 1
          : Math.min(1, Math.max(FIT_FLOOR, room / natural));
      if (Math.abs(fit - applied) < 0.005) return;
      applied = fit;
      host.style.setProperty("--demo-fit", fit.toFixed(3));
    };
    const request = () => {
      if (!frame) frame = requestAnimationFrame(write);
    };

    /* The window changing height is a new room; the scene's remembered height stays. */
    const onResize = () => request();
    const observer = new ResizeObserver(request);
    const watch = () => {
      const scene = host.firstElementChild;
      if (scene) observer.observe(scene);
    };
    watch();
    /* The chunk lands after this effect runs, replacing the skeleton. */
    const children = new MutationObserver(() => {
      observer.disconnect();
      natural = 0;
      watch();
      request();
    });
    children.observe(host, { childList: true });
    window.addEventListener("resize", onResize);
    request();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      children.disconnect();
      window.removeEventListener("resize", onResize);
      host.style.removeProperty("--demo-fit");
    };
  }, [hostRef, active]);
}

export function DemoMount({ demo }: { demo: DemoId }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [near, setNear] = useState(false);
  useFitToViewport(hostRef, near && !FIT_EXEMPT.has(demo));

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
      {
        // Choir embeds a full application and engraves a score. Loading it only
        // as its frame approaches keeps that work out of the hero's first visit;
        // the lighter staged scenes retain enough lead to be ready on arrival.
        rootMargin: demo === "choir-practice" ? "48px 0px" : "300px 0px",
      },
    );
    observer.observe(host);
    return () => observer.disconnect();
  }, [demo]);

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
