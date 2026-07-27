/* eslint-disable @next/next/no-img-element -- Local static assets are served directly by the Cloudflare/vinext build. */
import type { CSSProperties } from "react";
import { HydrationSafeVideo } from "./hydration-safe-video";
import { MediaRail, ProjectFocusManager, ProjectRail } from "./project-rail";
import { ProjectSwirlArrow } from "./project-swirl-arrow";
import { mediaAsset } from "./media-manifest";
import {
  entranceStyles,
  funMedia,
  projectMotifs,
  projects,
  type Project,
  type ProjectStep,
} from "./projects";

/**
 * Letters land one after another. The readable title is kept in a parallel
 * sr-only node so assistive tech never sees it spelled out character by
 * character.
 */
function HeroLetters({ text }: { text: string }) {
  return (
    <span className="hero-letters" aria-hidden="true">
      {Array.from(text).map((character, index) => (
        <span
          className="hero-letter"
          key={`${character}-${index}`}
          style={{ "--letter-index": index } as CSSProperties}
        >
          {character === " " ? "\u00A0" : character}
        </span>
      ))}
    </span>
  );
}

function ExternalArrow() {
  return (
    <span aria-hidden="true" className="external-arrow">
      ↗
    </span>
  );
}

/**
 * `<video poster>` takes a single URL with no srcset, so point it straight at the
 * AVIF sibling when the manifest has one.
 */
function preferAvif(src: string): string {
  const candidate = src.replace(/\.(png|jpe?g)$/i, ".avif");
  return candidate !== src && mediaAsset(candidate) ? candidate : src;
}

/** Widths the project rail and the gallery actually paint media at. */
const PROJECT_SIZES = "(max-width: 660px) 82vw, min(54vw, 740px)";
const GALLERY_SIZES = "(max-width: 660px) 78vw, min(30vw, 520px)";

/**
 * Serves AVIF (5-20x smaller than the source PNG/JPEG) with the original as the
 * fallback, and carries the intrinsic size so nothing reflows while media
 * decodes. Both come from the generated manifest; see scripts/build-media.mjs.
 */
function OptimizedImage({
  src,
  alt,
  className,
  style,
  fetchPriority,
  sizes = PROJECT_SIZES,
  eager = false,
}: {
  src: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
  fetchPriority?: "high" | "low" | "auto";
  sizes?: string;
  eager?: boolean;
}) {
  const asset = mediaAsset(src);
  const image = (
    <img
      className={className}
      src={src}
      alt={alt}
      width={asset?.width}
      height={asset?.height}
      loading={eager ? undefined : "lazy"}
      decoding="async"
      fetchPriority={fetchPriority}
      draggable={false}
      data-project-image
      style={style}
    />
  );

  if (!asset?.avif) return image;

  return (
    <picture>
      <source type="image/avif" srcSet={asset.avif} sizes={sizes} />
      {image}
    </picture>
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
            poster={preferAvif(step.poster ?? step.image)}
            ariaLabel={step.alt}
            style={
              step.position ? { objectPosition: step.position } : undefined
            }
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

/**
 * The average colour of each photo backs its own card, so letterbox bars belong
 * to the image instead of being one flat grey.
 */
function tintStyle(src: string): CSSProperties | undefined {
  const tint = mediaAsset(src)?.tint;
  return tint ? ({ "--media-tint": tint } as CSSProperties) : undefined;
}

function GalleryImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="fun-media" style={tintStyle(src)}>
      <OptimizedImage src={src} alt={alt} sizes={GALLERY_SIZES} />
    </div>
  );
}

/**
 * Clips play by themselves once scrolled into view (see MediaRail). `preload` is
 * left at "none" so nothing downloads until the gallery is approached; the rail
 * escalates it. The poster supplies the intrinsic size, which a video element
 * with preload="none" cannot, so the card never reflows once metadata lands.
 */
function GalleryClip({ src, alt }: { src: string; alt: string }) {
  const poster = src.replace(/\.mp4$/, "-poster.avif");
  const asset = mediaAsset(poster);

  return (
    <div className="fun-media fun-media--clip" style={tintStyle(poster)}>
      <video
        data-fun-clip
        muted
        loop
        playsInline
        preload="none"
        poster={poster}
        width={asset?.width}
        height={asset?.height}
        aria-label={alt}
      >
        <source src={src} type="video/mp4" />
        Your browser does not support embedded video.
      </video>
      {/* A real control rather than native chrome: autoplaying motion needs a
          keyboard-reachable way to stop it. */}
      <button
        className="fun-clip-toggle"
        type="button"
        data-fun-toggle
        data-state="paused"
        aria-label={`Play clip: ${alt}`}
      >
        <span aria-hidden="true" />
      </button>
    </div>
  );
}

