"use client";

/**
 * PagePack, as a twenty-one-second film.
 *
 * The pitch is one sentence — "your reading list is just a list of links once the
 * signal drops" — and a sentence is not something you can prove with a screenshot
 * of a popup. So the vignette proves it by staging the failure:
 *
 *   a page is open, the cursor reaches for the toolbar, Save is pressed — and before
 *   anything is saved the extension comes back with a sheet: eight pages found, what
 *   they weigh, what the save will leave of the month's allowance. That is pressed
 *   too, the pages tear themselves off into cards that fly out of the window while
 *   the meter under the bar counts them; then the connection dies, Chrome's own error
 *   screen starts to come up — and never arrives, because PagePack takes the tab and
 *   opens the saved copy in it, with every page of the save one click away in a
 *   sidebar.
 *
 * That last move is the product, and the sheet is the product as it is now. The
 * extension used to start a link-following save blind: press Save and find out
 * afterwards how many pages it took and how much of the month it cost. It now runs
 * `DISCOVER_LINKS` first and shows the plan — `openPreflightSheet` in `popup.js` — so
 * the count is on screen before the press that spends it, and the progress card
 * carries an honest `#progress-meter` counting pages landed rather than a guess.
 *
 * What is real here and what is staged. Every string the popup, the sheet, the
 * progress card, the library and the reader print is one the extension prints:
 * the sheet's kicker, title, summary, note and button from `openPreflightSheet` and
 * `allowanceNote`; the progress vocabulary from `captureProgressMessage`, copied out
 * of the service worker into `./progress`; the meter from `renderProgressCard`; the
 * plan line, the hint under the button, the saved notice and the status from
 * `renderSaveView`; the library row's `packMeta`; the reader's bar, its "In this save"
 * sidebar and the "✓ Saved" pill it puts on in-pack links. Everything else — the
 * browser frame, the article, the flying cards, the outage — is theatre, and the
 * section says so rather than claiming this is the extension running in the page.
 *
 * The article is invented. `ridgestation.example` is a reserved domain, the
 * publication does not exist, and nothing in it names a real product; a
 * reconstruction may show real-looking pages but may not borrow a real site's name.
 */

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { PhantomCursor, SETTLE_MS } from "../scene/cursor";
import { usePressGate } from "../scene/press-gate";
import { useSectionBeat } from "../scene/section-beat";
import { SpecTags, type SpecTag } from "../scene/spec";
import { useStoryboard, type Beat } from "../scene/storyboard";
import { useSceneRun } from "../scene/use-scene-run";
import { useOnScreen } from "../use-on-screen";
import { useSectionFocused } from "../use-section-focus";
import {
  captureProgressMessage,
  formatBytes,
  optionsSummary,
  progressTitle,
  type CapturePhase,
} from "./progress";
import "./demo.css";

type BeatName =
  | "settle"
  | "reach"
  | "open"
  | "aim"
  | "press"
  | "sheet"
  | "aim-sheet"
  | "confirm"
  | "read"
  | "collect"
  | "finish"
  | "cut"
  | "dead"
  | "caught"
  | "aim-library"
  | "reveal"
  | "aim-page"
  | "open-page"
  | "read-offline"
  | "hold";

/**
 * The storyboard.
 *
 * Kept as one visible list because the pacing is the design. `press` and `confirm` are
 * short because a click is short; `dead` is long because the silence after the
 * connection drops is the beat doing the work; `sheet` is the longest look in the film
 * because it is the new thing, and a first-time visitor has to read a count, a size and
 * an allowance off it before the pointer moves.
 *
 * Three beats were added for the pre-flight — `sheet`, `aim-sheet`, `confirm` — and they
 * follow the pattern every other press here uses: the thing appears, the pointer is
 * given a beat to reach the control, and the press gets a beat of its own, so the
 * consequence of a click can never precede the click.
 *
 * The four save beats are load-bearing arithmetic: `confirm + read + collect + finish` is
 * the window the cards fly in, and `FLYER_STAGGER` derives the stagger from it, so moving
 * any of them keeps the cards landing on `finish` rather than stranding them mid-air.
 */
const BEATS: readonly Beat<BeatName>[] = [
  // The establishing shot: a browser, an article, a toolbar nobody has looked at yet.
  { name: "settle", ms: 1400 },
  { name: "reach", ms: 800 },
  // The popup is a new object with a plan line, a target page and a button on it.
  { name: "open", ms: 1500 },
  { name: "aim", ms: 600 },
  // A press is a press. The button reads "Finding linked pages…" until the sheet lands.
  { name: "press", ms: 320 },
  /* The pre-flight. Eight pages found, ~45 KB, seventeen free pages left afterwards, a
     ticked list. The centrepiece of the film, and the beat that carries the claim the
     product could not make before this pass: the count is known before anything is
     saved. */
  { name: "sheet", ms: 2000 },
  { name: "aim-sheet", ms: 600 },
  // "Save 8 pages". The sheet closes on the click and the cards leave on the same tick.
  { name: "confirm", ms: 320 },
  // "Reading this page…" — the first of three progress states.
  { name: "read", ms: 900 },
  // The cards leaving the window while the meter counts them in.
  { name: "collect", ms: 1900 },
  // "Finishing up…" and the count landing on the toolbar badge.
  { name: "finish", ms: 1300 },
  // A cut. Long enough for the signal arcs to drop outside-in and the slash to draw.
  { name: "cut", ms: 800 },
  /* Chrome's dead end, and deliberately the shortest look in the film: the screen is
     Chrome's own, and `webNavigation.onErrorOccurred` in `background.js` catches a saved
     URL failing to load and sends the tab to the saved copy instead. The product is not
     "here is a crash screen and also a library". It is that you do not arrive at it. */
  { name: "dead", ms: 1100 },
  /* The redirect landing: `chrome.tabs.update(tabId, { url: offlineReaderUrl(match) })`,
     so what replaces the error is `viewer.html`, in the same tab, at a
     `chrome-extension://` address — which is why the omnibox changes here as well as the
     page, and why the tab's title becomes the page's own: `renderBar` sets
     `document.title` to it. */
  { name: "caught", ms: 1500 },
  // The pointer flies to the Library tab a beat before it presses it.
  { name: "aim-library", ms: 700 },
  // The library: the pack, its `packMeta`, and the allowance line it left.
  { name: "reveal", ms: 900 },
  { name: "aim-page", ms: 600 },
  { name: "open-page", ms: 600 },
  // The payoff: the reader at reading size, the sidebar listing every page of the save.
  { name: "read-offline", ms: 2400 },
  { name: "hold", ms: 1200 },
];

/**
 * The window the cards fly in: confirm, read, collect, finish.
 *
 * Named and summed rather than written down, because it is the input to
 * `FLYER_STAGGER` below and a hand-computed stagger silently strands the animation the
 * first time one of these beats moves.
 */
const SAVE_BEATS = ["confirm", "read", "collect", "finish"] as const;
const SAVE_MS = BEATS.filter((beat) =>
  (SAVE_BEATS as readonly string[]).includes(beat.name),
).reduce((total, beat) => total + beat.ms, 0);

/**
 * Where the cursor is on each beat. `null` means it has left the frame.
 *
 * Four clicks, each aimed a beat before it is pressed. Through `sheet` the pointer stays
 * on the Save button it just pressed — the sheet slides up over it, so what a visitor
 * sees is a hand resting where it clicked while the extension answers — and then moves
 * to the sheet's own button. It leaves on `read`: the pointer's work is finished when
 * the save starts, and a hand parked on a progress bar reads as waiting to click it.
 */
