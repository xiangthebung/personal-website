"use client";

/**
 * The interactive furniture around the page content.
 *
 * `MediaRail` drives the gallery at the bottom: drag with momentum, sideways
 * wheel, arrow keys, and clip playback that starts only once a clip is on screen.
 *
 * `ProjectFocusManager` decides which section you are standing in, colours the
 * progress trail with that section's accent, and owns the keyboard shortcuts.
 *
 * This file used to also export `ProjectRail`, four hundred lines that scrolled a
 * horizontal track of screenshots and animated each card's entrance. The
 * screenshots are gone — the sections now mount the software itself — so the rail
 * went with them. What remains is the part that was never about screenshots.
 */

import {
  useEffect,
  useRef,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type WheelEvent,
} from "react";

/**
 * Panning a rail must not start a native image drag. Images carry
 * `draggable={false}` too, but this covers every child in one place -- including
 * media that browsers make draggable by default.
 */
function preventNativeDrag(event: DragEvent<HTMLDivElement>) {
  event.preventDefault();
}

type Glide = {
  /** Begin a drag; discards any glide still running. */
  start: (x: number, time: number) => void;
  /** Feed a pointer sample so the release knows how hard the flick was. */
  track: (x: number, time: number) => void;
  /** Let go and coast. */
  release: () => void;
  stop: () => void;
};

/**
 * Flick physics for the drag rails. Releasing a drag hands the rail its last
 * pointer velocity, which then decays exponentially, so exploring sideways feels
 * like shoving something with weight rather than a scrollbar snapping to a halt.
 */
function createGlide(getScroller: () => HTMLDivElement | null): Glide {
  let frame = 0;
  let lastX = 0;
  let lastTime = 0;
  let velocity = 0;

  const stop = () => {
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
  };

  return {
    stop,
    start(x, time) {
      stop();
      lastX = x;
      lastTime = time;
      velocity = 0;
    },
    track(x, time) {
      const elapsed = time - lastTime;
      if (elapsed <= 0) return;

      // Blended with the running value so one jittery sample cannot define the
      // whole throw.
      const sample = (x - lastX) / elapsed;
      velocity = velocity * 0.7 + sample * 0.3;
      lastX = x;
      lastTime = time;
    },
    release() {
      const scroller = getScroller();
      if (!scroller) return;
      // Below this the pointer was effectively parked; coasting would feel like drift.
      if (Math.abs(velocity) < 0.06) return;

      let speed = -velocity;
      let previous = performance.now();

      const step = (now: number) => {
        // Clamped so a background tab returning to life cannot jump the rail.
        const elapsed = Math.min(now - previous, 32);
        previous = now;

        const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
        const next = scroller.scrollLeft + speed * elapsed;
        scroller.scrollLeft = Math.max(0, Math.min(maxScroll, next));
        speed *= Math.exp(-elapsed / 260);

        const stalled = Math.abs(speed) < 0.015;
        const atEdge =
          scroller.scrollLeft <= 0 || scroller.scrollLeft >= maxScroll - 0.5;
        frame = stalled || atEdge ? 0 : window.requestAnimationFrame(step);
      };

      stop();
      frame = window.requestAnimationFrame(step);
    },
  };
}

/**
 * Scroll to an explicit, clamped position so a new arrow click can interrupt
 * and reverse an in-flight smooth scroll instead of stacking another delta.
 */
function scrollRailByPage(
  scroller: HTMLDivElement,
  direction: number,
  pageFraction: number,
) {
  const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
  const current = Math.max(0, Math.min(maxScroll, scroller.scrollLeft));
  const target = Math.max(
    0,
    Math.min(maxScroll, current + direction * scroller.clientWidth * pageFraction),
  );

  scroller.scrollTo({ left: target, behavior: "smooth" });
}

type MediaRailProps = {
  children: ReactNode;
  itemCount: number;
};

