/* eslint-disable @next/next/no-img-element -- Local static assets are served directly by the Cloudflare/vinext build. */
import type { CSSProperties } from "react";
import { HydrationSafeVideo } from "./hydration-safe-video";
import { MediaRail, ProjectFocusManager, ProjectRail } from "./project-rail";
import { ProjectSwirlArrow } from "./project-swirl-arrow";
import {
  entranceStyles,
  funMedia,
  projectMotifs,
  projects,
  type Project,
  type ProjectStep,
} from "./projects";

function ExternalArrow() {
  return (
    <span aria-hidden="true" className="external-arrow">
      ↗
    </span>
  );
}

function OptimizedImage({
  src,
  alt,
  className,
  style,
  fetchPriority,
}: {
  src: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
  fetchPriority?: "high" | "low" | "auto";
}) {
  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      fetchPriority={fetchPriority}
      data-project-image
      style={style}
    />
  );
}

function SceneContent({
  step,
  index,
  total,
  portrait = false,
}: {
  step: ProjectStep;
  index: number;
  total: number;
  portrait?: boolean;
}) {
  return (
    <div className="scene-card-motion">
      <figure className={portrait ? "portrait-popout-image scene-image" : "scene-image"}>
        {step.video ? (
          <HydrationSafeVideo
            src={step.video}
            poster={step.poster ?? step.image}
            ariaLabel={step.alt}
          />
        ) : (
          <OptimizedImage
            src={step.image}
            alt={step.alt}
            fetchPriority="low"
            style={
              step.position ? { objectPosition: step.position } : undefined
            }
          />
        )}
      </figure>
      {step.pointer && <span className="scene-pointer" aria-hidden="true" />}
      <div className="scene-callout">
        <span>
          {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </span>
        <h3>{step.title}</h3>
        <p>{step.text}</p>
      </div>
    </div>
  );
}

function stepStyle(step: ProjectStep): CSSProperties | undefined {
  if (!step.pointer && !step.cardRatio) return undefined;

  return {
    ...(step.pointer
      ? {
          "--pointer-x": step.pointer.x,
          "--pointer-y": step.pointer.y,
          "--pointer-length": step.pointer.length,
          "--pointer-angle": step.pointer.angle,
        }
      : {}),
    ...(step.cardRatio ? { "--scene-ratio": step.cardRatio } : {}),
  } as CSSProperties;
}

function portraitStyle(step: ProjectStep): CSSProperties {
  return {
    ...(step.pointer
      ? {
          "--pointer-x": step.pointer.x,
          "--pointer-y": step.pointer.y,
          "--pointer-length": step.pointer.length,
          "--pointer-angle": step.pointer.angle,
        }
      : {}),
    "--portrait-ratio": step.portraitRatio ?? "1 / 3.55",
  } as CSSProperties;
}

function ProjectSection({ project, index }: { project: Project; index: number }) {
  const portraitSteps = project.steps
    .map((step, stepIndex) => ({ step, index: stepIndex }))
    .filter(({ step }) => step.display === "portrait-popout");

  const portraitLayers = portraitSteps.map(({ step, index: stepIndex }) => {
    const calloutSide =
      step.calloutSide ?? (stepIndex % 2 === 0 ? "left" : "right");

    return (
      <article
        className={[
          "scene-card",
          "portrait-popout",
          `portrait-popout--step-${stepIndex}`,
          stepIndex === 0 ? "is-visible" : "",
          `scene-card--${step.fit ?? "cover"}`,
          `scene-card--${step.surface ?? "light"}`,
          `scene-card--${calloutSide}`,
          `scene-card--layout-${(stepIndex % 4) + 1}`,
        ].join(" ")}
        data-portrait-step={stepIndex}
        key={step.image}
        style={portraitStyle(step)}
      >
        <SceneContent
          step={step}
          index={stepIndex}
          total={project.steps.length}
          portrait
        />
      </article>
    );
  });

  return (
    <section
      className={`project project--${project.theme}${index === 0 ? " is-active" : " is-after-active"}`}
      id={project.id}
      aria-labelledby={`${project.id}-title`}
      data-project-section
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
          <a href={project.source} target="_blank" rel="noreferrer">
            Source <ExternalArrow />
          </a>
          {project.live && (
            <a
              className="project-live-link"
              href={project.live}
              target="_blank"
              rel="noreferrer"
            >
              Open project <ExternalArrow />
            </a>
          )}
        </div>
      </div>

      <ProjectRail
        projectId={project.id}
        projectName={project.name}
        portraitLayers={portraitLayers}
      >
        <div
          className={`project-track${project.live ? " project-track--has-live" : ""}`}
        >
          <div className="scene-kicker" aria-hidden="true">
            <span>{projectMotifs[project.id].label}</span>
            <strong className="scene-kicker-mark">
              {projectMotifs[project.id].mark}
            </strong>
            <small>drag →</small>
          </div>

          {project.steps.map((step, stepIndex) => {
            const calloutSide =
              step.calloutSide ?? (stepIndex % 2 === 0 ? "left" : "right");
            const entrance =
              entranceStyles[
                (Number(project.number) + stepIndex - 1) % entranceStyles.length
              ];

            if (step.display === "portrait-popout") {
              return (
                <article
                  aria-hidden="true"
                  className="scene-card scene-card--portrait-proxy"
                  data-step={stepIndex}
                  key={step.image}
                />
              );
            }

            return (
              <article
                className={[
                  "scene-card",
                  stepIndex === 0 ? "is-visible" : "",
                  `scene-card--${step.fit ?? "cover"}`,
                  step.cardRatio ? "scene-card--contained" : "",
                  `scene-card--${step.surface ?? "light"}`,
                  `scene-card--${calloutSide}`,
                  `scene-card--${entrance}`,
                  `scene-card--layout-${(stepIndex % 4) + 1}`,
                ].join(" ")}
                data-step={stepIndex}
                key={step.image}
                style={stepStyle(step)}
              >
                <SceneContent
                  step={step}
                  index={stepIndex}
                  total={project.steps.length}
                />
              </article>
            );
          })}

          <div
            className={`scene-end${project.live ? " scene-end--with-live" : ""}`}
          >
            <a href={`#${projects[Number(project.number)]?.id ?? "top"}`}>
              {Number(project.number) < projects.length
                ? "Next project ↓"
                : "Back to top ↑"}
            </a>
          </div>
        </div>
      </ProjectRail>

      {/* Sits outside the rail so it can reach across the heading rule to the
          "Open project" link. Revealed once the rail is scrolled to its end. */}
      {project.live && <ProjectSwirlArrow />}

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
    <main id="top">
      <section className="hero" aria-labelledby="hero-title">
        <picture className="hero-art">
          <img
            src="/hero-face-1600.jpg"
            alt=""
            width="1600"
            height="2133"
            decoding="async"
            fetchPriority="high"
          />
        </picture>

        <a
          className="hero-github"
          href="https://github.com/xiangthebung"
          target="_blank"
          rel="noreferrer"
        >
          GitHub <ExternalArrow />
        </a>

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
        {projects.map((project, index) => (
          <ProjectSection project={project} index={index} key={project.id} />
        ))}
      </div>

      <section className="fun-section" aria-label="Additional media">
        <MediaRail itemCount={funMedia.length}>
          <div className="fun-rail">
            {funMedia.map((media) => (
              <figure className="fun-card" key={media.src}>
                <div className="fun-media">
                  {media.kind === "image" ? (
                    <img
                      src={media.src}
                      alt={media.alt}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <video
                      controls
                      muted
                      loop
                      playsInline
                      preload="none"
                      poster={media.src.replace(/\.mp4$/, "-poster.avif")}
                      aria-label={media.alt}
                    >
                      <source src={media.src} type="video/mp4" />
                      Your browser does not support embedded video.
                    </video>
                  )}
                </div>
              </figure>
            ))}
          </div>
        </MediaRail>
      </section>

      <section className="ending">
        <div>
          <span>Built with AI.</span>
        </div>
      </section>

      <ProjectFocusManager />
    </main>
  );
}
