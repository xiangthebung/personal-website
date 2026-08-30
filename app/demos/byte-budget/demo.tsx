"use client";

/**
 * Byte Budget, as a number admitting what it does not know.
 *
 * Every data-usage tool says it measures. This one is interesting for the sentence it
 * prints under the figure: how much of that figure it actually measured, and how much it
 * inferred. The reason it has to say so is the engineering worth showing — **Chrome does
 * not tell an extension how big a response was.** `webRequest` reports that a request
 * finished, its type, its tab and its headers, and there is no byte count anywhere in it.
 * So a total is assembled from three sources in a fixed order: `Content-Length` on the
 * response, which is exact; `PerformanceResourceTiming.transferSize` reported by the page,
 * which fills the streamed responses the first cannot see and returns 0 for a cross-origin
 * response without `Timing-Allow-Origin`; and a learned mean per `host|type` for
 * everything left, including every request a rule refused, which never had a size at all.
 *
 * The third source is the one the product discloses, and the disclosure is arithmetic:
 * `estimatedDown` carries that portion end to end and `measuredShare` is
 * `1 - estimatedDown / down`. So the scene is built the same way round. Four sites carry a
 * byte figure per beat and a share of it the model supplied; every number on screen is
 * derived from those and from the extension's own `format.ts`, which is copied verbatim
 * beside this file. Nothing here is a string someone typed to look plausible: the headline
 * total, the toolbar badge, the pace line, the limit line, the percentage in the popup's
 * meta row and the two figures under the bar all fall out of one table.
 *
 * WHAT THE BAR IS
 *
 * The instrument under the window is this scene's own, the way GRT's route line is. It is
 * the day's allowance drawn as a track, with the spending on it in two colours: teal for
 * the part that was measured, amber for the part the model supplied. Amber means inferred
 * everywhere in this product — it is the colour of `--estimate` in the extension's own
 * stylesheet and it is why this section of the page is amber. Three ticks stand where the
 * alerts fire, and they are drawn from `ALERT_THRESHOLDS` rather than from three typed
 * numbers.
 *
 * Past the cap the bar stops, and a dashed green run continues where the traffic would
 * have gone. Green is `--saved`: bytes something prevented. That run is the model's price
 * for requests `declarativeNetRequest` refused **before dispatch**, which is why the fill
 * does not move an inch while it grows — a refused request is never sent, so it costs
 * exactly zero rather than "bytes we noticed afterwards".
 *
 * WHAT IS STAGED RATHER THAN COPIED
 *
 * The popup is the extension's, down to the wording: `Over limit`, `31% of this is
 * estimated`, `~38.6 MB refused rather than spent`, `68% of total · part estimated`,
 * `Everything — every site, not just this tab`. The banner inside the page is the
 * extension's too, including its dark card, its amber dot and its two buttons — the one
 * thing changed about it is where it sits. The real one is `position: fixed; top: 12px;
 * right: 12px`, which in this frame is underneath the popup, and one card drawn under
 * another is a card nobody reads. It sits at the page's top left instead and leaves when
 * the popup opens: the banner exists to explain a page that has stopped loading things,
 * and the popup is that explanation. GRT's pod settled the same question the same way,
 * having first drawn the same notification in two places and photographed the result.
 *
 * The one alert on the visitor's own screen is the 90% one, and which threshold that is
 * comes from `decideAlert` rather than from a decision here. The spending crosses 75 and
 * 90 in a single beat — one video does that — and the rule is that only the highest fresh
 * threshold is announced, because three notifications arriving together bury the one that
 * matters. The 100% moment is left to the page: a second card saying the same thing in a
 * second place reads as a bug rather than as emphasis.
 *
 * The clock anchor is a fixed timestamp rather than `Date.now()`, so the server render and
 * the client render agree on "resets in 6 hours".
 */

