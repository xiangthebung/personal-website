/* eslint-disable @next/next/no-img-element -- Local static assets are served directly by the Cloudflare/vinext build. */
import type { CSSProperties } from "react";
import Link from "next/link";
import { Backdrop, BackdropFront } from "./backdrops";
import { Closing } from "./closing";
import { IndexMark } from "./index-marks";
import { MediaRail, ProjectFocusManager } from "./page-chrome";
import { DemoMount } from "./demos/demo-mount";
import { policiesFor } from "./legal/policies";
import { mediaAsset } from "./media-manifest";
import { funMedia, projectMotifs, projects, type Project } from "./projects";

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
 * How wide the browser should expect this print to land.
 *
 * Every print in the gallery shares a height and takes whatever width its own
 * aspect ratio gives it, so one `sizes` string for the whole rail would be wrong
 * for all but one shape: the set runs from a 0.47 phone screenshot to a 1.33
 * landscape, which is 246px against 693px at the same height. The two numbers are
 * the height clamp in `.fun-media img` — 300 for the small end, 560 for the large.
 */
function gallerySizes(src: string): string {
  const asset = mediaAsset(src);
  if (!asset?.width || !asset?.height) return "(max-width: 660px) 78vw, 560px";

  const ratio = asset.width / asset.height;
  return `(max-width: 660px) ${Math.round(ratio * 300)}px, ${Math.round(ratio * 560)}px`;
}

/**
 * Serves AVIF (5-20x smaller than the source PNG/JPEG) with the original as the
 * fallback, and carries the intrinsic size so nothing reflows while media
 * decodes. Both come from the generated manifest; see scripts/build-media.mjs.
 */
function OptimizedImage({ src, alt }: { src: string; alt: string }) {
  const asset = mediaAsset(src);
  const image = (
    <img
      src={src}
      alt={alt}
      width={asset?.width}
      height={asset?.height}
      loading="lazy"
      decoding="async"
      fetchPriority="low"
      draggable={false}
    />
  );

  if (!asset?.avif) return image;

  return (
    <picture>
      <source type="image/avif" srcSet={asset.avif} sizes={gallerySizes(src)} />
      {image}
    </picture>
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
      <OptimizedImage src={src} alt={alt} />
    </div>
  );
}

/**
 * Clips play by themselves once scrolled into view (see MediaRail). Neither the
 * video nor its poster is requested until the gallery approaches: the poster URL
 * lives in `data-poster` and the rail promotes both together. Explicit dimensions
 * preserve the card's intrinsic ratio before either resource arrives.
 */