const CURSOR: Partial<Record<BeatName, string>> = {
  reach: "toolbar",
  open: "toolbar",
  aim: "save",
  press: "save",
  sheet: "save",
  "aim-sheet": "save-pages",
  confirm: "save-pages",
  "aim-library": "library-tab",
  reveal: "library-tab",
  "aim-page": "shelf-page",
  "open-page": "shelf-page",
};

/**
 * The beats whose visible change is caused by a click, and which therefore wait for it.
 * See `usePressGate`.
 *
 * `press` carries the button's pressed look and its "Finding linked pages…" label.
 * `confirm` is the one that matters most: the sheet closes, the progress card appears
 * and eight cards leave the window, all on the tick the ring comes off the pointer.
 * `reveal` opens the library. `open-page` is absent on purpose — the reader unfolds on
 * the beat after it, so there is nothing on that beat to hold back.
 */
const CLICKS: ReadonlySet<BeatName> = new Set<BeatName>(["press", "confirm", "reveal"]);

/**
 * The site, and the page the browser has open.
 *
 * `.example` is reserved by RFC 2606, so this can never be anybody's. The publication
 * is invented for the same reason the extension's own screenshots are shot against an
 * invented one: a real site's name is a brand, and a reconstruction has no business
 * putting a brand's pages in a browser it is pretending to be.
 */
const SITE = "ridgestation.example";
const KICKER = "Ridge Station Notes";

/** The page in the tab: the one the save is *of*, and the one the sheet always keeps. */
const ROOT = { title: "A weather mast for the north ridge", bytes: 5_212, files: 6 };

/**
 * The same-site pages the crawl finds, in the order the sheet lists them and the cards
 * leave the button.
 *
 * `files` is each page's own asset count — the stylesheets, images and fonts the save has
 * to fetch before that page can be read offline. It is authored, like `bytes` and `title`,
 * and it is here rather than in the progress label because the label is arithmetic over
 * these pages and nothing else; `tests/rendered-html.test.mjs` reads this list back out
 * of the source and checks the label is derived from it.
 *
 * The root page is deliberately not in this list. `openPreflightSheet` counts
 * `1 + result.pages.length`, so "8 pages found" is this list plus the page in the tab,
 * exactly as the extension adds it up — and the test holds this list to seven entries of
 * exactly this shape, which is why each page's path lives in `LINKED_PATHS` beside it
 * rather than as a fourth field.
 */
const CAPTURED = [
  { title: "Choosing a barometer", bytes: 3_804, files: 4 },
  { title: "Calibrating the rain gauge", bytes: 3_390, files: 3 },
  { title: "Solar power for the mast", bytes: 2_961, files: 3 },
  { title: "Logging to a card", bytes: 4_118, files: 5 },
  { title: "Reading the data over radio", bytes: 3_577, files: 4 },
  { title: "Weatherproofing the enclosure", bytes: 2_845, files: 2 },
  { title: "A year of readings", bytes: 4_420, files: 5 },
];

/** Each linked page's path, in `CAPTURED` order. See the note above on why it is apart. */
const LINKED_PATHS = [
  "/barometer",
  "/rain-gauge",
  "/solar",
  "/logging",
  "/radio",
  "/enclosure",
  "/readings",
] as const;

/** Every page of the save, root first — the order the pack keeps and the sidebar lists. */
const PAGES = [ROOT, ...CAPTURED];

/**
 * The first line of each page, root first, in `PAGES` order.
 *
 * Printed on the cards that fly out of the window, which used to carry four grey bars
 * where a page would have text. A page torn out of a site should look like a page: a
 * title and the opening of an article, however small. Invented, like the titles, and
 * kept beside `LINKED_PATHS` rather than in `CAPTURED` for the same reason — the test
 * holds that list to three fields.
 */
const LEDES = [
  "Four instruments on a six-metre pole, a solar panel the size of a paperback, and a radio link to the house.",
  "Absolute pressure, not sea-level: the ridge is 640 m up and the correction is most of the reading.",
  "A tipping bucket counts tips, not millimetres. How 0.2 mm a tip was checked with a measuring jug.",
  "Twelve watts of panel, a 7 Ah battery, and the arithmetic for three overcast days in a row.",
  "Every reading is written to the card first. The radio is the second copy, never the only one.",
  "A 433 MHz link at 1200 baud reaches the house on clear days and drops when the cloud comes down.",
  "An IP66 box, a breathing vent, and the one cable gland that leaked for the whole of February.",
  "Twelve months of pressure, rain, wind and temperature, and the three days the mast stopped.",
] as const;

/**
 * Each page's address as the extension prints it: `shortUrl` in `popup.js` and
 * `shortReaderUrl` in `viewer.js` are the same function — hostname with any `www.`
 * removed, then the path with a trailing slash stripped — so the root page is bare.
 */
const PAGE_URLS = ["", ...LINKED_PATHS].map((path) => `${SITE}${path}`);

const TOTAL_BYTES = PAGES.reduce((sum, page) => sum + page.bytes, 0);

/**
 * The sheet's estimate, which is not the sum above and should not be.
 *
 * `DISCOVER_LINKS` sizes pages before they are fetched, from content-length and a
 * heuristic for what they will pull in, and the extension prints it with a tilde for
 * that reason: "~45 KB estimated" against a pack that lands at 30 KB is exactly the
 * relationship its own screenshots show. `formatBytes` rounds this to "45 KB".
 */
const ESTIMATED_BYTES = 46_080;

/**
 * The free allowance, and the arithmetic the popup does on it.
 *
 * Twenty-five is `FREE_LIMIT` — the plan line reads "25 pages left this month" from
 * `renderPlanSummary`, and the sheet's note "Leaves 17 free pages this month." is
 * `allowanceNote(8)` with `savesLeft()` at 25. This is the copy the audit found wrong:
 * it used to say "saves", and a four-page save then left "21 saves". Pages now, and the
 * scene prints both figures from one constant so the plan line after the save agrees
 * with the note before it.
 */
const FREE_PAGES = 25;

/**
 * The time the pack was saved, as the Library prints it.
 *
 * `packMeta` joins `plural(pages, "page")`, `formatBytes(stats.bytes)` and
 * `formatDate(savedAt)` with ` · `; `formatDate` prints a time for a save made today,
 * which this one was. A literal rather than a real `Intl.DateTimeFormat` call, because
 * `formatDate` passes `undefined` as its locale and the server render and the client
 * render can then disagree — a hydration mismatch is a worse bug than a fixed time in a
 * staged film.
 */
const SAVED_AT = "7:03 PM";

/** `plural` as `popup.js` has it: "8 pages", "1 page". */
const plural = (count: number, singular: string) =>
  `${count} ${count === 1 ? singular : `${singular}s`}`;

/**
 * The toolbar badge during a save, from `captureBadgeText` in `background.js`.
 *
 * ```
 * if (!following || !(Number(pages) > 0)) return CAPTURE_WORKING_BADGE;
 * return Number(pages) > 99 ? "99+" : String(Number(pages));
 * ```
 *
 * A planned save is `following`, so the badge counts. The dot is what a counting badge
 * shows before its first page has landed. The colour belongs to the same function's
 * caller: `paintActionBadge` sets `#0a84ff` for a capture and `#b85c5c` for a "save as I
 * browse" collection, and there is no state in which it is green.
 */
