"use client";

/**
 * Decaf, as a feed losing its grip.
 *
 * The premise is a claim about human behaviour rather than a feature: blocking a
 * site makes you want it, and a site with nothing rewarding left in it is one you
 * put down without deciding to. That is unprovable in a screenshot and obvious in
 * ten seconds of before and after, so the scene runs the change on a feed that is
 * doing everything it can to keep you.
 *
 * The order of the beats is the extension's own order of operations, and each one is
 * a real behaviour rather than a general "calming" effect:
 *
 *   the colour drains out of every image and video, left to right;
 *   every reward number — likes, views, followers — becomes a dash;
 *   the notification badge keeps its count and loses its red, because a real
 *     message still has to get through, and the `(3)` the site wrote into the tab
 *     title goes;
 *   the recommendation rail disappears;
 *   and the feed itself is emptied *where it sits*, its container holding a small
 *     notice instead, with the header and the sidebars not moving by a pixel.
 *
 * That last one is the detail worth staging carefully. Every other "hide the feed"
 * extension collapses the container, and the page jumps. Decaf keeps the box and
 * puts a card in it, and the only way to show that is to have the furniture around
 * it visibly stay put while the middle empties.
 *
 * The scene ends on the escalating hold, which is the design's real argument: the
 * feed is not blocked, it is three seconds away, and tomorrow it is seven.
 *
 * Nothing here is a real site. The layout is a generic one so that no brand is being
 * depicted with its numbers altered, and the copy in the notice is Decaf's own.
 */

import { useRef } from "react";
import { PhantomCursor } from "../scene/cursor";
import { useSectionBeat } from "../scene/section-beat";
import { useStoryboard, type Beat } from "../scene/storyboard";
import { useOnScreen } from "../use-on-screen";

type BeatName =
  | "raw"
  | "reach"
  | "press"
  | "drain"
  | "dashes"
  | "calm"
  | "pause"
  | "aim-hold"
  | "hold"
  | "settle";

const BEATS: readonly Beat<BeatName>[] = [
  // Long enough to feel got at.
  { name: "raw", ms: 1900 },
  { name: "reach", ms: 650 },
  { name: "press", ms: 240 },
  { name: "drain", ms: 1100 },
  { name: "dashes", ms: 900 },
  { name: "calm", ms: 850 },
  { name: "pause", ms: 1500 },
  { name: "aim-hold", ms: 600 },
  { name: "hold", ms: 1900 },
  { name: "settle", ms: 1300 },
];

const CURSOR: Partial<Record<BeatName, string>> = {
  reach: "toolbar",
  press: "toolbar",
  drain: "toolbar",
  "aim-hold": "hold",
  hold: "hold",
};

/** Posts in the feed. Numbers are the shapes sites actually write. */
const POSTS = [
  { who: "someone you follow", likes: "48.2K", views: "1.2M views", tint: "a" },
  { who: "a page you liked once", likes: "9,417", views: "310K views", tint: "b" },
];

const SUGGESTIONS = ["an account like yours", "trending near you", "because you watched"];

