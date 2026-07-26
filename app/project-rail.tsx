"use client";

import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type WheelEvent,
} from "react";

type ProjectRailProps = {
  children: ReactNode;
  portraitLayers?: ReactNode;
  projectId: string;
  projectName: string;
};

type CardGeometry = {
  element: HTMLElement;
  index: number;
  isPortraitProxy: boolean;
  left: number;
  width: number;
};

type CardMotion = CardGeometry & {
  imageTilt: number;
  imageX: number;
  imageY: number;
  railScale: number;
  railSkew: number;
  railTurn: number;
  railX: number;
  railY: number;
};

const visibilityThresholds = [0, 0.15, 0.22, 0.5, 0.85, 1];

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
function createGlide(
  getScroller: () => HTMLDivElement | null,
  prefersReducedMotion: () => boolean,
): Glide {
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
      if (!scroller || prefersReducedMotion()) return;
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

export function ProjectRail({
  children,
  portraitLayers,
  projectId,
  projectName,
}: ProjectRailProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const forwardButtonRef = useRef<HTMLButtonElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const pointerStartRef = useRef<{ x: number; scrollLeft: number } | null>(null);
  const draggedRef = useRef(false);
  const reduceMotionRef = useRef(false);
  const glideRef = useRef<Glide | null>(null);

  const glide = () =>
    (glideRef.current ??= createGlide(
      () => scrollerRef.current,
      () => reduceMotionRef.current,
    ));

  useEffect(() => {
    const scroller = scrollerRef.current;
    const project = scroller?.closest<HTMLElement>("[data-project-section]");
    const track = scroller?.querySelector<HTMLElement>(".project-track");
    if (!scroller || !project || !track) return;

    let cards: CardGeometry[] = [];
    let frame = 0;
    let initialized = false;
    let maxScroll = 0;
    let needsMeasurement = true;
    let projectOffsetX = 0;
    let viewportWidth = 1;
    let resizeObserver: ResizeObserver | undefined;
    let visibilityObserver: IntersectionObserver | undefined;

    const portraitByStep = new Map<number, HTMLElement>();
    project
      .querySelectorAll<HTMLElement>("[data-portrait-step]")
      .forEach((portrait) => {
        portraitByStep.set(Number(portrait.dataset.portraitStep), portrait);
      });

    const measure = () => {
      const scrollerRect = scroller.getBoundingClientRect();
      const projectRect = project.getBoundingClientRect();
      const elements = Array.from(
        track.querySelectorAll<HTMLElement>("[data-step]"),
      );

      viewportWidth = Math.max(scroller.clientWidth, 1);
      maxScroll = Math.max(0, scroller.scrollWidth - viewportWidth);
      projectOffsetX = scrollerRect.left - projectRect.left;
      cards = elements.map((element) => ({
        element,
        index: Number(element.dataset.step),
        isPortraitProxy: element.classList.contains(
          "scene-card--portrait-proxy",
        ),
        left: element.offsetLeft,
        width: element.offsetWidth,
      }));
      needsMeasurement = false;
    };

    const update = () => {
      frame = 0;
      if (!initialized) return;
      if (needsMeasurement) measure();

      const scrollLeft = Math.max(
        0,
        Math.min(maxScroll, scroller.scrollLeft),
      );
      const progress = maxScroll === 0 ? 0 : scrollLeft / maxScroll;
      const viewportCenter = viewportWidth / 2;
      const reduceMotion = reduceMotionRef.current;

      // Calculate every card from cached layout data before writing any styles.
      const motion: CardMotion[] = cards.map((card, cardIndex) => {
        const layoutCenter = card.left + card.width / 2 - scrollLeft;
        const normalized = Math.max(
          -1.35,
          Math.min(
            1.35,
            (layoutCenter - viewportCenter) / (viewportWidth * 0.72),
          ),
        );
        const arc = reduceMotion ? 0 : Math.sin(normalized * 1.55) * -22;
        const wobble = reduceMotion
          ? 0
          : Math.sin(normalized * 2.8 + cardIndex * 0.7) * 6;

        return {
          ...card,
          imageTilt: reduceMotion ? 0 : normalized * -1.4,
          imageX: reduceMotion ? 0 : normalized * -26,
          imageY: reduceMotion
            ? 0
            : Math.cos(normalized * 2.4 + cardIndex) * 8,
          railScale: reduceMotion
            ? 1
            : 1 - Math.min(0.075, Math.abs(normalized) * 0.045),
          railSkew: reduceMotion ? 0 : normalized * -2.4,
          railTurn: reduceMotion ? 0 : normalized * -5.5 + wobble * 0.22,
          railX: reduceMotion
            ? 0
            : Math.sin(normalized * 2.2 + cardIndex) * 11,
          railY: arc + wobble,
        };
      });

      project.style.setProperty(
        "--project-scroll-shift",
        `${reduceMotion ? 0 : progress * -180}px`,
      );
      progressRef.current?.style.setProperty(
        "--project-progress",
        String(progress * 0.93 + 0.07),
      );

      // Drives the reveal of the arrow that points at the "Open project" link.
      project.classList.toggle(
        "is-rail-end",
        maxScroll <= 2 || scrollLeft >= maxScroll - 4,
      );

      if (backButtonRef.current) {
        backButtonRef.current.disabled = scrollLeft <= 2;
      }
      if (forwardButtonRef.current) {
        forwardButtonRef.current.disabled = scrollLeft >= maxScroll - 2;
      }

      motion.forEach((card) => {
        if (card.isPortraitProxy) {
          const portrait = portraitByStep.get(card.index);
          if (!portrait) return;

          portrait.style.setProperty(
            "--rail-x",
            `${projectOffsetX + card.left - scrollLeft}px`,
          );
          portrait.style.setProperty("--rail-y", `${card.railY * 0.52}px`);
          portrait.style.setProperty(
            "--rail-turn",
            `${card.railTurn * 0.72}deg`,
          );
          portrait.style.setProperty(
            "--rail-scale",
            String(
              reduceMotion
                ? 1
                : 1 -
                    Math.min(
                      0.045,
                      Math.abs(
                        (card.left + card.width / 2 - scrollLeft -
                          viewportCenter) /
                          (viewportWidth * 0.72),
                      ) * 0.028,
                    ),
            ),
          );
          portrait.classList.add("is-positioned");
          return;
        }

        card.element.style.setProperty("--rail-x", `${card.railX}px`);
        card.element.style.setProperty("--rail-y", `${card.railY}px`);
        card.element.style.setProperty(
          "--rail-turn",
          `${card.railTurn}deg`,
        );
        card.element.style.setProperty(
          "--rail-scale",
          String(card.railScale),
        );
        card.element.style.setProperty(
          "--rail-skew",
          `${card.railSkew}deg`,
        );
        card.element.style.setProperty(
          "--image-shift-x",
          `${card.imageX}px`,
        );
        card.element.style.setProperty(
          "--image-shift-y",
          `${card.imageY}px`,
        );
        card.element.style.setProperty(
          "--image-tilt",
          `${card.imageTilt}deg`,
        );
      });
    };

    const requestUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    const requestMeasurement = () => {
      needsMeasurement = true;
      requestUpdate();
    };

    const initialize = () => {
      if (initialized) return;
      initialized = true;

      // Native lazy loading can be overly conservative inside a transformed,
      // horizontally scrolling rail. Once the project approaches the viewport,
      // start decoding its original PNG/JPEG screenshots before they are revealed.
      project
        .querySelectorAll<HTMLImageElement>("img[data-project-image]")
        .forEach((image) => {
          image.loading = "eager";
          image.fetchPriority = "auto";
          if (!image.complete) void image.decode().catch(() => {});
        });

      visibilityObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const card = entry.target as HTMLElement;
            const index = Number(card.dataset.step);
            const visibleWidth = entry.intersectionRect.width;
            const visible =
              entry.isIntersecting &&
              visibleWidth > Math.min(entry.boundingClientRect.width * 0.22, 140);

            card.classList.toggle("is-visible", visible);
            portraitByStep.get(index)?.classList.toggle("is-visible", visible);

            const video = card.querySelector<HTMLVideoElement>("video");
            if (video) {
              if (visible && !reduceMotionRef.current) {
                void video.play().catch(() => {});
              } else {
                video.pause();
              }
            }
          });
        },
        {
          root: scroller,
          threshold: visibilityThresholds,
        },
      );

      track
        .querySelectorAll<HTMLElement>("[data-step]")
        .forEach((card) => visibilityObserver?.observe(card));

      resizeObserver = new ResizeObserver(requestMeasurement);
      resizeObserver.observe(scroller);
      resizeObserver.observe(track);
      scroller.addEventListener("scroll", requestUpdate, { passive: true });
      requestMeasurement();
    };

    const proximityObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          initialize();
          proximityObserver.disconnect();
        }
      },
      { rootMargin: "25% 0px" },
    );
    proximityObserver.observe(project);

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleMotionPreference = () => {
      reduceMotionRef.current = motionQuery.matches;
      requestUpdate();
    };
    handleMotionPreference();
    motionQuery.addEventListener("change", handleMotionPreference);

    return () => {
      proximityObserver.disconnect();
      visibilityObserver?.disconnect();
      resizeObserver?.disconnect();
      scroller.removeEventListener("scroll", requestUpdate);
      motionQuery.removeEventListener("change", handleMotionPreference);
      if (frame) window.cancelAnimationFrame(frame);
      glideRef.current?.stop();
    };
  }, []);

  const scrollProject = (direction: number) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    glide().stop();
    scroller.scrollBy({
      left: direction * scroller.clientWidth * 0.72,
      behavior: reduceMotionRef.current ? "auto" : "smooth",
    });
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!event.shiftKey) return;

    const scroller = scrollerRef.current;
    if (!scroller) return;

    glide().stop();

    const delta =
      Math.abs(event.deltaX) > Math.abs(event.deltaY)
        ? event.deltaX
        : event.deltaY;
    if (!delta) return;

    event.preventDefault();
    const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    scroller.scrollLeft = Math.max(
      0,
      Math.min(maxScroll, scroller.scrollLeft + delta),
    );
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (
      event.target instanceof Element &&
      event.target.closest("a, button, video")
    ) {
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

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      scrollProject(1);
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      scrollProject(-1);
    }
  };

  const handleClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!draggedRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    draggedRef.current = false;
  };

  return (
    <>
      <div className="project-window">
        <div
          ref={scrollerRef}
          tabIndex={0}
          role="region"
          aria-label={`${projectName} screenshots. Drag sideways, hold Shift while scrolling, or use the left and right arrow keys.`}
          aria-describedby={`${projectId}-scroll-help`}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishPointerDrag}
          onPointerCancel={finishPointerDrag}
          onClickCapture={handleClickCapture}
          onKeyDown={handleKeyDown}
          className="project-scroller"
        >
          {children}
        </div>

        <p className="project-scroll-help" id={`${projectId}-scroll-help`}>
          <span>Drag sideways</span>
          <span aria-hidden="true">·</span>
          <span>Shift + scroll</span>
          <span aria-hidden="true">·</span>
          <kbd>← →</kbd>
        </p>

        <div
          className="project-nav"
          aria-label={`${projectName} screenshot navigation`}
        >
          <button
            ref={backButtonRef}
            type="button"
            className="project-nav-button"
            aria-label={`Show earlier ${projectName} screenshots`}
            disabled
            onClick={() => scrollProject(-1)}
          >
            <span aria-hidden="true">←</span>
          </button>
          <button
            ref={forwardButtonRef}
            type="button"
            className="project-nav-button"
            aria-label={`Show later ${projectName} screenshots`}
            onClick={() => scrollProject(1)}
          >
            <span aria-hidden="true">→</span>
          </button>
        </div>

        <div className="project-progress" aria-hidden="true">
          <span ref={progressRef} />
        </div>
      </div>

      {portraitLayers}
    </>
  );
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

  const glide = () =>
    (glideRef.current ??= createGlide(
      () => scrollerRef.current,
      () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    ));

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
      if (backButtonRef.current) {
        backButtonRef.current.disabled = scroller.scrollLeft <= 2;
      }
      if (forwardButtonRef.current) {
        forwardButtonRef.current.disabled = scroller.scrollLeft >= maxScroll - 2;
      }
    };

    syncControls();
    scroller.addEventListener("scroll", syncControls, { passive: true });
    window.addEventListener("resize", syncControls);

    return () => {
      scroller.removeEventListener("scroll", syncControls);
      window.removeEventListener("resize", syncControls);
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

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
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
      const shouldPlay =
        onScreen.has(clip) && !heldByViewer.has(clip) && !motionQuery.matches;

      if (shouldPlay) void clip.play().catch(() => {});
      else clip.pause();
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

    const handleMotionPreference = () => clips.forEach(settle);

    clips.forEach((clip) => {
      approachObserver.observe(clip);
      playObserver.observe(clip);
      clip.addEventListener("play", () => syncToggle(clip));
      clip.addEventListener("pause", () => syncToggle(clip));
      syncToggle(clip);
    });

    scroller.addEventListener("click", handleToggle);
    motionQuery.addEventListener("change", handleMotionPreference);

    return () => {
      approachObserver.disconnect();
      playObserver.disconnect();
      scroller.removeEventListener("click", handleToggle);
      motionQuery.removeEventListener("change", handleMotionPreference);
      clips.forEach((clip) => clip.pause());
    };
  }, [itemCount]);

  const scrollMedia = (direction: number) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    glide().stop();
    scroller.scrollBy({
      left: direction * scroller.clientWidth * 0.78,
      behavior: "smooth",
    });
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!event.shiftKey) return;

    const scroller = scrollerRef.current;
    if (!scroller) return;

    const delta =
      Math.abs(event.deltaX) > Math.abs(event.deltaY)
        ? event.deltaX
        : event.deltaY;
    if (!delta) return;

    event.preventDefault();
    glide().stop();
    scroller.scrollLeft += delta;
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
      scrollMedia(1);
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
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
          disabled
          onClick={() => scrollMedia(-1)}
        >
          <span aria-hidden="true">←</span>
        </button>
        <button
          ref={forwardButtonRef}
          type="button"
          className="fun-nav-button"
          aria-label="Show later photos and videos"
          onClick={() => scrollMedia(1)}
        >
          <span aria-hidden="true">→</span>
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

    // Progress trail across the top of the page. Written as a custom property so
    // the paint is a single compositor-friendly scaleX.
    let progressFrame = 0;
    const writeProgress = () => {
      progressFrame = 0;
      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? window.scrollY / scrollable : 0;
      root.style.setProperty(
        "--page-progress",
        String(Math.max(0, Math.min(1, progress))),
      );
    };
    const requestProgress = () => {
      if (progressFrame) return;
      progressFrame = window.requestAnimationFrame(writeProgress);
    };

    const updateFocus = () => {
      const visible = projects.filter((project) => (ratios.get(project) ?? 0) > 0);
      if (!visible.length) return;

      const viewportCenter = window.innerHeight * 0.48;
      const active = visible.reduce((best, project) => {
        const rect = project.getBoundingClientRect();
        const bestRect = best.getBoundingClientRect();
        const score =
          (ratios.get(project) ?? 0) * 2 -
          Math.abs(rect.top + rect.height / 2 - viewportCenter) /
            window.innerHeight;
        const bestScore =
          (ratios.get(best) ?? 0) * 2 -
          Math.abs(bestRect.top + bestRect.height / 2 - viewportCenter) /
            window.innerHeight;
        return score > bestScore ? project : best;
      });
      const activeIndex = projects.indexOf(active);

      projects.forEach((project, index) => {
        project.classList.toggle("is-active", project === active);
        project.classList.toggle("is-before-active", index < activeIndex);
        project.classList.toggle("is-after-active", index > activeIndex);
      });

      // The trail borrows the colour of whichever project you are standing in.
      const accent = getComputedStyle(active)
        .getPropertyValue("--project-accent")
        .trim();
      if (accent) root.style.setProperty("--trail-accent", accent);
    };

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

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

    writeProgress();
    window.addEventListener("scroll", requestProgress, { passive: true });
    window.addEventListener("resize", requestProgress);

    // --- Keyboard navigation -------------------------------------------------
    const jumpTo = (element: Element | null | undefined) => {
      if (!element) return;
      element.scrollIntoView({
        block: "start",
        behavior: reducedMotion.matches ? "auto" : "smooth",
      });
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
          window.scrollTo({
            top: 0,
            behavior: reducedMotion.matches ? "auto" : "smooth",
          });
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

    // --- Closing line --------------------------------------------------------
    const endingButton = document.querySelector<HTMLElement>("[data-ending-line]");
    const endingText = endingButton?.querySelector<HTMLElement>("[data-ending-text]");
    let endingIndex = 0;

    const cycleEnding = () => {
      if (!endingButton || !endingText) return;

      let lines: string[] = [];
      try {
        lines = JSON.parse(endingButton.dataset.lines ?? "[]");
      } catch {
        return;
      }
      if (lines.length < 2) return;

      endingIndex = (endingIndex + 1) % lines.length;
      endingText.textContent = lines[endingIndex];
      endingButton.classList.remove("is-swapping");
      // Reflow so the animation restarts on every click.
      void endingButton.offsetWidth;
      endingButton.classList.add("is-swapping");
    };

    document.addEventListener("keydown", handleShortcut);
    endingButton?.addEventListener("click", cycleEnding);

    return () => {
      observer.disconnect();
      root.classList.remove("has-project-focus");
      root.classList.remove("shows-shortcuts");
      window.removeEventListener("scroll", requestProgress);
      window.removeEventListener("resize", requestProgress);
      document.removeEventListener("keydown", handleShortcut);
      endingButton?.removeEventListener("click", cycleEnding);
      if (progressFrame) window.cancelAnimationFrame(progressFrame);
      root.style.removeProperty("--page-progress");
      root.style.removeProperty("--trail-accent");
    };
  }, []);

  return null;
}