const CAPTURE_WORKING_BADGE = "•";

function captureBadgeText(pages: number): string {
  if (!(pages > 0)) return CAPTURE_WORKING_BADGE;
  return pages > 99 ? "99+" : String(pages);
}

/** Files discovered across the first `pages` pages of the pack. */
const filesThrough = (pages: number) =>
  PAGES.slice(0, pages).reduce((sum, page) => sum + page.files, 0);

/** Bytes on disk after the first `pages` pages have landed — what the meter prints. */
const bytesThrough = (pages: number) =>
  PAGES.slice(0, pages).reduce((sum, page) => sum + page.bytes, 0);

/**
 * How far apart the cards leave the button, as a multiple of the stylesheet's own
 * 235ms step.
 *
 * `.pp-flyer[data-flying="true"]` runs a 1900ms flight with
 * `animation-delay: calc(var(--order) * 235ms)`, so the last of eight cards lands at
 * `1900 + 7 × 235 × stagger`. That has to equal the save window exactly: the cards
 * should settle as `finish` ends, so the last one arrives the instant before the
 * connection dies.
 *
 * `SETTLE_MS` comes off the front of the window because the cards leave when the pointer
 * actually presses "Save 8 pages", which is 90ms after it has landed on it. See
 * `usePressGate` and `CLICKS`.
 */
const FLYER_FLIGHT_MS = 1900;
const FLYER_STEP_MS = 235;
const FLYER_STAGGER =
  (SAVE_MS - SETTLE_MS - FLYER_FLIGHT_MS) / (FLYER_STEP_MS * (PAGES.length - 1));

/**
 * Where each card comes to rest: the centre of the card, in the stage's own pixels,
 * measured from the stage's top-left corner.
 *
 * Authored rather than randomised, and in stage pixels rather than viewport units,
 * because everything a card has to keep clear of is a fixed size and sits at a fixed
 * place in the stage: the browser is the stage, the popup hangs 400px wide off its
 * right end, the reader that replaces the error fills it from the beat after the cut,
 * and the labels hang off its left edge. A viewport unit is proportional to the wrong
 * thing — it undershot the window's edge at 1440 and threw cards off the page at 2560.
 * `100cqw` is the stage's width, so the column to the right of the window is placed
 * off its right edge whatever that width is; the stylesheet turns these into a
 * translation from the button the cards leave.
 *
 * The button is low in the popup, so the cards fan up and out from the bottom right.
 * Two columns stand to the left of the window and one to its right, between the
 * window's edge and the dock; one card lands on the window's top-left corner, over the
 * traffic lights and the dead tab strip — short of the tab's own favicon, and low enough
 * to clear the heading's rule above the window, which is the one strip of the frame
 * where a card can lie without touching something a visitor is reading. None lands on
 * the popup, the reader's bar, the sidebar or the loading lines, none on the two labels
 * that hang off the window's left edge, and none on the cable's coupler on the floor to
 * the left — that is the prop the outage depends on.
 *
 * These are the landing spots for a section with floor on both sides of the window. The
 * pod measures that floor — see the effect below — and publishes `data-scatter` on the
 * stage; where there is no room to the right of the window, or none to its left, the
 * stylesheet piles the cards instead. See `demo.css`.
 */
const SCATTER = [
  { x: "calc(100cqw + 62px)", y: "200px", rot: "9deg" },
  { x: "-215px", y: "235px", rot: "-11deg" },
  { x: "-93px", y: "260px", rot: "7deg" },
  { x: "calc(100cqw + 62px)", y: "340px", rot: "-6deg" },
  { x: "14px", y: "-12px", rot: "8deg" },
  { x: "-93px", y: "495px", rot: "-9deg" },
  { x: "-215px", y: "490px", rot: "4deg" },
  { x: "calc(100cqw + 62px)", y: "500px", rot: "-5deg" },
] as const;

/**
 * How much floor the full scatter needs, in CSS pixels.
 *
 * To the left: two columns of 96px cards standing clear of the window and of the page's
 * edge. To the right: one column, standing between the window and the hero index that
 * hangs down the right edge of the viewport — a card has to fit in that gap without
 * lying on either. Measured, like the cable's floor, rather than guessed from a
 * breakpoint: the window is a max-width box in a grid, so the floor beside it is not a
 * function of the viewport width that a media query could name. At 1440px there is room
 * for both; at 1366 the right column would be on the index; below about 1200 the
 * columns on the left would be off the page.
 */
const SCATTER_LEFT_PX = 250;
const SCATTER_RIGHT_PX = 150;

/**
 * Which landing the floor allows. Published on the stage as `data-scatter` and read by
 * the stylesheet; `corner` also re-pins two of the labels, see `CORNER_SPECS`.
 */
type Scatter = "wide" | "floor" | "corner";

/**
 * The five claims the frame cannot make for itself, each pinned to its evidence.
 *
 * The popup narrates the save in the extension's own strings — the sheet's count, the
 * meter's pages, the status line, the library row — so nothing here restates one. What a
 * label adds is the *point* of a string: that a count on a sheet means the price is known
 * before it is paid; that a meter reading "4 of 8 pages" is counting rather than
 * estimating; that the reader arriving in the tab is what happens *instead of* the error;
 * that a sidebar of eight pages is the whole save, one click each; and that reading it
 * costs nothing on the wire, which is invisible by definition and is on the page because
 * it is measured — `tests/offline-network.test.mjs` in the extension renders a real pack
 * under the policy read out of `manifest.json` and counts the requests, and gets none.
 *
 * Every one names the element it is about and is measured against it. The first two
 * leave with their evidence: the sheet closes on `confirm`, and the progress card is
 * replaced by the status line on `cut`. The third is pinned to the reader's bar, which
 * is in the tab from `caught` and on the reading plane from `read-offline` — the anchor
 * moves with it, so the label follows the reader out of the window rather than being
 * left over a ghost. The last two arrive with the still.
 */