import { useRef } from "react";
import { PhantomCursor } from "../scene/cursor";
import { usePressGate } from "../scene/press-gate";
import { SpecTags, type SpecTag } from "../scene/spec";
import { useStoryboard, type Beat } from "../scene/storyboard";
import { ViewportLayer } from "../scene/viewport-layer";
import { useOnScreen } from "../use-on-screen";
import { useSceneRun } from "../scene/use-scene-run";
import { useSectionFocused } from "../use-section-focus";
import {
  formatAgo,
  formatBytes,
  formatBytesBadge,
  formatCount,
  formatPercent,
  splitBytes,
} from "./format";
import {
  ALERT_THRESHOLDS,
  decideAlert,
  emptyTotals,
  measuredShare,
  totalBytes,
  type UsageTotals,
} from "./types";
import "./demo.css";

type BeatName = "load" | "climb" | "warn" | "refuse" | "reach" | "open" | "split";

/**
 * Seven beats over 15.8 seconds, in the order a person meets the product.
 *
 * The measurement half runs first because it is what the budget half is made of: a cap
 * you cannot check is a cap nobody trusts. So the bar fills, the warning arrives before
 * the allowance is gone rather than after, the limit refuses something, and only then is
 * the popup opened — which is also the honest order of events, since the reason to open it
 * is that a page has just stopped loading video.
 *
 * `reach` and `open` are separate for the reason `press-gate.ts` documents: the pointer is
 * standing on the button when the beat that presses it begins. `open` is the shortest beat
 * in the scene and does nothing but the click and the popup's 260ms entrance; reading the
 * popup is `split`'s job.
 *
 * `split` is long because it is the argument. The two runs of the bar pull apart, and what
 * a reader has to do with that frame is read two figures and the sentence under each.
 */
const BEATS: readonly Beat<BeatName>[] = [
  { name: "load", ms: 2600 },
  { name: "climb", ms: 2600 },
  { name: "warn", ms: 2700 },
  { name: "refuse", ms: 2900 },
  { name: "reach", ms: 900 },
  { name: "open", ms: 700 },
  { name: "split", ms: 3400 },
];

const BEAT_NAMES = BEATS.map((beat) => beat.name);

const CURSOR: Partial<Record<BeatName, string>> = {
  reach: "toolbar",
  open: "toolbar",
};

/** The beat that carries the click, and waits for it. See `usePressGate`. */
const OPENS: ReadonlySet<BeatName> = new Set<BeatName>(["open"]);

/**
 * A fixed afternoon, so the server and the client agree on every relative time in the
 * frame. 17:40 against a day that rolls over at midnight is "resets in 6 hours".
 */
const NOW = Date.UTC(2026, 7, 24, 21, 40, 0);
const RESETS_AT = Date.UTC(2026, 7, 25, 4, 0, 0);

/** SI, the extension's default: a network bill is quoted in decimal gigabytes. */
const UNITS = "si" as const;

/**
 * The allowance, and how much of the track lies past it.
 *
 * A limit over everything rather than over one site, because that is the one alerting is
 * on for by default — a per-site limit is something the user typed in on a site they chose
 * expecting to reach, so being told is being told what they already know. Hard stop rather
 * than the progressive default: progressive sheds video at 60% of the allowance, and this
 * day opens at 70%, so a progressive limit would have been refusing things before the first
 * frame. A hard stop refuses nothing until the allowance is gone, which is the shape this
 * scene is about.
 *
 * The track runs to 120% so there is somewhere for the overshoot and the refused run to be
 * drawn. A track that ended at the cap would have nothing to show the thing being held back.
 */
const ALLOWANCE = 250_000_000;
const TRACK = ALLOWANCE * 1.2;

/** Yesterday's total, which is all the pace line compares against. */
const YESTERDAY = 168_000_000;

/**
 * One site's day, and how much of it the size model supplied.
 *
 * The share is per site rather than per request because that is where the extension keeps
 * it — `UsageRow` extends `UsageTotals`, so every site row carries its own `estimatedDown`
 * — and because it is the shape of the real thing: whether a host's responses can be
 * measured is a fact about the host. A video edge that sets no `Timing-Allow-Origin`
 * cannot be measured by the page, and its bodies are streamed so they declare no length
 * either; a mail client on your own origin can be measured almost entirely.
 *
 * Bytes are cumulative and indexed by beat. They stop growing at `refuse`, which is not
 * tidiness: that is the limit working.
 */
