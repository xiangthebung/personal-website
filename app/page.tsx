"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

type ProjectStep = {
  title: string;
  text: string;
  image: string;
  alt: string;
  fit?: "cover" | "contain";
  surface?: "light" | "dark";
  position?: string;
};

type Project = {
  id: string;
  number: string;
  name: string;
  platform: string;
  headline: string;
  why: string;
  theme: "paper" | "mint" | "black" | "white" | "navy" | "forest";
  source: string;
  live?: string;
  steps: ProjectStep[];
};

const projects: Project[] = [
  {
    id: "blokamine",
    number: "01",
    name: "blokamine",
    platform: "Chrome extension",
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
      },
      {
        title: "Turn down the reward.",
        text: "Desaturate images and video. Hide likes, views, follower counts, and notification badges.",
        image: "/projects/blokamine-settings.png",
        alt: "blokamine core experience settings",
        fit: "contain",
        surface: "light",
      },
      {
        title: "Pick what disappears.",
        text: "Reels, comments, Explore, suggested posts, Shorts—each site gets its own controls.",
        image: "/projects/blokamine-sites.png",
        alt: "blokamine site-specific controls",
        fit: "contain",
        surface: "light",
      },
      {
        title: "Still scrolling?",
        text: "Blur the thumbnails. Remove the media. Turn it upside down. Whatever works. The settings stay in Chrome and I don’t collect browsing activity.",
        image: "/projects/blokamine-instagram.png",
        alt: "Instagram with media turned upside down and desaturated",
        surface: "dark",
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
      },
      {
        title: "Set up a stop once.",
        text: "Choose the route, direction, and stop. It stays there for next time.",
        image: "/projects/grt-add-stop.png",
        alt: "GRT Next Bus add a stop form",
        fit: "contain",
        surface: "light",
      },
      {
        title: "The basics are free.",
        text: "Pro adds closest-stop sorting, countdowns, and alerts. Useful if you care. Easy to ignore if you don’t.",
        image: "/projects/grt-pro.png",
        alt: "GRT Next Bus Pro countdown and alert controls",
        fit: "contain",
        surface: "light",
      },
      {
        title: "Leave when the notification shows up.",
        text: "Set an alert for a saved stop and Chrome tells you when the bus is getting close.",
        image: "/projects/grt-alert.png",
        alt: "Chrome notification for an arriving GRT bus",
        fit: "contain",
        surface: "dark",
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
      },
      {
        title: "Choose how much comes with it.",
        text: "Follow same-site links, keep supported scripts, and save the result into a folder.",
        image: "/projects/pagepack-options.png",
        alt: "PagePack link depth and script options",
        fit: "contain",
        surface: "dark",
      },
      {
        title: "Everything goes into a local library.",
        text: "Search it, sort it into folders, and keep the whole thing on your device.",
        image: "/projects/pagepack-library.png",
        alt: "PagePack saved pages library",
        fit: "contain",
        surface: "dark",
      },
      {
        title: "A pack can be more than one page.",
        text: "This one has 57. Open any saved link and move through the pack without a connection.",
        image: "/projects/pagepack-folder.png",
        alt: "A PagePack folder containing a 57-page pack",
        fit: "contain",
        surface: "dark",
      },
      {
        title: "The saved site still looks like the site.",
        text: "Styles, images, fonts, and supported media come along. DRM video, live streams, and some heavily scripted pages don’t.",
        image: "/projects/pagepack-reader.png",
        alt: "A full website open inside the PagePack offline reader",
        surface: "light",
      },
    ],
  },
  {
    id: "pdf-explainer",
    number: "04",
    name: "PDF Slide Explainer",
    platform: "Web app",
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
      },
      {
        title: "Ask about the exact thing on screen.",
        text: "The side panel handles notes, slide-specific chat, intuition, analogies, and examples.",
        image: "/projects/pdf-explainer-feature.png",
        alt: "PDF Slide Explainer explaining feature uncertainty",
        surface: "light",
      },
      {
        title: "Then make sure you actually learned it.",
        text: "Matching, fill-in-the-blank, practice problems, and quizzes are generated from the deck. It runs on Gemini and needs an API key.",
        image: "/projects/pdf-explainer-match.png",
        alt: "Matching activity in PDF Slide Explainer",
        fit: "contain",
        surface: "dark",
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
      },
      {
        title: "Make your part louder.",
        text: "Pick your section, lower everyone else, or use a preset like “Mostly Yours.”",
        image: "/projects/choir-mix.png",
        alt: "Choir Practice Tool part mixer and volume presets",
        fit: "contain",
        surface: "dark",
      },
      {
        title: "See whether you’re on pitch.",
        text: "Turn on the microphone and your pitch appears over the score. The analysis stays in the browser; nothing is recorded or uploaded.",
        image: "/projects/choir-pitch.png",
        alt: "Choir Practice Tool showing live pitch guidance",
        surface: "dark",
      },
      {
        title: "Mute the distraction.",
        text: "Focus mode dims the other sections so you can follow the one line you’re trying to learn.",
        image: "/projects/choir-focus.png",
        alt: "Choir Practice Tool with the tenor section in focus",
        surface: "dark",
      },
      {
        title: "Slow it down. Loop it. Export it.",
        text: "There’s tempo control, a metronome, repeat, passage practice, and WAV export. Compressed .mxl files aren’t supported yet.",
        image: "/projects/choir-practice.png",
        alt: "Choir Practice Tool playing a four-part score",
        surface: "dark",
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
      },
      {
        title: "The tutorial shows exactly what counts as a match.",
        text: "Position and spoken letters in dual mode. Add colour in triple mode.",
        image: "/projects/nback-tutorial.png",
        alt: "Zen N-Back tutorial explaining a dual match",
        fit: "contain",
        surface: "dark",
      },
      {
        title: "Then play.",
        text: "Use the buttons or keyboard, finish a short session, and check the stats. It’s a game, not a clinical promise.",
        image: "/projects/nback-game.png",
        alt: "Zen N-Back game board",
        fit: "contain",
        surface: "dark",
      },
    ],
  },
];