const SPECS: readonly SpecTag<BeatName>[] = [
  /* Off the sheet's summary line — "8 pages found · ~45 KB estimated" — reading left
     over the article. The sheet is a solid block of type with nowhere to sit inside it.
     Dropped ten pixels off the line's own centre: the plate is level with the article's
     headline otherwise, and lies along its baseline; this puts it in the leading under
     the headline's first line, where there is nothing to cover. */
  {
    at: "sheet",
    text: "The count is known before saving",
    x: 66,
    y: 35,
    anchor: "sheet-summary",
    grip: "left",
    nudge: { y: 10 },
    side: "left",
    until: "read",
  },
  /* Off the meter itself — "0 of 8 pages · 0 B" as the first page is read, "4 of 8
     pages · 15 KB" a beat later — which is `renderProgressCard`'s honest line for a save
     with a known page count. The label says why it is honest, and arrives with the
     meter rather than a beat after it: the plate takes most of a second to fly out of
     the button, and a label that leaves on `collect` is still in the air over the popup
     when the next frame is read, which `spec-anchors.mjs` reports as a plate lying on
     the meter it is about. */
  {
    at: "read",
    text: "The meter counts pages, not guesses",
    x: 66,
    y: 60,
    anchor: "meter",
    grip: "left",
    side: "left",
    until: "cut",
  },
  /* On the reader's bar, out of the window's left edge into the dark half of the section.
     Inside the tab it would be a white pill on a white page; out here the frame is
     drained to near black and a frosted plate is the most legible thing in it. */
  {
    at: "caught",
    text: "Saved copy opens when the load fails",
    x: 24,
    y: 30,
    anchor: "reader-bar",
    grip: "left",
    side: "left",
  },
  /* Two on the sidebar, at two heights: the list is 280px of pages in the real reader and
     the one element on the plane that is *about* the save rather than about the page. */
  {
    at: "read-offline",
    text: "Every saved page, one click away",
    x: 20,
    y: 62,
    anchor: "sidebar",
    grip: "top left",
    nudge: { y: 36 },
    side: "left",
  },
  /* Hung under the reading plane, centred beneath the page, on the dark floor. Nothing on
     the plane is evidence of a request that was never made, so this one is pinned to the
     plane as a whole rather than to a part of it. */
  {
    at: "read-offline",
    text: "Reading a save uses no network",
    x: 28,
    y: 96,
    anchor: "reader",
    grip: "bottom",
    /* Under the sidebar column, not the article: the article's last paragraph runs on
       below the plane's clipped edge, and a plate hung beneath it sat on lines of type
       nobody can see but the anchor check can. The sidebar ends with its eighth row. */
    nudge: { x: -300 },
    side: "below",
  },
];

/**
 * The same five claims when the window fills the section.
 *
 * Two of them read left off the reader's left edge, and a plate reading left needs about
 * 250px of floor to lie on. Below that — tablets, small laptops, anything up to about
 * 1200px wide — the window starts within a hundred pixels of the page's edge, and the
 * plate was cut off by it: "ad fails" was all that survived at 1024. So on that floor
 * they hang off the reader's other edges instead. The first goes above the bar, pinned
 * to its top edge over the sidebar toggle, where what is behind it is the dead chrome
 * of the tab and then the ghost of the receded window. The second hangs under the
 * sidebar, below the reading plane, beside the one that was already there — and the
 * piled cards, which would be under it, are put away once the plane is up (they are
 * under the plane by then anyway; see `demo.css`).
 *
 * Derived from `SPECS` rather than written out, so the text, the beats and the anchors
 * cannot drift between the two sets: only the pins differ.
 */
const CORNER_SPECS: readonly SpecTag<BeatName>[] = SPECS.map((tag) => {
  if (tag.anchor === "reader-bar") {
    return { ...tag, grip: "top left", side: "above", nudge: { x: 150 } };
  }
  if (tag.anchor === "sidebar") {
    return { ...tag, grip: "bottom", side: "below", nudge: { x: 0 } };
  }
  return tag;
});

/** The Save button they come out of, in the pod's own percentages. */
const SPEC_ORIGIN = { x: 82, y: 50 };

/**
 * How far into the pack the one frame that prints a page number is.
 *
 * Four landed, so the label reads "Page 5 of 8" and the meter "4 of 8 pages · 15 KB".
 * `collect` is the beat where the middle of the burst is in the air, so the middle of the
 * pack is what is actually on screen.
 */
const COLLECT_PAGES_DONE = 4;

/**
 * How many pages of the pack have landed by a given beat.
 *
 * One source for three readouts that have to agree: the progress line under the bar, the
 * meter under it and the count on the toolbar badge. They are published by different
 * parts of the extension — `publishProgress` four times a second, `setCaptureBadgePages`
 * once per page — but they are counting the same pages.
 */
function pagesSavedBy(beat: BeatName): number {
  if (beat === "collect") return COLLECT_PAGES_DONE;
  return beat === "finish" ? PAGES.length : 0;
}

/**
 * The detail line for a beat, through the extension's own formatter.
 *
 * Both file figures are derived from the pages. In `runCapture`, `assetsDone` and
 * `assetsTotal` are running totals over *only the pages opened so far* — each page
 * captures `assetsBefore`/`assetTotalBefore` and adds its own counts on top — so a
 * finished page contributes the same amount to both, and `assetsTotal - assetsDone` is
 * always the outstanding files of the page being hydrated right now. So everything
 * through the last finished page is done, and the page now being read has just added its
 * own files to the total. That is exactly the frame the extension publishes on entering a
 * page.
 */
function labelFor(beat: BeatName): string {
  const phase: CapturePhase =
    beat === "read" ? "reading" : beat === "finish" ? "finishing" : "assets";
  const pagesDone = pagesSavedBy(beat);
  return captureProgressMessage({
    phase,
    pagesDone,
    pagesTotal: PAGES.length,
    assetsDone: filesThrough(pagesDone),
    assetsTotal: filesThrough(Math.min(pagesDone + 1, PAGES.length)),
  });
}

/**
 * The meter, from `renderProgressCard`:
 *
 * ```
 * meter.textContent = `${done} of ${pagesTotal} ${unit} · ${formatBytes(capture.bytesDone)}`;
 * ```
 *
 * Shown for any save with more than one page. `bytesDone` is what has actually been
 * written, which is why it reads "15 KB" against a sheet that estimated 45.
 */
function meterFor(beat: BeatName): string {
  const done = pagesSavedBy(beat);
  return `${done} of ${PAGES.length} pages · ${formatBytes(bytesThrough(done))}`;
}

/**
 * How much bare floor the cable needs to the left of the browser window.
 *
 * The coupler is ~68px wide and has to be seen pulling apart, so it wants its own width
 * again in clearance on either side. Below this the section has no desk to lay a cable
 * on and the run moves to the bottom edge instead.
 */
const CABLE_FLOOR_PX = 210;

/* ------------------------------------------------------------------ the article
   The page the save is of, drawn three times: live in the tab, small in the reader
   that replaces the error, and at reading size on the plane. One component, so the
   copy cannot drift between them — a saved page that differs from the page it was
   saved from is the one thing this scene must never show.

   `saved` adds the pill the reader puts on every link that is in the pack:
   `annotateSavedLinks` in `pack-render.js` marks them `data-pagepack-saved-link` and
   `savedLinkStyle` draws "✓ Saved" after each, in the accent, at 0.62em. */
function Article({ saved, long }: { saved: boolean; long: boolean }) {
  return (
    <>
      <p className="pp-kicker">{KICKER}</p>
      <h1 className="pp-headline">{ROOT.title}</h1>
      <p className="pp-standfirst">
        Four instruments on a six-metre pole, a solar panel the size of a paperback, and
        a radio link that reaches the house on the days the cloud comes down. This is
        the build, in the order it actually happened.
      </p>
      <p className="pp-links">
        {CAPTURED.map((page) => (
          <span className="pp-link" key={page.title} data-saved={saved}>
            {page.title}
          </span>
        ))}
      </p>
      <h2 className="pp-subhead">What the mast carries</h2>
      <p className="pp-body">
        A barometer, a rain gauge, an anemometer and a thermometer, each on its own page,
        because each one turned into its own small argument with the weather. The mast
        was the easy part.
      </p>
      {long && (
        <>
          <figure className="pp-figure" aria-hidden="true">
            <svg viewBox="0 0 640 200" preserveAspectRatio="none">
              <path className="pp-ridge pp-ridge--far" d="M0 150 C90 120 150 96 230 104 S380 60 470 84 S580 122 640 108 V200 H0z" />
              <path className="pp-ridge pp-ridge--mid" d="M0 172 C70 150 130 132 210 146 S350 108 430 128 S560 168 640 150 V200 H0z" />
              <path className="pp-ridge pp-ridge--near" d="M0 200 C120 178 220 168 330 182 S520 166 640 186 V200z" />
              <circle className="pp-sun" cx="118" cy="52" r="18" />
              <path className="pp-mast" d="M416 128 V52 M404 64 h24 M408 80 h16" />
            </svg>
          </figure>
          <h2 className="pp-subhead">Why it logs to a card first</h2>
          <p className="pp-body">
            The radio link drops whenever the ridge is in cloud, which is most of March.
            The card never does. Everything is written locally, and the house catches up
            when it can.
          </p>
        </>
      )}
    </>
  );
}

