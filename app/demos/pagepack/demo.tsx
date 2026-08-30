"use client";

/**
 * PagePack, as an eighteen-second film.
 *
 * The pitch is one sentence — "your reading list is just a list of links once the
 * signal drops" — and a sentence is not something you can prove with a screenshot
 * of a popup. So the vignette proves it by staging the failure:
 *
 *   a page is open, the cursor reaches for the toolbar, Save is pressed, and the
 *   page tears itself off into cards that fly out of the button into a stack;
 *   then the connection dies, Chrome's own error screen starts to come up — and
 *   never arrives, because PagePack takes the tab and opens the saved copy in it.
 *
 * That last move is the product, and the scene used to get it backwards. It staged
 * `ERR_INTERNET_DISCONNECTED` as a screen PagePack shows you and then offered a
 * library beside it, which reads as "here is a crash, and separately here is a
 * consolation". What the extension actually does is listen on
 * `webNavigation.onErrorOccurred`, recognise a saved URL that has just failed to
 * load, and redirect the tab to the saved copy — so the dead end is the one thing
 * you do not reach. See `maybeRedirectOffline` in `background.js`.
 *
 * The order matters. Showing the library first and the outage second would be a
 * feature tour. Showing the outage first and the save catching it is an argument,
 * and the visitor gets to feel the moment where everything else on their screen
 * would have stopped working.
 *
 * What is real here and what is staged. The progress vocabulary is real: every
 * label under the bar comes from `captureProgressMessage`, copied out of the
 * extension's service worker, including the rule that a link-following save cannot
 * show a percentage. So is the toolbar badge — text and colour both, through
 * `captureBadgeText` and `paintActionBadge` — the library row's `pages · size · date`
 * from `packMeta`, and the two lines the reader paints while a save opens. The chunk
 * sizes and the file counts are the extension's own units. Everything else — the
 * browser frame, the flying cards, the outage — is theatre, and the section says so
 * rather than claiming this is the extension running in the page.
 */

import { useEffect, useRef } from "react";
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
  type CapturePhase,
} from "./progress";
import "./demo.css";

type BeatName =
  | "settle"
  | "reach"
  | "open"
  | "aim"
  | "press"
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
 * Kept as one visible list because the pacing is the design. `press` is short
 * because a click is short; `dead` is long because the silence after the
 * connection drops is the beat doing the work, and cutting it short would waste
 * the only moment in the scene that is supposed to feel bad.
 *
 * It ran 11.9s and was the fastest thing on the page, which is the one thing this
 * film could not afford to be: it has five acts and a reversal in it, and someone
 * meeting it for the first time was being asked to read a new caption, find a new
 * thing on screen and understand a cause every three quarters of a second. So every
 * beat that introduces something now gets between 1.4 and 2.4 seconds — long enough
 * to read the caption *and then* look at the frame, which is the order a first-time
 * visitor actually does it in — and the beats that are only a move or a click stay
 * where they were. 16.7s now.
 *
 * The four save beats are also load-bearing arithmetic: `press + read + collect +
 * finish` is the window the cards fly in, and `FLYER_STAGGER` below derives the stagger
 * from it, so moving any of them keeps the cards landing on `finish` rather than
 * stranding them mid-air or parking them early.
 *
 * 20.1s now, and the extra second went to the reversal rather than to the film. `dead`
 * lost 700ms and `caught` was added: the browser's error screen is no longer a
 * destination the scene rests on, it is a thing that starts to happen and is taken
 * away. See the notes on those two beats.
 */
const BEATS: readonly Beat<BeatName>[] = [
  // The establishing shot: a browser, a page, a toolbar nobody has looked at yet.
  // 900ms was not enough time to find the PagePack button before the cursor did.
  { name: "settle", ms: 1500 },
  { name: "reach", ms: 900 },
  // The popup is a new object with a name, a target page and a button on it. It was
  // on screen for 600ms, less time than it takes to read its own heading.
  { name: "open", ms: 1400 },
  { name: "aim", ms: 700 },
  // A press is a press.
  { name: "press", ms: 320 },
  // "Reading this page…" — the first of three progress states, and the one that
  // establishes that a save has phases at all.
  { name: "read", ms: 1400 },
  // The cards leaving the window. The longest beat of the save, because it is the
  // one carrying the idea that a save takes the linked pages with it.
  { name: "collect", ms: 2000 },
  /* The count landing on the toolbar badge: small, and the proof the save worked.
     1000ms could not carry its own caption, and this is the beat whose length was
     previously untouchable because a hand-computed stagger depended on it. It is not
     untouchable now — `FLYER_STAGGER` re-derives itself from these four beats. */
  { name: "finish", ms: 1400 },
  // A cut. Long enough for the signal arcs to drop outside-in and the slash to draw
  // across them — 640ms of transition in the stylesheet — and no longer.
  { name: "cut", ms: 800 },
  /**
   * Chrome's dead end, and it is deliberately the shortest look in the film.
   *
   * This was 1900ms of the browser's error screen sitting there, which staged
   * `ERR_INTERNET_DISCONNECTED` as something PagePack shows you. It is not: the screen
   * is Chrome's own, and `webNavigation.onErrorOccurred` in `background.js` catches a
   * saved URL failing to load and sends the tab to the saved copy instead. The product
   * is not "here is a crash screen and also a library". It is that you do not arrive at
   * the crash screen.
   *
   * So the error gets long enough to be recognised and not long enough to settle — the
   * stylesheet's 420ms fade means roughly three quarters of a second at full strength —
   * and then `caught` takes it away.
   */
  { name: "dead", ms: 1200 },
  /**
   * The redirect landing: the error is wiped and PagePack's reader has the tab.
   *
   * `maybeRedirectOffline` calls `chrome.tabs.update(tabId, { url: offlineReaderUrl(match) })`,
   * so what replaces the error is `viewer.html`, in the same tab, at a
   * `chrome-extension://` address — which is why the omnibox changes here as well as
   * the page. The two lines it paints first are the reader's own:
   * "Opening your save…" over "Reading it from this device."
   */
  { name: "caught", ms: 1600 },
  /**
   * The two beats that used to be one, and the reason is a reported one.
   *
   * `reveal` was 1500ms and did everything at once: the pointer flew in from off frame,
   * the Library tab lit up, the pack and the file list appeared, and the click landed
   * about 580ms in. Measured, the press was correctly after the arrival — but the
   * *effect* was not. The library opened on the beat's first frame, which is 580ms
   * before the click that is supposed to cause it, so what a visitor sees is a panel
   * changing on its own and a pointer turning up afterwards to take the credit.
   *
   * A state change is tied to a beat boundary and a click is 90ms into a beat; the two
   * can only agree if the pointer is already standing on the thing when the beat starts.
   * So the flight gets its own beat, exactly as `aim` does before `press` in the save.
   */
  { name: "aim-library", ms: 800 },
  /* Three new things in one frame — the Library tab, a pack, and a file list. */
  { name: "reveal", ms: 900 },
  /**
   * And the saved page gets opened rather than opening itself.
   *
   * Also reported: "the page just appears after clicking on library, rather than the
   * actual page in the library". It did. `reading` was keyed off `read-offline`, so the
   * reader unfolded across the section with nothing having been pressed — which quietly
   * undid the point of the shot, because the claim is that a *saved copy* opens, and a
   * copy has to be picked out of a list to be a copy of something.
   */
  { name: "aim-page", ms: 700 },
  { name: "open-page", ms: 700 },
  // The payoff, and the only frame with real prose in it.
  { name: "read-offline", ms: 2400 },
  { name: "hold", ms: 1400 },
];