export function MediaRail({ children, itemCount }: MediaRailProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const forwardButtonRef = useRef<HTMLButtonElement>(null);
  const pointerStartRef = useRef<{ x: number; scrollLeft: number } | null>(null);
  const draggedRef = useRef(false);
  const glideRef = useRef<Glide | null>(null);

  const glide = () => (glideRef.current ??= createGlide(() => scrollerRef.current));

  const markExplored = () => {
    scrollerRef.current
      ?.closest(".fun-section")
      ?.classList.add("is-rail-explored");
  };

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const rail = scroller.querySelector<HTMLElement>(".fun-rail");
    if (rail) {
      const items = Array.from(rail.children);
      for (let index = items.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        const item = items[index];
        items[index] = items[swapIndex];
        items[swapIndex] = item;
      }
      items.forEach((item) => rail.appendChild(item));
    }

    const syncControls = () => {
      const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
      const atStart = scroller.scrollLeft <= 2;
      const atEnd = scroller.scrollLeft >= maxScroll - 2;
      if (backButtonRef.current) {
        backButtonRef.current.dataset.disabled = String(atStart);
        backButtonRef.current.setAttribute("aria-disabled", String(atStart));
      }
      if (forwardButtonRef.current) {
        forwardButtonRef.current.dataset.disabled = String(atEnd);
        forwardButtonRef.current.setAttribute("aria-disabled", String(atEnd));
      }
    };

    const resizeObserver = new ResizeObserver(syncControls);
    resizeObserver.observe(scroller);
    if (rail) resizeObserver.observe(rail);

    syncControls();
    scroller.addEventListener("scroll", syncControls, { passive: true });
    window.addEventListener("resize", syncControls);

    return () => {
      scroller.removeEventListener("scroll", syncControls);
      window.removeEventListener("resize", syncControls);
      resizeObserver?.disconnect();
      glideRef.current?.stop();
    };
  }, [itemCount]);

  // A light that follows the pointer across the dark gallery. Written as two
  // custom properties on the section and read by a single gradient, so moving the
  // mouse costs one style recalculation per frame and no layout.
  useEffect(() => {
    const scroller = scrollerRef.current;
    const section = scroller?.closest<HTMLElement>(".fun-section");
    if (!section) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    let frame = 0;
    let x = 0;
    let y = 0;

    const write = () => {
      frame = 0;
      section.style.setProperty("--pointer-x", `${x}%`);
      section.style.setProperty("--pointer-y", `${y}%`);
    };

    // `globalThis.` because React's synthetic event types are imported above and
    // shadow the DOM ones.
    const handleMove = (event: globalThis.PointerEvent) => {
      const box = section.getBoundingClientRect();
      x = ((event.clientX - box.left) / box.width) * 100;
      y = ((event.clientY - box.top) / box.height) * 100;
      if (!frame) frame = window.requestAnimationFrame(write);
    };

    const handleEnter = () => section.classList.add("is-lit");
    const handleLeave = () => section.classList.remove("is-lit");

    section.addEventListener("pointermove", handleMove);
    section.addEventListener("pointerenter", handleEnter);
    section.addEventListener("pointerleave", handleLeave);

    return () => {
      section.removeEventListener("pointermove", handleMove);
      section.removeEventListener("pointerenter", handleEnter);
      section.removeEventListener("pointerleave", handleLeave);
      if (frame) window.cancelAnimationFrame(frame);
      section.classList.remove("is-lit");
    };
  }, []);

  // Gallery clips play on their own while they are on screen and stop as soon as
  // they leave, so nothing decodes video off screen. Bytes are only fetched once
  // a clip is close: the markup ships preload="none".
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const clips = Array.from(
      scroller.querySelectorAll<HTMLVideoElement>("video[data-fun-clip]"),
    );
    if (!clips.length) return;

    const onScreen = new Set<HTMLVideoElement>();
    const heldByViewer = new Set<HTMLVideoElement>();

    const toggleFor = (clip: HTMLVideoElement) =>
      clip.parentElement?.querySelector<HTMLButtonElement>("[data-fun-toggle]");

    const syncToggle = (clip: HTMLVideoElement) => {
      const toggle = toggleFor(clip);
      if (!toggle) return;

      const playing = !clip.paused && !clip.ended;
      const label = clip.getAttribute("aria-label") ?? "clip";
      toggle.dataset.state = playing ? "playing" : "paused";
      toggle.setAttribute(
        "aria-label",
        `${playing ? "Pause" : "Play"} clip: ${label}`,
      );
    };

    const warm = (clip: HTMLVideoElement) => {
      if (clip.preload === "auto") return;
      clip.preload = "auto";
      if (clip.readyState === 0) clip.load();
    };

    const settle = (clip: HTMLVideoElement) => {
      if (onScreen.has(clip) && !heldByViewer.has(clip)) {
        void clip.play().catch(() => {});
      } else {
        clip.pause();
      }
    };

    // Warms slightly before a clip is reachable so playback starts without a stall.
    const approachObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) warm(entry.target as HTMLVideoElement);
        });
      },
      { rootMargin: "320px" },
    );

    const playObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const clip = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) {
            onScreen.add(clip);
          } else {
            onScreen.delete(clip);
            // Leaving the screen clears a manual pause, so returning to a clip
            // starts it again rather than staying frozen for the session.
            heldByViewer.delete(clip);
          }
          settle(clip);
        });
      },
      { threshold: 0.4 },
    );

    const handleToggle = (event: Event) => {
      const toggle = (event.target as Element).closest<HTMLButtonElement>(
        "[data-fun-toggle]",
      );
      if (!toggle) return;

      const clip = toggle.parentElement?.querySelector<HTMLVideoElement>(
        "video[data-fun-clip]",
      );
      if (!clip) return;

      event.preventDefault();
      if (clip.paused) {
        heldByViewer.delete(clip);
        warm(clip);
        void clip.play().catch(() => {});
      } else {
        heldByViewer.add(clip);
        clip.pause();
      }
    };

    clips.forEach((clip) => {
      approachObserver.observe(clip);
      playObserver.observe(clip);
      clip.addEventListener("play", () => syncToggle(clip));
      clip.addEventListener("pause", () => syncToggle(clip));
      syncToggle(clip);
    });

    scroller.addEventListener("click", handleToggle);

    return () => {
      approachObserver.disconnect();
      playObserver.disconnect();
      scroller.removeEventListener("click", handleToggle);
      clips.forEach((clip) => clip.pause());
    };
  }, [itemCount]);

  const scrollMedia = (direction: number) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    glide().stop();
    markExplored();
    scrollRailByPage(scroller, direction, 0.78);
  };

  /**
   * Sideways intent only. A vertical wheel gesture over the gallery must keep
   * scrolling the page, or the rail becomes a trap you have to steer around.
   */
  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    const sideways = event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY);
    if (!sideways) return;

    glide().stop();
    markExplored();
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    // Clips no longer carry native controls, so they drag like any other card.
    // Only the play/pause button needs to keep its own pointer behaviour.
    if (event.target instanceof Element && event.target.closest("a, button")) {
      return;
    }

    const scroller = scrollerRef.current;
    if (!scroller) return;

    pointerStartRef.current = {
      x: event.clientX,
      scrollLeft: scroller.scrollLeft,
    };
    draggedRef.current = false;
    glide().start(event.clientX, event.timeStamp);
    markExplored();
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.classList.add("is-dragging");
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = pointerStartRef.current;
    const scroller = scrollerRef.current;
    if (!start || !scroller) return;

    const distance = event.clientX - start.x;
    if (!draggedRef.current && Math.abs(distance) < 6) return;

    draggedRef.current = true;
    event.preventDefault();
    scroller.scrollLeft = start.scrollLeft - distance;
    glide().track(event.clientX, event.timeStamp);
  };

  const finishPointerDrag = (event: PointerEvent<HTMLDivElement>) => {
    const wasDragging = pointerStartRef.current !== null;
    pointerStartRef.current = null;
    event.currentTarget.classList.remove("is-dragging");
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (wasDragging && draggedRef.current) glide().release();
  };

  const handleClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!draggedRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    draggedRef.current = false;
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      markExplored();
      scrollMedia(1);
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      markExplored();
      scrollMedia(-1);
    }
  };

  return (
    <div className="media-rail-window">
      <div
        ref={scrollerRef}
        tabIndex={0}
        role="region"
        aria-label="Additional photos and videos. Swipe, drag, or use the arrow keys to move sideways."
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointerDrag}
        onPointerCancel={finishPointerDrag}
        onClickCapture={handleClickCapture}
        onKeyDown={handleKeyDown}
        onDragStart={preventNativeDrag}
        className="fun-scroller"
      >
        {children}
      </div>

      <div className="fun-nav" aria-label="Additional media navigation">
        <button
          ref={backButtonRef}
          type="button"
          className="fun-nav-button"
          aria-label="Show earlier photos and videos"
          aria-disabled="true"
          data-disabled="true"
          onClick={() => scrollMedia(-1)}
        >
          {/* Drawn, not typed. These were arrow characters, and at some point they were
              written as UTF-8 and read back as Latin-1, so both buttons rendered a
              pair of accented letters instead of an arrow — a mistake that survives
              a diff review and only shows up on screen. A path cannot be
              double-encoded. */}
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M15 5l-7 7 7 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          ref={forwardButtonRef}
          type="button"
          className="fun-nav-button"
          aria-label="Show later photos and videos"
          aria-disabled="false"
          onClick={() => scrollMedia(1)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M9 5l7 7-7 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function ProjectFocusManager() {
  useEffect(() => {
    const projects = Array.from(
      document.querySelectorAll<HTMLElement>("[data-project-section]"),
    );
    if (!projects.length) return;

    const root = document.documentElement;
    const ratios = new Map<HTMLElement, number>();
    projects.forEach((project) => ratios.set(project, 0));
    root.classList.add("has-project-focus");

    // Progress trail across the top of the page. The transform is written straight
    // onto the trail element: setting a custom property on :root instead
    // invalidates the computed style of every node in the document, and doing that
    // on each scroll frame made wheel scrolling stutter.
    const trail = document.querySelector<HTMLElement>(".page-trail span");
    let progressFrame = 0;
    const writeProgress = () => {
      progressFrame = 0;
      if (!trail) return;

      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? window.scrollY / scrollable : 0;
      trail.style.transform = `scaleX(${Math.max(0, Math.min(1, progress))})`;
    };
    const requestProgress = () => {
      if (progressFrame) return;
      progressFrame = window.requestAnimationFrame(writeProgress);
    };

    // Accents are fixed per theme, so they are read once instead of on every
    // focus change. Each read forces a style recalculation.
    const accents = new Map<HTMLElement, string>();
    projects.forEach((project) => {
      const accent = getComputedStyle(project)
        .getPropertyValue("--project-accent")
        .trim();
      if (accent) accents.set(project, accent);
    });

    /**
     * Picks the project the viewer is standing in: mostly-visible and closest to
     * the middle of the screen. One pass with one box measurement per project --
     * the previous reduce measured the running best again on every comparison,
     * forcing a layout per step.
     */
    const updateFocus = () => {
      const viewportCenter = window.innerHeight * 0.48;
      let active: HTMLElement | null = null;
      let bestScore = -Infinity;

      projects.forEach((project) => {
        const ratio = ratios.get(project) ?? 0;
        if (ratio <= 0) return;

        const rect = project.getBoundingClientRect();
        const score =
          ratio * 2 -
          Math.abs(rect.top + rect.height / 2 - viewportCenter) /
            window.innerHeight;
        if (score > bestScore) {
          bestScore = score;
          active = project;
        }
      });

      if (!active) return;
      const activeIndex = projects.indexOf(active);

      projects.forEach((project, index) => {
        project.classList.toggle("is-active", project === active);
        project.classList.toggle("is-before-active", index < activeIndex);
        project.classList.toggle("is-after-active", index > activeIndex);
      });

      // The trail borrows the colour of whichever project you are standing in.
      const accent = accents.get(active);
      if (accent && trail) trail.style.setProperty("--trail-accent", accent);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          ratios.set(entry.target as HTMLElement, entry.intersectionRatio);
        });
        updateFocus();
      },
      {
        rootMargin: "-8% 0px -12%",
        threshold: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1],
      },
    );

    projects.forEach((project) => observer.observe(project));

    /**
     * The arrival trigger.
     *
     * Separate from the focus observer above, and set exactly once per section:
     * `is-seen` goes on the first time a section is meaningfully in view and is
     * never taken off. Reusing `is-active` for this was the obvious shortcut and is
     * wrong — `is-active` toggles as you scroll, so every heading and every fact
     * would re-run its entrance each time you passed, which stops reading as an
     * arrival and starts reading as a flinch.
     *
     * `unobserve` on first sight rather than a flag, so the browser stops doing
     * work for sections that have already played.
     */
    const arrivals = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-seen");
          arrivals.unobserve(entry.target);
        });
      },
      // A little into the viewport, so the entrance is not already over by the time
      // the section is somewhere the visitor is looking.
      { rootMargin: "0px 0px -18%", threshold: 0.08 },
    );
    projects.forEach((project) => arrivals.observe(project));

    /* The same one-shot arrival for anything outside the project run that wants
       it — currently just the closing section. It is a server component several
       levels up from here, so it opts in with an attribute rather than by becoming
       a client component for one class name. */
    document
      .querySelectorAll<HTMLElement>("[data-arrive]")
      .forEach((element) => arrivals.observe(element));

    writeProgress();
    window.addEventListener("scroll", requestProgress, { passive: true });
    window.addEventListener("resize", requestProgress);

    // --- Keyboard navigation -------------------------------------------------
    const jumpTo = (element: Element | null | undefined) => {
      if (!element) return;
      element.scrollIntoView({ block: "start", behavior: "smooth" });
    };

    const handleShortcut = (event: globalThis.KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      // Never steal a key from a field, or from the rails' own arrow handling.
      const target = event.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        (target && /^(input|textarea|select)$/i.test(target.tagName))
      ) {
        return;
      }

      const current = projects.findIndex((project) =>
        project.classList.contains("is-active"),
      );

      switch (event.key) {
        case "j":
        case "J":
          event.preventDefault();
          jumpTo(projects[Math.min(projects.length - 1, current + 1)]);
          break;
        case "k":
        case "K":
          event.preventDefault();
          jumpTo(projects[Math.max(0, current - 1)]);
          break;
        case "g":
        case "G":
          event.preventDefault();
          jumpTo(document.querySelector(".fun-section"));
          break;
        case "t":
        case "T":
          event.preventDefault();
          window.scrollTo({ top: 0, behavior: "smooth" });
          break;
        case "?":
          event.preventDefault();
          root.classList.toggle("shows-shortcuts");
          break;
        case "Escape":
          root.classList.remove("shows-shortcuts");
          break;
        default:
          break;
      }
    };

    document.addEventListener("keydown", handleShortcut);

    return () => {
      observer.disconnect();
      arrivals.disconnect();
      root.classList.remove("has-project-focus");
      root.classList.remove("shows-shortcuts");
      window.removeEventListener("scroll", requestProgress);
      window.removeEventListener("resize", requestProgress);
      document.removeEventListener("keydown", handleShortcut);
      if (progressFrame) window.cancelAnimationFrame(progressFrame);
      trail?.style.removeProperty("transform");
      trail?.style.removeProperty("--trail-accent");
    };
  }, []);

  return null;
}
