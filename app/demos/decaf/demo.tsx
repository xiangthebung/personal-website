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
import { SpecTags, type SpecTag } from "../scene/spec";
import { useStoryboard, type Beat } from "../scene/storyboard";
import { ViewportLayer } from "../scene/viewport-layer";
import { useOnScreen } from "../use-on-screen";
import { useSceneRun } from "../scene/use-scene-run";
import { useSectionFocused } from "../use-section-focus";

type BeatName =
  | "arrive"
  | "raw"
  | "pull"
  | "notice"
  | "reach"
  | "press"
  | "drain"
  | "dashes"
  | "calm"
  | "pause"
  | "aim-hold"
  | "hold"
  | "settle";

/**
 * Thirteen beats, 20.3 seconds.
 *
 * The account of what was wrong with the old eleven is worth keeping, because it was
 * a first-time visitor's account and it was not about any single beat being short:
 * *"I come from Choir Practice, I am met with a bunch of likes and notifications, then
 * immediately it is grey. I am confused, what just happened?"*
 *
 * Three separate failures in one sentence.
 *
 * It opened mid-flood. The first frame of the section was already the argument, so
 * there was never a moment of "this is an ordinary feed" to compare the argument
 * against — and arriving from another project, the flood read as the section's
 * decoration rather than as its subject. Hence `arrive`: a still feed, in colour, with
 * its counts and its red badge, and nothing happening to it yet.
 *
 * Nothing redirected the eye before the click. The pointer set off for a 24px button
 * while thirty hearts were crossing the window, so the one thing worth watching was
 * the least visible thing on screen. Hence `notice`: the flood drops back, the feed
 * itself dims, and the button starts pulsing on its own — a beat whose entire job is
 * to say *there is something here that is not the feed*, before anything moves toward
 * it.
 *
 * And the payoff arrived faster than the eye could follow it. `drain`, `dashes` and
 * `calm` are three distinct claims — the colour goes, the numbers go, the red goes but
 * the number stays — and they were sharing 2,850ms between them, so they landed as one
 * undifferentiated grey event. They now get 4,600ms and a caption each.
 */
const BEATS: readonly Beat<BeatName>[] = [
  // An ordinary feed, holding still. The baseline everything after this is measured
  // against, and the beat whose absence caused the confusion.
  { name: "arrive", ms: 2000 },
  // It starts arriving on its own.
  { name: "raw", ms: 1900 },
  // Full flood. This is the complaint the extension answers, at its loudest.
  { name: "pull", ms: 2000 },
  // The turn. The flood stands down, the feed dims, the toolbar starts asking.
  { name: "notice", ms: 1400 },
  /* The travel. Slower than the cursor's default 620ms glide — see the Decaf override
     in the stylesheet — because a pointer that crosses the frame in half a second is a
     pointer nobody saw move. */
  { name: "reach", ms: 1600 },
  // The press, comfortably longer than the 520ms its own click ring takes to play.
  { name: "press", ms: 800 },
  // One claim per beat from here, each with its own line of caption.
  { name: "drain", ms: 1700 },
  { name: "dashes", ms: 1500 },
  { name: "calm", ms: 1400 },
  { name: "pause", ms: 1800 },
  { name: "aim-hold", ms: 800 },
  { name: "hold", ms: 1900 },
  { name: "settle", ms: 1500 },
];

/**
 * Where the pointer is.
 *
 * It enters on `notice` rather than on `reach`, which is the beat that fixed the
 * complaint about the movement being missable. Arriving and travelling in the same beat
 * meant the cursor faded up already halfway to the button; entering while it is still
 * parked off to the side, and only setting off once the visitor has had a beat to see it
 * there, is what makes the travel itself readable.
 */