/**
 * The window the cards fly in: press, read, collect, finish.
 *
 * Named and summed rather than written down, because it is the input to
 * `FLYER_STAGGER` below and the previous version of that constant was a hand-computed
 * `2` with a comment warning that changing any of these four beats would silently
 * strand the animation. That warning came true the first time one of them moved.
 */
const SAVE_BEATS = ["press", "read", "collect", "finish"] as const;
const SAVE_MS = BEATS.filter((beat) =>
  (SAVE_BEATS as readonly string[]).includes(beat.name),
).reduce((total, beat) => total + beat.ms, 0);

/**
 * Where the cursor is on each beat. `null` means it has left the frame.
 *
 * Two clicks at the end rather than none and a half: the Library tab, and then the saved
 * page inside it. Each is aimed a beat before it is pressed, which is the pattern `aim`
 * and `press` already established for the Save button and the only arrangement in which
 * the thing a click causes cannot happen before the click.
 *
 * It leaves on `read-offline`, and used to stay on the Library tab through it. That was
 * measurably wrong: the stylesheet recedes the whole browser on that beat —
 * `translateY(-1.5rem) scale(0.88)` over 760ms, see `#pagepack .pp[data-beat="read-offline"]
 * .pp-browser` — so the tab the pointer was sitting on moves 24px up and shrinks, and the
 * pointer was left 48px outside it, hanging over a window at a quarter opacity. The
 * component re-measures once when it lands, which catches a target that is still arriving;
 * it does not chase one that moves for the whole beat, and it should not have to. The
 * pointer's work is finished when the page opens.
 */
const CURSOR: Partial<Record<BeatName, string>> = {
  reach: "toolbar",
  open: "toolbar",
  aim: "save",
  press: "save",
  read: "save",
  collect: "save",
  "aim-library": "library-tab",
  reveal: "library-tab",
  "aim-page": "shelf-page",
  "open-page": "shelf-page",
};

/**
 * The beats whose visible change is caused by a click, and which therefore wait for it.
 * See `usePressGate`.
 *
 * Two of the three presses, and the choreography above already does most of the work for
 * both — each is aimed a beat early, so the pointer is standing on the control when the
 * beat begins and the wait is 90ms rather than a flight. What the beats could not fix is
 * that last 90ms, which is five frames and is the whole width of what a click looks like:
 * the Save button dipped and seven pages left it, and the library opened, each of them
 * before the ring off the pointer said anything had been pressed.
 *
 * `open-page` is the third press and is deliberately absent. The reader unfolds on
 * `read-offline`, the beat after it, so there is nothing on `open-page` to hold back —
 * gating it would render that beat as `aim-page` and take the shelf row's opened state off
 * the screen until the click, which is a new fault rather than a fix.
 *
 * `press` reaches the stylesheet too. `data-did` on the root carries the button's pressed
 * look; `data-beat` keeps the toolbar's approach highlight and the compositor hint, which
 * are cues that belong *before* the click.
 */
const CLICKS: ReadonlySet<BeatName> = new Set<BeatName>(["press", "reveal"]);

/**
 * The pages torn off the site, in the order they fly out of the button.
 *
 * `files` is each page's own asset count — the stylesheets, images and fonts the save has
 * to fetch before that page can be read offline. It is authored, like `bytes` and `title`,
 * and it is here rather than in the progress label because the label is arithmetic over
 * these pages and nothing else. See `labelFor` for the reported fault that put it here.
 *
 * Roughly but not slavishly proportional to `bytes`: a page of plates is mostly a few large
 * images, an appendix is mostly text, and the two do not scale together.
 */
const CAPTURED = [
  { title: "The Byzantine Generals Problem", bytes: 402_411, files: 34 },
  { title: "Reaching agreement in the presence of faults", bytes: 221_004, files: 19 },
  { title: "Practical Byzantine fault tolerance", bytes: 318_770, files: 26 },
  { title: "Notes on quorum intersection", bytes: 96_233, files: 11 },
  { title: "Appendix A — proofs", bytes: 64_120, files: 7 },
  { title: "Figures and plates", bytes: 512_882, files: 38 },
  { title: "References", bytes: 41_006, files: 5 },
];