export function DecafDemo() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const onScreen = useOnScreen(stageRef);
  const { beat, index, run, still } = useStoryboard(BEATS, {
    running: onScreen,
    stage: stageRef,
    // The still that carries the argument: a paused feed with the page intact
    // around it.
    stillBeat: "pause",
  });

  /* This scene drives its whole section. Decaf's claim is that a page stops
     shouting at you, and proving that inside a frame on an otherwise loud page
     argues against itself — so the colour drains out of the section too. */
  useSectionBeat(stageRef, beat, BEATS);

  const at = (name: BeatName) => BEATS.findIndex((entry) => entry.name === name);
  const on = index >= at("drain");
  const grey = index >= at("drain");
  const dashed = index >= at("dashes");
  const calmed = index >= at("calm");
  const paused = index >= at("pause");
  const holding = beat === "hold";

  /** Reward counts become a dash — in the text and in the accessible label. */
  const count = (value: string) => (dashed ? "—" : value);

  return (
    <div
      className="dc"
      ref={stageRef}
      data-beat={beat}
      data-lap={run}
      data-on={on}
      data-grey={grey}
      data-paused={paused}
      role="img"
      aria-label={
        "A social feed with colour images, like counts and a red notification " +
        "badge. Decaf is switched on: the colour drains out of the media, every " +
        "reward number becomes a dash, the notification badge keeps its count but " +
        "loses its red, the suggestions rail disappears, and the feed is replaced " +
        "in place by a small notice offering a five-minute pass for a three-second " +
        "hold. The header and sidebar do not move."
      }
    >
      <div className="dc-browser">
        {/* The tab strip exists for one detail: the (3) a site writes into its own
            title, and the fact that it stops being there. */}
        <div className="dc-tabs">
          <span className="dc-tab">
            <i className="dc-favicon" />
            <span className="dc-tab-title">
              {calmed ? "" : <b>(3) </b>}
              Home
            </span>
          </span>
          <span className="dc-toolbar" data-target="toolbar">
            <span className="dc-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M5 9h11v4a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5z" />
                  <path d="M16 10.5h2a2.5 2.5 0 0 1 0 5h-2" />
                  <path d="M7.5 5.5c0-1 1-1 1-2M11 5.5c0-1 1-1 1-2" />
                </g>
              </svg>
            </span>
          </span>
        </div>

        <div className="dc-app">
          {/* Furniture. Nothing here moves for the whole scene, and that is the
              point of keeping it on screen. */}
          <aside className="dc-rail">
            <span className="dc-logo" />
            {["Home", "Search", "Messages", "Profile", "Settings"].map((item) => (
              <span className="dc-nav" key={item}>
                <i />
                {item}
              </span>
            ))}
          </aside>

          <div className="dc-main">
            <header className="dc-top">
              <span className="dc-search">Search</span>
              <span className="dc-bell" data-calm={calmed}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M12 4a5 5 0 0 0-5 5v3.5L5.5 15.5h13L17 12.5V9a5 5 0 0 0-5-5Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                  />
                </svg>
                {/* Keeps its number. Loses its urgency. */}
                <b>12</b>
              </span>
              <span className="dc-avatar" />
            </header>

            {/* The feed container. It does not change size, ever. */}
            <div className="dc-feed">
              {paused ? (
                <div className="dc-notice">
                  <p className="dc-notice-head">Decaf paused this feed.</p>
                  <p className="dc-notice-body">
                    Search, messages and anything you open on purpose still work.
                  </p>
                  <span
                    className="dc-hold"
                    data-target="hold"
                    data-holding={holding}
                    data-done={beat === "settle"}
                  >
                    <svg viewBox="0 0 44 44" aria-hidden="true">
                      <circle className="dc-hold-track" cx="22" cy="22" r="19" />
                      <circle className="dc-hold-fill" cx="22" cy="22" r="19" />
                    </svg>
                    <span className="dc-hold-label">
                      {beat === "settle" ? "5 min" : "Hold 3s"}
                    </span>
                  </span>
                  <p className="dc-notice-foot">
                    First pass today is 3 seconds. The next is 7.
                  </p>
                </div>
              ) : (
                POSTS.map((post) => (
                  <article className="dc-post" key={post.who}>
                    <p className="dc-post-head">
                      <span className="dc-post-avatar" />
                      {post.who}
                    </p>
                    <span className={`dc-media dc-media--${post.tint}`}>
                      <i className="dc-play" />
                    </span>
                    <p className="dc-post-meta">
                      <span className="dc-count">
                        <b>♥</b> {count(post.likes)}
                      </span>
                      <span className="dc-count">{count(post.views)}</span>
                      <span className="dc-comments" data-gone={paused}>
                        {dashed ? "—" : "2,904"} comments
                      </span>
                    </p>
                  </article>
                ))
              )}
            </div>
          </div>

          <aside className="dc-suggest" data-gone={paused}>
            <p className="dc-suggest-head">Suggested for you</p>
            {SUGGESTIONS.map((item) => (
              <span className="dc-suggest-row" key={item}>
                <i />
                <span>{item}</span>
                <b>{dashed ? "—" : "12.4K"}</b>
              </span>
            ))}
          </aside>
        </div>
      </div>

      {!still && (
        <PhantomCursor
          stage={stageRef}
          target={CURSOR[beat] ?? null}
          pressing={beat === "press" || holding}
          token={`${run}-${beat}`}
        />
      )}

      <p className="dc-caption" aria-hidden="true">
        {!on ? (
          <>
            <strong>Everything here is asking for another minute.</strong>
          </>
        ) : paused ? (
          <>
            <strong>Not blocked — three seconds away.</strong> Tomorrow&apos;s first
            pass is seven.
          </>
        ) : (
          <>
            <strong>No colour, no counts, no red.</strong> The message badge keeps its
            number.
          </>
        )}
      </p>
    </div>
  );
}
