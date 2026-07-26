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
    };
  }, []);

  const scrollProject = (direction: number) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    scroller.scrollBy({
      left: direction * scroller.clientWidth * 0.72,
      behavior: reduceMotionRef.current ? "auto" : "smooth",
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
  };

  const finishPointerDrag = (event: PointerEvent<HTMLDivElement>) => {
    pointerStartRef.current = null;
    event.currentTarget.classList.remove("is-dragging");
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
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
      scrollProject(1);
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      scrollProject(-1);
    }
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
    };
  }, [itemCount]);

  const scrollMedia = (direction: number) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

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
    scroller.scrollLeft += delta;
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (
      (event.target instanceof Element && event.target.closest("a, button")) ||
      event.target instanceof HTMLVideoElement
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
  };

  const finishPointerDrag = (event: PointerEvent<HTMLDivElement>) => {
    pointerStartRef.current = null;
    event.currentTarget.classList.remove("is-dragging");
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
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
    return () => {
      observer.disconnect();
      root.classList.remove("has-project-focus");
    };
  }, []);

  return null;
}
