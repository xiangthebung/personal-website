"use client";

import { useEffect, useRef, useState } from "react";

type ProjectStep = {
  title: string;
  text: string;
  image: string;
  alt: string;
  fit?: "cover" | "contain";
  surface?: "light" | "dark";
  position?: string;
  cardRatio?: string;
  display?: "portrait-popout";
  portraitRatio?: string;
  pointer?: {
    x: string;
    y: string;
    length: string;
    angle: string;
  };
  calloutSide?: "left" | "right";
};

type Project = {
  id: string;
  number: string;
  name: string;
  platform: string;
  status?: string;
  mode?: string;
  headline: string;
  why: string;
  theme: "paper" | "mint" | "black" | "white" | "navy" | "forest";
  source: string;
  live?: string;
  steps: ProjectStep[];
};

type PortraitMotion = {
  left: number;
  y: number;
  rotate: number;
  scale: number;
};

const projectData: Project[] = [
  {
    id: "blokamine",
    number: "01",
    name: "blokamine",
    platform: "Chrome extension",
    status: "Work in progress",
    mode: "Monochrome mode",
    headline: "Make social media less rewarding.",
    why: "Remove the parts that keep you scrolling.",
    theme: "paper",
    source: "https://github.com/xiangthebung/blokamine",
    steps: [
      {
        title: "Make the feed less interesting.",
        text: "Keep the sites. Remove colour, numbers, and other attention triggers.",
        image: "/projects/blokamine.png",
        alt: "YouTube with desaturated, upside-down media",
        fit: "contain",
        cardRatio: "1600 / 934",
        surface: "dark",
        pointer: { x: "56%", y: "48%", length: "22%", angle: "158deg" },
      },
      {
        title: "Hide the reward signals.",
        text: "Remove likes, views, follower counts, and notification badges.",
        image: "/projects/blokamine-settings.png",
        alt: "blokamine core experience settings",
        fit: "contain",
        cardRatio: "1462 / 1212",
        surface: "light",
        pointer: { x: "88%", y: "22%", length: "26%", angle: "166deg" },
      },
      {
        title: "Choose what to remove.",
        text: "Hide Reels, comments, Explore, suggested posts, and Shorts per site.",
        image: "/projects/blokamine-sites.png",
        alt: "blokamine site-specific controls",
        fit: "contain",
        cardRatio: "1350 / 1296",
        surface: "light",
        pointer: { x: "58%", y: "58%", length: "24%", angle: "158deg" },
      },
      {
        title: "Turn down the rest.",
        text: "Blur or remove media, or flip the page upside down.",
        image: "/projects/blokamine-instagram.png",
        alt: "Instagram with media turned upside down and desaturated",
        fit: "contain",
        cardRatio: "1600 / 900",
        surface: "dark",
        pointer: { x: "52%", y: "48%", length: "22%", angle: "-14deg" },
      },
    ],
  },
  {
    id: "grt-next-bus",
    number: "02",
    name: "GRT Next Bus",
    platform: "Chrome extension",
    headline: "See the next bus without opening Google Maps.",
    why: "Faster than searching Google Maps for the same stop.",
    theme: "mint",
    source: "https://github.com/xiangthebung/grt-bus-time",
    steps: [
      {
        title: "See the next departures.",
        text: "Saved stops show live or scheduled times on the front page.",
        image: "/projects/grt-next-bus.png",
        alt: "GRT Next Bus saved stops and departure times",
        fit: "contain",
        surface: "light",
        display: "portrait-popout",
        portraitRatio: "842 / 1200",
        pointer: { x: "54%", y: "43%", length: "52%", angle: "158deg" },
      },
      {
        title: "Save a stop once.",
        text: "Choose a route, direction, and stop.",
        image: "/projects/grt-add-stop.png",
        alt: "GRT Next Bus add a stop form",
        fit: "contain",
        surface: "light",
        display: "portrait-popout",
        portraitRatio: "830 / 720",
        pointer: { x: "50%", y: "72%", length: "48%", angle: "-14deg" },
      },
      {
        title: "Use Pro for alerts.",
        text: "Add closest-stop sorting, countdowns, and alerts.",
        image: "/projects/grt-pro.png",
        alt: "GRT Next Bus Pro countdown and alert controls",
        fit: "contain",
        surface: "light",
        display: "portrait-popout",
        portraitRatio: "842 / 1196",
        pointer: { x: "85%", y: "8%", length: "52%", angle: "156deg" },
      },
      {
        title: "Leave when the alert arrives.",
        text: "Get a Chrome notification when the bus is close.",
        image: "/projects/grt-alert.png",
        alt: "Chrome notification for an arriving GRT bus",
        fit: "contain",
        cardRatio: "760 / 188",
        surface: "dark",
        pointer: { x: "52%", y: "39%", length: "22%", angle: "-14deg" },
      },
    ],
  },
  {
    id: "pagepack",
    number: "03",
    name: "PagePack",
    platform: "Chrome extension",
    headline: "Save websites. Read them offline.",
    why: "Useful when you have no mobile data.",
    theme: "black",
    source: "https://github.com/xiangthebung/pagepack-extension",
    steps: [
      {
        title: "Save one page or a whole browse.",
        text: "Keep one page or collect pages as you browse.",
        image: "/projects/pagepack.png",
        alt: "PagePack save page and browsing journey options",
        fit: "contain",
        surface: "dark",
        display: "portrait-popout",
        portraitRatio: "826 / 1304",
        pointer: { x: "54%", y: "43%", length: "52%", angle: "158deg" },
      },
      {
        title: "Choose what to save.",
        text: "Follow same-site links, keep supported scripts, and save to a folder.",
        image: "/projects/pagepack-options.png",
        alt: "PagePack link depth and script options",
        fit: "contain",
        surface: "dark",
        display: "portrait-popout",
        portraitRatio: "758 / 904",
        pointer: { x: "61%", y: "58%", length: "48%", angle: "-14deg" },
      },
      {
        title: "Keep a local library.",
        text: "Search saved pages and sort them into folders.",
        image: "/projects/pagepack-library.png",
        alt: "PagePack saved pages library",
        fit: "contain",
        surface: "dark",
        display: "portrait-popout",
        portraitRatio: "760 / 1194",
        pointer: { x: "53%", y: "52%", length: "52%", angle: "158deg" },
      },
      {
        title: "Save packs, not just pages.",
        text: "Open any saved link and read the pack without a connection.",
        image: "/projects/pagepack-folder.png",
        alt: "A PagePack folder containing a 57-page pack",
        fit: "contain",
        surface: "dark",
        display: "portrait-popout",
        portraitRatio: "752 / 1186",
        pointer: { x: "52%", y: "46%", length: "50%", angle: "-14deg" },
      },
      {
        title: "Keep the original look.",
        text: "Styles, images, fonts, and supported media come along. DRM video, live streams, and heavily scripted pages may not.",
        image: "/projects/pagepack-reader.png",
        alt: "A full website open inside the PagePack offline reader",
        fit: "contain",
        cardRatio: "1600 / 1002",
        surface: "light",
        pointer: { x: "56%", y: "54%", length: "22%", angle: "158deg" },
      },
    ],
  },
  {
    id: "pdf-explainer",
    number: "04",
    name: "PDF Slide Explainer",
    platform: "Web app",
    status: "Work in progress",
    headline: "Explain slides in the same window.",
    why: "Keep notes, chat, and practice beside the deck.",
    theme: "white",
    source: "https://github.com/xiangthebung/pdf-explainer",
    live: "https://pdf-explainer.ai.studio/",
    steps: [
      {
        title: "Read notes beside each slide.",
        text: "Upload a lecture PDF and get an explanation without shrinking the deck.",
        image: "/projects/pdf-explainer.png",
        alt: "PDF Slide Explainer showing notes beside a lecture slide",
        fit: "contain",
        cardRatio: "1600 / 972",
        surface: "dark",
        pointer: { x: "81%", y: "53%", length: "28%", angle: "150deg" },
      },
      {
        title: "Ask about what’s on screen.",
        text: "Use slide-specific chat, notes, analogies, and examples.",
        image: "/projects/pdf-explainer-feature.png",
        alt: "PDF Slide Explainer explaining feature uncertainty",
        fit: "contain",
        cardRatio: "1600 / 922",
        surface: "light",
        pointer: { x: "82%", y: "52%", length: "22%", angle: "-16deg" },
      },
      {
        title: "Practice from the deck.",
        text: "Generate matching, fill-in-the-blank, practice problems, and quizzes. Requires a Gemini API key.",
        image: "/projects/pdf-explainer-match.png",
        alt: "Matching activity in PDF Slide Explainer",
        fit: "contain",
        cardRatio: "942 / 808",
        surface: "dark",
        pointer: { x: "53%", y: "57%", length: "22%", angle: "158deg" },
      },
    ],
  },
  {
    id: "choir-practice",
    number: "05",
    name: "Choir Practice Tool",
    platform: "Web app",
    headline: "Practice one choir part in the browser.",
    why: "Play the full score, isolate your part, and check pitch.",
    theme: "navy",
    source: "https://github.com/xiangthebung/satb-practice",
    live: "https://satb-practice.xiangli3625.workers.dev/",
    steps: [
      {
        title: "Play the full score.",
        text: "Open an uncompressed MusicXML file and hear every part.",
        image: "/projects/choir-overview.png",
        alt: "Choir Practice Tool playing a six-part score",
        fit: "contain",
        cardRatio: "1600 / 919",
        surface: "dark",
        pointer: { x: "65%", y: "48%", length: "24%", angle: "158deg" },
      },
      {
        title: "Bring out your part.",
        text: "Choose a section and lower the others.",
        image: "/projects/choir-mix.png",
        alt: "Choir Practice Tool part mixer and volume presets",
        fit: "contain",
        surface: "dark",
        display: "portrait-popout",
        portraitRatio: "562 / 1994",
        calloutSide: "right",
        pointer: { x: "19%", y: "56%", length: "78%", angle: "-10deg" },
      },
      {
        title: "Check your pitch.",
        text: "Use the microphone to see pitch over the score.",
        image: "/projects/choir-pitch.png",
        alt: "Choir Practice Tool showing live pitch guidance",
        fit: "contain",
        cardRatio: "1600 / 921",
        surface: "dark",
        pointer: { x: "43%", y: "66%", length: "18%", angle: "168deg" },
      },
      {
        title: "Focus on one line.",
        text: "Dim the other sections while you practice.",
        image: "/projects/choir-focus.png",
        alt: "Choir Practice Tool with the tenor section in focus",
        fit: "contain",
        cardRatio: "1600 / 923",
        surface: "dark",
        pointer: { x: "48%", y: "65%", length: "31%", angle: "-12deg" },
      },
      {
        title: "Slow down and loop passages.",
        text: "Use tempo control, metronome, repeat, passage practice, and WAV export. Compressed .mxl files are not supported.",
        image: "/projects/choir-practice.png",
        alt: "Choir Practice Tool playing a four-part score",
        fit: "contain",
        cardRatio: "1600 / 922",
        surface: "dark",
        pointer: { x: "50%", y: "92%", length: "23%", angle: "-148deg" },
      },
    ],
  },
  {
    id: "zen-n-back",
    number: "06",
    name: "Zen N-Back",
    platform: "Web game",
    headline: "Play dual or triple N-back.",
    why: "Set the difficulty, learn the rules, and play a short session.",
    theme: "forest",
    source: "https://github.com/xiangthebung/n-back",
    live: "https://n-back.ai.studio/",
    steps: [
      {
        title: "Set the difficulty.",
        text: "Choose dual or triple N-back, memory depth, speed, and optional help.",
        image: "/projects/zen-n-back.png",
        alt: "Zen N-Back setup screen",
        fit: "contain",
        cardRatio: "1600 / 1467",
        surface: "dark",
        pointer: { x: "50%", y: "35%", length: "22%", angle: "158deg" },
      },
      {
        title: "Learn what counts.",
        text: "See how position, letters, and colour count as matches.",
        image: "/projects/nback-tutorial.png",
        alt: "Zen N-Back tutorial explaining a dual match",
        fit: "contain",
        cardRatio: "1600 / 1527",
        surface: "dark",
        pointer: { x: "51%", y: "53%", length: "21%", angle: "-14deg" },
      },
      {
        title: "Play a short session.",
        text: "Use the buttons or keyboard, then check your stats. It’s a game, not a clinical test.",
        image: "/projects/nback-game.png",
        alt: "Zen N-Back game board",
        fit: "contain",
        cardRatio: "1600 / 1459",
        surface: "dark",
        pointer: { x: "52%", y: "48%", length: "22%", angle: "158deg" },
      },
    ],
  },
];