interface SiteDay {
  readonly site: string;
  /** Bytes down at each beat, in `BEATS` order. */
  readonly down: readonly number[];
  /** The share of them the size model supplied, 0..1. */
  readonly modelled: number;
}

const SITES: readonly SiteDay[] = [
  {
    site: "watch.example",
    down: [96_600_000, 105_200_000, 149_600_000, 171_200_000, 171_200_000, 171_200_000, 171_200_000],
    modelled: 0.42,
  },
  {
    site: "news.example",
    down: [42_800_000, 43_500_000, 43_700_000, 43_800_000, 43_800_000, 43_800_000, 43_800_000],
    modelled: 0.09,
  },
  {
    site: "mail.example",
    down: [31_900_000, 32_400_000, 32_600_000, 32_700_000, 32_700_000, 32_700_000, 32_700_000],
    modelled: 0.04,
  },
  /* A reserved key, not a hostname. Requests that belonged to no tab — browser services,
     service workers, other extensions — have no site of their own for a rule to name, so
     the ledger files them here and a limit over everything is the only one that covers
     them. They are also among the least measurable traffic there is. */
  {
    site: "#background",
    down: [4_700_000, 4_900_000, 5_100_000, 5_300_000, 5_300_000, 5_300_000, 5_300_000],
    modelled: 0.38,
  },
];

/** The label a reserved key is shown under. `#` is a character no hostname can start with. */
const RESERVED_SITE_LABELS: Record<string, string> = {
  "#background": "Background & other",
};

function isReservedSite(site: string): boolean {
  return site.startsWith("#");
}

function siteLabel(site: string): string {
  return isReservedSite(site) ? (RESERVED_SITE_LABELS[site] ?? site) : site;
}

/**
 * The model's price for what the limit refused, by beat.
 *
 * It grows while the transferred total does not, which is the whole of the claim. A
 * refused request has no measured size — it was never dispatched — so this figure can only
 * ever be the estimator's, and the popup prints it with a tilde and in the estimate colour
 * for exactly that reason.
 */
const REFUSED: readonly number[] = [0, 0, 0, 22_400_000, 28_100_000, 32_700_000, 38_600_000];

/** The site whose tab is open, which is what the popup marks and the page shows. */
const CURRENT = SITES[0];

/** How many rows the panel has room for before it starts pointing at the dashboard. */
const SITE_ROWS = 3;

/** Where the labels come from: the extension's button on the toolbar. */
const SPEC_ORIGIN = { x: 92, y: 5 };

/**
 * Three claims, on the three things making them.
 *
 * There is no fourth. `Nothing leaves your device` and `Savings measured against a real
 * holdout` are both true and both checkable, and neither has anything in this frame to
 * point at — a label pinned to nothing is the one thing this component must never be,
 * since the whole reason it exists is that the claim and its evidence are in the same
 * place.
 */