function GalleryClip({ src, alt }: { src: string; alt: string }) {
  const poster = src.replace(/\.mp4$/, "-poster.avif");
  const asset = mediaAsset(poster);

  return (
    <div className="fun-media fun-media--clip" style={tintStyle(poster)}>
      <video
        data-fun-clip
        data-poster={poster}
        muted
        loop
        playsInline
        preload="none"
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

function ProjectSection({ project, index }: { project: Project; index: number }) {
  const motif = projectMotifs[project.id];
  const policies = policiesFor(project.id);

  return (
    <section
      className={`project project--${project.theme}${index === 0 ? " is-active" : " is-after-active"}`}
      id={project.id}
      aria-labelledby={`${project.id}-title`}
      data-project-section
      /* Which composition this section uses. The variants are in the stylesheet;
         see `Stage` in projects.ts for why there are four and not seven. */
      data-stage={project.stage}
    >
      {/* The theme's ambient motion, plus — where the project has a subject worth
          drawing — a backdrop with real markup in it. Two pseudo-elements is not a
          budget you can put a road with traffic on, and keying the background off
          the palette meant a bus network and a choir shared one, because both are
          mint. See `app/backdrops.tsx`. */}
      <div className="project-ambience" aria-hidden="true">
        <Backdrop project={project.id} />
      </div>

      {/* The number, as furniture. Behind everything, clipped by the section. */}
      <span className="project-ghost-number" aria-hidden="true">
        {project.number}
      </span>

      {/* What makes the page one place rather than a stack of coloured panels: a wash
          in the colour of whichever project you are currently standing in, at whatever
          opacity this section has lost. Deliberately after the ambience and the number
          so it covers both — see `.project > .project-tint`. */}
      <div className="project-tint" aria-hidden="true" />

      {/* This theme's signature entrance. Its own element rather than a borrowed
          pseudo-element on `.project-ambience`, which already owns both of its own
          for the drifting background — see the stylesheet. */}
      <div className="project-veil" aria-hidden="true" />

      {/* Everything the compositions arrange. A wrapper is needed because two of
          the four variants place the heading and the well as grid siblings, and
          the ambience and the ghost number must not become grid items too. */}
      <div className="project-body">
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
                {motif && (
                  <span className="project-mode" aria-hidden="true">
                    {motif.mark} {motif.label}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="project-summary">
            <p>{project.headline}</p>
            {/* Only where the headline does not already contain the reason. See the note on
                `why` in projects.ts. */}
            {project.why && <small>{project.why}</small>}
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
            {/* Disclosures remain available without competing with the two primary
                project actions. They also opt out of speculative route prefetching;
                these low-frequency documents should load only when requested. */}
            {policies.length > 0 && (
              <span className="project-policy-links">
                {policies.map((policy) => (
                  <Link
                    className="project-policy-link"
                    href={`/legal/${policy.slug}`}
                    key={policy.slug}
                    prefetch={false}
                  >
                    {policy.kind === "privacy" ? "Privacy" : "Terms"}
                  </Link>
                ))}
              </span>
            )}
          </div>

          {/* There was a list of three notes here, per project, and it is gone.
              A column of feature bullets beside a running scene is a column nobody reads —
              the scene wins that competition every time, and the list still took up the
              room. Every claim it carried is now a label inside the frame, on the thing
              making the claim; see `demos/scene/spec.tsx` and each pod's `SPECS`. What
              stays in this column is a name, a platform, a headline and the problem, which
              is the one thing a demonstration of the solution cannot state. */}
        </div>

        <div className="project-window">
          <div className="demo">
            {/* Only where there is one. Four of the seven have none — see the note on
                `invitation` in `projects.ts` — and an empty chrome row would leave the
                reserved band above the scene doing nothing but taking up space. */}
            {project.invitation && (
              <div className="demo-chrome">
                <p>{project.invitation}</p>
              </div>
            )}

            <div
              className={`demo-surface${project.well === "dark" ? " demo-surface--dark" : ""}`}
            >
              <DemoMount demo={project.demo} />
            </div>
          </div>
        </div>
      </div>

      {/* Anything that belongs over the scene rather than behind it. Almost always
          nothing — see `BackdropFront`. PagePack's cable is here because it has to be
          seen being pulled apart, and behind the scene it was covered by the reader
          panel and therefore did not exist. */}
      <div className="project-foreground" aria-hidden="true">
        <BackdropFront project={project.id} />
      </div>
    </section>
  );
}

const HERO_SOURCE = "/hero-face-1600.jpg";

const shortcutHints: [string, string][] = [
  ["J", "Next project"],
  ["K", "Previous project"],
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

      {/* A compact route through the long project run. It stays hidden over the
          hero and gallery; ProjectFocusManager reveals it only while a project
          owns the viewport and marks the matching destination. */}
      <nav className="project-dock" aria-label="Project navigation">
        <a className="project-dock-home" href="#top" aria-label="Back to the top">
          XL
        </a>
        <span className="project-dock-links">
          {projects.map((project) => (
            <a
              href={`#${project.id}`}
              key={project.id}
              data-project-dock={project.id}
              title={project.name}
            >
              <span>{project.number}</span>
              <strong>{project.name}</strong>
            </a>
          ))}
        </span>
        <button type="button" data-shortcut-trigger title="Keyboard shortcuts">
          <kbd>?</kbd>
          <span>Shortcuts</span>
        </button>
      </nav>

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

          <a className="hero-cue" href={`#${projects[0].id}`}>
            <span className="hero-cue-line" aria-hidden="true" />
            Start exploring
          </a>
        </div>

        {/* Not a list of names. Each row carries the scene in miniature, running,
            so the line above it is already true before anything is scrolled. See
            app/index-marks.tsx. */}
        <nav className="project-index" aria-label="Project index">
          {projects.map((project, order) => (
            <a
              href={`#${project.id}`}
              key={project.id}
              style={{ "--order": order } as CSSProperties}
            >
              <span className="project-index-number">{project.number}</span>
              <IndexMark project={project.id} />
              <strong>{project.name}</strong>
              <span className="project-index-arrow" aria-hidden="true">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M12 5v14M6 13l6 6 6-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </a>
          ))}
        </nav>
      </section>

      <div id="projects">
        {projects.map((project, index) => (
          <ProjectSection project={project} index={index} key={project.id} />
        ))}
      </div>

      {/* The gallery: a draggable row of photographs, each at its own proportions.
          No heading and no caption — a row of pictures is self-evident, and the
          paper mount and pin that used to frame each one were furniture around the
          thing worth looking at. The section is labelled here rather than by a
          visible title, and the rail inside carries its own instructions for
          assistive tech; see MediaRail. */}
      <section className="fun-section" aria-label="Photos and clips">
        <MediaRail itemCount={funMedia.length}>
          <div className="fun-rail">
            {funMedia.map((media, order) => (
              <figure
                className="fun-card"
                key={media.src}
                /* Alternating tilts, cycling through four angles rather than
                   randomised: random gives you two neighbours at the same angle
                   often enough to look like a mistake. */
                data-tilt={order % 4}
              >
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

      {/* The last paragraph of the argument. It carries the contact details and
          the policy index that used to live in a thin footer under the photo
          rail — a page that spends seven sections proving it is careful should not
          end on a picture of dinner. */}
      <Closing />

      <ProjectFocusManager />
    </main>
  );
}
