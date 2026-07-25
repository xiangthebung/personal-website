"use client";

import { useEffect, useRef, useState } from "react";

type Project = {
  id: string;
  number: string;
  name: string;
  category: string;
  platform: string;
  tagline: string;
  story: string;
  description: string;
  angle: string;
  features: string[];
  image: string;
  source: string;
  live?: string;
  layout: "wide" | "narrow" | "half";
};

const projects: Project[] = [
  {
    id: "blokamine",
    number: "01",
    name: "blokamine",
    category: "Attention",
    platform: "Chrome extension",
    tagline: "Make the internet less rewarding—not inaccessible.",
    story:
      "I didn’t want to block social media. I wanted it to stop trying quite so hard to reward me.",
    description:
      "blokamine turns down the visual reward signals behind endless scrolling. It desaturates media, removes engagement counts and notification badges, trims discovery surfaces, and adds Focus Lock plus timed breaks—while leaving the websites usable.",
    angle:
      "Settings and Focus Lock data stay inside Chrome. The extension does not collect browsing activity or use a remote server.",
    features: [
      "Adjustable desaturation",
      "Hidden engagement cues",
      "Site-specific controls",
      "Focus Lock",
    ],
    image: "/projects/blokamine.png",
    source: "https://github.com/xiangthebung/blokamine",
    layout: "wide",
  },
  {
    id: "grt-next-bus",
    number: "02",
    name: "GRT Next Bus",
    category: "Transit",
    platform: "Chrome extension",
    tagline: "The bus times I actually need, one click away.",
    story:
      "Every bus trip started with opening Maps and entering the same origin and destination. That felt like a lot of ceremony for one tiny answer.",
    description:
      "A quick departure board for Grand River Transit riders. Save the routes, directions, and stops you use, then see scheduled or real-time arrivals at a glance—with optional nearby-stop ordering, countdowns, and alerts.",
    angle:
      "The free version keeps saved stops close at hand. Optional Pro features add countdowns, closest-stop ordering, and arrival alerts.",
    features: [
      "Live departures",
      "Saved stops",
      "Nearby ordering",
      "Arrival alerts",
    ],
    image: "/projects/grt-next-bus.png",
    source: "https://github.com/xiangthebung/grt-bus-time",
    layout: "narrow",
  },
  {
    id: "pagepack",
    number: "03",
    name: "PagePack",
    category: "Offline web",
    platform: "Chrome extension",
    tagline: "Save the web for the bus ride home.",
    story:
      "I don’t have mobile data. I’ve made it this far without it, so I built a better way to take the web with me.",
    description:
      "PagePack saves complete web pages—including styles, images, fonts, and supported media—to a private on-device library. It can follow same-site links, collect a browsing journey, organize packs into folders, and reopen saved links offline.",
    angle:
      "Saved pages stay on the device. DRM video, live streams, and some heavily scripted pages cannot be captured reliably.",
    features: [
      "Complete page capture",
      "Browsing journeys",
      "Offline navigation",
      "Private local library",
    ],
    image: "/projects/pagepack.png",
    source: "https://github.com/xiangthebung/pagepack-extension",
    layout: "narrow",
  },
  {
    id: "pdf-explainer",
    number: "04",
    name: "PDF Slide Explainer",
    category: "Learning",
    platform: "Web app",
    tagline: "A tutor that stays attached to the slide.",
    story:
      "Keeping lecture slides in one tab and an AI explanation in another left each slide at a quarter of my screen. Studying should not need window choreography.",
    description:
      "Upload a lecture-slide PDF and get explanations in context, on the slide you are viewing. The app creates structured notes, intuition, analogies, examples, quizzes, matching exercises, fill-in-the-blank activities, interactive problems, and slide-specific chat.",
    angle:
      "It uses Gemini AI and needs either a server-side Gemini configuration or a key supplied by the user.",
    features: [
      "Slide-by-slide notes",
      "Attached AI chat",
      "Practice activities",
      "Final quiz workflow",
    ],
    image: "/projects/pdf-explainer.png",
    source: "https://github.com/xiangthebung/pdf-explainer",
    live: "https://pdf-explainer.ai.studio/",
    layout: "wide",
  },
  {
    id: "choir-practice",
    number: "05",
    name: "Choir Practice Tool",
    category: "Music",
    platform: "Web app",
    tagline: "Hear your part. Lower the others. Sing it again.",
    story:
      "I somehow passed the choir audition. I could copy and remember a part, but turning notes on a page into my own voice—and holding them against five other parts—was another problem.",
    description:
      "A flexible rehearsal room for uncompressed MusicXML scores. Singers can isolate and mix sections, slow the tempo, loop passages, use a metronome, follow the notation, check pitch locally with a microphone, and export MusicXML or WAV audio.",
    angle:
      "Microphone analysis happens locally in the browser; audio is not recorded or uploaded. Compressed .mxl files are not currently supported.",
    features: [
      "Part isolation",
      "Flexible section mix",
      "Local pitch guidance",
      "MusicXML & WAV export",
    ],
    image: "/projects/choir-practice.png",
    source: "https://github.com/xiangthebung/satb-practice",
    live: "https://satb-practice.xiangli3625.workers.dev/",
    layout: "wide",
  },
  {
    id: "zen-n-back",
    number: "06",
    name: "Zen N-Back",
    category: "Memory",
    platform: "Web game",
    tagline: "A calmer version of a very demanding game.",
    story:
      "Every N-back game I tried had one small thing I didn’t like. Eventually, making my own felt easier than continuing to complain.",
    description:
      "A quiet dual- or triple-N-back experience with adjustable difficulty, speed, audio, speech, keyboard controls, visual assistance, tutorials, and performance statistics.",
    angle:
      "This is a cognitive training game, not a clinical claim. It does not promise guaranteed improvements to memory or intelligence.",
    features: [
      "Dual & triple modes",
      "1–8 back difficulty",
      "Adjustable pacing",
      "Session statistics",
    ],
    image: "/projects/zen-n-back.png",
    source: "https://github.com/xiangthebung/n-back",
    live: "https://n-back.ai.studio/",
    layout: "narrow",
  },
];