const SPECS: readonly SpecTag<BeatName>[] = [
  /* On the ticks, not on the notification. The card is portalled to the corner of the
     visitor's real window and is gone by the next beat, so a label hung on it would be a
     label pointing at nothing for two thirds of the scene. The ladder itself is drawn on
     the track and stays, and it is the better evidence anyway: the notification proves one
     of the three, and the three ticks are the three.

     Hung on the first rung rather than the middle one, and reading upward. Two labels
     share the space around this bar and they have to be in different rows or they sit on
     each other; this one takes the row above the rail, and the first tick is both the
     leftmost anchor available and the one the claim is really about — the whole point of
     a ladder that starts at 75 is that it speaks before the allowance is gone. */
  {
    at: "warn",
    text: "Warns at 75, 90, 100 percent",
    x: 62,
    y: 76,
    anchor: "threshold",
    grip: "top",
    side: "above",
  },
  /* On the dashed run past the cap, which is the size the model gives to requests that were
     refused before dispatch. The fill beside it does not move while that run grows, and
     those two facts in one picture are the claim.

     It gets a row of its own, under the legend, and both of the places that looked
     cheaper are recorded here because each was wrong in a way a screenshot did not show.

     Sitting in the legend's own row, out past the two figures, put the plate on top of
     `79.2 MB estimated` and the sentence under it. A plate is opaque, so the frame still
     looked composed; it took measuring every plate against every line of type in the pod
     to find it. Moving it up beside the label about the thresholds then had the two plates
     overlapping each other — because an anchor is measured once when the beat opens and
     again when the entrances settle, and this one is pinned to a run that grows for the
     whole beat. It is therefore placed from where the refused run *starts out*, which is
     several hundred pixels left of where it ends, and no amount of choosing a grip fixes
     that. A row nothing else is using is the only arrangement that does not depend on
     where the measurement happened to be taken. */
  {
    at: "refuse",
    text: "A refused request costs zero bytes",
    x: 88,
    y: 93,
    anchor: "refused",
    grip: "bottom",
    side: "below",
    /* Past the legend, in pixels, because what is being cleared is two rows of type and
       that is a pixel height. Converted against the measured layer, so it stays the same
       visual distance at any width. */
    nudge: { y: 26 },
  },
  /* On the popup's meta line, which is the product saying the thing this label claims it
     says — `31% of this is estimated`, in the amber it marks an inferred figure with
     everywhere else. The bar below is the same fact at the size it actually is, and it
     needs no plate of its own: it prints both figures and names the source under each.

     Anchored on the panel's measured left edge and its own chosen height. The edge is a
     fact about a 420px panel hanging off a button in a `minmax(0, 1fr)` column, so it
     moves with the window; the height is a decision, and the line it names is not a box
     the popup can be asked for. Hung off the edge rather than laid on the line for the
     reason GRT records at the same place: the panel is dense type all the way down and
     there is no gap inside it big enough for a plate to sit in without covering two lines
     of what it is pointing at. */
  {
    at: "split",
    text: "Every total says how much was measured",
    x: 58,
    y: 20,
    anchor: "popup",
    grip: "left",
    axis: "x",
    side: "left",
  },
];

/** What the extension's own three sources are called, under the run each one paid for. */
const MEASURED_SOURCES = "Content-Length, and the page's own timing";
const MODELLED_SOURCE = "a learned mean per host and type";

/** Totals for one beat, in the shape every surface in the extension reads. */
function totalsAt(index: number): UsageTotals {
  const totals = emptyTotals();
  for (const site of SITES) {
    const down = site.down[index] ?? 0;
    totals.down += down;
    totals.estimatedDown += Math.round(down * site.modelled);
  }
  /* A refusal has no measured original — only a rewrite produces one — so all of it is
     the model's, and `savedMeasured` stays zero. The popup reads the difference. */
  totals.saved = REFUSED[index] ?? 0;
  totals.blocked = totals.saved > 0 ? 1 : 0;
  return totals;
}

/** One site's totals, for the row that has to say whether it is part estimated. */
function siteTotalsAt(site: SiteDay, index: number): UsageTotals {
  const totals = emptyTotals();
  totals.down = site.down[index] ?? 0;
  totals.estimatedDown = Math.round(totals.down * site.modelled);
  return totals;
}

/** A byte figure as the popup prints it. */
function bytes(value: number): string {
  return formatBytes(value, UNITS);
}

/** A point on the track, as a percentage of it. */
function track(value: number): number {
  return Math.round((value / TRACK) * 10_000) / 100;
}

/**
 * The band the popup's meta line puts a measured share in.
 *
 * Wide bands rather than a live percentage, and the reason is in the extension: the line
 * used to read "Measured directly" and flip to a percentage the moment a rounding error
 * crossed 90%, which is a sentence that changes character on a tenth of a percent. Only the
 * band that is actually a caveat gets the estimate colour, which is the amber this whole
 * section is named after.
 */
function measuredNote(totals: UsageTotals): { text: string; flag: boolean } {
  if (totals.down <= 0) return { text: "Nothing measured yet", flag: false };
  const share = measuredShare(totals);
  if (share >= 0.97) return { text: "Measured, not estimated", flag: false };
  if (share >= 0.8) return { text: "Nearly all measured", flag: false };
  return { text: `${formatPercent(1 - share)} of this is estimated`, flag: true };
}

/** The user's status, not the mechanism. Nothing in the tier names says "over". */
function statusWord(share: number): string {
  if (share >= 1) return "Over limit";
  if (share >= 0.85) return "Nearly full";
  return "Within limit";
}