function stepStyle(step: ProjectStep): CSSProperties | undefined {
  if (!step.pointer && !step.cardRatio && !step.cardWidth) return undefined;

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
    ...(step.cardWidth ? { "--scene-width": step.cardWidth } : {}),
  } as CSSProperties;
}

/**
 * Pop-out screenshots are sized from the height they are allowed to occupy, so
 * the stylesheet needs the ratio as a plain number it can multiply as well as
 * the `aspect-ratio` fallback.
 */
function portraitAspect(ratio: string): number {
  const [width, height] = ratio.split("/").map((part) => Number(part.trim()));
  if (!width || !height) return 0.7;
  return Number((width / height).toFixed(4));
}

function portraitStyle(step: ProjectStep): CSSProperties {
  const ratio = step.portraitRatio ?? "1 / 3.55";

  return {
    ...(step.pointer
      ? {
          "--pointer-x": step.pointer.x,
          "--pointer-y": step.pointer.y,
          "--pointer-length": step.pointer.length,
          "--pointer-angle": step.pointer.angle,
        }
      : {}),
    "--portrait-ratio": ratio,
    "--portrait-aspect": portraitAspect(ratio),
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

      {/* One element, three paintable layers (itself plus two pseudo-elements),
          used for each theme's ambient motion. Purely decorative. */}
      <div className="project-ambience" aria-hidden="true" />

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
                  step.cardWidth ? "scene-card--sized" : "",
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

const HERO_SOURCE = "/hero-face-1600.jpg";

const shortcutHints: [string, string][] = [
  ["J", "Next project"],
  ["K", "Previous project"],
  ["← →", "Move through a project's screenshots"],
  ["G", "Jump to the gallery"],
  ["T", "Back to the top"],
  ["?", "This list"],
];

export default function Home() {
  const heroAvif = mediaAsset(HERO_SOURCE)?.avif;

  return (
    <main id="top">
      {/* Fills as the page is descended; coloured by the project you are in. */}
      <div className="page-trail" aria-hidden="true">
        <span />
      </div>

      <section className="hero" aria-labelledby="hero-title">
        <picture className="hero-art">
          {heroAvif && (
            <source type="image/avif" srcSet={heroAvif} sizes="100vw" />
          )}
          <img
            src={HERO_SOURCE}
            alt=""
            width="1600"
            height="2133"
            decoding="async"
            fetchPriority="high"
            draggable={false}
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
          <h1 id="hero-title">
            <span className="sr-only">Xiang Li</span>
            <HeroLetters text="Xiang Li" />
          </h1>
          <p>Projects (including this website) are built with AI</p>
          <a className="hero-cue" href={`#${projects[0].id}`}>
            <span className="hero-cue-line" aria-hidden="true" />
            Start exploring
          </a>
        </div>

        <nav className="project-index" aria-label="Project index">
          {projects.map((project) => (
            <a href={`#${project.id}`} key={project.id}>
              <span>{project.number}</span>
              <strong>{project.name}</strong>
              {/* Peek at where the link goes before committing to the jump. */}
              <span className="project-index-peek" aria-hidden="true">
                <OptimizedImage
                  src={project.steps[0].poster ?? project.steps[0].image}
                  alt=""
                  sizes="200px"
                />
              </span>
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
                {media.kind === "image" ? (
                  <GalleryImage src={media.src} alt={media.alt} />
                ) : (
                  <GalleryClip src={media.src} alt={media.alt} />
                )}
              </figure>
            ))}
          </div>
        </MediaRail>
      </section>

      {/* Revealed by "?" -- see the shortcut handler in ProjectFocusManager. */}
      <aside className="shortcut-sheet" aria-label="Keyboard shortcuts">
        <h2>Shortcuts</h2>
        <dl>
          {shortcutHints.map(([keys, description]) => (
            <div key={keys}>
              <dt>
                <kbd>{keys}</kbd>
              </dt>
              <dd>{description}</dd>
            </div>
          ))}
        </dl>
        <small>Press ? or Esc to close</small>
      </aside>

      <ProjectFocusManager />
    </main>
  );
}