const TOTAL_BYTES = CAPTURED.reduce((sum, page) => sum + page.bytes, 0);

/**
 * The day the pack was saved, as the Library prints it.
 *
 * `packMeta` in `popup.js` joins `plural(pages, "page")`, `formatBytes(stats.bytes)` and
 * `formatDate(pack.savedAt)` with ` · `, so a row reads `7 pages · 1.6 MB · 29 Aug`. Only
 * the date is authored: the other two are computed from `CAPTURED` above.
 *
 * A literal rather than a real `Intl.DateTimeFormat` call, and that is not laziness.
 * `formatDate` passes `undefined` as its locale, so the string it produces depends on
 * whoever is asking — which on this page means the server render and the client render can
 * disagree, and a hydration mismatch is a worse bug than a fixed date in a staged film.
 */
const SAVED_ON = "29 Aug";

/**
 * The saved page's address as the reader prints it, from `shortReaderUrl` in `viewer.js`:
 * hostname with any `www.` removed, then the path with a trailing slash stripped.
 *
 * The same string the omnibox shows before the connection drops, which is the point of
 * having it in both places — the tab is at `viewer.html` afterwards, and this is how the
 * reader says which page it is a copy of.
 */
const READER_URL = "lamport.azurewebsites.net/pubs/byz.html";

/**
 * The toolbar badge during a save, from `captureBadgeText` in `background.js`.
 *
 * ```
 * if (!following || !(Number(pages) > 0)) return CAPTURE_WORKING_BADGE;
 * return Number(pages) > 99 ? "99+" : String(Number(pages));
 * ```
 *
 * This scene stages a save at one level of links — the popup's own Options line says so —
 * which is `following`, so the badge counts. The dot is not a different mode: it is what a
 * counting badge shows before its first page has landed, which is why `read` still has one
 * and `collect` does not.
 *
 * The colour belongs to the same function's caller and is the correction that brought this
 * comment into being. `paintActionBadge` sets `#0a84ff` for a capture and `#b85c5c` for a
 * "save as I browse" collection; there is no state in which it is green, and this badge was
 * painted `--good`. See `--pp-badge-save` in the stylesheet.
 */
const CAPTURE_WORKING_BADGE = "•";

function captureBadgeText(pages: number): string {
  if (!(pages > 0)) return CAPTURE_WORKING_BADGE;
  return pages > 99 ? "99+" : String(pages);
}

/** Files discovered across the first `pages` pages of the pack. */
const filesThrough = (pages: number) =>
  CAPTURED.slice(0, pages).reduce((sum, page) => sum + page.files, 0);

/**
 * How far apart the cards leave the button, as a multiple of the stylesheet's own
 * 235ms step.
 *
 * `.pp-flyer[data-flying="true"]` runs a 1900ms flight with
 * `animation-delay: calc(var(--order) * 235ms)`, so the last of seven cards lands at
 * `1900 + 6 × 235 × stagger`. That has to equal the save window exactly: the cards
 * should settle as `finish` ends, so the last one arrives the instant before the
 * connection dies.
 *
 * This used to be a hand-computed `2`, correct against a 4,720ms save, under a comment
 * warning that changing any of the four save beats would silently strand the animation.
 * The warning was accurate and the arrangement still failed, because raising `finish`
 * to clear the caption floor is exactly the kind of edit that has no visible connection
 * to a constant seventy lines away. Deriving it means the coupling cannot rot: move any
 * of those beats and the stagger follows.
 *
 * `SETTLE_MS` comes off the front of the window because the cards no longer leave on the
 * beat boundary — they leave when the pointer actually presses the button, which is 90ms
 * after the pointer has landed on it. See `usePressGate` and `CLICKS`. Without this the
 * whole burst would shift by that much and the last card would settle after `finish` had
 * ended, which is the one thing this arithmetic exists to prevent.
 */
const FLYER_FLIGHT_MS = 1900;
const FLYER_STEP_MS = 235;
const FLYER_STAGGER =
  (SAVE_MS - SETTLE_MS - FLYER_FLIGHT_MS) / (FLYER_STEP_MS * (CAPTURED.length - 1));

/**
 * Where each card comes to rest, in viewport units, measured from the Save button
 * it left.
 *
 * Authored rather than randomised. The landings stay inside the demo/stage band:
 * they still clear the browser and reach both outer edges, but none can travel up
 * into the title, facts or links. Viewport units keep that safe spread proportional
 * across a 1600px section and a 380px phone.
 *
 * The last one used to land at `8vw, -7vh`, which put it flat on top of the popup.
 * Photographing the beats caught it: through `dead`, `reveal` and `hold` — the three
 * frames where the popup is the only lit thing in a dead section — a saved card was
 * covering the Library tab, the pack's size and two of its four rows. A card resting
 * over the dead browser is the shot; a card resting over the one surviving window is
 * the shot with its subject hidden. Moved down and left, into the frame's empty lower
 * quarter, where it still reads as a page that got out.
 */
/**
 * The width the scatter was composed at, and the floor its spread stops shrinking below.
 *
 * Viewport units keep the spread proportional, which is what a scatter across a whole
 * section wants — and proportional to the *window* is the wrong thing to be, because two
 * of the things the cards have to keep clear of are not. The popup is 232px whatever the
 * window is, and the labels hanging off its left edge are a fixed plate of type. So as the
 * window narrows the cards walk inward onto them: measured, the first card's title was 31%
 * covered at 1024px, 42% at 900 and 87% at 780, while at 1180 and above nothing touched.
 * `scripts/spec-anchors.mjs` reports it as `COVERS TYPE`.
 *
 * `min(-31vw, -366px)` is the authored reach or the reach it had at 1180px, whichever is
 * further out — `min` because these are negative and it is the *magnitude* that must not
 * collapse. Above 1180 nothing changes.
 */