// Keep the monochrome blokamine section between two color-led projects so the
// change in visual language feels intentional when scrolling through the work.
const projects: Project[] = [
  projectData[1],
  projectData[0],
  projectData[2],
  projectData[3],
  projectData[4],
  projectData[5],
].map((project, index) => ({
  ...project,
  number: String(index + 1).padStart(2, "0"),
}));

const entranceStyles = [
  "orbit",
  "drop",
  "pop",
  "whip",
  "rise",
  "flip",
] as const;

const projectMotifs: Record<
  string,
  { label: string; mark: string }
> = {
  blokamine: { label: "colour off", mark: "B/W" },
  "grt-next-bus": { label: "next stop", mark: "●—●" },
  pagepack: { label: "saved offline", mark: "⇩" },
  "pdf-explainer": { label: "next slide", mark: "▱" },
  "choir-practice": { label: "follow along", mark: "♪" },
  "zen-n-back": { label: "next round", mark: "▦" },
};

const funMedia = [
  {
    kind: "image",
    src: "/fun/pan-fried-fish.jpg",
    label: "Photo / 01",
    title: "Dinner, mid-process",
    alt: "Two pieces of fish cooking in a cast-iron skillet",
  },
  {
    kind: "video",
    src: "/fun/clip-01.mp4",
    label: "Video / 02",
    title: "Clip 01",
    alt: "User-provided video clip 01",
  },
  {
    kind: "video",
    src: "/fun/clip-02.mp4",
    label: "Video / 03",
    title: "Clip 02",
    alt: "User-provided video clip 02",
  },
  {
    kind: "video",
    src: "/fun/clip-03.mp4",
    label: "Video / 04",
    title: "Clip 03",
    alt: "User-provided video clip 03",
  },
  {
    kind: "video",
    src: "/fun/human-flag-right-side.mp4",
    label: "Video / 05",
    title: "Human flag / right side",
    alt: "User-provided human flag video from the right side",
  },
  {
    kind: "video",
    src: "/fun/clip-04.mp4",
    label: "Video / 06",
    title: "Clip 04",
    alt: "User-provided video clip 04",
  },
  {
    kind: "image",
    src: "/fun/gym-map.png",
    label: "Photo / 07",
    title: "A route through the gym",
    alt: "Annotated gym floor plan with colored waypoints and a route from a you-are-here marker",
  },
] as const;