/**
 * The reader's bar, from `#reader-bar` in `viewer.html`: back to the Library, the
 * sidebar toggle, the title over `shortReaderUrl(page.url)`, the page position between
 * its arrows, "Enable scripts" for a pack that saved them, and the live page.
 *
 * `anchor` is which of the two copies a label may be measured against — see `SPECS`.
 */
function ReaderBar({ anchor }: { anchor: boolean }) {
  return (
    <div className="pp-rbar" data-spec-anchor={anchor ? "reader-bar" : undefined}>
      <span className="pp-rbtn pp-rbtn--quiet">
        <svg viewBox="0 0 24 24"><path d="M14 6l-6 6 6 6" /></svg>
        Library
      </span>
      <span className="pp-ricon">
        <svg viewBox="0 0 24 24"><path d="M4.5 5.5h15v13h-15zM9.5 5.5v13M6.5 9h1M6.5 12h1M6.5 15h1" /></svg>
      </span>
      <span className="pp-ridentity">
        <strong>{ROOT.title}</strong>
        <span>{PAGE_URLS[0]}</span>
      </span>
      <span className="pp-rnav">
        <i className="pp-ricon" data-disabled="true">
          <svg viewBox="0 0 24 24"><path d="M14 6l-6 6 6 6" /></svg>
        </i>
        <b>{`1 of ${PAGES.length}`}</b>
        <i className="pp-ricon">
          <svg viewBox="0 0 24 24"><path d="M10 6l6 6-6 6" /></svg>
        </i>
      </span>
      <span className="pp-rbtn pp-rbtn--quiet">Enable scripts</span>
      <span className="pp-rbtn">Open online</span>
    </div>
  );
}

/**
 * "In this save", from `renderSidebar`: the count, then every page of the pack as a
 * numbered row of title over short URL, the current one in the accent.
 */
function PackSidebar({ anchor }: { anchor: boolean }) {
  return (
    <aside className="pp-rside" data-spec-anchor={anchor ? "sidebar" : undefined}>
      <p className="pp-rside-head">
        <strong>In this save</strong>
        <span>{plural(PAGES.length, "page")}</span>
      </p>
      <ol className="pp-rside-list">
        {PAGES.map((page, order) => (
          <li key={page.title} data-current={order === 0}>
            <i>{order + 1}</i>
            <span>
              <strong>{page.title}</strong>
              <small>{PAGE_URLS[order]}</small>
            </span>
          </li>
        ))}
      </ol>
    </aside>
  );
}

/** The extension's mark, as `popup.html` draws it. */
function BrandMark({ className }: { className: string }) {
  return (
    <span className={className} aria-hidden="true">
      <svg viewBox="0 0 32 32">
        <path d="M9.5 7.5h11a3 3 0 0 1 3 3v13h-11a3 3 0 0 1-3-3v-13Z" />
        <path d="M9.5 11.5h-1a3 3 0 0 0-3 3v10h11a3 3 0 0 0 3-3" />
        <path d="M16.5 11v7m0 0-2.5-2.5m2.5 2.5 2.5-2.5" />
      </svg>
    </span>
  );
}

