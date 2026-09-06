"use client";

/**
 * Decaf, as a feed losing its grip — and then as the extension accounting for it.
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
 *   the notification badges keep their counts and lose their red, because a real
 *     message still has to get through, and the `(3)` the site wrote into the tab
 *     title goes;
 *   the recommendation rail disappears;
 *   and the feed itself is emptied *where it sits*, its container holding Decaf's
 *     notice card instead, with the header and the sidebars not moving by a pixel.
 *
 * That last one is the detail worth staging carefully. Every other "hide the feed"
 * extension collapses the container, and the page jumps. Decaf keeps the box and
 * puts a card in it, and the only way to show that is to have the furniture around
 * it visibly stay put while the middle empties.
 *
 * THE SECOND HALF, WHICH IS NEW
 *
 * The extension grew a popup that accounts for itself, and the film grew with it.
 * After the page has gone quiet the pointer opens the popup off the toolbar icon —
 * a 328px window in Decaf's own warm paper that hangs below the browser mock, which
 * is where a Chrome popup goes when the window it came from is short — and the
 * popup's receipt lists what happened on this page, counted off the page rather than
 * guessed from the settings. Pointing at a line of the receipt outlines the thing it
 * counts, over on the page; that is the proof moment and the still. Under the receipt
 * is the week as a meter — passes and minutes with the feed open, and nothing else,
 * because the extension keeps no streak to protect.
 *
 * Then the hold, which is the design's real argument: the feed is not blocked, it is
 * three seconds away, and the card now says in its own words what the next passes
 * will cost — "Hold for 3 seconds. Later today: 7, 11, then 15." The escalation is
 * keyed to the day: `passCount` in `Decaf/core.js` reads `passHistory[dayKey(now)][site]`,
 * so tomorrow starts again at three. And it is keyed to the *site*, which is what lets
 * the meter say "1 today" while this card still costs three seconds — today's pass was
 * on another site. See `WEEK`.
 *
 * WHAT IS REAL AND WHAT IS STAGED
 *
 * Nothing here is a real site. The layout is a generic one so that no brand is being
 * depicted with its numbers altered. The site is called Hubbub, an invented name,
 * and it stands in for one of the twelve sites the extension ships a table for —
 * which is what lets the receipt say a rail was removed, since a site somebody adds by
 * hand has no rail table and is found by shape instead.
 *
 * Every string the extension prints is its own, read out of the extension's source
 * rather than remembered: the card's title template and body, the hold button's
 * label and its "Keep holding…", the hint from `holdHint()`, the receipt lines from
 * `receiptLines()` in `ui.js` with this page's own numbers fed in, the meter caption
 * from `meterCaption()`, the by-site line from `meterSites()`, the popup's site
 * detail, the snooze and lock choices, and the counter that appears once the feed is
 * open. The card's copy used to be genericised — "Decaf paused this feed." — because
 * the scene depicted no named site; now that it does, the card prints the template
 * the extension actually prints.
 */

import "./demo.css";
import { useEffect, useRef, useState } from "react";
import { PhantomCursor } from "../scene/cursor";
import { usePressGate } from "../scene/press-gate";
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
  | "aim-popup"
  | "open"
  | "receipt"
  | "aim-line"
  | "spot"
  | "aim-hold"
  | "hold"
  | "settle";

/**
 * Eighteen beats, 27.8 seconds.
 *
 * The first ten are the film that was here, unchanged in their timing, and the
 * account of what was wrong with the eleven before them is worth keeping, because it
 * was a first-time visitor's account: *"I come from Choir Practice, I am met with a
 * bunch of likes and notifications, then immediately it is grey. I am confused, what
 * just happened?"* Hence `arrive` — a still feed, in colour, before anything happens
 * to it — hence `notice`, a beat whose entire job is to redirect the eye to the
 * toolbar before anything travels, and hence `drain`, `dashes` and `calm` getting a
 * beat each rather than sharing one grey event.
 *
 * The eight after `pause` are the popup and the hold. Each pointer journey has its
 * own beat, so that the beat containing a press begins with the pointer already on
 * the control — the arrangement `usePressGate` exists for.
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
  /* The travel. Slower than the cursor's default glide — see `pace` below — because a
     pointer that crosses the frame in half a second is a pointer nobody saw move. */
  { name: "reach", ms: 1600 },
  // The press: the travel is over, then 90ms to settle, 150ms down, and a 460ms ring.
  { name: "press", ms: 800 },
  // One claim per beat from here, each with its own label.
  { name: "drain", ms: 1700 },
  { name: "dashes", ms: 1500 },
  { name: "calm", ms: 1400 },
  // The feed emptied in place, and the card that says why.
  { name: "pause", ms: 1800 },
  /* The pointer comes back for the toolbar icon, from off stage. About 1220ms of
     flight at this scene's pace; the beat has to outlast it. */
  { name: "aim-popup", ms: 1300 },
  // The press, and the popup growing out of the icon it belongs to.
  { name: "open", ms: 700 },
  // Reading the receipt. Four lines and an eyebrow, plus the label about them.
  { name: "receipt", ms: 1800 },
  // Down the popup to the first line of the receipt.
  { name: "aim-line", ms: 1000 },
  // The hover: the line lights, and the card it counts is outlined on the page.
  { name: "spot", ms: 2400 },
  // Across to the card's hold button, which closes the popup on the press.
  { name: "aim-hold", ms: 1000 },
  { name: "hold", ms: 1900 },
  // The feed is back, and still boring, with the counter in the corner.
  { name: "settle", ms: 1600 },
];

/**
 * Where the pointer is.
 *
 * It enters on `notice` rather than on `reach`, which is the beat that fixed the
 * complaint about the movement being missable. Arriving and travelling in the same beat
 * meant the cursor faded up already halfway to the button; entering while it is still
 * parked off to the side, and only setting off once the visitor has had a beat to see it
 * there, is what makes the travel itself readable.
 *
 * It leaves on `dashes`, once the labels have burst out of the switch, and comes back
 * on `aim-popup` for the second press on the same icon. It stays parked on the icon
 * through `receipt` — a person who has just opened a popup reads it before moving —
 * and leaves for good on `settle`.
 */
const CURSOR: Partial<Record<BeatName, string>> = {
  notice: "feed",
  reach: "toolbar",
  press: "toolbar",
  drain: "toolbar",
  "aim-popup": "toolbar",
  open: "toolbar",
  receipt: "toolbar",
  "aim-line": "line",
  spot: "line",
  "aim-hold": "hold",
  hold: "hold",
};