const SCATTER_FLOOR_PX = 1180;
const reach = (vw: number) => `min(${vw}vw, ${Math.round((vw / 100) * SCATTER_FLOOR_PX)}px)`;

const SCATTER = [
  { x: reach(-31), y: "-4vh", rot: "-11deg" },
  { x: reach(30), y: "-5vh", rot: "9deg" },
  { x: reach(-25), y: "8vh", rot: "7deg" },
  { x: reach(26), y: "7vh", rot: "-6deg" },
  { x: reach(-39), y: "2vh", rot: "13deg" },
  { x: reach(38), y: "3vh", rot: "-9deg" },
  { x: reach(-9), y: "13vh", rot: "4deg" },
] as const;

/**
 * What is happening in each frame, in the present tense.
 *
 * There were two captions before — one for the save half, one for the outage half —
 * so eleven of the thirteen beats were described by a sentence written about a
 * different beat. Watching it, the caption under `open` was still talking about a
 * press that had not happened, and the caption under `read-offline` was explaining a
 * browser that had by then faded off the top of the frame. A visitor reading the line
 * and then looking up at the picture found the two disagreeing, which is worse than
 * no caption: it teaches them to stop reading it.
 *
 * Each entry is a lead clause and the rest of the sentence, so the markup can keep
 * the emphasis it had. Kept to one line at the pod's width — the stylesheet reserves
 * `min-height: 2.6em`, which is two lines, and a caption that reflows between beats
 * moves the frame above it.
 */
/**
 * There is no caption under this scene.
 *
 * There were thirteen lines here, one per beat, and they were cut to nine, and then to
 * six, and the six were still wrong. "Text, styles, images and fonts — not a list of
 * links" against a reading column four inches away that says "Saves the page exactly as
 * you saw it, pictures and all". "It takes the pages this one links to, as well" against
 * "Follow the links and it takes the whole section with it". The caption was not too
 * verbose; it was a fifth layer of prose paraphrasing the fourth while the scene
 * demonstrated the same thing a third time.
 *
 * The popup narrates its own save — "Reading this page…", the page count, the badge —
 * and the invitation above the frame says "One save, then the connection dies". Between
 * them there is nothing left for a caption to add.
 */

/**
 * The four things this scene does that it cannot show, two to a half.
 *
 * This scene is unusually good at narrating itself — the popup prints "Reading this page…"
 * and a page count, the badge counts up to seven in the blue a save is painted in, the
 * library row says "7 pages · 1.6 MB · 29 Aug", and the reader paints "Opening your save…"
 * over "Reading it from this device." Every one of those is a string or a colour the
 * extension actually produces, which is the only reason the frame is allowed to print
 * them, so nothing here restates one.
 *
 * The save half: *what* got saved, and that the save followed the links. A progress bar
 * does not say "text, styles, images and fonts", and seven cards flying out of a button
 * does not say they are the pages this one links to rather than seven copies of it. Both
 * leave at the cut — the browser they are pinned to fades to a quarter opacity later, see
 * `#pagepack .pp[data-beat="read-offline"] .pp-browser`, and a label hanging over a ghost
 * is a label about nothing.
 *
 * The outage half: what just happened to the error screen, and what it costs to read what
 * replaced it. Neither is visible, and the second one is invisible by definition — a
 * request that is never made leaves nothing on screen to point at. It is on the page at
 * all because it is now measured rather than asserted: `tests/offline-network.test.mjs`
 * renders a real pack in a real Chromium under the policy read out of `manifest.json` and
 * counts the requests, from both capture paths, and gets none. Until this week that was a
 * claim the extension could not have passed for a followed page.
 *
 * The last one arrives on `read-offline`, which is the still. That is deliberate: the hold
 * control cuts every scene to the frame carrying its argument, and this one used to cut to
 * a frame with no label on it at all, because both of the labels it had left at the cut.
 */
const SPECS: readonly SpecTag<BeatName>[] = [
  /* "Text, styles, images, fonts" was a list of the four things the code captures, which is
     an answer to a question nobody asked. The question a visitor has is whether this is a
     bookmark or a copy. */
  /* Both hang off the popup's measured left edge at their own chosen heights — the panel
     is 208px of dense type with no gap in it big enough to sit on, so a label inside it
     covers what it is about. `axis: "x"` because the two heights are a composition: one
     level with the page title the save is of, one down in the empty lower quarter of the
     window where the cards have room to fly past it.

     This pod is width-capped, so the edge does not currently move — which is exactly why
     it is measured rather than trusted. A hand-tuned 70 was right until something in a
     three-column browser mock changed width, and nothing about the constant said what it
     had been measured against. */
  {
    at: "read",
    text: "The whole page, images and all",
    x: 70,
    y: 35,
    anchor: "popup",
    grip: "left",
    axis: "x",
    side: "left",
    until: "cut",
  },
  /* "And every page it links to" until this was checked against `background.js`, where it
     is not every page and never was. `isLinkInScope` compares `siteKey(target.hostname)`
     against `siteKey(source.hostname)`, so the crawl never leaves the site; it stops at the
     depth chosen in the popup, capped at `MAX_CAPTURE_DEPTH = 3`; and it takes at most
     `MAX_LINKS_PER_PAGE = 100` links from any one page, telling you when it hit that.
     The extension's own store listing is exact about this — "Optional same-site link
     following, up to three levels deep." — so the scene was the loosest description of
     this feature anywhere in the project, which is the wrong way round.
     Seven words, which is the cap. The depth is not in the label because it is already on
     screen four lines below it: `optionsSummary` prints "One level of links" in the panel
     this label points at. */
  {
    at: "collect",
    text: "And every same-site page it links to",
    x: 70,
    y: 74,
    anchor: "popup",
    grip: "left",
    axis: "x",
    side: "left",
    until: "cut",
  },
  /* On the thing that replaced the error, reading out of the window's left edge into the
     dark half of the section. Inside the tab it would be a white pill on a white page; out
     here the frame is drained to near black and a frosted plate is the most legible thing
     in it, which is the same reasoning the flying cards' outline follows.

     It leaves on `read-offline`, with the browser it is pinned to. */
  {
    at: "caught",
    text: "The saved copy opens instead",
    x: 26,
    y: 62,
    anchor: "restored",
    grip: "left",
    side: "left",
    until: "read-offline",
  },
  /* And the one the still is held on. Pinned to the reading plane's left edge rather than
     to a coordinate: that panel is 900px wide at this width and a third of that on a phone,
     so the only stable thing about its edge is that it is measurable. */
  {
    at: "read-offline",
    text: "Reading a save makes zero network requests",
    x: 26,
    y: 54,
    anchor: "reader",
    grip: "left",
    side: "left",
  },
];