function ExternalArrow() {
  return (
    <span aria-hidden="true" className="external-arrow">
      ↗
    </span>
  );
}

export default function Home() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    if (!selectedProject) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedProject(null);
      }
    };

    document.body.classList.add("modal-open");
    window.addEventListener("keydown", onKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.body.classList.remove("modal-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedProject]);

  const closeProject = () => {
    const id = selectedProject?.id;
    setSelectedProject(null);
    if (id) {
      window.requestAnimationFrame(() => triggerRefs.current[id]?.focus());
    }
  };

  return (
    <>
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="Xiang Li, back to top">
          XIANG LI
        </a>
        <nav className="site-nav" aria-label="Main navigation">
          <a href="#projects">Projects</a>
          <a href="#about">About</a>
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
            <p className="eyebrow">
              <span className="status-dot" aria-hidden="true" />
              A small software workshop
            </p>
            <h1 id="hero-title">
              I make tools for problems that keep bothering me.
            </h1>
            <p className="hero-intro">
              Six practical experiments in attention, transit, learning, music,
              memory, and the offline web—designed around the way I actually
              want to use them.
            </p>
            <div className="hero-actions">
              <a className="button button--primary" href="#projects">
                Explore the projects
                <span aria-hidden="true">↓</span>
              </a>
              <a className="text-link" href="#about">
                Why I build <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>

          <aside className="problem-log" aria-label="A few problems resolved">
            <div className="problem-log__header">
              <span>A few problems, resolved</span>
              <span>06 / 06</span>
            </div>
            <ol>
              <li>
                <span className="problem-number">01</span>
                <span>
                  <strong>Same bus search, every trip</strong>
                  <small>Saved departures in one click</small>
                </span>
              </li>
              <li>
                <span className="problem-number">02</span>
                <span>
                  <strong>Slides squeezed beside an AI chat</strong>
                  <small>The explanation now travels with the slide</small>
                </span>
              </li>
              <li>
                <span className="problem-number">03</span>
                <span>
                  <strong>Every choir part except mine</strong>
                  <small>A rehearsal mix built around one voice</small>
                </span>
              </li>
            </ol>
            <div className="problem-log__footer">
              <span>Waterloo, Canada</span>
              <span>Always tinkering</span>
            </div>
          </aside>
        </section>

        <section className="projects-section" id="projects">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Selected work · 01–06</p>
              <h2>Things I wished already existed.</h2>
            </div>
            <p>
              Each one began as a small, recurring annoyance. Open a project to
              see the story behind it.
            </p>
          </div>

          <div className="project-grid">
            {projects.map((project) => (
              <article
                className={`project-card project-card--${project.layout} project-card--${project.id}`}
                key={project.id}
              >
                <button
                  className="project-trigger"
                  ref={(node) => {
                    triggerRefs.current[project.id] = node;
                  }}
                  type="button"
                  aria-label={`Open project note for ${project.name}`}
                  onClick={() => setSelectedProject(project)}
                >
                  <span className="project-meta">
                    <span>
                      {project.number} · {project.category}
                    </span>
                    <span>{project.platform}</span>
                  </span>
                  <span className="project-media">
                    <img
                      src={project.image}
                      alt={`${project.name} interface`}
                      loading={project.number === "01" ? "eager" : "lazy"}
                    />
                    <span className="project-open">
                      Open project note <ExternalArrow />
                    </span>
                  </span>
                  <span className="project-copy">
                    <span>
                      <span className="project-name">{project.name}</span>
                      <span className="project-tagline">{project.tagline}</span>
                    </span>
                    <span className="project-arrow" aria-hidden="true">
                      ↗
                    </span>
                  </span>
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="about-section" id="about">
          <div className="about-kicker">
            <p className="eyebrow">The maker note</p>
            <p className="about-number">⅙</p>
          </div>
          <div className="about-statement">
            <h2>
              Most of my projects start with the sentence, “Surely there is a
              better way to do this.”
            </h2>
          </div>
          <div className="about-copy">
            <p>
              I’m Xiang Li. I build software around the friction I notice in my
              own life—from getting around Waterloo without repeating the same
              search, to studying dense slides, practicing choir, and staying
              intentional online.
            </p>
            <p>
              The result is a slightly unusual collection: Chrome extensions,
              study tools, rehearsal software, and a memory game. What connects
              them is simple: I wanted each one badly enough to make it.
            </p>
            <a
              className="button button--outline"
              href="https://github.com/xiangthebung"
              target="_blank"
              rel="noreferrer"
            >
              See what I’m building on GitHub <ExternalArrow />
            </a>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <p>Built for problems I couldn’t stop noticing.</p>
        <div>
          <span>© 2026 Xiang Li</span>
          <a href="#top">
            Back to top <span aria-hidden="true">↑</span>
          </a>
        </div>
      </footer>

      {selectedProject && (
        <div
          className="project-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="project-modal-title"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) closeProject();
          }}
        >
          <div className="project-modal__panel">
            <button
              className="modal-close"
              type="button"
              onClick={closeProject}
              ref={closeButtonRef}
              aria-label="Close project note"
            >
              <span aria-hidden="true">×</span>
            </button>

            <div className="modal-visual">
              <img
                src={selectedProject.image}
                alt={`${selectedProject.name} interface`}
              />
              <span className="modal-index">{selectedProject.number} / 06</span>
            </div>

            <div className="modal-content">
              <p className="eyebrow">
                {selectedProject.category} · {selectedProject.platform}
              </p>
              <h2 id="project-modal-title">{selectedProject.name}</h2>
              <blockquote>“{selectedProject.story}”</blockquote>
              <p className="modal-description">{selectedProject.description}</p>

              <div className="feature-list" aria-label="Project features">
                {selectedProject.features.map((feature) => (
                  <span key={feature}>{feature}</span>
                ))}
              </div>

              <div className="project-note">
                <span>Worth knowing</span>
                <p>{selectedProject.angle}</p>
              </div>

              <div className="modal-actions">
                {selectedProject.live && (
                  <a
                    className="button button--primary"
                    href={selectedProject.live}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Try the live app <ExternalArrow />
                  </a>
                )}
                <a
                  className="button button--outline"
                  href={selectedProject.source}
                  target="_blank"
                  rel="noreferrer"
                >
                  View source <ExternalArrow />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