/**
 * The three beats that carry a click, and all of them wait for it. See `usePressGate`.
 *
 * The pointer is already standing on each control when these beats begin — `reach`,
 * `aim-popup` and `aim-hold` exist for exactly that — so the wait here is only the 90ms
 * between arriving and pressing, not a flight. It is worth taking anyway, because 90ms
 * is five frames and these are the frames a visitor is being asked to read: the toolbar
 * button depressing, the popup growing, a progress ring starting to fill.
 *
 * `spot` is deliberately not here. It is a hover, not a click: the extension outlines
 * on `mouseenter`, and the pointer is on the line when the beat starts.
 */
const CLICKS: ReadonlySet<BeatName> = new Set<BeatName>(["press", "open", "hold"]);

/**
 * The stand-in site, and the other one that shares the week with it.
 *
 * Both invented. The extension prints a site's label in three places this scene
 * shows — the card's title, the popup's site card, the meter's by-site line — so the
 * site has to have a name, and it must not be a real one. Two sites rather than one
 * because the meter's "1 today" has to be a pass on a site *other* than this one for
 * the card to still cost three seconds; see `WEEK`.
 */
const SITE = "Hubbub";
const OTHER_SITE = "Natter";

/** The unread count the site writes into its own tab title, and onto Messages. */
const TAB_UNREAD = 3;

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
 * The post the feed's three labels are measured against.
 *
 * The reel travels four posts' worth — see `dc-reel-pull` — and finishes exactly as
 * `drain` begins, because `REEL_MS` is the sum of the beats it runs across. So at the
 * frame the labels arrive, post 4 is flush against the top of the feed and post 5 fills
 * the rest of it: everything before has scrolled out of the window and everything after
 * is runway. Post 4 is therefore the one post that is both fully in frame and still
 * there for all three of `drain`, `dashes` and `calm`.
 *
 * So this is the reel's own travel, and the keyframe reads it from here rather than
 * hardcoding a 4 of its own — see `--reel-posts` in the stylesheet. The two cannot drift
 * apart: change how far the feed pulls and the labels follow it to the post that ends up
 * in frame.
 */
