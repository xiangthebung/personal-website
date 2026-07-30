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

import { useEffect, useRef } from "react";
import { PhantomCursor } from "../scene/cursor";
import { useSectionBeat } from "../scene/section-beat";
import { useStoryboard, type Beat } from "../scene/storyboard";
import { ViewportLayer } from "../scene/viewport-layer";
import { useOnScreen } from "../use-on-screen";
import { useSectionFocused } from "../use-section-focus";

type BeatName =
  | "raw"
  | "pull"
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
  { name: "raw", ms: 1600 },
  /* The feed pulling. One beat is not enough room for "faster and faster" to be
     felt — the reel needs about four seconds of runway before the switch, and this
     is the middle of it, where the acceleration becomes obvious. */
  { name: "pull", ms: 1500 },
  /* The click, and the two beats that make it legible.
     This was 650ms of travel and a 240ms press, and a visitor could not tell what had
     happened — the feed went grey and nothing on screen said why. Three things were
     against it at once: the button is 24px, the pointer arrives while thirty hearts are
     crossing the window, and 240ms is under the 460ms the click ring takes to play, so
     the one cue that does exist was cut off partway through.
     Nearly a second of travel with the button haloed, then half a second of press with
     the ring completing — and the deluge stands down for both, so for that moment the
     click is the only thing moving on the page. See `quiet` below. */
  { name: "reach", ms: 1000 },
  { name: "press", ms: 560 },
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

/**
 * Posts in the feed. Numbers are the shapes sites actually write.
 *
 * Six rather than two, because the feed scrolls itself now. Two posts sitting still
 * is a picture of a feed; a reel that will not stop arriving is what the extension
 * is actually about, and you cannot show something being endless with two of it.
 * Only the first two are ever fully in frame — the rest are the runway.
 */
const POSTS = [
  { who: "someone you follow", likes: "48.2K", views: "1.2M views", tint: "a" },
  { who: "a page you liked once", likes: "9,417", views: "310K views", tint: "b" },
  { who: "recommended for you", likes: "212K", views: "4.8M views", tint: "c" },
  { who: "trending in your area", likes: "1.1M", views: "22M views", tint: "d" },
  { who: "because you watched", likes: "63.5K", views: "890K views", tint: "a" },
  { who: "people you may know", likes: "7,208", views: "154K views", tint: "b" },
];

/**
 * How long the reel takes to run its length, and the curve it runs on.
 *
 * The curve is the argument. A linear scroll is a carousel; an ease-in that starts
 * at a crawl and is still gaining speed when it is cut off is what being held by a
 * feed feels like. The duration covers `raw` through `press` — 1600 + 1500 + 650 +
 * 240 — so the switch lands while it is at its fastest.
 */
const REEL_MS = 3990;

/**
 * A burst of rewards leaving one point on the screen.
 *
 * The first version of this rained down the whole window from fixed `vw` positions
 * along the top edge, and it was the wrong picture: it looked like weather. Nothing on
 * screen produced it, so it read as decoration laid over the section rather than as
 * something the feed was doing.
 *
 * These come out of the counters instead — the hearts out of the like count, the
 * bubbles out of the comment count — measured live from the real elements and fired
 * from their actual coordinates. A visitor watches the number and sees what the number
 * is for.
 *
 * Directions are stepped rather than random. `(index * 47) % 141` walks the fan in
 * coprime strides, so no two neighbours in the sequence leave on a similar heading and
 * no seed ever produces the clump that random scatter reliably does. Distances are in
 * viewport units so the spray crosses the same proportion of a laptop and a 4K monitor.
 */
function burst(count: number, spec: { spread: number; from: number; glyphs: readonly string[] }) {
  return Array.from({ length: count }, (_, index) => {
    const degrees = spec.from + ((index * 47) % spec.spread);
    const radians = (degrees * Math.PI) / 180;
    const reach = 42 + ((index * 29) % 52);
    return {
      glyph: spec.glyphs[index % spec.glyphs.length],
      // Cosine across the width, sine up the height, so the fan is wide and tall.
      dx: `${(Math.cos(radians) * reach * 0.62).toFixed(2)}vw`,
      dy: `${(Math.sin(radians) * reach).toFixed(2)}vh`,
      size: 20 + ((index * 13) % 34),
      delay: (index * 137) % 2600,
      spin: ((index * 53) % 90) - 45,
    };
  });
}