const CURSOR: Partial<Record<BeatName, string>> = {
  notice: "feed",
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
 * The curve is the argument. A linear scroll is a carousel; an ease-in that starts at a
 * crawl and is still gaining speed when it is cut off is what being held by a feed
 * feels like.
 *
 * The duration covers `raw` through `press` — 1900 + 2000 + 1400 + 1600 + 800 — so the
 * switch lands while the reel is at its fastest. It deliberately does not cover
 * `arrive`: the reel is held at its first frame through that beat, so the section opens
 * on a feed sitting still. If a beat in that range changes, this changes with it.
 */
const REEL_MS = 7700;

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
    /**
     * How far out this one flies, and it has to land somewhere it can be seen.
     *
     * This was `42 + (index * 29) % 52` — up to 94vh of vertical travel — and filming
     * the flood showed what that costs: nineteen of forty-six rewards were outside the
     * window entirely, and more were inside the window but outside the layer's clip to
     * Decaf's own band. Half the cloud was hanging where nobody could see it, so the
     * flood looked thin while paying for every element in it.
     *
     * 18 to 48, weighted wide rather than tall: the fan is roughly ±45vw across and
     * ±28vh down, which fits inside a section that is 84svh tall and reads as filling
     * the screen because it is filling the part of the screen this section owns.
     *
     * The modulus has to be coprime with the stride, and the first version of this was
     * `(index * 29) % 29` — which is zero for every index, so all forty-eight rewards
     * came out at exactly radius 18 and the flood rendered as a tidy ring around the
     * counter. Every stepped value in this function relies on that property; 29 against
     * 31 gives all thirty-one radii before repeating.
     */
    const reach = 18 + ((index * 29) % 31);
    return {
      glyph: spec.glyphs[index % spec.glyphs.length],
      // Cosine across the width, sine down the height. Wider than tall, like a window.
      dx: `${(Math.cos(radians) * reach * 0.95).toFixed(2)}vw`,
      dy: `${(Math.sin(radians) * reach * 0.58).toFixed(2)}vh`,
      size: 26 + ((index * 13) % 42),
      delay: (index * 137) % 2600,
      spin: ((index * 53) % 90) - 45,
      /* For the fall. Nothing drops straight: a small sideways drift and some extra
         tumble on the way down, both stepped in coprime strides like the headings above
         so no two neighbours behave alike and no seed produces a clump. */
      drift: `${(((index * 31) % 9) - 4).toFixed(1)}vw`,
      tumble: ((index * 67) % 220) - 110,
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
const LIKE_BITS = burst(48, {
  from: 0,
  spread: 360,
  glyphs: ["♥", "♥", "★", "♥", "▲", "♥", "★"],
});

/** Comment bubbles out of the comment counter. Fewer, and they do not travel as far. */
const COMMENT_BITS = burst(20, {
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

/**
 * What the press did, printed on each thing it did it to.
 *
 * This is the change that made the section legible, and the report that prompted it was
 * blunt: *nobody reads the project description while the animation is running*. Which was
 * true, and was true of all seven sections, and was worst here — the three notes in
 * the column beside this scene were the only place the page said what Decaf actually
 * does, and they sat beside ten seconds of hearts crossing the screen.
 *
 * So the notes are gone and their content is here, pinned to its evidence. "Media
 * greyscaled" is next to the image that just lost its colour. "Notifications muted" is
 * next to the badge that just lost its red and kept its number. There is no gap between
 * the claim and the proof for a visitor to fail to cross.
 *
 * They burst out of the toolbar button, on a stagger, which is the point of the layout
 * as much as of the copy: one press, and six things fly out of it and land on six
 * different parts of the page. That reads as *this switch did all of this* in a way six
 * bullet points four inches away cannot.
 *
 * Coordinates are percentages of the pod, which is a fixed-geometry browser — `.dc-app`
 * is a fixed three-column grid and `.dc-feed` is exactly 268px whatever is in it, for the
 * reasons in the stylesheet — so a percentage lands on the same element at every width.
 *
 * The three labels over the feed carry `until: "pause"`, because the feed is what the
 * notice card replaces. A label left pinned over the notice would be a label pointing at
 * nothing, which is the one failure this whole idea cannot survive. The other three sit
 * on furniture that never moves — the tab strip, the header, the suggestions column — so
 * they stay to the end and the last frame is the whole argument at once.
 */
const SPECS: readonly SpecTag<BeatName>[] = [
  /* "Media greyscaled" was the first wording and it was written from inside the code.
     Greyscale is a filter name; a person watching this sees the colour go. */
  { at: "drain", text: "Colour off", x: 21, y: 35, until: "pause" },
  { at: "drain", text: "Autoplay stopped", x: 50, y: 42, until: "pause" },
  { at: "dashes", text: "Likes and views hidden", x: 22, y: 59, until: "pause" },
  /* Reads leftward, over the search field, and stops just short of the bell. Anything
     anchored at the bell and reading rightward runs off the edge of the window it is
     describing; anything anchored *on* it covers the badge that is the whole point.

     Two rewrites got here. "Notifications muted, count kept" described the mechanism and
     left the reader to work out which half was the point. "Keeps the count, loses the red"
     described the pixels — which is accurate, and reads as a riddle about a badge rather
     than as a thing the extension does for you. This says what it is for. The badge in the
     frame keeps its 12 and drops its red at the same moment, so the mechanism is still on
     screen for anyone who looks; it just is not what the label is about. */
  { at: "calm", text: "Notifications less distracting", x: 72, y: 17.5, side: "left" },
  /* There was a second label here, reading rightward along the tab strip: "Tab title stops
     counting", pointing at the `(3)` that a site writes into its own title and that Decaf
     removes. It is a real behaviour and it is still in the scene — the `(3)` still goes.
     But naming it needs the visitor to already know that sites do that, and to have noticed
     which two characters changed in a 10px tab label. A label that has to teach a premise
     before it can make a point is a label nobody finishes reading. */
  { at: "pause", text: "Suggestions gone", x: 89, y: 20, side: "below" },
];

/** The button they all come out of: the toolbar icon, in the pod's own percentages. */
const SPEC_ORIGIN = { x: 97, y: 5 };

export function DecafDemo() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const onScreen = useOnScreen(stageRef);
  /* Two different questions, and they are not interchangeable. `onScreen` decides
     whether the scene inside the box runs. `focused` decides whether it is allowed to
     take over the visitor's whole screen — which it may only do when this is
     unambiguously the section they are looking at. */
  const focused = useSectionFocused(stageRef);
  /* Starts when the visitor is standing here, not 120px before the section arrives. This
     scene has the most to lose from the old behaviour: its first two seconds are a still,
     ordinary feed, and arriving to find the flood already at full height is arriving after
     the setup. See `useSceneRun`. */
  const running = useSceneRun(focused, onScreen);

  /* The two counters the bursts come out of, and the portalled layer they are written
     onto. */
  const likeRef = useRef<HTMLSpanElement | null>(null);
  const commentRef = useRef<HTMLSpanElement | null>(null);
  const delugeRef = useRef<HTMLDivElement | null>(null);
  const { beat, index, run, still } = useStoryboard(BEATS, {
    running,
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

  /**
   * Whether the feed is actively working on you.
   *
   * Not simply `!on`. The scene now opens on a still feed for two seconds — see
   * `arrive` — and both the reel and the burst have to hold at their first frame
   * through it, or the section still starts mid-flood and the beat buys nothing.
   */
  const flooding = index >= at("raw") && !on;

  /**
   * The three beats where the click has to be the only thing moving.
   *
   * `notice` is included, and it is the one that matters: it is the beat that redirects
   * the eye before anything travels, so it is the beat that most needs the flood out of
   * the way.
   */
  const quiet = beat === "notice" || beat === "reach" || beat === "press";

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

    /* Only measured when the geometry can actually have moved.
       This used to read three `getBoundingClientRect`s and write five custom properties
       on every single frame — 180 layout reads a second, and forced synchronous ones
       whenever anything else had invalidated layout. It was the most expensive thing in
       the scene by a wide margin.
       Two things make it unnecessary. The page's scroll position and the window's height
       are the only inputs that move the counters relative to the viewport, so comparing
       those two numbers is enough to know whether a measurement is worth taking. And
       the drops now fly out once and hang, rather than cycling forever, so the origin
       only has to be right at the moment each one launches — tracking the counter as
       the reel scrolls underneath it would actively drag the whole suspended cloud
       upward, which is the opposite of what it should do. */
    let lastY = Number.NaN;
    let lastHeight = Number.NaN;

    let frame = 0;
    const write = () => {
      const y = window.scrollY;
      const height = window.innerHeight;
      if (y === lastY && height === lastHeight) {
        frame = window.requestAnimationFrame(write);
        return;
      }
      lastY = y;
      lastHeight = height;

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
        {/* The switch throwing a wash across the page it is switching off.
            One soft radial glow scaling up out of the toolbar button, clipped by the
            browser's own overflow so it reads as something crossing the window. It is
            keyed to `data-on` rather than to the press beat because `press` is 800ms and
            the wash is 1500 — hung on the beat it would be cut off by its own successor,
            and hung on both beats it would restart halfway through. `data-on` turns true
            once, at `drain`, which is also the frame the colour starts leaving. */}
        <span className="dc-wave" aria-hidden="true" />

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

            {/* The feed container. It does not change size, ever.
                It is also a cursor target: the pointer enters here, on the thing the
                visitor is already looking at, and only then sets off for the toolbar.
                Entering directly at the toolbar meant the pointer faded up at its
                destination, so there was no journey to notice. */}
            <div className="dc-feed" data-target="feed">
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
                  data-running={flooding}
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
            data-running={flooding}
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
                      "--drift": bit.drift,
                      "--tumble": `${bit.tumble}deg`,
                    } as React.CSSProperties
                  }
                >
                  {/* Two elements, because there are two independent movements: the
                      outer one flies out and later falls, the inner one bobs on the
                      spot while it hangs. One element cannot do both — they would be
                      fighting over `transform`. */}
                  <i className="dc-drop-body">{bit.glyph}</i>
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

      {/* What the press did, on each thing it did it to. See `SPECS`.
          Still no caption: a caption is a line of prose under a picture, which is the
          arrangement that failed. These are labels on the picture. */}
      <SpecTags
        beats={BEATS}
        beat={beat}
        tags={SPECS}
        origin={SPEC_ORIGIN}
        className="dc-specs"
      />
    </div>
  );
}