/** The Save button they come out of, in the pod's own percentages. */
const SPEC_ORIGIN = { x: 82, y: 38 };

/**
 * How far into the pack the one frame that prints a page number is.
 *
 * Three done, so the label reads "Page 4 of 7". `collect` is the beat where the middle of
 * the burst is in the air, so the middle of the pack is what is actually on screen.
 */
const COLLECT_PAGES_DONE = 3;

/**
 * How many pages of the pack have landed by a given beat.
 *
 * One source for two readouts that have to agree: the progress line under the bar and the
 * count on the toolbar badge. They are published by different parts of the extension —
 * `publishProgress` four times a second, `setCaptureBadgePages` once per page — but they
 * are counting the same pages, so a frame where the label says "Page 4 of 7" and the badge
 * says something else is a frame the extension cannot produce.
 */
function pagesSavedBy(beat: BeatName): number {
  if (beat === "collect") return COLLECT_PAGES_DONE;
  return beat === "finish" ? CAPTURED.length : 0;
}

/**
 * The real label for a beat, through the extension's own formatter.
 *
 * The two file figures are derived from `CAPTURED`, and that is a fix rather than tidying.
 * They were the literals `34` and `61`, which was reported as not making sense — "it says
 * page 4 of 7, but there are 61 files?" — and it does not, in two ways.
 *
 * The first is that they were unattached. Every other number this scene shows comes from
 * `CAPTURED`: the badge that lands on seven, the library head's "7 pages · 1.6 MB", the
 * reader's pack index, the seven cards. Two invented figures in the middle of that are the
 * one thing on screen a reader cannot reconcile with anything else on screen.
 *
 * The second is that they contradicted the extension. In `runCapture`, `assetsDone` and
 * `assetsTotal` are running totals over *only the pages opened so far* — each page captures
 * `assetsBefore`/`assetTotalBefore` and adds its own counts on top — so a finished page
 * contributes the same amount to both, and `assetsTotal - assetsDone` is always the
 * outstanding files of the page being hydrated *right now*. `61 - 34` claims 27 files
 * outstanding on page 4 alone while the three pages already finished managed 34 between
 * them, which is not a state the extension can reach.
 *
 * So both come from the pages: everything through the last finished page is done, and the
 * page now being read has just added its own files to the total. That is exactly the frame
 * the extension publishes on entering a page, and it explains the bar beside it — the
 * denominator grows as links are discovered, which is why a link-following save cannot show
 * a percentage. See `isDeterminate` in `./progress`.
 */
function labelFor(beat: BeatName): string {
  const phase: CapturePhase =
    beat === "read" ? "reading" : beat === "finish" ? "finishing" : "assets";
  const pagesDone = pagesSavedBy(beat);
  return captureProgressMessage({
    phase,
    pagesDone,
    pagesTotal: CAPTURED.length,
    assetsDone: filesThrough(pagesDone),
    assetsTotal: filesThrough(Math.min(pagesDone + 1, CAPTURED.length)),
  });
}

/**
 * How much bare floor the cable needs to the left of the browser window.
 *
 * The coupler is ~68px wide and has to be seen pulling apart, so it wants its own width
 * again in clearance on either side. Below this the section has no desk to lay a cable
 * on and the run moves to the bottom edge instead.
 */