export function PagePackDemo() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const browserRef = useRef<HTMLDivElement | null>(null);
  const onScreen = useOnScreen(stageRef);
  /* Starts on focus. The save and the outage are cause and effect, and arriving to find
     the connection already dead is arriving after the cause. */
  const running = useSceneRun(useSectionFocused(stageRef), onScreen);
  const state = useStoryboard(BEATS, {
    running,
    stage: stageRef,
    // The still that carries the argument: a dead browser and a live reader.
    stillBeat: "read-offline",
  });
  const { beat, index, run, still } = state;
  /* What the presses did, held until they happened. `beat` still decides where the
     pointer goes and what the section's outage is doing; `did`/`reached` decide what a
     press is allowed to have changed. */
  const { did, reached, onPress } = usePressGate(BEATS, state, CLICKS);

  // The cable, section outage and reading field follow the save film beat for beat.
  useSectionBeat(stageRef, beat, BEATS);

  /* Where the escaped cards may land, from the measurement below. Undefined until it has
     been made, which the server render and the first frame are: the stylesheet's default
     is the full scatter, and no card is on screen for the first five seconds. */
  const [scatter, setScatter] = useState<Scatter>();

  /**
   * Tells the section's cable where this browser window actually is.
   *
   * The cable is drawn in `.bd--pagepack-front` as an SVG stretched to the full width, so
   * every x in its path is a percentage of the viewport; the window it runs behind is a
   * max-width box inside a grid, so its left edge is not a percentage of anything. The
   * pod publishes the measurement — `--pack-window-left`, `--pack-window-bottom` — and the
   * stylesheet clips the cable there and hangs the coupler a fixed distance short of it.
   * `data-pack-room` says whether there is any floor to lay a cable on at all; below
   * `CABLE_FLOOR_PX` the run moves to the bottom edge.
   *
   * The same measurement decides where the escaped cards may land, rendered on the
   * stage itself as `data-scatter` so the rule that reads it is the scene's own: `wide`
   * when there is floor on both sides of the window for the full `SCATTER`, `floor` when
   * only the left has room and the cards pile up on it, `corner` when the window fills
   * the section and the piles go on its own bottom-left corner instead — and the two
   * labels that read left off the reader move, see `CORNER_SPECS`.
   *
   * Resize and layout only, so it is not in the storyboard's frame loop.
   */
  useEffect(() => {
    const stage = stageRef.current;
    const section = stage?.closest<HTMLElement>("[data-project-section]");
    if (!stage || !section) return;

    let last = { left: -1, right: -1, bottom: -1 };
    const publish = () => {
      const browser = browserRef.current;
      if (!browser) return;
      const box = browser.getBoundingClientRect();
      /* On a narrow screen the stylesheet takes the dead window out of the flow for the
         reader's beats. A window with no box has no edge to measure; the cable keeps
         the last one, which is where the reader now stands. */
      if (box.width === 0 || box.height === 0) return;
      const sectionBox = section.getBoundingClientRect();
      const left = Math.round(box.left - sectionBox.left);
      const right = Math.round(sectionBox.right - box.right);
      const bottom = Math.round(box.bottom - sectionBox.top);
      if (left === last.left && right === last.right && bottom === last.bottom) return;
      last = { left, right, bottom };
      section.style.setProperty("--pack-window-left", `${left}px`);
      section.style.setProperty("--pack-window-bottom", `${bottom}px`);
      section.dataset.packRoom = left >= CABLE_FLOOR_PX ? "roomy" : "tight";
      setScatter(
        left < SCATTER_LEFT_PX ? "corner" : right < SCATTER_RIGHT_PX ? "floor" : "wide",
      );
    };

    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(section);
    observer.observe(stage);

    return () => {
      observer.disconnect();
      section.style.removeProperty("--pack-window-left");
      section.style.removeProperty("--pack-window-bottom");
      delete section.dataset.packRoom;
    };
  }, []);

  const at = (name: BeatName) => BEATS.findIndex((entry) => entry.name === name);

  const popupOpen = index >= at("open");
  /* `setBusy(saveButton, true)` and "Finding linked pages…" for as long as the discovery
     runs — from the click until the sheet answers it on the next beat. */
  const finding = did === "press";
  /* Open from the beat after the press until "Save 8 pages" is actually pressed. */
  const sheetOpen = index >= at("sheet") && reached < at("confirm");
  /* `#save-progress` shown and `#save-action` hidden, exactly as `renderSaveView` does
     for the whole of a capture. */
  const saving = reached >= at("confirm") && index < at("cut");
  /**
   * Stays true for the rest of the scene, and that matters. The scatter is held by the
   * animation's `forwards` fill; dropping the flag at the cut would remove the animation
   * and snap every card back to `opacity: 0`, and the outage would play over an empty
   * section — deleting the one image the vignette is built to produce.
   */
  const flying = reached >= at("confirm");
  const offline = index >= at("cut");
  /* The capture's `finally`: the pack is written, the badge cleared, the plan line
     re-read, `setStatus("Saved to your library.")`, and `findSavedUrl` now matches the
     tab, so the saved notice shows. */
  const saved = index >= at("cut");
  const dead = index >= at("dead");
  /* The redirect. From here the tab is not a failed page, it is `viewer.html`. */
  const restored = index >= at("caught");
  /* The reader's own first frame, and only its first frame: `#reader-loading` is painted
     while the pack is read off the device and gone by the next beat. */
  const opening = beat === "caught";
  const libraryOpen = reached >= at("reveal");
  const reading = index >= at("read-offline");
  /* The row the pointer is about to press, lit the way a row under a pointer is. */
  const aimingPage = beat === "aim-page" || beat === "open-page";

  const pagesLeft = saved ? FREE_PAGES - PAGES.length : FREE_PAGES;
  const found = 1 + CAPTURED.length;

  /* Chrome's tab title: the page's own, then the host while the error page has the tab,
     then the page's own again because `renderBar` sets `document.title` to it. */
  const tabTitle = offline && !restored ? SITE : ROOT.title;

  return (
    <div
      className="pp"
      ref={stageRef}
      data-beat={beat}
      /* The same clock a beat behind, for the beats that wait for a click. The stylesheet
         uses it for the buttons' pressed looks. See `CLICKS`. */
      data-did={did}
      data-lap={run}
      data-offline={offline}
      data-dead={dead}
      data-restored={restored}
      data-reading={reading}
      data-scatter={scatter}
      role="img"
      aria-label={
        "A browser with a technical article open. PagePack's popup offers to save it with " +
        "its linked pages, and first shows a sheet listing the eight pages it found — " +
        "this one and seven it links to — their estimated size and how many free pages " +
        "the month will have left. " +
        "The save runs with a meter counting pages landed while the pages fly out of the " +
        "window. The connection then drops, the browser's own no-internet screen begins " +
        "to appear and is replaced by the saved copy in PagePack's reader, whose sidebar " +
        "lists every page of the save; the library shows the pack and the pages left."
      }
    >
      {/* ---------------------------------------------------------------- browser */}
      {/* Measured, so the section's cable knows where to stop. See the effect above. */}
      <div className="pp-browser" ref={browserRef}>
        {/* Everything inside the window is drawn at the extension's own pixel sizes — a
            400×600 popup, a 52px reader bar, a 280px sidebar, 13px type — and this wrapper
            scales the whole screen to fit the well. See `--pp-zoom` in the stylesheet. */}
        <div className="pp-screen">
        {/* The outage, as a wash rather than a filter on this element: a filter here would
            drain the popup with everything else, and the popup surviving is the shot. */}
        <div className="pp-drain" aria-hidden="true" />
        <div className="pp-chrome">
          {/* The tab strip exists for one detail: the title. Chrome's, until the reader
              has the tab and sets `document.title` to the saved page's own. */}
          <div className="pp-tabstrip">
            <span className="pp-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="pp-tab" data-spec-anchor="tab">
              <i className="pp-favicon" data-dead={offline && !restored} />
              <span className="pp-tab-title">{tabTitle}</span>
            </span>
            <span className="pp-tab-new" aria-hidden="true">
              +
            </span>
          </div>

          <div className="pp-toolbar-row">
            <span className="pp-navs" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>

            {/* The tab's address, and it changes twice: the redirect is a navigation, so
                once PagePack has caught the failure the tab is at the extension's own
                `viewer.html`. The id is elided because a 32-character extension id at
                11px is noise; the scheme and the file carry the fact. */}
            <span className="pp-omnibox">
              <span className="pp-lock" aria-hidden="true">
                {restored ? (
                  <svg viewBox="0 0 24 24">
                    <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
                      <path d="M5 4.5h9l5 5v10H5z" />
                      <path d="M14 4.5v5h5" />
                    </g>
                  </svg>
                ) : offline ? (
                  "⚠"
                ) : (
                  "🔒"
                )}
              </span>
              <span className="pp-url">
                {restored ? "chrome-extension://…/viewer.html" : SITE}
              </span>
            </span>

            {/* The signal. Its own element so the cut can be a single class flip. */}
            <span className="pp-wifi" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M2.5 8.5a15 15 0 0 1 19 0" className="pp-wifi-arc pp-wifi-arc--3" />
                  <path d="M5.8 12.2a10 10 0 0 1 12.4 0" className="pp-wifi-arc pp-wifi-arc--2" />
                  <path d="M9 15.8a5 5 0 0 1 6 0" className="pp-wifi-arc pp-wifi-arc--1" />
                </g>
                <circle cx="12" cy="19.2" r="1.5" fill="currentColor" className="pp-wifi-dot" />
                <path d="M3 3l18 18" className="pp-wifi-slash" />
              </svg>
            </span>

            <span className="pp-toolbar" data-target="toolbar">
              <BrandMark className="pp-mark" />
              {/* Up for exactly as long as the save is: `setCaptureBadge(true, …)` runs
                  when the capture starts and the `finally` clears it when the pack is
                  written. Keyed by its own text so each change pops. */}
              {saving && (
                <span
                  className="pp-badge"
                  key={captureBadgeText(pagesSavedBy(beat))}
                  aria-hidden="true"
                >
                  {captureBadgeText(pagesSavedBy(beat))}
                </span>
              )}
            </span>
          </div>
        </div>

        {/* --------------------------------------------------------------- content */}
        <div className="pp-viewport">
          <article className="pp-page pp-article pp-article--live" aria-hidden="true" data-spec-anchor="page">
            <Article saved={false} long={false} />
          </article>

          {/* The browser's own failure, which is the whole reason the product exists — and
              which is Chrome's screen, not PagePack's. It rises on `dead` and is wiped on
              `caught`; see the stylesheet. */}
          <div className="pp-crash" aria-hidden="true">
            <span className="pp-crash-glyph">
              <svg viewBox="0 0 24 24">
                <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <path d="M4 7.5a20 20 0 0 1 16 0" />
                  <path d="M7.5 11.6a13 13 0 0 1 9 0" />
                  <path d="M3 3l18 18" />
                </g>
              </svg>
            </span>
            <strong>No internet</strong>
            <span>ERR_INTERNET_DISCONNECTED</span>
          </div>

          {/* ---------------------------------------------------------- the catch
              What `onErrorOccurred` puts in the tab instead: `viewer.html`, at the page
              that just failed to load. It is the same tab, which is the part that makes
              this the product rather than a consolation prize.

              Two frames of it. The reader paints `#reader-loading` first, and those two
              lines are the extension's own; the bar, the sidebar and the page follow on
              the next beat. */}
          <div className="pp-restored" data-spec-anchor="restored" aria-hidden="true">
            <ReaderBar anchor={!reading} />
            {opening ? (
              <p className="pp-restored-loading">
                {/* `.loader` in `viewer.css`: the mark on a 62px accent tile. */}
                <BrandMark className="pp-loader" />
                <strong>Opening your save…</strong>
                <span>Reading it from this device.</span>
              </p>
            ) : (
              <div className="pp-rmain">
                <PackSidebar anchor={false} />
                <div className="pp-article pp-article--tab">
                  <Article saved long={false} />
                </div>
              </div>
            )}
          </div>

          {/* ------------------------------------------------------------- popup
              400x600 in the extension, at the scale this window gives it: the same
              header, segmented control, cards, separators and radii, on the same
              `#f2f2f6`. */}
          <div className="pp-popup" data-spec-anchor="popup" data-open={popupOpen}>
            <header className="pp-popup-head">
              <BrandMark className="pp-popup-mark" />
              <span className="pp-brand">
                <strong>PagePack</strong>
                {/* `renderPlanSummary`: `${plural(savesLeft(), "page")} left this month`. */}
                <span className="pp-plan">{`${plural(pagesLeft, "page")} left this month`}</span>
              </span>
              <span className="pp-chip">Free</span>
            </header>

            <nav className="pp-tabs" aria-hidden="true">
              <span data-on={!libraryOpen}>
                <svg viewBox="0 0 24 24"><path d="M5 19.5h14M12 3.5v11m0 0-4-4m4 4 4-4" /></svg>
                Save
              </span>
              <span data-on={libraryOpen} data-target="library-tab">
                <svg viewBox="0 0 24 24"><path d="M4.5 7.5h15v12h-15zM7.5 4.5h9M8.5 11.5h7" /></svg>
                Library
              </span>
            </nav>

            {libraryOpen ? (
              <div className="pp-library">
                <p className="pp-library-title">
                  <strong>Library</strong>
                  <i className="pp-icon-btn" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><path d="M3.5 7.5h7l2-2h8v14h-17zM12 11v5m-2.5-2.5h5" /></svg>
                  </i>
                </p>
                <p className="pp-library-sub">Private, on this device, ready offline.</p>
                {/* `renderStorageLine`: the packs' bytes against the browser's own quota
                    estimate, which is machine-specific; the tilde is the extension's. */}
                <p className="pp-storage">
                  <span>{`Library: ${formatBytes(TOTAL_BYTES)} of ~77 GB available`}</span>
                  <i />
                </p>
                <p className="pp-search">
                  <svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6" /><path d="m15 15 4.5 4.5" /></svg>
                  Search titles, sites, and text
                </p>
                {/* `#library-sort` and `#library-filter`, at their defaults. */}
                <p className="pp-tools" aria-hidden="true">
                  <span>Your order</span>
                  <span>All saves</span>
                </p>
                <ul className="pp-shelf">
                  {/* One pack, because one save has been made. `packMeta` joins the page
                      count, the size and the time with ` · `; the unread dot is the
                      library page's own 7px `#007aff`. The row is what the pointer
                      presses, and the reader below is a copy of its first page. */}
                  <li
                    data-target="shelf-page"
                    data-open={reading}
                    data-aimed={aimingPage}
                  >
                    <i className="pp-grip" />
                    {/* `.entry-icon` with `icon("page")`: the popup shows the glyph, and
                        keeps the 124×78 thumbnail for the full library page. */}
                    <span className="pp-thumb" aria-hidden="true">
                      <svg viewBox="0 0 24 24">
                        <rect x="5" y="3.5" width="14" height="17" rx="2.5" />
                        <path d="M8.5 8h7M8.5 11.5h7M8.5 15h4" />
                      </svg>
                    </span>
                    <span className="pp-shelf-copy">
                      <strong>
                        <i className="pp-unread" />
                        {ROOT.title}
                      </strong>
                      <span>{`${plural(PAGES.length, "page")} · ${formatBytes(TOTAL_BYTES)} · ${SAVED_AT}`}</span>
                    </span>
                    <i className="pp-more">···</i>
                  </li>
                </ul>
              </div>
            ) : (
              <div className="pp-save">
                <p className="pp-target" data-spec-anchor="target">
                  <span className="pp-target-mark">{SITE[0].toUpperCase()}</span>
                  <span className="pp-target-copy">
                    <strong>{ROOT.title}</strong>
                    <span>{SITE}</span>
                  </span>
                </p>

                {/* `renderSavedNotice`: shown once `findSavedUrl` matches the tab, which it
                    does the moment the pack is written. */}
                {saved && (
                  <p className="pp-saved-notice">
                    Saved just now · <b>Open</b> / <b>Save again</b>
                  </p>
                )}

                {saving ? (
                  /* `#save-progress`, from `renderProgressCard`: the title, the worker's
                     message, the bar, the meter, the hint and the cancel. The bar fills,
                     because a planned save is `determinate` — `background.js` sets it as
                     `Number(depth) === 0 || Boolean(planned)` — and the ratio is
                     `captureProgressRatio`'s: pages landed plus the fraction of the page
                     in hand, over the total. The fraction rides `--beat-t` through `read`
                     and `collect` — the two beats with a page in hand — so the bar moves
                     between the frames React draws. */
                  <div
                    className="pp-progress"
                    key={run}
                    data-spec-anchor="progress"
                    style={
                      {
                        "--pp-done": pagesSavedBy(beat),
                        "--pp-live": beat === "read" || beat === "collect" ? 1 : 0,
                        "--pp-total": PAGES.length,
                      } as CSSProperties
                    }
                  >
                    <p className="pp-progress-head">
                      <strong>{progressTitle(PAGES.length, false)}</strong>
                      <span>{labelFor(beat)}</span>
                    </p>
                    <span className="pp-bar">
                      <i />
                    </span>
                    <p className="pp-meter" data-spec-anchor="meter">
                      {meterFor(beat)}
                    </p>
                    <p className="pp-progress-hint">
                      You can close this window — saving continues in the background.
                    </p>
                    <span className="pp-cancel">Cancel save</span>
                  </div>
                ) : (
                  <div className="pp-save-action">
                    {/* `saveButton.textContent` at depth ≥ 1: "Save with linked pages…",
                        and "Finding linked pages…" while the discovery runs. The
                        button is disabled and busy for exactly that window. */}
                    <button
                      className="pp-primary"
                      type="button"
                      data-target="save"
                      data-busy={finding}
                      tabIndex={-1}
                      disabled={finding}
                    >
                      {finding ? "Finding linked pages…" : "Save with linked pages…"}
                    </button>
                    {/* `saveHint` at depth ≥ 1, verbatim. */}
                    <p className="pp-hint">
                      Finds the same-site links first, so you see the page count before
                      anything is saved
                    </p>
                  </div>
                )}

                {/* `setStatus("Saved to your library.")`, which is how the extension says
                    a capture finished. It arrives on the cut, so the frames where the
                    page fails to load have a popup that has already said the save
                    worked. `#save-status` sits under the progress card and above the
                    option rows, which is where this is. */}
                {saved && <p className="pp-status">Saved to your library.</p>}

                {/* `#collect-start-button` and `#tabs-start-button`, hidden for the
                    whole of a capture exactly as `renderSaveView` hides them. */}
                {!saving && (
                  <>
                    <p className="pp-row">
                      <span className="pp-row-icon">
                        <svg viewBox="0 0 24 24"><circle cx="6" cy="17.5" r="2" /><circle cx="12" cy="11.5" r="2" /><circle cx="18" cy="5.5" r="2" /><path d="m7.5 16 3-3m3-3 3-3" /></svg>
                      </span>
                      <span className="pp-row-copy">
                        <strong>Save as I browse</strong>
                        <small>Collect the pages you visit into one save</small>
                      </span>
                      <i className="pp-row-chevron" />
                    </p>
                    <p className="pp-row">
                      <span className="pp-row-icon">
                        <svg viewBox="0 0 24 24"><path d="M4.5 8.5h11v11h-11zM8.5 4.5h11v11" /></svg>
                      </span>
                      <span className="pp-row-copy">
                        <strong>Save all tabs in this window</strong>
                        <small>Each open tab becomes its own save</small>
                      </span>
                      <i className="pp-row-chevron" />
                    </p>
                  </>
                )}

                {/* `.destination-row`: the folder picker at its default. */}
                <p className="pp-row">
                  <span className="pp-row-icon">
                    <svg viewBox="0 0 24 24"><path d="M3.5 7.5h7l2-2h8v14h-17z" /></svg>
                  </span>
                  <span className="pp-row-copy">
                    <strong>Save to</strong>
                    <small>Where new saves are filed</small>
                  </span>
                  <span className="pp-row-pick">
                    Library
                    <svg viewBox="0 0 24 24"><path d="m7 10 5 5 5-5" /></svg>
                  </span>
                </p>

                {/* The Options disclosure, its value from `optionsSummary` — the
                    extension's own rule, rather than a literal beside it. */}
                <p className="pp-option-row">
                  <span>Options</span>
                  <span className="pp-option-value">
                    {optionsSummary(1, true)}
                    <svg viewBox="0 0 24 24"><path d="m7 10 5 5 5-5" /></svg>
                  </span>
                </p>

                {/* `.local-note`, verbatim, keys and all. */}
                <p className="pp-local-note">
                  <svg viewBox="0 0 16 16"><path d="M4.5 7V5.5a3.5 3.5 0 0 1 7 0V7M3 7h10v7H3z" /></svg>
                  <span>
                    Everything you save stays on this device.{" "}
                    <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd> saves the current page.
                  </span>
                </p>
              </div>
            )}

            {/* ----------------------------------------------------------- the sheet
                `#review-overlay`, in its pre-flight mode: a scrim over the popup and a
                raised sheet — kicker, title, summary, the allowance note, one row per
                page with the root locked, and the button that starts the save. Every
                string is `openPreflightSheet`'s. */}
            <div className="pp-overlay" data-open={sheetOpen} aria-hidden="true">
              <span className="pp-scrim" />
              <section className="pp-sheet">
                <p className="pp-sheet-head">
                  <span>
                    <small>LINKED PAGES</small>
                    <strong>Pack this site</strong>
                  </span>
                  <i className="pp-icon-btn">
                    <svg viewBox="0 0 20 20"><path d="m6 6 8 8m0-8-8 8" /></svg>
                  </i>
                </p>
                <p className="pp-sheet-summary" data-spec-anchor="sheet-summary">
                  {`${plural(found, "page")} found · ~${formatBytes(ESTIMATED_BYTES)} estimated. `}
                  Uncheck anything you don’t need — this page always stays.
                </p>
                {/* `allowanceNote(8)` at 25 free pages. */}
                <p className="pp-sheet-note">
                  {`Leaves ${plural(FREE_PAGES - PAGES.length, "free page")} this month.`}
                </p>
                <div className="pp-review">
                  <span className="pp-review-row" data-locked="true">
                    <i className="pp-check" />
                    <span>
                      <strong>{ROOT.title}</strong>
                      <small>This page · always kept</small>
                    </span>
                  </span>
                  {CAPTURED.map((page, order) => (
                    <span className="pp-review-row" key={page.title}>
                      <i className="pp-check" />
                      <span>
                        <strong>{page.title}</strong>
                        <small>{PAGE_URLS[order + 1]}</small>
                      </span>
                    </span>
                  ))}
                </div>
                <div className="pp-sheet-actions">
                  {/* `confirmLabel(count)`: `Save ${plural(count, "page")}`. */}
                  <button className="pp-primary" type="button" data-target="save-pages" tabIndex={-1}>
                    {`Save ${plural(found, "page")}`}
                  </button>
                  <span className="pp-link-btn">Cancel</span>
                </div>
              </section>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ spill
          Outside `.pp-browser`, because the browser clips its own contents and
          everything in here has to leave it. Laid over the same box, so a card can
          start at the sheet's button and finish a third of a viewport away, across
          the section, past the gutters.

          This is the part that stops the pod being a screen recording. Pages that fly
          out of the window and stay out are the difference between watching software
          work and watching it take your reading with it. */}
      <div className="pp-spill" aria-hidden="true">
        {PAGES.map((page, order) => (
          <span
            className="pp-flyer"
            key={`${run}-${page.title}`}
            data-flying={flying}
            data-kept={offline}
            style={
              {
                "--order": order * FLYER_STAGGER,
                "--to-x": SCATTER[order].x,
                "--to-y": SCATTER[order].y,
                "--rot": SCATTER[order].rot,
              } as CSSProperties
            }
          >
            <span className="pp-flyer-head">
              <i />
              <span>{page.title}</span>
            </span>
            <span className="pp-flyer-text">{LEDES[order]}</span>
          </span>
        ))}

        {/* The reader at reading size — out here, not in the frame. The browser is dead;
            the reading is not. The bar, the sidebar and the page are the reader's own,
            and the claims about them are labels pinned to this panel. */}
        <div className="pp-reader" data-spec-anchor="reader" data-open={reading}>
          <ReaderBar anchor={reading} />
          <div className="pp-rmain">
            <PackSidebar anchor />
            <div className="pp-article pp-article--plane" data-spec-anchor="reader-page">
              <Article saved long />
            </div>
          </div>
        </div>
      </div>

      {!still && (
        <PhantomCursor
          stage={stageRef}
          target={CURSOR[beat] ?? null}
          pressing={CLICKS.has(beat) || beat === "open-page"}
          onPress={onPress}
          token={`${run}-${beat}`}
        />
      )}

      {/* The five claims the frame cannot make for itself. See `SPECS`, and
          `CORNER_SPECS` for the floor with no room beside the reader. */}
      <SpecTags
        beats={BEATS}
        beat={beat}
        tags={scatter === "corner" ? CORNER_SPECS : SPECS}
        origin={SPEC_ORIGIN}
        className="pp-specs"
      />
    </div>
  );
}