/**
 * Hearts and stars out of the like counter, in every direction.
 *
 * The first version fanned them upward only, which looked right in isolation and wrong on
 * the page: the counter sits low in the section, so an upward fan threw every heart over
 * the top edge and across whichever project happened to be above. A full circle keeps the
 * burst around the thing that produced it and reads as an explosion out of a button rather
 * than as a fountain aimed at the neighbours.
 */
const LIKE_BITS = burst(26, {
  from: 0,
  spread: 360,
  glyphs: ["♥", "♥", "★", "♥", "▲", "♥", "★"],
});

/** Comment bubbles out of the comment counter. Fewer, and they do not travel as far. */
const COMMENT_BITS = burst(14, {
  from: 18,
  spread: 360,
  glyphs: ["💬"],
});

/** The other half of being got at: other people, looking at you. */
const SPAM = [
  { title: "12 people liked your post", body: "and 4 others you follow" },
  { title: "3 new followers", body: "someone you may know" },
  { title: "Live now", body: "a page you liked once is streaming" },
  { title: "You have 8 unread", body: "tap to catch up" },
] as const;

const SUGGESTIONS = ["an account like yours", "trending near you", "because you watched"];

export function DecafDemo() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const onScreen = useOnScreen(stageRef);
  /* Two different questions, and they are not interchangeable. `onScreen` decides
     whether the scene inside the box runs. `focused` decides whether it is allowed to
     take over the visitor's whole screen — which it may only do when this is
     unambiguously the section they are looking at. */
  const focused = useSectionFocused(stageRef);

  /* The two counters the bursts come out of, and the portalled layer they are written
     onto. */
  const likeRef = useRef<HTMLSpanElement | null>(null);
  const commentRef = useRef<HTMLSpanElement | null>(null);
  const delugeRef = useRef<HTMLDivElement | null>(null);
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
  /** The two beats where the click has to be the only thing happening. */
  const quiet = beat === "reach" || beat === "press";

  /** Reward counts become a dash — in the text and in the accessible label. */
  const count = (value: string) => (dashed ? "—" : value);

  /**
   * Keeps the bursts pinned to the counters they come out of.
   *
   * The layer is portalled to `document.body` and positioned against the viewport, while
   * the counters live inside a reel scrolling upward inside a section the visitor is also
   * scrolling past. The origin therefore moves for two independent reasons, and writing it
   * once on mount would leave the hearts pouring out of a point the numbers left seconds
   * ago.
   *
   * One `requestAnimationFrame` loop, two `getBoundingClientRect` reads, four custom
   * properties written straight onto the layer element. Nothing re-renders — the same
   * approach the pointer light in `MediaRail` uses, and for the same reason: this must not
   * cost a React pass per frame.
   *
   * Stops once the extension is on, because there is nothing left to emit and no point
   * tracking a position nobody is reading.
   */
  useEffect(() => {
    if (!focused || on) return;

    const section = stageRef.current?.closest("[data-project-section]");

    let frame = 0;
    const write = () => {
      const layer = delugeRef.current;
      if (layer) {
        const like = likeRef.current?.getBoundingClientRect();
        const comment = commentRef.current?.getBoundingClientRect();
        if (like) {
          layer.style.setProperty("--like-x", `${Math.round(like.left + like.width / 2)}px`);
          layer.style.setProperty("--like-y", `${Math.round(like.top + like.height / 2)}px`);
        }
        if (comment) {
          layer.style.setProperty(
            "--comment-x",
            `${Math.round(comment.left + comment.width / 2)}px`,
          );
          layer.style.setProperty(
            "--comment-y",
            `${Math.round(comment.top + comment.height / 2)}px`,
          );
        }

        /* Clipped to this section's share of the window.
           The layer covers the whole viewport, which is the point — a burst that stops at
           the edge of a panel is not a burst. But the viewport usually also contains the
           end of the project above, and hearts drawn over Choir Practice look like they
           belong to Choir Practice. That was reported, from a screenshot, and no threshold
           fixes it: at any ordinary reading position some of the neighbour is visible.
           So the boundary is enforced as a boundary. `inset()` in pixels off the section's
           own rect, rewritten every frame with the origin, cuts every heart off exactly
           where the section ends. Inside its own band the effect is still full width and
           full bleed. */
        if (section) {
          const box = section.getBoundingClientRect();
          const top = Math.max(0, Math.round(box.top));
          const bottom = Math.max(0, Math.round(window.innerHeight - box.bottom));
          layer.style.clipPath = `inset(${top}px 0px ${bottom}px 0px)`;
          /* The top of the band, for anything that wants to sit against it rather than
             against the window. The notification stack does: pinned to the viewport
             corner it was landing inside the section above and getting clipped away
             with it, so the flood arrived without the notifications that are half the
             point. */
          layer.style.setProperty("--band-top", `${top}px`);
        }
      }
      frame = window.requestAnimationFrame(write);
    };

    frame = window.requestAnimationFrame(write);
    return () => window.cancelAnimationFrame(frame);
  }, [focused, on]);

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
                /* The reel. Keyed by `run` so each replay starts from the top, and
                   paused rather than stopped once the extension is on — a feed that
                   fades out has been switched off politely, and a feed that stops
                   dead mid-scroll is what actually happens. */
                <div
                  className="dc-reel"
                  key={`reel-${run}`}
                  data-running={!on}
                  style={{ "--reel-ms": `${REEL_MS}ms` } as React.CSSProperties}
                >
                  {POSTS.map((post, index) => (
                    <article className="dc-post" key={post.who}>
                      <p className="dc-post-head">
                        <span className="dc-post-avatar" />
                        {post.who}
                      </p>
                      <span className={`dc-media dc-media--${post.tint}`}>
                        <i className="dc-play" />
                      </span>
                      {/* The first post's counters are the two emitters. Only the
                          first: it is the one reliably in frame, and thirty-eight
                          things leaving six different points at once is noise rather
                          than emphasis. */}
                      <p className="dc-post-meta">
                        <span className="dc-count" ref={index === 0 ? likeRef : undefined}>
                          <b>♥</b> {count(post.likes)}
                        </span>
                        <span className="dc-count">{count(post.views)}</span>
                        <span
                          className="dc-comments"
                          data-gone={paused}
                          ref={index === 0 ? commentRef : undefined}
                        >
                          {dashed ? "—" : "2,904"} comments
                        </span>
                      </p>
                    </article>
                  ))}
                </div>
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

      {/* The reward, all over the visitor's screen.
          The first version of this was seven small glyphs inside the demo's own box,
          which is a tidy illustration of a thing whose defining quality is that it is
          not tidy. A feed does not politely indicate that it wants your attention. So
          this is thirty of them, big, pouring across the whole window, with follower
          and like notifications stacking up in the corner on top — and all of it
          portalled out of the section so it happens to the page the visitor is
          actually looking at.

          Then the extension goes on and every one of them stops dead where it is,
          loses its colour and drains away. Freezing rather than clearing is the
          argument: nothing was taken from you, it just stopped being worth anything.

          Gated on `onScreen` as well as the beat, because a frozen storyboard would
          otherwise leave the deluge on screen for the rest of the page. */}
      <ViewportLayer className="vlayer--deluge">
        {focused && (
          <div
            className="dc-deluge"
            ref={delugeRef}
            data-running={!on}
            data-spent={on}
            /* Stands down while the extension is being switched on. The whole point of
               those two beats is that a visitor sees a pointer press a button, and it
               cannot compete with thirty hearts crossing the screen — the flood is the
               problem being described, so it gets out of the way of the moment the
               problem is solved. */
            data-quiet={quiet}
            key={`deluge-${run}`}
          >
            {[
              { bits: LIKE_BITS, from: "like" as const },
              { bits: COMMENT_BITS, from: "comment" as const },
            ].map(({ bits, from }) =>
              bits.map((bit, order) => (
                <span
                  className="dc-drop"
                  data-from={from}
                  key={`${from}-${order}`}
                  style={
                    {
                      "--dx": bit.dx,
                      "--dy": bit.dy,
                      "--size": `${bit.size}px`,
                      "--delay": `${bit.delay}ms`,
                      "--spin": `${bit.spin}deg`,
                    } as React.CSSProperties
                  }
                >
                  {bit.glyph}
                </span>
              )),
            )}

            {/* The other half of being got at: things telling you that other people
                are looking at you. Stacked in the corner where they really land. */}
            <div className="dc-spam">
              {SPAM.map((line, order) => (
                <span
                  className="dc-spam-card"
                  key={line.title}
                  style={{ "--card": order } as React.CSSProperties}
                >
                  <i className="dc-spam-dot" />
                  <b>{line.title}</b>
                  <small>{line.body}</small>
                </span>
              ))}
            </div>
          </div>
        )}
      </ViewportLayer>

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
