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

const projectData: Project[] = [
  {
    id: "blokamine",
    number: "01",
    name: "blokamine",
    platform: "Chrome extension",
    status: "Work in progress",
    mode: "Monochrome mode",
    headline: "Can’t quit social media? Make it less addicting instead.",
    why: "I still wanted the sites. Just not all the little tricks that make me stay.",
    theme: "paper",
    source: "https://github.com/xiangthebung/blokamine",
    steps: [
      {
        title: "You’ll get bored and leave on your own.",
        text: "The sites still work. The pictures are just grey, the numbers are gone, and the feed is a lot less exciting.",
        image: "/projects/blokamine.png",
        alt: "YouTube with desaturated, upside-down media",
        surface: "dark",
        pointer: { x: "56%", y: "48%", length: "22%", angle: "158deg" },
      },
      {
        title: "Turn down the reward.",
        text: "Desaturate images and video. Hide likes, views, follower counts, and notification badges.",
        image: "/projects/blokamine-settings.png",
        alt: "blokamine core experience settings",
        fit: "contain",
        surface: "light",
        pointer: { x: "88%", y: "22%", length: "26%", angle: "166deg" },
      },
      {
        title: "Pick what disappears.",
        text: "Reels, comments, Explore, suggested posts, Shorts—each site gets its own controls.",
        image: "/projects/blokamine-sites.png",
        alt: "blokamine site-specific controls",
        fit: "contain",
        surface: "light",
        pointer: { x: "58%", y: "58%", length: "24%", angle: "158deg" },
      },
      {
        title: "Still scrolling?",
        text: "Blur the thumbnails. Remove the media. Turn it upside down. Whatever works. The settings stay in Chrome and I don’t collect browsing activity.",
        image: "/projects/blokamine-instagram.png",
        alt: "Instagram with media turned upside down and desaturated",
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
    headline: "See your frequent bus times at a quick glance.",
    why: "To save 15 seconds going to Google Maps and typing the same starting point and destination.",
    theme: "mint",
    source: "https://github.com/xiangthebung/grt-bus-time",
    steps: [
      {
        title: "Open it. See the next departures.",
        text: "Your saved stops stay on the front page. Live times when they’re available, scheduled times when they aren’t.",
        image: "/projects/grt-next-bus.png",
        alt: "GRT Next Bus saved stops and departure times",
        fit: "contain",
        surface: "light",
        display: "portrait-popout",
        portraitRatio: "842 / 1200",
        pointer: { x: "54%", y: "43%", length: "52%", angle: "158deg" },
      },
      {
        title: "Set up a stop once.",
        text: "Choose the route, direction, and stop. It stays there for next time.",
        image: "/projects/grt-add-stop.png",
        alt: "GRT Next Bus add a stop form",
        fit: "contain",
        surface: "light",
        display: "portrait-popout",
        portraitRatio: "830 / 720",
        pointer: { x: "50%", y: "72%", length: "48%", angle: "-14deg" },
      },
      {
        title: "The basics are free.",
        text: "Pro adds closest-stop sorting, countdowns, and alerts. Useful if you care. Easy to ignore if you don’t.",
        image: "/projects/grt-pro.png",
        alt: "GRT Next Bus Pro countdown and alert controls",
        fit: "contain",
        surface: "light",
        display: "portrait-popout",
        portraitRatio: "842 / 1196",
        pointer: { x: "85%", y: "8%", length: "52%", angle: "156deg" },
      },
      {
        title: "Leave when the notification shows up.",
        text: "Set an alert for a saved stop and Chrome tells you when the bus is getting close.",
        image: "/projects/grt-alert.png",
        alt: "Chrome notification for an arriving GRT bus",
        fit: "contain",
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
    headline: "Save websites now. Read them on the bus later.",
    why: "I don’t have mobile data and I’m not getting it just to read articles.",
    theme: "black",
    source: "https://github.com/xiangthebung/pagepack-extension",
    steps: [
      {
        title: "Save one page or keep saving as you browse.",
        text: "A page becomes an offline copy. A browsing journey keeps collecting the pages you visit.",
        image: "/projects/pagepack.png",
        alt: "PagePack save page and browsing journey options",
        fit: "contain",
        surface: "dark",
        display: "portrait-popout",
        portraitRatio: "826 / 1304",
        pointer: { x: "54%", y: "43%", length: "52%", angle: "158deg" },
      },
      {
        title: "Choose how much comes with it.",
        text: "Follow same-site links, keep supported scripts, and save the result into a folder.",
        image: "/projects/pagepack-options.png",
        alt: "PagePack link depth and script options",
        fit: "contain",
        surface: "dark",
        display: "portrait-popout",
        portraitRatio: "758 / 904",
        pointer: { x: "61%", y: "58%", length: "48%", angle: "-14deg" },
      },
      {
        title: "Everything goes into a local library.",
        text: "Search it, sort it into folders, and keep the whole thing on your device.",
        image: "/projects/pagepack-library.png",
        alt: "PagePack saved pages library",
        fit: "contain",
        surface: "dark",
        display: "portrait-popout",
        portraitRatio: "760 / 1194",
        pointer: { x: "53%", y: "52%", length: "52%", angle: "158deg" },
      },
      {
        title: "A pack can be more than one page.",
        text: "This one has 57. Open any saved link and move through the pack without a connection.",
        image: "/projects/pagepack-folder.png",
        alt: "A PagePack folder containing a 57-page pack",
        fit: "contain",
        surface: "dark",
        display: "portrait-popout",
        portraitRatio: "752 / 1186",
        pointer: { x: "52%", y: "46%", length: "50%", angle: "-14deg" },
      },
      {
        title: "The saved site still looks like the site.",
        text: "Styles, images, fonts, and supported media come along. DRM video, live streams, and some heavily scripted pages don’t.",
        image: "/projects/pagepack-reader.png",
        alt: "A full website open inside the PagePack offline reader",
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
    headline: "Your slides on the left. The explanation on the right.",
    why: "AI explanations were useful. Keeping them in a second tab wasn’t.",
    theme: "white",
    source: "https://github.com/xiangthebung/pdf-explainer",
    live: "https://pdf-explainer.ai.studio/",
    steps: [
      {
        title: "The notes stay on the slide you’re looking at.",
        text: "Upload a lecture PDF and get an explanation for each slide without shrinking the deck into a corner.",
        image: "/projects/pdf-explainer.png",
        alt: "PDF Slide Explainer showing notes beside a lecture slide",
        surface: "dark",
        pointer: { x: "81%", y: "53%", length: "28%", angle: "150deg" },
      },
      {
        title: "Ask about the exact thing on screen.",
        text: "The side panel handles notes, slide-specific chat, intuition, analogies, and examples.",
        image: "/projects/pdf-explainer-feature.png",
        alt: "PDF Slide Explainer explaining feature uncertainty",
        surface: "light",
        pointer: { x: "82%", y: "52%", length: "22%", angle: "-16deg" },
      },
      {
        title: "Then make sure you actually learned it.",
        text: "Matching, fill-in-the-blank, practice problems, and quizzes are generated from the deck. It runs on Gemini and needs an API key.",
        image: "/projects/pdf-explainer-match.png",
        alt: "Matching activity in PDF Slide Explainer",
        fit: "contain",
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
    headline: "Turn a MusicXML file into choir practice.",
    why: "I can copy a part. Sight-reading it while five other parts are going off is harder.",
    theme: "navy",
    source: "https://github.com/xiangthebung/satb-practice",
    live: "https://satb-practice.xiangli3625.workers.dev/",
    steps: [
      {
        title: "Hear the whole score.",
        text: "Open an uncompressed MusicXML file and play every part in the browser.",
        image: "/projects/choir-overview.png",
        alt: "Choir Practice Tool playing a six-part score",
        surface: "dark",
        pointer: { x: "65%", y: "48%", length: "24%", angle: "158deg" },
      },
      {
        title: "Make your part louder.",
        text: "Pick your section, lower everyone else, or use a preset like “Mostly Yours.”",
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
        title: "See whether you’re on pitch.",
        text: "Turn on the microphone and your pitch appears over the score. The analysis stays in the browser; nothing is recorded or uploaded.",
        image: "/projects/choir-pitch.png",
        alt: "Choir Practice Tool showing live pitch guidance",
        surface: "dark",
        pointer: { x: "43%", y: "66%", length: "18%", angle: "168deg" },
      },
      {
        title: "Mute the distraction.",
        text: "Focus mode dims the other sections so you can follow the one line you’re trying to learn.",
        image: "/projects/choir-focus.png",
        alt: "Choir Practice Tool with the tenor section in focus",
        surface: "dark",
        pointer: { x: "48%", y: "65%", length: "31%", angle: "-12deg" },
      },
      {
        title: "Slow it down. Loop it. Export it.",
        text: "There’s tempo control, a metronome, repeat, passage practice, and WAV export. Compressed .mxl files aren’t supported yet.",
        image: "/projects/choir-practice.png",
        alt: "Choir Practice Tool playing a four-part score",
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
    headline: "An N-back game without the stuff I found annoying.",
    why: "Every version online had one thing I didn’t like, so I made mine.",
    theme: "forest",
    source: "https://github.com/xiangthebung/n-back",
    live: "https://n-back.ai.studio/",
    steps: [
      {
        title: "Pick dual or triple N-back.",
        text: "Set the memory depth from 1 to 8, change the speed, and turn visual or audio help on if you want it.",
        image: "/projects/zen-n-back.png",
        alt: "Zen N-Back setup screen",
        surface: "dark",
        pointer: { x: "50%", y: "35%", length: "22%", angle: "158deg" },
      },
      {
        title: "The tutorial shows exactly what counts as a match.",
        text: "Position and spoken letters in dual mode. Add colour in triple mode.",
        image: "/projects/nback-tutorial.png",
        alt: "Zen N-Back tutorial explaining a dual match",
        fit: "contain",
        surface: "dark",
        pointer: { x: "51%", y: "53%", length: "21%", angle: "-14deg" },
      },
      {
        title: "Then play.",
        text: "Use the buttons or keyboard, finish a short session, and check the stats. It’s a game, not a clinical promise.",
        image: "/projects/nback-game.png",
        alt: "Zen N-Back game board",
        fit: "contain",
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
  const [progress, setProgress] = useState(0);
  const [visibleSteps, setVisibleSteps] = useState<number[]>([0]);
  const [portraitOffsets, setPortraitOffsets] = useState<Record<number, number>>({});
  const portraitSteps = project.steps
    .map((step, index) => ({ step, index }))
    .filter(({ step }) => step.display === "portrait-popout");

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    let frame = 0;

    const update = () => {
      const maxScroll = Math.max(1, scroller.scrollWidth - scroller.clientWidth);
      setProgress(Math.min(1, Math.max(0, scroller.scrollLeft / maxScroll)));

      const scrollerRect = scroller.getBoundingClientRect();
      const projectRect = projectRef.current?.getBoundingClientRect();
      const nextVisible = Array.from(
        scroller.querySelectorAll<HTMLElement>("[data-step]"),
      )
        .filter((card) => {
          const cardRect = card.getBoundingClientRect();
          const visibleWidth =
            Math.min(cardRect.right, scrollerRect.right) -
            Math.max(cardRect.left, scrollerRect.left);
          return visibleWidth > Math.min(cardRect.width * 0.22, 140);
        })
        .map((card) => Number(card.dataset.step));

      if (projectRect) {
        const nextPortraitOffsets = Object.fromEntries(
          Array.from(scroller.querySelectorAll<HTMLElement>("[data-step]"))
            .filter((card) => {
              const stepIndex = Number(card.dataset.step);
              return project.steps[stepIndex]?.display === "portrait-popout";
            })
            .map((card) => [
              Number(card.dataset.step),
              card.getBoundingClientRect().left - projectRect.left,
            ]),
        ) as Record<number, number>;

        setPortraitOffsets((current) => {
          const currentKeys = Object.keys(current);
          const nextKeys = Object.keys(nextPortraitOffsets);
          const unchanged =
            currentKeys.length === nextKeys.length &&
            nextKeys.every(
              (key) =>
                Math.abs(
                  (current[Number(key)] ?? 0) -
                    (nextPortraitOffsets[Number(key)] ?? 0),
                ) < 0.5,
            );
          return unchanged ? current : nextPortraitOffsets;
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

    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;

      const maxScroll = scroller.scrollWidth - scroller.clientWidth;
      const movingForward = event.deltaY > 0;
      const canMoveForward = scroller.scrollLeft < maxScroll - 2;
      const canMoveBack = scroller.scrollLeft > 2;

      if (
        (movingForward && canMoveForward) ||
        (!movingForward && canMoveBack)
      ) {
        event.preventDefault();
        scroller.scrollLeft += event.deltaY;
        requestUpdate();
      }
    };

    update();
    scroller.addEventListener("scroll", requestUpdate, { passive: true });
    scroller.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", requestUpdate);

    return () => {
      scroller.removeEventListener("scroll", requestUpdate);
      scroller.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", requestUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [project.steps]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    if (event.key === "ArrowRight") {
      event.preventDefault();
      scroller.scrollBy({ left: scroller.clientWidth * 0.72, behavior: "smooth" });
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      scroller.scrollBy({
        left: scroller.clientWidth * -0.72,
        behavior: "smooth",
      });
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
          <small>
            <strong>Why?</strong> {project.why}
          </small>
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
          className="project-scroller"
          ref={scrollerRef}
          tabIndex={0}
          role="region"
          aria-label={`${project.name} screenshots. Scroll sideways or use the left and right arrow keys.`}
          onKeyDown={handleKeyDown}
        >
          <div className="project-track">
            <div className="scene-kicker" aria-hidden="true">
              <span>{projectMotifs[project.id].label}</span>
              <strong className="scene-kicker-mark">
                {projectMotifs[project.id].mark}
              </strong>
              <small>scroll →</small>
            </div>

            {project.steps.map((step, index) => {
              const calloutSide =
                step.calloutSide ?? (index % 2 === 0 ? "left" : "right");
              const entrance =
                entranceStyles[
                  (Number(project.number) + index - 1) %
                    entranceStyles.length
                ];
              const pointerStyle = step.pointer
                ? ({
                    "--pointer-x": step.pointer.x,
                    "--pointer-y": step.pointer.y,
                    "--pointer-length": step.pointer.length,
                    "--pointer-angle": step.pointer.angle,
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
        if (!visibleSteps.includes(index)) return null;

        const calloutSide = step.calloutSide ?? (index % 2 === 0 ? "left" : "right");
        return (
          <article
            className={`portrait-popout portrait-popout--step-${index} scene-card--${calloutSide} scene-card--${step.surface ?? "light"} is-visible`}
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
                left:
                  portraitOffsets[index] === undefined
                    ? undefined
                    : `${portraitOffsets[index]}px`,
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
            <p>Projects below are built with AI.</p>
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

        <section className="ending">
          <div>
            <span>Made with AI.</span>
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