function ExternalArrow() {
  return (
    <span aria-hidden="true" className="external-arrow">
      ↗
    </span>
  );
}

function ProjectSection({ project }: { project: Project }) {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      const section = sectionRef.current;
      if (!section) return;

      const viewportHeight = window.innerHeight;
      const rect = section.getBoundingClientRect();
      const scrollDistance = Math.max(1, section.offsetHeight - viewportHeight);
      const travelled = Math.min(
        Math.max(70 - rect.top, 0),
        scrollDistance,
      );
      const nextStep = Math.min(
        project.steps.length - 1,
        Math.floor((travelled / scrollDistance) * project.steps.length),
      );

      setActiveStep((current) => (current === nextStep ? current : nextStep));
      frame = 0;
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [project.steps.length]);

  const active = project.steps[activeStep];
  const sectionStyle = {
    "--step-count": project.steps.length,
  } as CSSProperties;

  return (
    <section
      className={`project project--${project.theme}`}
      id={project.id}
      ref={sectionRef}
      style={sectionStyle}
      aria-labelledby={`${project.id}-title`}
    >
      <div className="project-stage">
        <div className="project-topline">
          <span>{project.number} / 06</span>
          <span>{project.platform}</span>
        </div>

        <div className="project-layout">
          <div className="project-visual">
            {project.steps.map((step, index) => (
              <figure
                className={[
                  "project-shot",
                  index === activeStep ? "is-active" : "",
                  `project-shot--${step.fit ?? "cover"}`,
                  `project-shot--${step.surface ?? "light"}`,
                ].join(" ")}
                key={step.image}
                aria-hidden={index !== activeStep}
              >
                <img
                  src={step.image}
                  alt={index === activeStep ? step.alt : ""}
                  loading={
                    project.number === "01" && index === 0 ? "eager" : "lazy"
                  }
                  style={
                    step.position
                      ? ({ objectPosition: step.position } as CSSProperties)
                      : undefined
                  }
                />
              </figure>
            ))}
          </div>

          <div className="project-copy">
            <div>
              <h2 id={`${project.id}-title`}>{project.name}</h2>
              <p className="project-headline">{project.headline}</p>
              <p className="project-why">
                <span>Why?</span> {project.why}
              </p>
            </div>

            <div className="step-copy" key={`${project.id}-${activeStep}`}>
              <span className="step-count">
                {String(activeStep + 1).padStart(2, "0")} /{" "}
                {String(project.steps.length).padStart(2, "0")}
              </span>
              <h3>{active.title}</h3>
              <p>{active.text}</p>
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
        </div>

        <div className="project-progress" aria-hidden="true">
          <span
            style={{
              width: `${((activeStep + 1) / project.steps.length) * 100}%`,
            }}
          />
        </div>

        <ol className="sr-only">
          {project.steps.map((step) => (
            <li key={step.title}>
              {step.title} {step.text}
            </li>
          ))}
        </ol>
      </div>
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
            <p className="eyebrow">Six projects</p>
            <h1 id="hero-title">Some tools I made.</h1>
            <p>
              Built with AI. Mostly because I wanted them and couldn’t find
              versions I liked.
            </p>
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
          <p>That’s everything.</p>
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