function ExternalArrow() {
  return (
    <span aria-hidden="true" className="external-arrow">
      ↗
    </span>
  );
}

function ProjectSection({ project }: { project: Project }) {
  const projectRef = useRef<HTMLElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pointerStartRef = useRef<{ x: number; scrollLeft: number } | null>(
    null,
  );
  const draggedRef = useRef(false);
  const [progress, setProgress] = useState(0);
  const [canScrollBack, setCanScrollBack] = useState(false);
  const [canScrollForward, setCanScrollForward] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [visibleSteps, setVisibleSteps] = useState<number[]>([0]);
  const [portraitMotion, setPortraitMotion] = useState<
    Record<number, PortraitMotion>
  >({});
  const portraitSteps = project.steps
    .map((step, index) => ({ step, index }))
    .filter(({ step }) => step.display === "portrait-popout");

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    let frame = 0;

    const update = () => {
      const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
      const scrollLeft = Math.max(0, Math.min(maxScroll, scroller.scrollLeft));
      setProgress(maxScroll === 0 ? 0 : scrollLeft / maxScroll);
      setCanScrollBack(scrollLeft > 2);
      setCanScrollForward(
        scrollLeft < maxScroll - 2,
      );

      const scrollerRect = scroller.getBoundingClientRect();
      const projectRect = projectRef.current?.getBoundingClientRect();
      const cards = Array.from(
        scroller.querySelectorAll<HTMLElement>("[data-step]"),
      );
      const nextVisible = cards
        .filter((card) => {
          const cardLeft = card.offsetLeft - scrollLeft;
          const visibleWidth = Math.max(
            0,
            Math.min(cardLeft + card.offsetWidth, scroller.clientWidth) -
              Math.max(cardLeft, 0),
          );
          return visibleWidth > Math.min(card.offsetWidth * 0.22, 140);
        })
        .map((card) => Number(card.dataset.step));

      const viewportCenter = scroller.clientWidth / 2;
      const viewportWidth = Math.max(scroller.clientWidth, 1);
      const nextPortraitMotion: Record<number, PortraitMotion> = {};

      cards.forEach((card, cardIndex) => {
        const stepIndex = Number(card.dataset.step);
        const layoutCenter =
          card.offsetLeft + card.offsetWidth / 2 - scrollLeft;
        const normalized = Math.max(
          -1.35,
          Math.min(1.35, (layoutCenter - viewportCenter) / (viewportWidth * 0.72)),
        );
        const arc = Math.sin(normalized * 1.55) * -22;
        const wobble = Math.sin(normalized * 2.8 + cardIndex * 0.7) * 6;
        const lean = normalized * -5.5 + wobble * 0.22;
        const scale = 1 - Math.min(0.075, Math.abs(normalized) * 0.045);

        card.style.setProperty(
          "--rail-x",
          `${Math.sin(normalized * 2.2 + cardIndex) * 11}px`,
        );
        card.style.setProperty("--rail-y", `${arc + wobble}px`);
        card.style.setProperty("--rail-turn", `${lean}deg`);
        card.style.setProperty("--rail-scale", String(scale));
        card.style.setProperty("--rail-skew", `${normalized * -2.4}deg`);
        card.style.setProperty(
          "--image-shift-x",
          `${normalized * -26}px`,
        );
        card.style.setProperty(
          "--image-shift-y",
          `${Math.cos(normalized * 2.4 + cardIndex) * 8}px`,
        );
        card.style.setProperty("--image-tilt", `${normalized * -1.4}deg`);

        if (project.steps[stepIndex]?.display === "portrait-popout") {
          nextPortraitMotion[stepIndex] = {
            left:
              scrollerRect.left -
              (projectRect?.left ?? 0) +
              card.offsetLeft -
              scrollLeft,
            y: arc * 0.52 + wobble,
            rotate: lean * 0.72,
            scale: 1 - Math.min(0.045, Math.abs(normalized) * 0.028),
          };
        }
      });

      if (projectRect) {
        setPortraitMotion((current) => {
          const currentKeys = Object.keys(current);
          const nextKeys = Object.keys(nextPortraitMotion);
          const unchanged =
            currentKeys.length === nextKeys.length &&
            nextKeys.every((key) => {
              const previous = current[Number(key)];
              const next = nextPortraitMotion[Number(key)];
              return (
                previous &&
                Math.abs(previous.left - next.left) < 0.5 &&
                Math.abs(previous.y - next.y) < 0.5 &&
                Math.abs(previous.rotate - next.rotate) < 0.1 &&
                Math.abs(previous.scale - next.scale) < 0.002
              );
            });
          return unchanged ? current : nextPortraitMotion;
        });
      }

      setVisibleSteps((current) =>
        current.length === nextVisible.length &&
        current.every((value, index) => value === nextVisible[index])
          ? current
          : nextVisible,
      );
      frame = 0;
    };

    const requestUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    scroller.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      scroller.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [project.steps]);

  const scrollProject = (direction: number) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    scroller.scrollBy({
      left: direction * scroller.clientWidth * 0.72,
      behavior: "smooth",
    });
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
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

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
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
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = pointerStartRef.current;
    const scroller = scrollerRef.current;
    if (!start || !scroller) return;

    const distance = event.clientX - start.x;
    if (!draggedRef.current && Math.abs(distance) < 6) return;

    draggedRef.current = true;
    event.preventDefault();
    scroller.scrollLeft = start.scrollLeft - distance;
  };

  const finishPointerDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    pointerStartRef.current = null;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleClickCapture = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!draggedRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    draggedRef.current = false;
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
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
    <section
      ref={projectRef}
      className={`project project--${project.theme}`}
      id={project.id}
      aria-labelledby={`${project.id}-title`}
      style={
        {
          "--project-scroll-shift": `${progress * -180}px`,
        } as React.CSSProperties
      }
    >
      <div className="project-heading">
        <div className="project-identity">
          <span className="project-number">{project.number}</span>
          <div>
            <h2 id={`${project.id}-title`}>{project.name}</h2>
            <div className="project-platform-row">
              <span className="project-platform">{project.platform}</span>
              {project.status && (
                <span className="project-status">{project.status}</span>
              )}
              {project.mode && (
                <span className="project-mode">{project.mode}</span>
              )}
            </div>
          </div>
        </div>
        <div className="project-summary">
          <p>{project.headline}</p>
          <small>{project.why}</small>
        </div>
        <div className="project-links">
          {project.live && (
            <a href={project.live} target="_blank" rel="noreferrer">
              Open app <ExternalArrow />
            </a>
          )}
          <a href={project.source} target="_blank" rel="noreferrer">
            Source <ExternalArrow />
          </a>
        </div>
      </div>

      <div className="project-window">
        <div
          ref={scrollerRef}
          tabIndex={0}
          role="region"
          aria-label={`${project.name} screenshots. Drag sideways, hold Shift while scrolling, or use the left and right arrow keys.`}
          aria-describedby={`${project.id}-scroll-help`}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishPointerDrag}
          onPointerCancel={finishPointerDrag}
          onClickCapture={handleClickCapture}
          onKeyDown={handleKeyDown}
          className={`project-scroller${isDragging ? " is-dragging" : ""}`}
        >
          <div className="project-track">
            <div className="scene-kicker" aria-hidden="true">
              <span>{projectMotifs[project.id].label}</span>
              <strong className="scene-kicker-mark">
                {projectMotifs[project.id].mark}
              </strong>
              <small>drag →</small>
            </div>

            {project.steps.map((step, index) => {
              const calloutSide =
                step.calloutSide ?? (index % 2 === 0 ? "left" : "right");
              const entrance =
                entranceStyles[
                  (Number(project.number) + index - 1) %
                    entranceStyles.length
                ];
              const pointerStyle =
                step.pointer || step.cardRatio
                  ? ({
                      ...(step.pointer
                        ? {
                            "--pointer-x": step.pointer.x,
                            "--pointer-y": step.pointer.y,
                            "--pointer-length": step.pointer.length,
                            "--pointer-angle": step.pointer.angle,
                          }
                        : {}),
                      ...(step.cardRatio
                        ? { "--scene-ratio": step.cardRatio }
                        : {}),
                    } as React.CSSProperties)
                  : undefined;

              if (step.display === "portrait-popout") {
                return (
                  <article
                    aria-hidden="true"
                    className="scene-card scene-card--portrait-proxy"
                    data-step={index}
                    key={step.image}
                  />
                );
              }

              return (
                <article
                  className={[
                    "scene-card",
                    visibleSteps.includes(index) ? "is-visible" : "",
                    `scene-card--${step.fit ?? "cover"}`,
                    step.cardRatio ? "scene-card--contained" : "",
                    `scene-card--${step.surface ?? "light"}`,
                    `scene-card--${calloutSide}`,
                    `scene-card--${entrance}`,
                    `scene-card--layout-${(index % 4) + 1}`,
                  ].join(" ")}
                  data-step={index}
                  key={step.image}
                  style={pointerStyle}
                >
                  <figure className="scene-image">
                    <img
                      src={step.image}
                      alt={step.alt}
                      loading={
                        project.number === "01" && index === 0
                          ? "eager"
                          : "lazy"
                      }
                      style={
                        step.position
                          ? { objectPosition: step.position }
                          : undefined
                      }
                    />
                  </figure>
                  {step.pointer && (
                    <span className="scene-pointer" aria-hidden="true" />
                  )}
                  <div className="scene-callout">
                    <span>
                      {String(index + 1).padStart(2, "0")} /{" "}
                      {String(project.steps.length).padStart(2, "0")}
                    </span>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </div>
                </article>
              );
            })}

            <div className="scene-end">
              <a href={`#${projects[Number(project.number)]?.id ?? "top"}`}>
                {Number(project.number) < projects.length
                  ? "Next project ↓"
                  : "Back to top ↑"}
              </a>
            </div>
          </div>
        </div>

        <p className="project-scroll-help" id={`${project.id}-scroll-help`}>
          <span>Drag sideways</span>
          <span aria-hidden="true">·</span>
          <span>Shift + scroll</span>
          <span aria-hidden="true">·</span>
          <kbd>← →</kbd>
        </p>

        <div className="project-nav" aria-label={`${project.name} screenshot navigation`}>
          <button
            type="button"
            className="project-nav-button"
            aria-label={`Show earlier ${project.name} screenshots`}
            disabled={!canScrollBack}
            onClick={() => scrollProject(-1)}
          >
            <span aria-hidden="true">←</span>
          </button>
          <button
            type="button"
            className="project-nav-button"
            aria-label={`Show later ${project.name} screenshots`}
            disabled={!canScrollForward}
            onClick={() => scrollProject(1)}
          >
            <span aria-hidden="true">→</span>
          </button>
        </div>

        <div className="project-progress" aria-hidden="true">
          <span
            style={{
              width: `${Math.max(
                7,
                progress * 93 + 7,
              )}%`,
            }}
          />
        </div>
      </div>

      {portraitSteps.map(({ step, index }) => {
        const calloutSide = step.calloutSide ?? (index % 2 === 0 ? "left" : "right");
        const motion = portraitMotion[index];
        const isVisible = visibleSteps.includes(index);
        return (
          <article
            className={[
              "scene-card",
              "portrait-popout",
              `portrait-popout--step-${index}`,
              isVisible ? "is-visible" : "",
              `scene-card--${step.fit ?? "cover"}`,
              `scene-card--${step.surface ?? "light"}`,
              `scene-card--${calloutSide}`,
              `scene-card--layout-${(index % 4) + 1}`,
            ].join(" ")}
            key={step.image}
            style={
              {
                ...(step.pointer
                  ? {
                      "--pointer-x": step.pointer.x,
                      "--pointer-y": step.pointer.y,
                      "--pointer-length": step.pointer.length,
                      "--pointer-angle": step.pointer.angle,
                    }
                  : {}),
                "--portrait-ratio": step.portraitRatio ?? "1 / 3.55",
                left: motion === undefined ? undefined : `${motion.left}px`,
                "--rail-y": motion ? `${motion.y}px` : "0px",
                "--rail-turn": motion ? `${motion.rotate}deg` : "0deg",
                "--rail-scale": motion ? motion.scale : 1,
              } as React.CSSProperties
            }
          >
            <figure className="portrait-popout-image scene-image">
              <img src={step.image} alt={step.alt} />
            </figure>
            {step.pointer && (
              <span className="scene-pointer" aria-hidden="true" />
            )}
            <div className="scene-callout">
              <span>
                {String(index + 1).padStart(2, "0")} / {String(project.steps.length).padStart(2, "0")}
              </span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </div>
          </article>
        );
      })}

      <ol className="sr-only">
        {project.steps.map((step) => (
          <li key={step.title}>
            {step.title} {step.text}
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="Xiang Li, back to top">
          XIANG LI
        </a>
        <nav className="site-nav" aria-label="Main navigation">
          <a href="#blokamine">Projects</a>
          <a
            href="https://github.com/xiangthebung"
            target="_blank"
            rel="noreferrer"
          >
            GitHub <ExternalArrow />
          </a>
        </nav>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <h1 id="hero-title">Xiang Li</h1>
            <p>AI-built tools for everyday problems.</p>
          </div>

          <nav className="project-index" aria-label="Project index">
            {projects.map((project) => (
              <a href={`#${project.id}`} key={project.id}>
                <span>{project.number}</span>
                <strong>{project.name}</strong>
                <span aria-hidden="true">↓</span>
              </a>
            ))}
          </nav>
        </section>

        <div id="projects">
          {projects.map((project) => (
            <ProjectSection project={project} key={project.id} />
          ))}
        </div>

        <section className="fun-section" aria-label="Additional media">
          <div className="fun-grid">
            {funMedia.map((media, index) => (
              <figure
                className={`fun-card fun-card--${media.kind}${index === 0 ? " fun-card--feature" : ""}`}
                key={media.src}
              >
                <div className="fun-media">
                  {media.kind === "image" ? (
                    <img src={media.src} alt={media.alt} loading="lazy" />
                  ) : (
                    <video
                      controls
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      aria-label={media.alt}
                    >
                      <source src={media.src} type="video/mp4" />
                      Your browser does not support embedded video.
                    </video>
                  )}
                </div>
                <figcaption>
                  <span>{media.label}</span>
                  <strong>{media.title}</strong>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="ending">
          <div>
            <span>Built with AI.</span>
            <a
              href="https://github.com/xiangthebung"
              target="_blank"
              rel="noreferrer"
            >
              GitHub <ExternalArrow />
            </a>
          </div>
        </section>
      </main>
    </>
  );
}