const REEL_TRAVEL_POSTS = 4;
const LABELLED_POST = REEL_TRAVEL_POSTS;

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
     * the flood showed what that costs: too many rewards were outside the
     * window entirely, and more were inside the window but outside the layer's clip to
     * Decaf's own band. Half the cloud was hanging where nobody could see it, so the
     * flood looked thin while paying for every element in it.
     *
     * 18 to 48, weighted wide rather than tall: the fan is roughly ±45vw across and
     * ±28vh down, which fits inside a section that is 84svh tall and reads as filling
     * the screen because it is filling the part of the screen this section owns.
     *
     * The modulus has to be coprime with the stride, and the first version of this was
     * `(index * 29) % 29` — which is zero for every index, so every reward
     * came out at exactly radius 18 and the flood rendered as a tidy ring around the
     * counter. Every stepped value in this function relies on that property; 29 against
     * 31 gives all thirty-one radii before repeating.
     */
    const reach = 22 + ((index * 29) % 31);
    return {
      glyph: spec.glyphs[index % spec.glyphs.length],
      // Cosine across the width, sine down the height. Fewer particles travel
      // slightly farther and vary more in scale so the burst keeps its full-screen
      // silhouette without paying for dozens of near-duplicates.
      dx: `${(Math.cos(radians) * reach).toFixed(2)}vw`,
      dy: `${(Math.sin(radians) * reach * 0.62).toFixed(2)}vh`,
      size: 30 + ((index * 17) % 52),
      delay: (index * 137) % 2300,
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
const LIKE_BITS = burst(30, {
  from: 0,
  spread: 360,
  glyphs: ["♥", "♥", "★", "♥", "▲", "♥", "★"],
});

/** Comment bubbles share the second shockwave. Twelve varied marks read as a
 * separate source without duplicating the like burst's density. */
const COMMENT_BITS = burst(12, {
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
 * The two notification badges on this page, and the one rail.
 *
 * Named here rather than counted in the markup, because the popup's receipt is
 * computed from these — see `RECEIPT` — and the receipt's numbers have to be the
 * page's own. The extension reads them off the page; the scene reads them off the
 * same constants the page is drawn from, which is the nearest a reconstruction can
 * get to the same thing.
 *
 * Two badges, which is the count the extension prints for its own demo page. The
 * bell keeps its 12 and Messages keeps its 3 — the same 3 the site wrote into the
 * tab title — and both lose their red on `calm`, because Decaf ships with badges
 * muted rather than hidden.
 */
const BADGES = { bell: "12", messages: String(TAB_UNREAD) } as const;
const RAILS = ["suggest"] as const;

/**
 * The two pictures the extension is still greying once the feed has gone: the site's
 * logo in the rail and the visitor's own avatar in the header, both of which visibly
 * lose their colour on `drain`. Everything else it greyed — the post media, the rail's
 * avatars — left with the feed and the rail, and `receipt()` in `content.js` counts
 * what is being painted grey *now*, not what was.
 */
const MEDIA = ["logo", "avatar"] as const;

/** A line of the popup's receipt. `what` names what the line can point at. */
interface ReceiptLine {
  readonly what: "feed" | "badges" | "media" | "";
  readonly count: number | null;
  readonly label: string;
}

/**
 * `receiptLines` in the extension's `ui.js`, for the kinds of line this page produces.
 *
 * Transcribed rather than paraphrased: the singulars, the order, the tick standing in
 * for a count where there is nothing to count, and the rule that a line whose subject
 * is hidden — a removed rail, the cleared title — cannot be pointed at and so is not a
 * button. The two kinds this page never produces are left out: counts (nothing masked
 * is left on screen once the feed and the rail have gone — `receipt()` counts only
 * masked elements that are still rendered) and comments (there is no thread on this
 * page to hide, only a count, and the count went with the feed).
 */
function receiptLines(receipt: {
  feed: boolean;
  badges: number;
  rails: number;
  media: number;
  title: boolean;
}): ReceiptLine[] {
  const lines: ReceiptLine[] = [];
  if (receipt.feed) lines.push({ what: "feed", count: null, label: "feed paused" });
  if (receipt.badges) {
    const noun = receipt.badges === 1 ? "badge" : "badges";
    lines.push({ what: "badges", count: receipt.badges, label: `${noun} muted` });
  }
  if (receipt.rails) {
    lines.push({
      what: "",
      count: receipt.rails,
      label: receipt.rails === 1 ? "rail removed" : "rails removed",
    });
  }
  if (receipt.media) {
    lines.push({
      what: "media",
      count: receipt.media,
      label: receipt.media === 1 ? "media item greyed" : "media greyed",
    });
  }
  if (receipt.title) lines.push({ what: "", count: null, label: "tab title cleared" });
  return lines;
}

/**
 * What the popup says it did to this page: feed paused, 2 badges muted, 1 rail
 * removed, 2 media greyed, tab title cleared. Every number is the page's, by
 * construction.
 */
const RECEIPT = receiptLines({
  feed: true,
  badges: Object.keys(BADGES).length,
  rails: RAILS.length,
  media: MEDIA.length,
  title: TAB_UNREAD > 0,
});

/** The receipt as the extension's `line.text` prints it, for the stage's description. */
const RECEIPT_SPOKEN = RECEIPT.map((line) =>
  line.count === null ? line.label : `${line.count} ${line.label}`,
).reduce((sentence, text, order, all) =>
  order === 0 ? text : `${sentence}${order === all.length - 1 ? " and " : ", "}${text}`,
"");

/** The line the pointer rests on, and the thing on the page it outlines. */
const SPOT_LINE: ReceiptLine["what"] = "feed";

/**
 * The week behind the meter.
 *
 * The extension keeps fourteen days of `passHistory` and `openMinutes`, and the popup
 * draws the last seven as bars: passes in the accent, minutes beside them in the
 * track's grey, each series scaled to its own busiest day. The figures are the ones
 * the extension's own screenshots were seeded with — one, none, two, two, none, three,
 * one — because a meter with nothing on it says nothing, and one with a tidy upward
 * line would be a scoreboard, which is the thing this meter is designed not to be.
 *
 * Today's single pass is on the *other* site, and that is load-bearing. The hold's
 * escalation is per site and per day, so a pass on Hubbub earlier today would make
 * the card read "Hold for 7 seconds · 2nd time today". The meter's "1 today" and the
 * card's "Hold for 3 seconds" are both true of the same afternoon only because the
 * pass was somewhere else, and the by-site line under the chart says so.
 */
const WEEK = [
  { day: "Sat", passes: 1, minutes: 5, site: SITE },
  { day: "Sun", passes: 0, minutes: 0, site: "" },
  { day: "Mon", passes: 2, minutes: 7, site: SITE },
  { day: "Tue", passes: 2, minutes: 9, site: SITE },
  { day: "Wed", passes: 0, minutes: 0, site: "" },
  { day: "Thu", passes: 3, minutes: 13, site: SITE },
  { day: "Fri", passes: 1, minutes: 5, site: OTHER_SITE },
] as const;
const TODAY = WEEK[WEEK.length - 1];

/** `meterCaption` in `ui.js`: "1 today, 9 this week · 39 min with the feed open." */
const METER_CAPTION = `${TODAY.passes} today, ${WEEK.reduce((sum, day) => sum + day.passes, 0)} this week · ${WEEK.reduce((sum, day) => sum + day.minutes, 0)} min with the feed open.`;

/** `meterSites` in `ui.js`: passes per site, most first. "By site: Hubbub 8, Natter 1." */
const METER_SITES = (() => {
  const totals = new Map<string, number>();
  for (const day of WEEK) {
    if (day.site) totals.set(day.site, (totals.get(day.site) ?? 0) + day.passes);
  }
  const parts = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([site, passes]) => `${site} ${passes}`);
  return `By site: ${parts.join(", ")}.`;
})();

const MAX_PASSES = Math.max(1, ...WEEK.map((day) => day.passes));
const MAX_MINUTES = Math.max(1, ...WEEK.map((day) => day.minutes));

/**
 * What the extension's card says the hold costs.
 *
 * `holdHint()` in `content.js`, at a pass count of zero: the base hold and the next
 * three from `holdPlan`, which are the base plus one step each. Mid-hold the hint is
 * hidden and the status line takes over with the seconds left; "2…" is what it reads
 * one second into a three-second hold.
 */
const HOLD_HINT = "Hold for 3 seconds. Later today: 7, 11, then 15.";
const HOLD_STATUS = "Keep holding — 2…";
const PASS_MINUTES = 5;

/**
 * What the press did, printed on each thing it did it to.
 *
 * This is the change that made the section legible, and the report that prompted it was
 * blunt: *nobody reads the project description while the animation is running*. Which was
 * true, and was true of all seven sections, and was worst here — the three notes in
 * the column beside this scene were the only place the page said what Decaf actually
 * does, and they sat beside ten seconds of hearts crossing the screen.
 *
 * So the notes are gone and their content is here, pinned to its evidence. "Colour off"
 * is next to the image that just lost its colour. "Notifications less distracting" is
 * next to the badge that just lost its red and kept its number. There is no gap between
 * the claim and the proof for a visitor to fail to cross.
 *
 * They burst out of the toolbar button, on a stagger, which is the point of the layout
 * as much as of the copy: one press, and five things fly out of it and land on five
 * different parts of the page. That reads as *this switch did all of this* in a way five
 * bullet points four inches away cannot. The six that follow come out of the same
 * button, because the popup did too.
 *
 * Every one of them names the element it is about and is measured against it. The
 * coordinates are still here and are still worth getting close, because they are what the
 * server renders and what a visitor with no JavaScript keeps — but they are no longer the
 * position. `.dc-app`'s middle column is `minmax(0, 1fr)`, so the header, the bell and the
 * suggestions rail all move as a fraction of the layer when the window changes width.
 * See `scripts/spec-anchors.mjs`.
 *
 * Every label leaves when its subject does, because a label pointing at nothing is the
 * one failure this whole idea cannot survive. The three over the feed go on `pause`,
 * when the card replaces the posts. The bell's and the rail's go on `open`: the popup
 * hangs off the toolbar icon and covers the right third of the browser, which is where
 * both of them are — and the popup's own receipt takes up the claim, in the extension's
 * voice, on the beat theirs is withdrawn. The four about the popup go on `hold`, when
 * the press on the page closes it.
 */
const SPECS: readonly SpecTag<BeatName>[] = [
  /* "Media greyscaled" was the first wording and it was written from inside the code.
     Greyscale is a filter name; a person watching this sees the colour go.

     On the media's top-*right* corner, reading back into the picture, and pushed down into
     it. A plate is centred on its dot, so a dot correctly placed on a corner hangs half a
     plate above the thing it is pointing at — this one struck a line through "because you
     watched" in the post header, which `scripts/spec-anchors.mjs` reports as `COVERS TYPE`.
     And the counts label below has to be on the left, because the counts are: two plates
     in the same corner of a 97px-tall picture read as a stack of tags on it rather than as
     two labels about two things. The three sit top-right, middle and bottom-left, which is
     also the order the eye reads them in. */
  {
    at: "drain",
    text: "Colour off",
    x: 76,
    y: 35,
    anchor: "media",
    grip: "top right",
    nudge: { y: 8 },
    side: "left",
    until: "pause",
  },
  { at: "drain", text: "Autoplay stopped", x: 48, y: 42, anchor: "autoplay", until: "pause" },
  /* Straight above the numbers with a line down to them, which is what `side: "above"` is
     for. The row is 16px tall and the plate is 25px, so a label reading sideways at the
     row's own height covers the counts it is about. The x nudge slides the dot along the
     row to the views count, so the plate above it is centred over the feed rather than
     over the sidebar. */
  {
    at: "dashes",
    text: "Likes and views hidden",
    x: 21,
    y: 46,
    anchor: "counts",
    grip: "top left",
    nudge: { x: 40 },
    side: "above",
    until: "pause",
  },
  /* Reads leftward out of the bell's left edge. Anything anchored at the bell and reading
     rightward runs off the edge of the window it is describing; anything anchored *on* it
     covers the badge that is the whole point.

     Two rewrites got here. "Notifications muted, count kept" described the mechanism and
     left the reader to work out which half was the point. "Keeps the count, loses the red"
     described the pixels — accurate, and a riddle about a badge rather than a thing the
     extension does for you. This says what it is for. The badge in the frame keeps its 12
     and drops its red at the same moment, so the mechanism is still on screen for anyone
     who looks. */
  {
    at: "calm",
    text: "Notifications less distracting",
    x: 74,
    y: 18,
    anchor: "bell",
    grip: "left",
    side: "left",
    until: "open",
  },
  /* There was a second label here, reading rightward along the tab strip: "Tab title stops
     counting", pointing at the `(3)` that a site writes into its own title and that Decaf
     removes. It is a real behaviour and it is still in the scene — the `(3)` still goes,
     and the popup's receipt now says "tab title cleared" in the extension's own words. But
     naming it up here needs the visitor to already know that sites do that, and to have
     noticed which two characters changed in a 10px tab label. */
  {
    at: "pause",
    text: "Suggestions gone",
    x: 89,
    y: 16,
    anchor: "suggestions",
    side: "below",
    until: "open",
  },
  /* On the card's hint line, which is the sentence that proves it: "Hold for 3 seconds.
     Later today: 7, 11, then 15." Two facts in five words — the escalation, and that it
     is a daily one. It leaves on `hold`, when the hint gives way to the status line's
     countdown and the button below carries the next claim. */
  {
    at: "pause",
    text: "Longer each pass. Resets tomorrow.",
    x: 21,
    y: 62,
    anchor: "hint",
    grip: "left",
    side: "left",
    until: "hold",
  },
  /* Inside the popup, reading right out of the receipt's own eyebrow, into the empty
     half of that row. The one place on the layer a plate about the receipt can sit
     without covering the card the popup is lying across — everything to the left of the
     popup at this height is the card's hold button — and it is a claim about honesty,
     which is `popup.js`'s own word for the arrangement: the number is read out of the
     page rather than guessed from the settings. */
  {
    at: "receipt",
    text: "Counted, not guessed",
    x: 66,
    y: 54,
    anchor: "receipt",
    grip: "right",
    side: "right",
    until: "hold",
  },
  /* The proof. The pointer is resting on "feed paused" and the card has the extension's
     ring on it, over on the page. Pinned to the card's left edge, low, where the rail's
     navigation has run out, and reading away from the card so it covers none of it. */
  {
    at: "spot",
    text: "Hover a line: it outlines what changed",
    x: 18,
    y: 84,
    anchor: "notice",
    grip: "bottom left",
    nudge: { y: -22 },
    side: "left",
    until: "hold",
  },
  /* On the meter card, which hangs below the browser mock, so the plate reads back into
     the empty band under the window. `ui.js` says it in its own comment — "Nothing here
     is a streak, a score or a goal" — and this is the one label whose claim is about
     what is *absent* from the picture, so it has to be said. */
  {
    at: "spot",
    text: "Passes and minutes, no streaks",
    x: 63,
    y: 128,
    anchor: "meter",
    grip: "left",
    side: "left",
    until: "hold",
  },
  /* On the button while its ring fills. The stylesheet's own line for this scene, and the
     design's whole argument in five words. */
  {
    at: "hold",
    text: "Not blocked. Three seconds away.",
    x: 18,
    y: 56,
    anchor: "hold",
    grip: "left",
    side: "left",
    until: "settle",
  },
  /* On the counter the extension pins to the corner once the feed is open: "Feed open ·
     4:59", with a way to hand the pass back early. Above its right-hand end, because the
     rail's navigation has run out above it and a plate centred on a pill in the corner
     would hang off the left edge of the stage. */
  {
    at: "settle",
    text: "Five minutes, then paused again",
    x: 16,
    y: 88,
    anchor: "counter",
    grip: "top right",
    nudge: { y: -4 },
    side: "above",
  },
];

/**
 * The button they all come out of: the toolbar icon, in the pod's own percentages.
 * The popup's four come out of the same point, because the popup did.
 */
const SPEC_ORIGIN = { x: 97, y: 5 };

/**
 * Where the popup's top edge sits below the browser mock's top — two pixels under the
 * tab strip, which is where Chrome hangs an action popup — and the breathing room kept
 * under it. Both are read by the effect that measures how tall the popup may be.
 *
 * `POPUP_TOP_PX` is also the stylesheet's `top` on `.dc-popup`; the two have to agree.
 */
const POPUP_TOP_PX = 40;
const POPUP_MARGIN_PX = 12;
/** The popup shell's own bottom padding, in its unzoomed pixels. See `.dc-popup-window`. */
const POPUP_SHELL_PAD_PX = 12;
/**
 * How small the popup may be drawn to keep the meter in the frame. Below this the
 * receipt's 13px type is under 9.4px, which is no longer a thing a visitor reads.
 */
const POPUP_MIN_ZOOM = 0.72;
/** The popup's own width, which is what a narrow stage has to fit. See `.dc-popup`. */
const POPUP_WIDTH_PX = 328;

/**
 * Whether the stage is at the width where the popup takes the browser's place.
 *
 * The same breakpoint the stylesheet collapses the app to two columns at. Below it a
 * 328px popup hung off the toolbar covers the whole window and the row of label chips
 * under it — which is also what happens on a phone, where an extension's popup is a
 * sheet over the page rather than a window beside it. So at this width the popup
 * stands in for the browser while it is open, in the flow, and it closes when the
 * pointer sets off for the card rather than when the card is pressed: the card has to
 * be back on screen for there to be anything to press.
 */
function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 720px)");
    const read = () => setNarrow(query.matches);
    // A media query result, which cannot be derived during render.
    read();
    query.addEventListener("change", read);
    return () => query.removeEventListener("change", read);
  }, []);

  return narrow;
}

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
  const narrow = useNarrow();

  /* The two counters the bursts come out of, and the portalled layer they are written
     onto. */
  const likeRef = useRef<HTMLSpanElement | null>(null);
  const commentRef = useRef<HTMLSpanElement | null>(null);
  const delugeRef = useRef<HTMLDivElement | null>(null);
  /* The popup's window and its meter card, for the effect that decides how much of the
     popup fits under the browser mock. */
  const popupRef = useRef<HTMLDivElement | null>(null);
  const meterRef = useRef<HTMLElement | null>(null);
  const state = useStoryboard(BEATS, {
    running,
    stage: stageRef,
    /* The still that carries the argument: the popup open on its receipt, the pointer's
       line lit, the card it counts outlined on the page, and the week's meter under it —
       with every label about them pinned. It was `pause`, the paused feed with the page
       intact around it; that frame is still in the film, and this one contains it. */
    stillBeat: "spot",
  });
  const { beat, index, run, still } = state;
  /* What the three presses did, held until they happened. `beat` still decides where the
     pointer goes; `did` and `reached` decide what a press is allowed to have changed. */
  const { did, reached, onPress } = usePressGate(BEATS, state, CLICKS);

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
  /* Open from the press that opens it to the press that closes it. A Chrome popup is
     dismissed by a click anywhere outside it, and the click that starts the hold is one.
     On a narrow stage it closes a beat earlier, as the pointer leaves it — see
     `useNarrow`. */
  const popupOpen = reached >= at("open") && reached < at(narrow ? "aim-hold" : "hold");
  /* The hover. Not gated: the extension outlines on `mouseenter`, and the pointer is
     already on the line when this beat begins — `aim-line` is the flight. */
  const spotting = beat === "spot";
  /* The ring only starts filling once the button under the pointer has actually been
     pressed. It runs 1800ms inside a 1900ms beat, which leaves exactly enough room for the
     90ms the press waits — see `CLICKS`. The real hold is three seconds; the film
     compresses it and says so nowhere, because the card's own hint says the true number. */
  const holding = did === "hold";
  /* The pass, granted: the card goes, the posts come back, the counter arrives. */
  const feedOpen = index >= at("settle");

  /**
   * Whether the feed is actively working on you.
   *
   * Not simply `!on`. The scene opens on a still feed for two seconds — see `arrive` —
   * and both the reel and the burst have to hold at their first frame through it, or
   * the section still starts mid-flood and the beat buys nothing.
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

  /**
   * Pins a reward to the emitter's viewport position when its delayed lift actually starts.
   *
   * The counters are inside an accelerating reel, but the rewards are portalled to the
   * viewport. Shared layer coordinates therefore cannot remain the source of truth after a
   * reward launches: rewriting them at `notice`, `reach` and `press` moved the whole cloud
   * upward once per beat. The lift begins at opacity zero, so this bounded measurement lands
   * before the reward becomes visible and its inline origin never changes afterward.
   */
  const pinRewardOrigin = (event: React.AnimationEvent<HTMLDivElement>) => {
    if (event.animationName !== "dc-lift") return;

    const reward = event.target;
    if (!(reward instanceof HTMLElement) || !reward.classList.contains("dc-drop")) return;
    if (reward.style.getPropertyValue("--drop-x")) return;

    const emitter = reward.dataset.from === "like" ? likeRef.current : commentRef.current;
    const box = emitter?.getBoundingClientRect();
    if (!box) return;

    reward.style.setProperty("--drop-x", `${Math.round(box.left + box.width / 2)}px`);
    reward.style.setProperty("--drop-y", `${Math.round(box.top + box.height / 2)}px`);
  };

  /** Reward counts become a dash — in the text and in the accessible label. */
  const count = (value: string) => (dashed ? "—" : value);

  /**
   * Keeps the pre-launch origins, burst auras and section clip aligned.
   *
   * The layer is portalled to `document.body` and positioned against the viewport, while
   * the counters live inside a reel scrolling upward inside a section the visitor is also
   * scrolling past. Shared coordinates provide a safe first frame; `pinRewardOrigin`
   * snapshots the exact moving emitter separately for every delayed reward.
   *
   * One requestAnimationFrame batch, two `getBoundingClientRect` reads, four custom
   * properties written straight onto the layer element. Scroll, resize and observed
   * geometry changes request that batch; nothing re-renders and no callback runs
   * continuously while the geometry is unchanged.
   *
   * Stops once the extension is on, because there is nothing left to emit and no point
   * tracking a position nobody is reading.
   */
  useEffect(() => {
    if (!focused || on) return;

    const section = stageRef.current?.closest("[data-project-section]");
    let frame = 0;

    const write = () => {
      frame = 0;
      const layer = delugeRef.current;
      if (!layer) return;

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

      /**
       * Where Decaf's band sits in the visitor's window, so the layer can keep itself
       * inside it.
       *
       * Published as two numbers for the stylesheet to feather, rather than applied here
       * as `clip-path: inset(...)`. A clip has one edge and no width: it cut forty-two
       * falling rewards in half along an invisible horizontal line at the top and bottom
       * of the section, which is the same hard edge the sections themselves had. The
       * scene was already working around it — the fall fades from 62% so the hearts are
       * gone before they reach the line — and that is a workaround for a boundary that
       * should not have been visible in the first place. See `.dc-deluge`'s mask.
       */
      if (section) {
        const box = section.getBoundingClientRect();
        const top = Math.max(0, Math.round(box.top));
        const bottom = Math.max(0, Math.round(window.innerHeight - box.bottom));
        layer.style.setProperty("--band-top", `${top}px`);
        layer.style.setProperty("--band-bottom", `${bottom}px`);
      }
    };

    const requestWrite = () => {
      if (!frame) frame = window.requestAnimationFrame(write);
    };

    // Geometry changes only on scrolling, resizing, or observed layout changes. The
    // previous implementation woke up every frame even when every input was identical.
    // Per-reward animation starts handle the reel's transform without restoring that loop.
    requestWrite();
    window.addEventListener("scroll", requestWrite, { passive: true });
    window.addEventListener("resize", requestWrite);

    const resizeObserver = new ResizeObserver(requestWrite);
    if (stageRef.current) resizeObserver.observe(stageRef.current);
    if (likeRef.current) resizeObserver.observe(likeRef.current);
    if (commentRef.current) resizeObserver.observe(commentRef.current);

    return () => {
      window.removeEventListener("scroll", requestWrite);
      window.removeEventListener("resize", requestWrite);
      resizeObserver.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [focused, on, run]);

  /**
   * How tall the popup is allowed to be, which is how much of the section is below it —
   * and how small it has to be drawn for the meter to make it into the frame.
   *
   * Chrome gives an action popup 600px and scrolls the rest, and this popup's natural
   * height is 821, so at full size it hangs well below the browser mock — which is the
   * frame-breaking moment and is also simply where a popup goes when the window it came
   * from is short. But a section is 84svh tall, and on a 900px laptop the bottom of a
   * 600px popup would land eighty pixels past the section's edge, across the next
   * project's heading. Chrome would clamp it to the screen; this clamps it to the
   * section, which is the same rule at the scale the scene is drawn at.
   *
   * The clamp alone is not enough, and a 900px laptop is again the case: it leaves about
   * 500px under the toolbar, and the meter card's bottom edge is 560px down the popup.
   * The still frame is the receipt, the ring and the meter together, so a popup cut
   * through its chart would be the argument frame with a third of the argument
   * missing. So the popup is also *zoomed*, to whatever fits, down to a floor — see
   * `POPUP_MIN_ZOOM` — and its height is then cut exactly under the meter card, which
   * is a card edge rather than a line through a bar chart. On a 1200px window the zoom
   * is 1 and the cut is Chrome's own 600.
   *
   * `needed` is measured off the popup itself rather than declared, because it is the
   * height of two paragraphs of system-font text at 328px and the system font is not the
   * same on every machine. Divided by the zoom already applied, since the rects come
   * back in screen pixels and the stylesheet wants the unzoomed figure.
   *
   * Scroll-invariant, because every rect here moves together, so it is measured on
   * layout changes only.
   *
   * On a narrow stage none of that applies: the popup is in the flow, standing in for
   * the browser, so the only thing to fit is its width — a 328px window on a 282px
   * stage would be the one horizontal overflow on the page — and the height is
   * Chrome's own 600. See `useNarrow`.
   */
  useEffect(() => {
    const stage = stageRef.current;
    const section = stage?.closest<HTMLElement>("[data-project-section]");
    const popup = popupRef.current;
    const meter = meterRef.current;
    if (!stage || !section || !popup || !meter) return;

    let applied = 1;
    const write = () => {
      if (narrow) {
        const zoom = Math.min(1, stage.getBoundingClientRect().width / POPUP_WIDTH_PX);
        stage.style.setProperty("--dc-popup-room", "600px");
        stage.style.setProperty("--dc-popup-zoom", zoom.toFixed(3));
        applied = zoom;
        return;
      }
      const room =
        section.getBoundingClientRect().bottom -
        stage.getBoundingClientRect().top -
        POPUP_TOP_PX -
        POPUP_MARGIN_PX;
      const needed =
        (meter.getBoundingClientRect().bottom - popup.getBoundingClientRect().top) / applied +
        POPUP_SHELL_PAD_PX;
      const zoom = Math.min(1, Math.max(POPUP_MIN_ZOOM, room / Math.max(1, needed)));
      stage.style.setProperty("--dc-popup-room", `${Math.max(240, Math.round(room))}px`);
      stage.style.setProperty("--dc-popup-zoom", zoom.toFixed(3));
      applied = zoom;
    };

    write();
    const observer = new ResizeObserver(write);
    observer.observe(section);
    observer.observe(stage);
    return () => {
      observer.disconnect();
      stage.style.removeProperty("--dc-popup-room");
      stage.style.removeProperty("--dc-popup-zoom");
    };
  }, [narrow]);

  /** The reel of posts. Rendered twice: before the pause, and again once the pass opens the feed. */
  const reel = (key: string) => (
    <div
      className="dc-reel"
      key={key}
      data-running={flooding}
      style={
        {
          "--reel-ms": `${REEL_MS}ms`,
          "--reel-posts": REEL_TRAVEL_POSTS,
        } as React.CSSProperties
      }
    >
      {POSTS.map((post, order) => (
        <article className="dc-post" key={post.who}>
          <p className="dc-post-head">
            <span className="dc-post-avatar" />
            {post.who}
          </p>
          <span
            className={`dc-media dc-media--${post.tint}`}
            /* Two of the three feed labels are measured against this one post, and it
               is this one because of where the reel stops. `REEL_MS` is the sum of
               `raw` through `press`, so the pull finishes exactly as `drain` begins and
               the fifth post is sitting flush against the top of the feed at the frame
               the labels arrive. Anything earlier has scrolled out of the window;
               anything later is the runway. */
            data-spec-anchor={order === LABELLED_POST ? "media" : undefined}
          >
            <i
              className="dc-play"
              /* Still measurable once the extension has stopped it: `data-on` takes it
                 to `opacity: 0` and leaves the box, which is what a label saying it was
                 stopped needs to point at. */
              data-spec-anchor={order === LABELLED_POST ? "autoplay" : undefined}
            />
          </span>
          {/* The first post's counters are the two emitters. Only the first: it is the
              one reliably in frame, and emitting from every repeated counter would turn
              direction into noise rather than emphasis. */}
          <p className="dc-post-meta">
            <span
              className="dc-count"
              ref={order === 0 ? likeRef : undefined}
              data-spec-anchor={order === LABELLED_POST ? "counts" : undefined}
            >
              <b>♥</b> {count(post.likes)}
            </span>
            <span className="dc-count">{count(post.views)}</span>
            <span
              className="dc-comments"
              data-gone={paused}
              ref={order === 0 ? commentRef : undefined}
            >
              {dashed ? "—" : "2,904"} comments
            </span>
          </p>
        </article>
      ))}
    </div>
  );

  return (
    <div
      className="dc"
      ref={stageRef}
      data-beat={beat}
      /* The same clock a beat behind, for the beats that wait for a click. The
         stylesheet uses it for the button's pressed look and its click ring, so those
         land with the pointer rather than 90ms ahead of it. See `CLICKS`. */
      data-did={did}
      data-lap={run}
      data-on={on}
      data-grey={grey}
      data-paused={paused}
      data-popup={popupOpen}
      data-feed-open={feedOpen}
      role="img"
      aria-label={
        `A social feed on an invented site called ${SITE}, with colour images, like ` +
        "counts and two red notification badges. Decaf is switched on from the toolbar: " +
        "the colour drains out of the media, every reward number becomes a dash, both " +
        "badges keep their counts but lose their red, the suggestions rail disappears, " +
        "and the feed is replaced in place by Decaf's notice card, which reads " +
        `"Decaf paused the ${SITE} feed.", offers a hold-to-open button for a ` +
        "five-minute pass, and says the hold is three seconds now and seven, eleven, " +
        "then fifteen later today. The extension's popup is then opened from the " +
        `toolbar: under "On this page" it lists ${RECEIPT_SPOKEN}, and pointing at ` +
        "the first line outlines the notice card on the page. Below that, a " +
        "\"Last 7 days\" meter shows passes and " +
        "minutes with the feed open per day, with no streak. The button on the card is " +
        "held, its ring fills, and the feed returns for five minutes with a counter in " +
        "the corner. The header and sidebar do not move."
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
              {calmed ? "" : <b>({TAB_UNREAD}) </b>}
              {SITE}
            </span>
          </span>
          {/* The extension's icon: a cup in its own coffee on paper, which is what
              `icons/icon.svg` draws. */}
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
                {/* The second badge. The same three unread the site wrote into its tab
                    title, on the item they belong to. Muted with the bell's on `calm`. */}
                {item === "Messages" && (
                  <b className="dc-badge dc-nav-badge" data-calm={calmed}>
                    {BADGES.messages}
                  </b>
                )}
              </span>
            ))}
          </aside>

          <div className="dc-main">
            <header className="dc-top">
              <span className="dc-search">Search</span>
              <span className="dc-bell" data-calm={calmed} data-spec-anchor="bell">
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
                <b className="dc-badge">{BADGES.bell}</b>
              </span>
              <span className="dc-avatar" />
            </header>

            {/* The feed container. It does not change size, ever.
                It is also a cursor target: the pointer enters here, on the thing the
                visitor is already looking at, and only then sets off for the toolbar.
                Entering directly at the toolbar meant the pointer faded up at its
                destination, so there was no journey to notice. */}
            <div className="dc-feed" data-target="feed">
              {paused && !feedOpen ? (
                /* The extension's card, as `buildNotice` in `content.js` builds it: a
                   title, a body, the hold button with its ring, the hint, a status line
                   that keeps its box while empty, and the one way out that is not the
                   hold. Drawn at four fifths of its real size, which is the scale the
                   page around it is drawn at; the card is the page's, so it scales with
                   the page, where the popup is a separate window and does not. */
                <div
                  className="dc-notice"
                  data-spec-anchor="notice"
                  data-spot={spotting && SPOT_LINE === "feed"}
                >
                  <p className="dc-notice-title">Decaf paused the {SITE} feed.</p>
                  <p className="dc-notice-body">
                    Search, messages and anything you open on purpose still work.
                  </p>
                  <span
                    className="dc-hold"
                    data-target="hold"
                    data-spec-anchor="hold"
                    data-aimed={beat === "aim-hold"}
                    data-holding={holding}
                  >
                    <svg viewBox="0 0 44 44" aria-hidden="true">
                      <circle className="dc-hold-track" cx="22" cy="22" r="19" />
                      <circle className="dc-hold-fill" cx="22" cy="22" r="19" />
                    </svg>
                    <span className="dc-hold-label">
                      {holding ? "Keep holding…" : `Hold to open for ${PASS_MINUTES} minutes`}
                    </span>
                  </span>
                  {/* Mid-hold the hint is hidden and the status line speaks instead, which
                      is `attachHold`'s own arrangement — the two would otherwise say the
                      same thing twice. */}
                  {holding ? (
                    <p className="dc-notice-status">{HOLD_STATUS}</p>
                  ) : (
                    <>
                      <p className="dc-notice-hint" data-spec-anchor="hint">
                        {HOLD_HINT}
                      </p>
                      <p className="dc-notice-status" />
                    </>
                  )}
                  <span className="dc-notice-escape">Can&apos;t hold? Open Decaf settings</span>
                </div>
              ) : (
                /* The reel. Keyed by `run` so each replay starts from the top, and
                   paused rather than stopped once the extension is on — a feed that
                   fades out has been switched off politely, and a feed that stops
                   dead mid-scroll is what actually happens. Mounted afresh once the
                   pass opens the feed, at its first frame: the posts are back, grey and
                   dashed, which is the point of the pass being worth little. */
                reel(feedOpen ? `reel-${run}-open` : `reel-${run}`)
              )}
            </div>
          </div>

          <aside className="dc-suggest" data-gone={paused}>
            <p className="dc-suggest-head" data-spec-anchor="suggestions">
              Suggested for you
            </p>
            {SUGGESTIONS.map((item) => (
              <span className="dc-suggest-row" key={item}>
                <i />
                <span>{item}</span>
                <b>{dashed ? "—" : "12.4K"}</b>
              </span>
            ))}
          </aside>
        </div>

        {/* What the extension pins to the page while a pass runs: the counter, fixed to
            the bottom-left corner of the window, and the chip it shows for four seconds
            as the feed opens. Both are the extension's own — `.decaf-counter` and
            `showChip("Feed open for 5 minutes")` in `content.js`. The clock is the first
            second of a five-minute pass. */}
        {feedOpen && (
          <>
            <span className="dc-counter" data-spec-anchor="counter">
              <b>Feed open · 4:59</b>
              <span>Pause it again</span>
            </span>
            <span className="dc-chip">Feed open for {PASS_MINUTES} minutes</span>
          </>
        )}
      </div>

      {/* The extension's popup, hanging off its own toolbar icon.
          Outside `.dc-browser`, because the browser clips its contents and this has to
          hang below the window: a Chrome action popup is its own window, clamped to the
          screen rather than to the browser, and a 600px popup off a short window is
          exactly this picture. The palette, type and every string are the extension's —
          see the header comment. Chrome's 600px ceiling is applied as a max-height, and
          the section's own room under the window as a second one. */}
      <div className="dc-popup" data-open={popupOpen} aria-hidden="true">
        {/* Two elements: the outer one is positioned, the inner one is zoomed. `zoom`
            multiplies every length on the element it sits on, offsets included, so a
            zoomed popup positioned by its own `top` would drift up the tab strip as it
            shrank. See the effect that writes `--dc-popup-zoom`. */}
        <div className="dc-popup-window" ref={popupRef}>
        <div className="dc-popup-head">
          <span className="dc-popup-brand">Decaf</span>
          <span className="dc-popup-switch">
            <span>On</span>
            <i />
          </span>
        </div>

        <section className="dc-popup-card">
          <div className="dc-popup-row">
            <span className="dc-popup-h2">{SITE}</span>
            <span className="dc-popup-badge">On</span>
          </div>
          <p className="dc-popup-detail">
            This feed is paused. Hold the button on the page to open it for {PASS_MINUTES}{" "}
            minutes.
          </p>
          <div className="dc-popup-receipt">
            <p className="dc-popup-eyebrow" data-spec-anchor="receipt">
              On this page
            </p>
            <ul className="dc-popup-rows">
              {RECEIPT.map((line) => (
                <li key={line.label}>
                  <span
                    className="dc-popup-line"
                    data-button={line.what !== ""}
                    data-target={line.what === SPOT_LINE ? "line" : undefined}
                    data-hover={spotting && line.what === SPOT_LINE}
                  >
                    <b>{line.count === null ? "✓" : line.count}</b> {line.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="dc-popup-off">
            <p className="dc-popup-detail">Need this site to behave normally?</p>
            <div className="dc-popup-segmented">
              <span>30 min</span>
              <span>2 hours</span>
            </div>
            <span className="dc-popup-button">Off until I turn it back on</span>
          </div>
        </section>

        <section className="dc-popup-card dc-popup-meter" data-spec-anchor="meter" ref={meterRef}>
          <p className="dc-popup-eyebrow">Last 7 days</p>
          <p className="dc-popup-caption">{METER_CAPTION}</p>
          <div className="dc-popup-chart">
            {WEEK.map((day) => (
              <span className="dc-popup-day" key={day.day} data-today={day === TODAY}>
                <span className="dc-popup-bars">
                  <i
                    className="dc-popup-bar dc-popup-bar--passes"
                    data-empty={day.passes === 0}
                    style={{ height: `${Math.round((day.passes / MAX_PASSES) * 100)}%` }}
                  />
                  <i
                    className="dc-popup-bar dc-popup-bar--minutes"
                    data-empty={day.minutes === 0}
                    style={{ height: `${Math.round((day.minutes / MAX_MINUTES) * 100)}%` }}
                  />
                </span>
                <small>{day.day.slice(0, 1)}</small>
              </span>
            ))}
          </div>
          <p className="dc-popup-legend">
            <span>
              <i className="dc-popup-bar--passes" />
              passes
            </span>
            <span>
              <i className="dc-popup-bar--minutes" />
              minutes open
            </span>
          </p>
          <p className="dc-popup-sites">{METER_SITES}</p>
        </section>

        {/* Below Chrome's 600px line for most of its height, exactly as it is in the
            extension's own screenshot of the popup at that height. */}
        <section className="dc-popup-card">
          <div className="dc-popup-row">
            <span className="dc-popup-h2">Lock</span>
          </div>
          <p className="dc-popup-detail">Holds every Decaf setting in place until it ends.</p>
          <div className="dc-popup-segmented">
            {["1 hour", "4 hours", "1 day", "1 week", "30 days"].map((choice, order) => (
              <span key={choice} data-checked={order === 0}>
                {choice}
              </span>
            ))}
          </div>
          <span className="dc-popup-button dc-popup-button--primary">Lock</span>
        </section>
        <span className="dc-popup-button dc-popup-button--wide">Settings</span>
        </div>
      </div>

      {/* The reward, all over the visitor's screen.
          The first version of this was seven small glyphs inside the demo's own box,
          which is a tidy illustration of a thing whose defining quality is that it is
          not tidy. A feed does not politely indicate that it wants your attention. So
          this is forty-two of them, big, pouring across the whole window, with follower
          and like notifications stacking up in the corner on top — and all of it
          portalled out of the section so it happens to the page the visitor is
          actually looking at.

          Then the extension goes on and every one of them stops dead where it is,
          loses its colour and drains away. Freezing rather than clearing is the
          argument: nothing was taken from you, it just stopped being worth anything.

          Gated on `focused` as well as the beat, because a frozen storyboard would
          otherwise leave the deluge on screen for the rest of the page. */}
      <ViewportLayer className="vlayer--deluge">
        {focused && (
          <div
            className="dc-deluge"
            ref={delugeRef}
            onAnimationStart={pinRewardOrigin}
            data-running={flooding}
            data-spent={on}
            /* Stands down while the extension is being switched on. The whole point of
               those two beats is that a visitor sees a pointer press a button, and it
               cannot compete with dozens of rewards crossing the screen — the flood is the
               problem being described, so it gets out of the way of the moment the
               problem is solved. */
            data-quiet={quiet}
            key={`deluge-${run}`}
          >
            {/* Two low-cost shockwaves carry the scale the reduced particle set no
                longer has to fake with duplicate glyphs. They share the measured
                origins, expand once, and leave the individual rewards to provide
                texture and direction. */}
            <div className="dc-burst-aura" aria-hidden="true">
              <span data-from="like" />
              <span data-from="comment" />
            </div>

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
          pressing={CLICKS.has(beat)}
          onPress={onPress}
          /* Deliberate rather than brisk, for the reason in this scene's stylesheet: the
             pointer crosses a whole browser window here with a flood of animation going
             on around it. This replaces a flat 1100ms transition override, so the longest
             move is about what it was and the short ones are no longer artificially slow. */
          pace={2.4}
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