const CABLE_FLOOR_PX = 210;

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
    // The still that carries the argument: a dead browser and a live library.
    stillBeat: "read-offline",
  });
  const { beat, index, run, still } = state;
  /* What the three presses did, held until they happened. `beat` still decides where the
     pointer goes and what the section's outage is doing; `did`/`reached` decide what a
     press is allowed to have changed. */
  const { did, reached, onPress } = usePressGate(BEATS, state, CLICKS);

  // The cable, section outage and reading field follow the save film beat for beat.
  useSectionBeat(stageRef, beat, BEATS);

  /**
   * Tells the section's cable where this browser window actually is.
   *
   * The cable is drawn in `.bd--pagepack-front` as an SVG with `viewBox="0 0 1600 720"`
   * stretched to the full width with `preserveAspectRatio="none"`, so every x in its path
   * is a percentage of the viewport. The window it is supposed to run behind is a
   * max-width box inside a two-column grid, so its left edge is not a percentage of
   * anything. Those two facts cannot be reconciled by choosing a better number, which is
   * what the previous version tried: the path stopped at x=440 of 1600 — 27.5% — from a
   * measurement taken at one width.
   *
   * Measured across the range, that single number was wrong nearly everywhere.
   *
   *     width   window left   cable ended   error
   *     820     53            226           176px *across the article*
   *     1024    72            282           210px across the article
   *     1180    191           325           134px across the article
   *     1440    392           396           4px — the width it was measured at
   *     1600    472           440           32px short, ending in mid-air
   *     2560    952           704           248px short
   *
   * So at 1440 it looked deliberate and at every other width it was either a cord thrown
   * over the page — the thing that was reported in the first place — or a wire stopping
   * in space. The coupler was worse: below about 1200px the window's left edge is inside
   * it, so the one part of this that has to be *seen* coming apart was underneath the
   * article.
   *
   * Publishing the measurement fixes both. `--pack-window-left` is where the window
   * starts, in pixels from the section's left edge; the stylesheet clips the cable there
   * and hangs the coupler a fixed distance short of it.
   *
   * `data-pack-room` is the honest admission that below a certain width there is no floor
   * to lay a cable on at all — at 820px the window begins 53px in. Rather than pick a
   * breakpoint and hope, the flag is set from the space actually available, and the
   * stylesheet moves the run to the bottom edge when there is not enough.
   *
   * Resize and layout only. Nothing here needs to run while the scene plays, so it is not
   * in the storyboard's frame loop; `ResizeObserver` on the section covers a window
   * resize, a font swap and the section's own height changing as scenes mount.
   */
  useEffect(() => {
    const stage = stageRef.current;
    const section = stage?.closest<HTMLElement>("[data-project-section]");
    if (!stage || !section) return;

    let last = { left: -1, bottom: -1 };
    const publish = () => {
      const browser = browserRef.current;
      if (!browser) return;
      const left = Math.round(
        browser.getBoundingClientRect().left - section.getBoundingClientRect().left,
      );
      const box = browser.getBoundingClientRect();
      const sectionBox = section.getBoundingClientRect();
      const bottom = Math.round(box.bottom - sectionBox.top);
      if (left === last.left && bottom === last.bottom) return;
      last = { left, bottom };
      section.style.setProperty("--pack-window-left", `${left}px`);
      /* Where the window's lower edge is, so the `tight` layout can hang the run under it
         rather than at a percentage. 86% of the section put the coupler *inside* the
         window at 1024 and 1180 — the section's height and the window's height do not
         scale together, so no single percentage clears it. */
      section.style.setProperty("--pack-window-bottom", `${bottom}px`);
      section.dataset.packRoom = left >= CABLE_FLOOR_PX ? "roomy" : "tight";
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
  const saving = index >= at("read") && index < at("cut");
  /**
   * Stays true for the rest of the scene, and that matters.
   *
   * It was `index >= at("press") && index < at("cut")` at first, which read
   * sensibly — the cards fly during the save — and was wrong. The scatter is held
   * by the animation's `forwards` fill, so dropping the flag at the cut removed
   * the animation and every card snapped back to `opacity: 0`. The outage then
   * played over an empty section, deleting the one image the whole vignette is
   * built to produce: a dead browser surrounded by pages that outlived it.
   */
  const flying = reached >= at("press");
  const offline = index >= at("cut");
  const dead = index >= at("dead");
  /* The redirect. From here the tab is not a failed page, it is `viewer.html` — which is
     why the omnibox changes with the viewport rather than after it. */
  const restored = index >= at("caught");
  /* The reader's own first frame, and only its first frame: the two lines in
     `#reader-loading` are painted while the pack is read off the device and are gone by the
     next beat, exactly as they are in the extension. */
  const opening = beat === "caught";
  /* Both of these open one beat after the pointer has arrived on the control that opens
     them, which is the fix for "the library tab gets clicked before the mouse actually
     gets there" and for the reader unfolding with nothing having been pressed. See the
     notes on `aim-library` and `aim-page` in `BEATS`. `reached` closes the last 90ms of
     the same fault — see `CLICKS`. */
  const libraryOpen = reached >= at("reveal");
  /* Not gated, and it does not need to be: `open-page` is the press and the reader unfolds
     on the beat after it, so the ordering the note above is about is already carried by the
     beats. Holding this back would only take the shelf row's opened state off the screen
     until the click. */
  const reading = index >= at("read-offline");
  /* The row the pointer is about to press, lit the way a row under a pointer is. */
  const aimingPage = beat === "aim-page" || beat === "open-page";

  return (
    <div
      className="pp"
      ref={stageRef}
      data-beat={beat}
      /* The same clock a beat behind, for the beats that wait for a click. The stylesheet
         uses it for the Save button's pressed look. See `CLICKS`. */
      data-did={did}
      data-lap={run}
      data-offline={offline}
      data-dead={dead}
      data-restored={restored}
      role="img"
      aria-label={
        "A browser with a page open. PagePack saves the page and six pages linked " +
        "from it. The connection then drops, the browser's own no-internet screen " +
        "begins to appear and is replaced by the saved copy of the same page, and the " +
        "rest of the pack is still readable from the extension's library."
      }
    >
      {/* ---------------------------------------------------------------- browser */}
      {/* Measured, so the section's cable knows where to stop. See the effect above. */}
      <div className="pp-browser" ref={browserRef}>
        {/* The outage, as a wash rather than a filter on this element. See the
            stylesheet: a filter here would drain the popup with everything else,
            and the popup surviving is the shot. */}
        <div className="pp-drain" aria-hidden="true" />
        <div className="pp-chrome">
          <span className="pp-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>

          {/* The tab's address, and it changes twice.
              The redirect is a navigation — `chrome.tabs.update(tabId, { url: … })` — so
              once PagePack has caught the failure the tab is at the extension's own
              `viewer.html`, and the omnibox is where a visitor can see that it was the
              extension rather than the site that answered. The id is elided because a
              32-character extension id at 11px is noise; the scheme and the file are the
              part that carries the fact. */}
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
              {restored
                ? "chrome-extension://…/viewer.html"
                : READER_URL}
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
            <span className="pp-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <g fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round">
                  <path d="M5 4.5h9l5 5v10H5z" />
                  <path d="M14 4.5v5h5" />
                </g>
              </svg>
            </span>
            {/* Up for exactly as long as the save is: `setCaptureBadge(true, …)` runs when
                the capture starts and the `finally` clears it when the pack is written, so
                the badge is gone by the time the connection drops. Keyed by its own text
                so each change pops rather than silently swapping a digit — the count
                moving is the liveness signal the dot could not give. */}
            {reached >= at("press") && !offline && (
              <span className="pp-badge" key={captureBadgeText(pagesSavedBy(beat))} aria-hidden="true">
                {captureBadgeText(pagesSavedBy(beat))}
              </span>
            )}
          </span>
        </div>

        {/* --------------------------------------------------------------- content */}
        <div className="pp-viewport">
          <article className="pp-page" aria-hidden="true">
            <h4>The Byzantine Generals Problem</h4>
            <p className="pp-byline">LESLIE LAMPORT, ROBERT SHOSTAK, MARSHALL PEASE</p>
            {[92, 100, 84, 96, 71, 100, 88, 62].map((width, line) => (
              <span className="pp-line" key={line} style={{ width: `${width}%` }} />
            ))}
            <span className="pp-figure" />
            {[100, 78].map((width, line) => (
              <span className="pp-line" key={`tail-${line}`} style={{ width: `${width}%` }} />
            ))}
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
              this the product rather than a consolation prize — nothing was opened, nothing
              was chosen, the dead end simply did not arrive.

              Two frames of it. The reader paints `#reader-loading` first, and those two
              lines are the extension's own; the bar and the page follow on the next beat.
              The bar is the real one: back to the Library, the title over the page's own
              short URL, `1 of 7`, and the live page one click away. */}
          <div className="pp-restored" data-spec-anchor="restored" aria-hidden="true">
            <div className="pp-restored-bar">
              <span className="pp-restored-back">‹ Library</span>
              <span className="pp-restored-identity">
                <strong>{CAPTURED[0].title}</strong>
                <span>{READER_URL}</span>
              </span>
              <span className="pp-restored-count">{`1 of ${CAPTURED.length}`}</span>
              <span className="pp-restored-online">Open online</span>
            </div>

            {opening ? (
              <p className="pp-restored-loading">
                <strong>Opening your save…</strong>
                <span>Reading it from this device.</span>
              </p>
            ) : (
              <div className="pp-restored-page">
                {[96, 88, 100, 74, 92, 81].map((width, line) => (
                  <span className="pp-line" key={line} style={{ width: `${width}%` }} />
                ))}
              </div>
            )}
          </div>

          {/* ------------------------------------------------------------- popup */}
          <div className="pp-popup" data-spec-anchor="popup" data-open={popupOpen}>
            <div className="pp-popup-head">
              <span className="pp-popup-mark" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <g fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round">
                    <path d="M5 4.5h9l5 5v10H5z" />
                    <path d="M14 4.5v5h5" />
                  </g>
                </svg>
              </span>
              <strong>PagePack</strong>
              <span className="pp-tabs" aria-hidden="true">
                <span data-on={!libraryOpen}>Save</span>
                <span data-on={libraryOpen} data-target="library-tab">
                  Library
                </span>
              </span>
            </div>

            {libraryOpen ? (
              <div className="pp-library">
                {/* `packMeta` joins the page count, the size and the save date with ` · `,
                    and drops the count when a pack holds one page. Seven, so it stays. */}
                {/* A pack row: `title` over `packMeta`, which is what `makeRow` is given
                    for every pack in the list. It read "1 pack", and that is `#library-count`
                    — an element `popup.js` explicitly hides in the root library view
                    (`count.hidden = true`), showing it only for a search or inside a folder.
                    So the scene was printing a number the extension takes care not to. The
                    pack's own title is what stands there, and it is the page just saved. */}
                <p className="pp-library-head">
                  <strong>{CAPTURED[0].title}</strong>
                  <span>
                    {`${CAPTURED.length} pages · ${formatBytes(TOTAL_BYTES)} · ${SAVED_ON}`}
                  </span>
                </p>
                <ul className="pp-shelf">
                  {CAPTURED.slice(0, 4).map((page, order) => (
                    <li
                      key={page.title}
                      /* The first row is what the reader is a copy of, so it is what the
                         pointer presses. Named as a target for that reason. */
                      data-target={order === 0 ? "shelf-page" : undefined}
                      data-open={reading && order === 0}
                      data-aimed={aimingPage && order === 0}
                      style={{ "--order": order } as React.CSSProperties}
                    >
                      <span className="pp-shelf-title">{page.title}</span>
                      <span className="pp-shelf-meta">{formatBytes(page.bytes)}</span>
                    </li>
                  ))}
                </ul>
                {/* There was a green foot here reading "Opens with no connection". The
                    popup does not say that anywhere, and the claim it was making is the
                    label pinned to the reading plane below — so it was an invented string
                    in the extension's voice restating something the scene already proves.
                    Same fault as the reader's stamp, one panel over. */}
              </div>
            ) : (
              <div className="pp-save">
                <p className="pp-target">
                  <span className="pp-target-title">The Byzantine Generals Problem</span>
                  <span className="pp-target-host">lamport.azurewebsites.net</span>
                </p>

                {/* One label, because the extension only has one. This cycled through
                    "Saving…" and "Saved", and `popup.js` writes neither onto this button:
                    `saveButton.textContent` is "Save page", "You’re offline" or "No free
                    saves left", and during a capture the button is not on screen at all
                    (`$("#save-action").hidden = Boolean(capture || journey)`).

                    The problem those two invented labels were solving is real — a visitor
                    who has not reached the Library needs to be told the save worked — and
                    the extension solves it itself, with `setStatus("Saved to your library.")`
                    under the panel. That is the string used now.

                    What is staged rather than copied: the button stays mounted while the
                    capture runs, disabled, where the extension hides it. It is the cursor's
                    anchor through `read` and `collect` (see `CURSOR`), and a target that
                    unmounts mid-gesture leaves the pointer pointing at nothing. Disabled is
                    the extension's own state for it here; only the visibility differs. */}
                <button
                  className="pp-primary"
                  type="button"
                  data-target="save"
                  tabIndex={-1}
                  disabled={saving}
                >
                  Save page
                </button>

                {/* From `optionsSummary`, which is the extension's own rule, rather than a
                    literal beside it. It read "One level of links · scripts on", and the
                    extension has no such string: `popup.js` appends exactly one suffix to
                    the depth label, "no scripts", and only when the box is unchecked. The
                    box is `checked` in `popup.html`, so the scripts-on case — which is what
                    this scene stages — prints the depth label bare. A scene that hardcodes
                    what a vendored helper computes is a scene with two answers to one
                    question, and this one had them disagreeing. */}
                <p className="pp-options">{optionsSummary(1, true)}</p>

                {saving && (
                  <p className="pp-progress" key={run}>
                    {/* Indeterminate on purpose: a save that follows links discovers
                        pages as it goes, so a percentage here would be invented. */}
                    <span className="pp-bar" data-indeterminate={beat !== "finish"}>
                      <i />
                    </span>
                    <span className="pp-progress-label">{labelFor(beat)}</span>
                  </p>
                )}

                {/* The extension's own success signal, and the reason the button no longer
                    invents one: `setStatus("Saved to your library.")` is what `popup.js`
                    prints when a capture completes. It arrives on the cut, which is the beat
                    the connection dies on — so the frames where the page fails to load have
                    a popup that has already said the save worked. */}
                {index >= at("cut") && <p className="pp-status">Saved to your library.</p>}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ------------------------------------------------------------------ spill
          Outside `.pp-browser`, because the browser clips its own contents and
          everything in here has to leave it. Laid over the same box, so a card can
          start at the Save button and finish a third of a viewport away, across
          the section, over the heading, past the gutters.

          This is the part that stops the pod being a screen recording. Pages that
          fly out of the window and stay out are the difference between watching
          software work and watching it take your reading with it. */}
      <div className="pp-spill" aria-hidden="true">
        {CAPTURED.map((page, order) => (
          <span
            className="pp-flyer"
            key={`${run}-${page.title}`}
            data-flying={flying}
            data-kept={offline}
            style={
              {
                // Scaled, not the raw index. See `FLYER_STAGGER`: the stylesheet
                // multiplies this by 235ms to get the card's launch delay, and the
                // save it was timed against is 1410ms longer than it used to be.
                "--order": order * FLYER_STAGGER,
                "--to-x": SCATTER[order].x,
                "--to-y": SCATTER[order].y,
                "--rot": SCATTER[order].rot,
              } as React.CSSProperties
            }
          >
            <span className="pp-flyer-head">
              <i />
              <span>{page.title}</span>
            </span>
            <span className="pp-flyer-bar" />
            <span className="pp-flyer-bar" />
            <span className="pp-flyer-bar" />
            <span className="pp-flyer-bar" />
          </span>
        ))}

        {/* One of them comes back and opens — out here, not in the frame. The
            browser is dead; the reading is not. */}
        {/* The reader's own bar, at reading size.
            It used to be stamped "saved copy · no network request" over an "offline" pill,
            and neither string exists anywhere in the extension — they were the scene
            asserting the product's claim in the product's voice, which is the one voice a
            reconstruction may not borrow. What the real bar carries is a way back to the
            Library, the page title over `shortReaderUrl(page.url)`, and `1 of 7` from
            `#reader-page-label`. The claim it was making is now a label, pinned to this
            panel, where a claim on this page belongs. */}
        <div className="pp-reader" data-spec-anchor="reader" data-open={reading}>
          <header className="pp-reader-head">
            <span>
              <small>{READER_URL}</small>
              {CAPTURED[0].title}
            </span>
            <b>{`1 of ${CAPTURED.length}`}</b>
          </header>
          <div className="pp-reader-layout">
            <article className="pp-reader-document">
              <p className="pp-reader-byline">
                Leslie Lamport · Robert Shostak · Marshall Pease
              </p>
              {/* A section head, not another paper's title. It read "Reaching agreement in
                  the presence of faults", which is page 02 of the pack — printed as the
                  body of the page the bar and the index both say is page 01.

                  The bordered callout that used to sit below it is gone with the stamp
                  above, and for the same reason: it was a sentence in the saved document's
                  voice explaining that saved documents are served from the pack. The claim
                  is a label now, pinned to this panel. */}
              <h4>The problem, informally</h4>
              {[100, 94, 88, 97, 72, 91, 84].map((width, line) => (
                <span className="pp-line" key={line} style={{ width: `${width}%` }} />
              ))}
              {[96, 78, 89].map((width, line) => (
                <span className="pp-line" key={`tail-${line}`} style={{ width: `${width}%` }} />
              ))}
            </article>
            {/* `Pages in this save` is the reader's own label for this list — the
                `aria-label` on `#reader-page-menu`. "Pack contents" was a phrase this
                scene made up for it. */}
            <aside className="pp-reader-index">
              <small>Pages in this save</small>
              {CAPTURED.slice(0, 5).map((page, order) => (
                <span key={page.title} data-current={order === 0}>
                  <i>{String(order + 1).padStart(2, "0")}</i>
                  {page.title}
                </span>
              ))}
            </aside>
          </div>
        </div>
      </div>

      {!still && (
        <PhantomCursor
          stage={stageRef}
          target={CURSOR[beat] ?? null}
          pressing={beat === "press" || beat === "reveal" || beat === "open-page"}
          onPress={onPress}
          token={`${run}-${beat}`}
        />
      )}

      {/* The two claims the frame cannot make for itself. See `SPECS`: everything else
          this section used to say in prose is printed by the popup, the badge, the crash
          screen or the reader. */}
      <SpecTags
        beats={BEATS}
        beat={beat}
        tags={SPECS}
        origin={SPEC_ORIGIN}
        className="pp-specs"
      />
    </div>
  );
}