/**
 * The pace verdict. Under a twentieth either way is noise dressed up as a finding, and a
 * popup that reports "3% more than yesterday" every day teaches people to ignore the line.
 */
function pace(total: number): { text: string; tone: "up" | "down" | null } {
  const delta = total / YESTERDAY - 1;
  if (Math.abs(delta) < 0.05) return { text: "About the same as yesterday", tone: null };
  return {
    text: `${formatPercent(Math.abs(delta))} ${delta > 0 ? "more" : "less"} than yesterday`,
    tone: delta > 0 ? "up" : "down",
  };
}

/** The extension's mark: a meter with its needle past the middle. */
function Mark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M3.6 17.4a9.6 9.6 0 1 1 16.8 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M12 17.4 16.4 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ByteBudgetDemo() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const onScreen = useOnScreen(stageRef);
  /* The alert is only allowed onto the visitor's own screen while this is the section they
     are actually standing in. See `useSectionFocused`. */
  const focused = useSectionFocused(stageRef);
  const running = useSceneRun(focused, onScreen);
  const state = useStoryboard(BEATS, {
    running,
    stage: stageRef,
    /* The frame the section exists for: the bar in two parts with each part's source named
       under it, the cap holding, and the popup saying in words what the bar says in colour.
       It is also the last beat, so the film ends on its point either way. */
    stillBeat: "split",
  });
  const { beat, index, run, still } = state;
  /* The one click in the scene, and a 420px panel over half the window depends on it. The
     pointer is already standing on the button when `open` begins — that is what `reach` is
     for — so the wait is only the 90ms between arriving and pressing. */
  const { reached, onPress } = usePressGate(BEATS, state, OPENS);

  const at = (name: BeatName) => BEAT_NAMES.indexOf(name);
  const open = reached >= at("open");

  const totals = totalsAt(index);
  const day = totalBytes(totals);
  const share = day / ALLOWANCE;
  const note = measuredNote(totals);
  const verdict = pace(day);
  const headline = splitBytes(day, UNITS);

  /* Which threshold the extension would announce here, rather than a number typed into the
     card. The spending crosses 75 and 90 inside one beat and only the highest fresh one is
     sent, which is why there is one notification in this scene and not two. */
  const announced = decideAlert(share, undefined, "2026-08-24").announce;
  const alerting = beat === "warn" && announced !== null;

  /* Refusing starts when the allowance is gone, and the banner is withdrawn when the popup
     opens — see the note at the top of this file. */
  const refusing = totals.saved > 0;
  const notice = refusing && !open;

  /* Both ends of the current move, so the bar is a continuous function of scene time
     rather than a value at seven instants. The stylesheet interpolates between them with
     `--beat-t`, which the storyboard already writes onto the stage every frame without
     re-rendering anything. A single figure per beat plus a transition gives a bar that
     drives for a second and then stands still for two, which reads as stalling rather than
     as filling.

     The move runs from the *previous* beat's figure to this one's, and getting that
     backwards is a mistake worth recording. Written the other way — this beat's figure to
     the next one's — the motion is just as smooth, and every still is wrong: `--beat-t`
     reaches 1 at the end of a beat, so a frame photographed there had the bar standing at
     the next beat's length while the two figures printed underneath it still read this
     beat's. The whole claim of this instrument is that the bar and the figures are the same
     arithmetic, and a still is where anyone would check. Running from behind, a beat ends
     with the bar arriving exactly at the number under it. */
  const previous = Math.max(0, index - 1);
  const before = totalsAt(previous);
  const usedFrom = track(totalBytes(before));
  const usedTo = track(day);
  const seamFrom = track(totalBytes(before) - before.estimatedDown);
  const seamTo = track(day - totals.estimatedDown);
  const ghostFrom = track(totalBytes(before) + before.saved);
  const ghostTo = track(day + totals.saved);

  const peak = SITES.reduce((most, site) => Math.max(most, site.down[index] ?? 0), 0);

  return (
    <div
      className="bb"
      ref={stageRef}
      data-beat={beat}
      data-lap={run}
      data-open={open}
      data-refusing={refusing}
      style={
        {
          "--used-from": usedFrom,
          "--used-to": usedTo,
          "--seam-from": seamFrom,
          "--seam-to": seamTo,
          "--ghost-from": ghostFrom,
          "--ghost-to": ghostTo,
        } as React.CSSProperties
      }
      role="img"
      aria-label={
        "A browser playing a video, with the Byte Budget extension pinned to its toolbar " +
        "and the day's data allowance drawn as a track below the window. The spending on " +
        "the track is in two colours: the part that was measured, and in amber the part a " +
        "size model supplied because Chrome does not report how big a response was. Ticks " +
        "stand at 75, 90 and 100 percent of the allowance. A notification arrives reading " +
        "90 percent of your data allowance used, 231 MB of 250 MB, 19 MB left. At the cap " +
        "the bar stops and a dashed run continues past it, marking requests refused before " +
        "they were sent, which transferred nothing. The popup is then opened and prints " +
        "253 MB for the day, 31 percent of this is estimated, Over limit, and 38.6 MB " +
        "refused rather than spent."
      }
    >
      <div className="bb-browser">
        <div className="bb-chrome">
          <span className="bb-lights" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="bb-tabs">
            <span className="bb-tab is-active">
              <i className="bb-favicon bb-favicon--watch" />
              Long train journeys
            </span>
            <span className="bb-tab">
              <i className="bb-favicon" />
              Inbox
            </span>
          </span>
          <span className="bb-bar">
            <span className="bb-omni">{CURRENT.site}/watch</span>
            {/* The extension's own button. The only thing clicked in this scene, and the
                only thing in the chrome drawn at full contrast. The badge is a setting
                rather than a default — it ships off — but it is the shortest route to the
                figure, and it is `formatBytesBadge`, which is capped at four characters
                because Chrome truncates anything longer to something unreadable. */}
            <span
              className="bb-action"
              data-target="toolbar"
              data-open={open}
              data-live={!open}
            >
              <span className="bb-mark" aria-hidden="true">
                <Mark />
              </span>
              <b className="bb-badge" key={formatBytesBadge(day, UNITS)}>
                {formatBytesBadge(day, UNITS)}
              </b>
            </span>
          </span>
        </div>

        {/* The page the bytes are being spent on. Video, because video is what a metered
            connection actually goes on, and because it is the traffic an extension can
            least often measure: streamed bodies declare no length and a cross-origin edge
            without `Timing-Allow-Origin` reports a transfer size of zero. */}
        <div className="bb-page" aria-hidden="true">
          <div className="bb-page-main">
            <div className="bb-player" data-stopped={refusing}>
              <span className="bb-player-art" />
              <span className="bb-player-play">
                <svg viewBox="0 0 24 24">
                  <path d="M8 5.4 19 12 8 18.6z" fill="currentColor" />
                </svg>
              </span>
              <span className="bb-player-scrub">
                <i />
              </span>
            </div>
            <div className="bb-page-copy">
              <p className="bb-page-title">The slow line to Fort William</p>
              <p className="bb-page-meta">4K · watch.example</p>
            </div>
          </div>

          {/* The column the popup lands on once it opens. It is here for the four beats
              before that: a page with one black rectangle on it does not read as a site
              somebody is actually using, and the bytes in this scene have to be being
              spent on something. */}
          <ul className="bb-next">
            {["Sleeper to Inverness", "The last mail train", "Rannoch Moor, in winter"].map(
              (row) => (
                <li key={row}>
                  <span className="bb-next-thumb" />
                  <span className="bb-next-copy">
                    <b>{row}</b>
                    <i />
                  </span>
                </li>
              ),
            )}
          </ul>

          {/* The extension's banner, in the page rather than in the browser's own
              furniture, because that is where it has to be: a refused image leaves a gap
              and a refused video segment makes a player error, and neither looks like a
              decision to the person who set the limit a fortnight ago. */}
          {notice && (
            <div className="bb-notice">
              <div className="bb-notice-row">
                <span className="bb-notice-dot" />
                <div>
                  <p className="bb-notice-headline">Your total data limit is used up</p>
                  <p className="bb-notice-detail">
                    {bytes(day)} of {bytes(ALLOWANCE)} per day. Resets{" "}
                    {formatAgo(RESETS_AT, NOW)}.
                  </p>
                </div>
                <span className="bb-notice-close">&times;</span>
              </div>
              <div className="bb-notice-actions">
                <span>Pause for an hour</span>
                <span>Limits</span>
              </div>
            </div>
          )}
        </div>

        {/* The popup, at the 420px Chrome gives it, hanging off its own button. */}
        <div className="bbx bb-popup" data-spec-anchor="popup" data-open={open}>
          <div className="bbx-app">
            <header className="bbx-topbar">
              <div className="bbx-headline">
                <p className="bbx-pace" data-tone={verdict.tone ?? undefined}>
                  {verdict.text}
                </p>
                <p className="bbx-total">
                  <span className="bbx-total-value">{headline.value}</span>
                  <span className="bbx-total-unit">{headline.unit}</span>
                </p>
              </div>
              <span className="bbx-actions" aria-hidden="true">
                <i />
                <i />
              </span>
            </header>

            <p className="bbx-meta">
              <span>Today</span>
              <span className={note.flag ? "bbx-flag" : undefined}>{note.text}</span>
            </p>

            <section className="bbx-limit" data-state={share >= 1 ? "over" : "within"}>
              <div className="bbx-limit-head">
                <h3 className="bbx-limit-heading">Data limit</h3>
                <span className="bbx-limit-status">{statusWord(share)}</span>
              </div>
              <p className="bbx-limit-scope">Everything — every site, not just this tab</p>
              <p className="bbx-limit-line">
                {bytes(day)} of {bytes(ALLOWANCE)} · {formatPercent(share)} of today&rsquo;s
                limit · resets {formatAgo(RESETS_AT, NOW)}
              </p>
              {/* The tier is a consequence, not a status: "Page shell only" tells someone
                  the name of a setting when what they need is the sentence underneath it. */}
              <p className="bbx-limit-consequence">
                {refusing
                  ? "Refuses every subresource. The page's own HTML still loads so it can tell you what happened, but nothing else does."
                  : "Everything loads normally."}
              </p>
              {refusing && (
                <p className="bbx-limit-prevented">
                  ~{bytes(totals.saved)} refused rather than spent
                </p>
              )}
            </section>

            <section className="bbx-sites">
              <div className="bbx-sites-head">
                <h3 className="bbx-sites-title">Sites</h3>
                <span className="bbx-sites-note">
                  {formatCount(SITES.length)} sites
                </span>
              </div>
              <ol className="bbx-site-list">
                {SITES.slice(0, SITE_ROWS).map((site) => {
                  const own = totalBytes(siteTotalsAt(site, index));
                  const estimated = own > 0 && measuredShare(siteTotalsAt(site, index)) < 0.75;
                  return (
                    <li className="bbx-site" key={site.site}>
                      <span
                        className="bbx-site-icon"
                        data-reserved={isReservedSite(site.site)}
                      />
                      <span className="bbx-site-main">
                        <span className="bbx-site-heading">
                          <span className="bbx-site-name">{siteLabel(site.site)}</span>
                          {site.site === CURRENT.site && (
                            <span className="bbx-site-tag">This tab</span>
                          )}
                        </span>
                        <span className="bbx-site-bar">
                          <i style={{ width: `${peak > 0 ? Math.max(2, (own / peak) * 100) : 0}%` }} />
                        </span>
                      </span>
                      <span className="bbx-site-figures">
                        <span className="bbx-site-bytes">{bytes(own)}</span>
                        <span
                          className={estimated ? "bbx-site-share bbx-flag" : "bbx-site-share"}
                        >
                          {formatPercent(day > 0 ? own / day : 0)} of total
                          {estimated ? " · part estimated" : ""}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ol>
              {/* A silent truncation at three of four is the popup deciding the fourth
                  does not exist. The real one says so and offers the rest. */}
              {SITES.length > SITE_ROWS && (
                <p className="bbx-sites-expand">
                  See all {formatCount(SITES.length)} in the dashboard
                </p>
              )}
            </section>
          </div>
        </div>
      </div>

      {/* The allowance, drawn. Everything on it is the same arithmetic the popup prints, so
          the two can never disagree: the fill is the day, the seam is `measuredShare`, the
          ticks are `ALERT_THRESHOLDS` and the dashed run is what the limit refused. */}
      <div className="bb-track" aria-hidden="true">
        <p className="bb-track-head">{bytes(ALLOWANCE)} a day, over everything</p>
        <div className="bb-rail">
          <span className="bb-ticks">
            {ALERT_THRESHOLDS.map((threshold) => (
              <span
                className="bb-tick"
                key={threshold}
                data-lit={share >= threshold}
                data-cap={threshold === 1}
                /* The first rung carries the label for all three. It is the leftmost of
                   them, which is the only one with clear room above it, and it is the one
                   the claim is really about: a ladder starting at 75 is a warning, and the
                   two above it are what happens next. */
                data-spec-anchor={threshold === 0.75 ? "threshold" : undefined}
                style={{ left: `${track(ALLOWANCE * threshold)}%` }}
              >
                <i />
                <b>{formatPercent(threshold)}</b>
              </span>
            ))}
          </span>

          <span className="bb-fill">
            <span className="bb-measured" />
            <span className="bb-inferred" data-spec-anchor="seam" />
            {/* Where the traffic would have gone. Drawn from the fill's own leading edge, so
                the one thing the eye compares is a run that grew against a fill that did
                not move. */}
            <span className="bb-refused" data-spec-anchor="refused">
              <b>0 B</b>
            </span>
          </span>
        </div>

        <div className="bb-legend">
          <p className="bb-figure bb-figure--measured">
            <b>{bytes(day - totals.estimatedDown)} measured</b>
            <span>{MEASURED_SOURCES}</span>
          </p>
          <p className="bb-figure bb-figure--inferred">
            <b>{bytes(totals.estimatedDown)} estimated</b>
            <span>{MODELLED_SOURCE}</span>
          </p>
        </div>
      </div>

      {/* The warning, on the visitor's own screen rather than drawn inside a picture of a
          browser. An extension whose pitch is that it reaches you before the allowance is
          gone cannot make that point inside a 940px panel.

          Gated on the section being the one in front of the visitor as well as on the beat:
          the storyboard freezes rather than advancing when it goes off screen, so without
          that a visitor who scrolled away mid-alert would carry the card with them for the
          rest of the page. */}
      {/* The class is an identifier rather than a hook: `.vlayer` is already a fixed,
          full-viewport positioning context, so the card inside needs nothing added to it.
          It is here so this layer is findable in a page that portals several. */}
      <ViewportLayer className="bb-alert-layer">
        {alerting && focused && (
          <div className="bb-os-alert">
            <span className="bb-alert-icon">
              <Mark />
            </span>
            <div className="bb-alert-copy">
              <p className="bb-alert-source">
                <span>Byte Budget</span>
                <small>now</small>
              </p>
              <p className="bb-alert-title">
                {formatPercent(announced ?? 0)} of your data allowance used
              </p>
              <p className="bb-alert-body">
                {bytes(day)} of {bytes(ALLOWANCE)}. {bytes(Math.max(0, ALLOWANCE - day))} left.{" "}
                Resets {formatAgo(RESETS_AT, NOW)}.
              </p>
            </div>
            <span className="bb-alert-close">
              <svg viewBox="0 0 24 24">
                <path
                  d="M7 7l10 10M17 7L7 17"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </div>
        )}
      </ViewportLayer>

      {!still && (
        <PhantomCursor
          stage={stageRef}
          target={CURSOR[beat] ?? null}
          pressing={OPENS.has(beat)}
          onPress={onPress}
          token={`${run}-${beat}`}
        />
      )}

      {/* No caption. Every figure one could carry is printed on screen already — the badge,
          the headline, the meta line, the limit line, the two figures under the bar — and
          what a caption cannot do is stand next to the one it is about. See `SPECS`. */}
      <SpecTags
        beats={BEATS}
        beat={beat}
        tags={SPECS}
        origin={SPEC_ORIGIN}
        className="bb-specs"
      />
    </div>
  );
}
