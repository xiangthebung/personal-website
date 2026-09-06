"use client";

/**
 * Byte Budget, as a plan being spent by one tab, and the popup that says by which host.
 *
 * Every data-usage tool says it measures. This one is interesting for three things it
 * prints that the others do not: which host is spending the connection *right now*,
 * how much of every figure it actually measured rather than inferred, and what it
 * refused before the bytes were spent. The film shows all three happening to one page —
 * a 4K stream on a 5.0 GB monthly plan, three days before the cycle resets.
 *
 * WHAT THE NUMBERS ARE
 *
 * Nothing on screen is a string someone typed to look plausible. The scene carries one
 * table — the cycle's finished days, today's bytes at each beat, the size model's share
 * of them, the count of requests that had no size, and what the cap refused — and every
 * figure is derived from it the way the extension derives its own: the headline and the
 * badge from the plan share, the "left today" line from the plan's remaining allowance
 * spread over the days left (the arithmetic in `popup.ts`'s `renderHeadline`), the
 * projection from `core/forecast.ts`'s rule (finished days carried as themselves, today
 * at what it has cost or a typical day whichever is larger, the rest modelled), the
 * meta line's floor from `measuredShare`, and the alert from `decideAlert`. All of it is
 * rounded by the extension's own `format.ts`, copied verbatim beside this file, and
 * the ladder the badge climbs is `ALERT_THRESHOLDS`, copied into `types.ts`.
 *
 * WHAT IS STAGED RATHER THAN COPIED
 *
 * The popup is the extension's, section by section, in the strings its message
 * catalogue prints: `Right now`, `2.4 MB/s over the last minute`, `Skip video here for
 * an hour`, `Video and audio skipped on watch.example · resumes in 60 minutes`, `≥ 3.7 GB
 * measured`, `1.3 GB estimated · 540 unsized requests · could be more`, `~4.1 MB refused
 * rather than spent`, `Projected 4.2 GB by Sep 16 · 810 MB spare`. Three sections of the
 * real popup are below the fold here and not drawn — Data Saver, Over time, Sites — and
 * the limit card ends at its three buttons. The banner inside the page is the
 * extension's own content script, at the top left rather than its real top right, which
 * is under the popup. The notification on the visitor's screen is the ladder's, worded
 * by `limit/alerts.ts`.
 *
 * The one licence a film takes is time: the stream eats in seconds what it would eat in
 * minutes, so the "last minute" panel and the cycle total move at different scales.
 *
 * The clock is a fixed timestamp rather than `Date.now()`, so the server render and the
 * client render agree on "resets in 3 days".
 */

import { useRef } from "react";
import { PhantomCursor } from "../scene/cursor";
import { usePressGate } from "../scene/press-gate";
import { useSectionBeat } from "../scene/section-beat";
import { SpecTags, type SpecTag } from "../scene/spec";
import { useStoryboard, type Beat } from "../scene/storyboard";
import { ViewportLayer } from "../scene/viewport-layer";
import { useOnScreen } from "../use-on-screen";
import { useSceneRun } from "../scene/use-scene-run";
import { useSectionFocused } from "../use-section-focus";
import {
  formatAgo,
  formatBytes,
  formatBytesPerSecond,
  formatCount,
  formatPercent,
  splitBytes,
} from "./format";
import {
  ALERT_THRESHOLDS,
  decideAlert,
  emptyTotals,
  measuredShare,
  type UsageTotals,
} from "./types";
import "./demo.css";

type BeatName =
  | "load"
  | "reach"
  | "open"
  | "live"
  | "climb"
  | "surge"
  | "refuse"
  | "aim"
  | "hold"
  | "split";

/**
 * Ten beats over nineteen seconds, in the order a person meets the product.
 *
 * The page is spending first, because that is the problem. The popup is opened early
 * rather than last: its `Right now` panel is the instrument the film is about, and it has
 * to be on screen while the numbers move for the movement to mean anything. `climb` and
 * `surge` are two beats rather than one because the badge changes colour twice — amber
 * at 75%, red at 90% — and a colour change nobody saw happen is a colour.
 *
 * `reach`/`open` and `aim`/`hold` are pairs for the reason `press-gate.ts` documents: the
 * pointer is standing on the control when the beat that presses it begins.
 */
const BEATS: readonly Beat<BeatName>[] = [
  { name: "load", ms: 2000 },
  { name: "reach", ms: 900 },
  { name: "open", ms: 700 },
  { name: "live", ms: 2200 },
  { name: "climb", ms: 2200 },
  { name: "surge", ms: 2200 },
  { name: "refuse", ms: 2600 },
  { name: "aim", ms: 800 },
  { name: "hold", ms: 2400 },
  { name: "split", ms: 3000 },
];

const BEAT_NAMES = BEATS.map((beat) => beat.name);

const CURSOR: Partial<Record<BeatName, string>> = {
  reach: "toolbar",
  open: "toolbar",
  aim: "hold-trim",
  hold: "hold-trim",
};

/** The two beats that carry a click, and wait for it. See `usePressGate`. */
const CLICKS: ReadonlySet<BeatName> = new Set<BeatName>(["open", "hold"]);

/* --- the calendar ----------------------------------------------------------
   A fixed evening three days before the cycle resets. Every relative time in the frame
   is a difference against `NOW`, so the timezone the constants are written in never
   reaches the screen. */
const DAY_MS = 86_400_000;
const CYCLE_START = Date.UTC(2026, 7, 17, 0, 0, 0);
const TOTAL_DAYS = 31;
const ELAPSED_DAYS = 28;
const REMAINING_DAYS = TOTAL_DAYS - ELAPSED_DAYS;
/** Days left including today, which is what today's share is spread over. */
const DAYS_LEFT = TOTAL_DAYS - ELAPSED_DAYS + 1;
const RESETS_AT = CYCLE_START + TOTAL_DAYS * DAY_MS;
const NOW = CYCLE_START + (ELAPSED_DAYS - 1) * DAY_MS + (23 * 60 + 40) * 60_000;
/** The extension was installed ten days into the cycle; those days are unknown, not zero. */
const UNKNOWN_DAYS = 10;
const RECORDED_START = CYCLE_START + UNKNOWN_DAYS * DAY_MS;
const FINISHED_DAYS = ELAPSED_DAYS - 1 - UNKNOWN_DAYS;
/** Printed the way `formatDayShort` prints them: month short, day numeric. */
const CYCLE_START_LABEL = "Aug 17";
const TODAY_LABEL = "Sep 13";
const RESETS_LABEL = "Sep 16";
const RECORDED_LABEL = "Aug 27";
/** A hold set a moment before the poll, so it prints as sixty minutes, not one hour. */
const HOLD_UNTIL = NOW + 3598_000;

/** SI, the extension's default: a plan is sold in decimal gigabytes. */
const UNITS = "si" as const;

/* --- the plan ---------------------------------------------------------------- */
const PLAN = 5_000_000_000;
/** The seventeen recorded, finished days of the cycle, summed. */
const USED_FINISHED = 3_430_000_000;
/** A typical recorded day, tails pulled in — what `forecast.ts` models the rest at. */
const TYPICAL_DAY = 190_000_000;
/** The extension needs this many finished days before it prints a projection. */
const NEEDED_DAYS = Math.max(5, Math.ceil(TOTAL_DAYS * 0.2));
/** With seventeen on file, it does. Below the floor it prints how many it has and needs. */
const CONFIDENT = FINISHED_DAYS >= NEEDED_DAYS;

/** The site in the tab, and the hosts its bytes come from. */
const SITE = "watch.example";
const MEDIA_HOST = "media.watch.example";

/**
 * Today's bytes at each beat, cumulative, in `BEATS` order.
 *
 * A 4K stream at 2.3 MB a second, compressed: the stream eats through the day's share,
 * then the plan, and stops when the cap refuses it. They stop growing at `refuse`,
 * which is the limit working, and stay stopped through the hold.
 */
const TODAY: readonly number[] = [
  70_000_000, 90_000_000, 110_000_000, 160_000_000, 670_000_000, 1_250_000_000,
  1_596_000_000, 1_596_000_000, 1_596_000_000, 1_596_000_000,
];

/**
 * How much of the cycle's total the size model supplied, by beat.
 *
 * It grows with the stream, because a stream is the traffic an extension can least
 * often measure: a segment that is chunked declares no length, and the page cannot
 * report a size for a cross-origin response without `Timing-Allow-Origin`. Those are
 * priced at the mean learned from the segments that did declare one.
 */
const ESTIMATED: readonly number[] = [
  780_000_000, 787_000_000, 794_000_000, 812_000_000, 990_000_000, 1_193_000_000,
  1_314_000_000, 1_314_000_000, 1_314_000_000, 1_314_000_000,
];

/** Requests in the cycle that had no measured size, by beat. */
const UNSIZED: readonly number[] = [412, 414, 416, 421, 460, 510, 540, 540, 540, 540];

/**
 * The model's price for what the cap refused, by beat: one 4K segment, never sent.
 * A refused request has no measured size, so `savedMeasured` stays zero and the
 * popup prints it with a tilde.
 */
const REFUSED: readonly number[] = [0, 0, 0, 0, 0, 0, 4_100_000, 4_100_000, 4_100_000, 4_100_000];

/** Bytes in the cycle so far, measured and modelled together. */
function usedAt(index: number): number {
  return USED_FINISHED + (TODAY[index] ?? 0);
}

/** The cycle's totals at a beat, in the shape every surface in the extension reads. */
function totalsAt(index: number): UsageTotals {
  const totals = emptyTotals();
  totals.down = usedAt(index);
  totals.estimatedDown = ESTIMATED[index] ?? 0;
  totals.saved = REFUSED[index] ?? 0;
  totals.blocked = totals.saved > 0 ? 1 : 0;
  return totals;
}

/* --- the last minute ----------------------------------------------------------
   What the `Right now` panel lists: the last sixty seconds per host, heaviest first,
   with the site the bytes were charged to when it is not the host itself. The rate
   is bytes over the window, which is how `live.ts` divides it. */
interface LiveHost {
  readonly host: string;
  readonly site: string;
  readonly bytes: number;
}

const LIVE_WINDOW_S = 60;

const STREAMING: readonly LiveHost[] = [
  { host: MEDIA_HOST, site: SITE, bytes: 140_000_000 },
  { host: "img.watch.example", site: SITE, bytes: 3_100_000 },
  { host: SITE, site: SITE, bytes: 612_000 },
  { host: "mail.example", site: "mail.example", bytes: 84_000 },
];

/**
 * Just after the hold: the window still holds most of the minute before it, and the
 * stream's row is falling rather than gone.
 */
const HOLDING: readonly LiveHost[] = [
  { host: MEDIA_HOST, site: SITE, bytes: 46_700_000 },
  { host: "img.watch.example", site: SITE, bytes: 1_030_000 },
  { host: SITE, site: SITE, bytes: 612_000 },
  { host: "mail.example", site: "mail.example", bytes: 84_000 },
];

/** A minute on: the page is still there, the stream is not. */
const HELD: readonly LiveHost[] = [
  { host: SITE, site: SITE, bytes: 201_000 },
  { host: "mail.example", site: "mail.example", bytes: 80_800 },
];

/** A byte figure as the popup prints it. */
function bytes(value: number): string {
  return formatBytes(value, UNITS);
}

/** `2.4 MB/s`, the way `liveRow` prints a host's rate. */
function rate(value: number): string {
  return formatBytesPerSecond(value / LIVE_WINDOW_S, UNITS);
}

/**
 * The projection, by the rule in `core/forecast.ts`: finished days carried as
 * themselves, today at what it has cost or a typical day whichever is larger, the
 * days after today modelled at the typical day. When it lands past the plan, the day
 * the plan runs out is either found in the recorded days — placed proportionally
 * through the day it happened on, because the ledger keeps a day's total and not the
 * hour each byte arrived — or is `rate` away.
 */
function project(today: number): { projected: number; overBy: number; exhaustedOn: number | null } {
  const projected = USED_FINISHED + Math.max(today, TYPICAL_DAY) + TYPICAL_DAY * REMAINING_DAYS;
  let exhaustedOn: number | null = null;
  if (USED_FINISHED + today >= PLAN) {
    const share = today > 0 ? (PLAN - USED_FINISHED) / today : 0;
    exhaustedOn = RECORDED_START + (FINISHED_DAYS + share) * DAY_MS;
  } else {
    const offset = ELAPSED_DAYS + (PLAN - USED_FINISHED - today) / TYPICAL_DAY;
    exhaustedOn = offset > TOTAL_DAYS ? null : CYCLE_START + offset * DAY_MS;
  }
  return { projected, overBy: Math.max(0, projected - PLAN), exhaustedOn };
}

/** The basis sentence `forecast.ts` composes for a confident projection. */
const PROJECTION_BASIS =
  `${FINISHED_DAYS} days of this cycle are measured and carried as themselves. The ` +
  `${REMAINING_DAYS} days after today are modelled at about ${bytes(TYPICAL_DAY)} each — the ` +
  `typical day across the last 14 days, with the heaviest and lightest pulled in so one ` +
  `unusual day cannot set the pace. Today counts at what it has used so far, or at that ` +
  `same figure, whichever is larger. The first ${UNKNOWN_DAYS} days of this cycle passed ` +
  `before Byte Budget was counting, so they are not included anywhere in this figure.`;

/**
 * Where today stands against an even spread of what is left — `renderHeadline`'s
 * arithmetic, not a forecast: what was left at the start of today, spread over the days
 * left including today, minus what today has cost.
 */
function planTrack(index: number): { text: string; over: boolean } {
  const used = usedAt(index);
  const today = TODAY[index] ?? 0;
  const remaining = PLAN - used;
  const atStartOfToday = Math.max(0, PLAN - (used - today));
  const leftToday = atStartOfToday / DAYS_LEFT - today;
  if (remaining <= 0) return { text: `Plan spent · ${bytes(-remaining)} over`, over: true };
  if (leftToday > 0) return { text: `${bytes(leftToday)} left today to stay on track`, over: false };
  return { text: `Today's even share is spent · ${bytes(-leftToday)} over it`, over: true };
}

/**
 * The meta line's caveat, in the bands `measuredNotes` uses. Under 80% measured it is
 * two spans: the floor, printed with a `≥` because the real total cannot be below it,
 * and the model's part with the number of requests it stood in for.
 */
function measuredNotes(
  totals: UsageTotals,
  unsized: number,
): { floor: string | null; flag: string | null; plain: string | null } {
  const share = measuredShare(totals);
  if (share >= 0.97) return { floor: null, flag: null, plain: "Measured, not estimated" };
  if (share >= 0.8) {
    return {
      floor: null,
      flag: null,
      plain: `Nearly all measured · ${formatCount(unsized)} unsized request${unsized === 1 ? "" : "s"}`,
    };
  }
  return {
    floor: `≥ ${bytes(Math.max(0, totals.down - totals.estimatedDown))} measured`,
    flag: `${bytes(totals.estimatedDown)} estimated · ${formatCount(unsized)} unsized request${unsized === 1 ? "" : "s"} · could be more`,
    plain: null,
  };
}

/** The limit card's status word, at `statusWord`'s thresholds. */
function statusWord(share: number): string {
  if (share >= 1) return "Over limit";
  if (share >= 0.85) return "Nearly full";
  return "Within limit";
}

/** Which rung of the ladder the badge is painted for. The colours are in the stylesheet. */
function badgeTone(share: number): "fine" | "warn" | "urgent" | "over" {
  const [warn = 0.75, urgent = 0.9, over = 1] = ALERT_THRESHOLDS;
  if (share >= over) return "over";
  if (share >= urgent) return "urgent";
  if (share >= warn) return "warn";
  return "fine";
}

/**
 * Which threshold the extension announces at a beat, if any.
 *
 * `decideAlert` carries the thresholds already said on the previous reading, so 75 is
 * announced on `climb`, 90 on `surge`, and neither is announced twice. The 100 crossing
 * is announced too; the film leaves that one to the page's own banner, since a second
 * card saying the same thing in a second place reads as a bug rather than emphasis.
 */
function announcedAt(index: number): number | null {
  let previous: { periodKey: string; thresholds: number[] } | undefined;
  let announced: number | null = null;
  for (let i = 0; i <= index; i++) {
    const decided = decideAlert(usedAt(i) / PLAN, previous, "2026-08");
    previous = { periodKey: "2026-08", thresholds: decided.thresholds };
    announced = i === index ? decided.announce : null;
  }
  return announced;
}

/** Where the labels come from: the extension's button on the toolbar. */
const SPEC_ORIGIN = { x: 92, y: 4 };

/**
 * Five claims, on the five things making them.
 *
 * Four hang off the popup's left edge at their own rows. The panel is dense type with no
 * gap in it big enough for a plate, so each is pinned to the left edge of the line it
 * is about and reads away from it into the page, and each is nudged the width of its
 * card's padding so the four dots share one vertical line. The fifth is on the badge.
 */
const SPECS: readonly SpecTag<BeatName>[] = [
  /* On the panel's own heading, not on the media row: the row is gone by the end of the
     film — a host with nothing in the last minute is not listed — and a label whose
     subject leaves is a label pointing at nothing. The heading stays, and after the hold
     the panel under it is the evidence that the rate fell. */
  {
    at: "live",
    text: "Which host is spending it, live",
    x: 56,
    y: 52,
    anchor: "live",
    grip: "left",
    side: "left",
    nudge: { x: -12 },
  },
  /* On the badge, reading leftward along the toolbar. The badge is the share of the
     *plan* left — the cycle, not this tab and not this session — which is the one thing
     a four-character figure on a toolbar cannot say for itself. */
  {
    at: "climb",
    text: "The plan left, not this session",
    x: 95,
    y: 5,
    anchor: "badge",
    grip: "left",
    side: "left",
    nudge: { x: -6, y: -5 },
  },
  {
    at: "refuse",
    text: "Refused bytes: counted, not spent",
    x: 56,
    y: 86,
    anchor: "refused",
    grip: "left",
    side: "left",
    nudge: { x: -12 },
  },
  {
    at: "hold",
    text: "An hour, then back to normal",
    x: 56,
    y: 66,
    anchor: "hold",
    grip: "left",
    side: "left",
    nudge: { x: -12 },
  },
  /* On the meta line, which is the product saying the thing this label claims it says —
     the floor with its `≥`, and the model's share in the amber it marks an inferred
     figure with everywhere else. */
  {
    at: "split",
    text: "Every total says how much was measured",
    x: 56,
    y: 46,
    anchor: "split",
    grip: "left",
    side: "left",
    nudge: { x: -2 },
  },
];

/** The extension's mark: three bars, rising. */
function Mark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 19v-6M12 19V5m7 14v-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LockGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="10.5" width="14" height="10" rx="2.2" fill="currentColor" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function ByteBudgetDemo() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const onScreen = useOnScreen(stageRef);
  /* The alert is only allowed onto the visitor's own screen while this is the section
     they are actually standing in. See `useSectionFocused`. */
  const focused = useSectionFocused(stageRef);
  const running = useSceneRun(focused, onScreen);
  const state = useStoryboard(BEATS, {
    running,
    stage: stageRef,
    /* The frame the section exists for: the plan spent, the refused segment counted, the
       stream held, and the popup saying which host did it and how much of the figure it
       measured. It is also the last beat, so the film ends on its point either way. */
    stillBeat: "split",
  });
  const { beat, index, run, still } = state;
  const { reached, onPress } = usePressGate(BEATS, state, CLICKS);

  /* The section's backdrop climbs with the page: its runs are the same hosts. */
  useSectionBeat(stageRef, beat, BEATS);

  const at = (name: BeatName) => BEAT_NAMES.indexOf(name);
  const open = reached >= at("open");
  const held = reached >= at("hold");

  const totals = totalsAt(index);
  const used = totals.down;
  const share = used / PLAN;
  const previousShare = usedAt(Math.max(0, index - 1)) / PLAN;
  const tone = badgeTone(share);
  const headline = splitBytes(used, UNITS);
  const cap = splitBytes(PLAN, UNITS);
  const pace = Math.min(1, ELAPSED_DAYS / TOTAL_DAYS);
  const track = planTrack(index);
  const projection = project(TODAY[index] ?? 0);
  const notes = measuredNotes(totals, UNSIZED[index] ?? 0);
  const over = share >= 1;
  const refusing = totals.saved > 0;

  const live = index >= at("split") ? HELD : held ? HOLDING : STREAMING;
  /* The hold line's row is reserved a beat before the press, so the button under the
     pointer does not move when the line arrives: the pointer measures its target once,
     as it lands, and a control that shifts after that is a control it has let go of. */
  const holdRow = index >= at("aim");
  const liveTotal = live.reduce((sum, host) => sum + host.bytes, 0);
  const livePeak = live.reduce((max, host) => Math.max(max, host.bytes), 0);

  const announced = announcedAt(index);
  const alerting = announced !== null && announced < 1;

  return (
    <div
      className="bb"
      ref={stageRef}
      data-beat={beat}
      data-lap={run}
      data-open={open}
      data-over={over}
      data-held={held}
      style={
        {
          "--share-from": previousShare,
          "--share-to": share,
        } as React.CSSProperties
      }
      role="img"
      aria-label={
        `A browser playing a 4K video on ${SITE}, with the Byte Budget extension on its ` +
        `toolbar showing how much of a ${bytes(PLAN)} monthly plan is left. Its popup opens ` +
        `on ${bytes(usedAt(at("live")))} of ${bytes(PLAN)}, ${planTrack(at("live")).text}, and ` +
        `a Right now panel naming ${MEDIA_HOST} as the host spending ` +
        `${rate(STREAMING[0].bytes)} of the connection. As the stream eats, the badge turns ` +
        `amber at ${formatPercent(ALERT_THRESHOLDS[0])} and red at ${formatPercent(ALERT_THRESHOLDS[1])} ` +
        `and a notification says so; then the plan is spent, a segment is refused before it ` +
        `is sent, and the popup reads ~${bytes(REFUSED[at("refuse")] ?? 0)} refused rather than ` +
        `spent. The pointer presses Skip video here for an hour: the rate falls to ` +
        `${rate(HELD.reduce((sum, host) => sum + host.bytes, 0))} while the page stays. ` +
        `Under the figure the popup says how much of it was measured: ` +
        `${measuredNotes(totalsAt(at("split")), UNSIZED[at("split")] ?? 0).floor}, ` +
        `${measuredNotes(totalsAt(at("split")), UNSIZED[at("split")] ?? 0).flag}.`
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
            <span className="bb-omni">{SITE}/watch</span>
            {/* The extension's own button, and the badge it paints: the share of the plan
                left, in the ladder's colours, `over` once it is spent. Four characters at
                most, which `formatPercent` keeps to. */}
            <span className="bb-action" data-target="toolbar" data-open={open}>
              <span className="bb-mark" aria-hidden="true">
                <Mark />
              </span>
              <b
                className="bb-badge"
                data-tone={tone}
                data-spec-anchor="badge"
                key={over ? "over" : formatPercent(1 - share)}
              >
                {over ? "over" : formatPercent(Math.max(0, 1 - share))}
              </b>
            </span>
          </span>
        </div>

        {/* The page the bytes are being spent on. Video, because video is what a metered
            connection actually goes on, and because it is the traffic an extension can
            least often measure. */}
        <div className="bb-page" aria-hidden="true">
          <div className="bb-page-main">
            <div className="bb-player" data-stopped={refusing}>
              <span className="bb-player-art" />
              <span className="bb-player-hud">
                <b>4K</b>
                <i />
              </span>
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
              <p className="bb-page-meta">4K · 2 h 14 min · {SITE}</p>
            </div>
            {/* Enough page under the player for it to read as a page somebody is on, not a
                black rectangle in a frame. One row, because the labels hang off the popup's
                left edge and read into this column; a paragraph here is a paragraph under
                a plate. */}
            <div className="bb-page-about">
              <span className="bb-page-avatar" />
              <span className="bb-page-channel">
                <b>Highland Rail Films</b>
                <small>Cab-view and lineside films from the West Highland Line</small>
              </span>
            </div>
          </div>

          <ul className="bb-next">
            {[
              ["Sleeper to Inverness", "1 h 52 min"],
              ["The last mail train", "48 min"],
              ["Rannoch Moor, in winter", "1 h 06 min"],
              ["Kyle line, cab view", "2 h 31 min"],
              ["Mallaig, the last mile", "32 min"],
              ["Corrour at dawn", "54 min"],
            ].map(([row, length]) => (
              <li key={row}>
                <span className="bb-next-thumb" />
                <span className="bb-next-copy">
                  <b>{row}</b>
                  <small>{length}</small>
                </span>
              </li>
            ))}
          </ul>

          {/* The extension's banner, inside the page, because that is where it has to
              be: a refused segment makes a player stall, and a stall does not look like
              a decision to the person who set the plan a month ago. The wording is the
              governor's for a plan-wide limit that is used up. */}
          {refusing && (
            <div className="bb-notice">
              <div className="bb-notice-row">
                <span className="bb-notice-dot" />
                <div>
                  <p className="bb-notice-headline">Your total data limit is used up</p>
                  <p className="bb-notice-detail">
                    {bytes(used)} of {bytes(PLAN)} per month. Resets {formatAgo(RESETS_AT, NOW)}.
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

      </div>

      {/* The popup, at the 420px Chrome gives it, hanging off its own button and past
          the bottom of the window it hangs off. */}
      <div className="bbx bb-popup" data-open={open}>
        <div className="bbx-app">
          <header className="bbx-topbar">
            <div className="bbx-headline">
              {/* Held open at one line's height with nothing in it: the cycle before
                  this one was never recorded, so there is nothing to compare against. */}
              <p className="bbx-pace" />
              <p className="bbx-total">
                <span className="bbx-total-value">
                  {headline.unit === cap.unit ? headline.value : `${headline.value} ${headline.unit}`}
                </span>
                <span className="bbx-total-unit">of {cap.value} {cap.unit}</span>
              </p>
            </div>
            <span className="bbx-actions" aria-hidden="true">
              <i>
                <svg viewBox="0 0 24 24">
                  <path
                    d="M4 19V9m5 10V5m5 14v-7m5 7V8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                  />
                </svg>
              </i>
              <i>
                <svg viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.9" />
                  <path
                    d="M12 2.9v2.3M12 18.8v2.3M2.9 12h2.3M18.8 12h2.3M6.1 6.1l1.6 1.6M16.3 16.3l1.6 1.6M17.9 6.1l-1.6 1.6M7.7 16.3l-1.6 1.6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                  />
                </svg>
              </i>
            </span>
          </header>

          {/* The plan meter, with the mark where an evenly spent plan would be. */}
          <div className="bbx-plan">
            <span className="bbx-plan-meter" data-spec-anchor="cap">
              <span className="bbx-plan-meter-fill" data-over={over} />
              <span
                className="bbx-plan-meter-pace"
                style={{ left: `${Math.min(99.5, pace * 100).toFixed(1)}%` }}
              />
            </span>
            <p className="bbx-plan-line">
              Day {ELAPSED_DAYS} of {TOTAL_DAYS} · resets {formatAgo(RESETS_AT, NOW)} · the mark
              is even spending, {formatPercent(pace)} by now
            </p>
            <p className="bbx-plan-track" data-tone={track.over ? "over" : undefined}>
              {track.text}
            </p>
            <p className="bbx-plan-since">
              Byte Budget has been counting since {RECORDED_LABEL}. The{" "}
              {formatCount(UNKNOWN_DAYS)} days of this cycle before that are not included.
            </p>
          </div>

          {/* The only modelled figure on the surface, in the colour that means so, with
              its basis under it — clamped to two lines, never absent. */}
          <section className="bbx-projection">
            <h3 className="bbx-projection-heading">Projection</h3>
            {CONFIDENT ? (
              <p className="bbx-projection-figure">
                Projected {bytes(projection.projected)} by {RESETS_LABEL} ·{" "}
                {projection.overBy > 0 ? (
                  <span className="bbx-projection-over">{bytes(projection.overBy)} over your plan</span>
                ) : (
                  <span className="bbx-projection-spare">
                    {bytes(PLAN - projection.projected)} spare
                  </span>
                )}
                {projection.exhaustedOn !== null &&
                  ` · ${projection.exhaustedOn <= NOW ? "ran out" : "runs out"} ${formatAgo(projection.exhaustedOn, NOW)}`}
              </p>
            ) : (
              <p className="bbx-projection-figure" data-tone="early">
                Too early to project — {formatCount(FINISHED_DAYS)} full days recorded,{" "}
                {formatCount(NEEDED_DAYS)} needed
              </p>
            )}
            <p className="bbx-projection-basis">{PROJECTION_BASIS}</p>
            <span className="bbx-link">Show how this is worked out</span>
          </section>

          <div className="bbx-tabs" aria-hidden="true">
            {["Session", "Today", "7 days", "Cycle", "30 days"].map((tab) => (
              <span key={tab} data-checked={tab === "Cycle"} data-locked={tab === "30 days"}>
                {tab}
                {tab === "30 days" && (
                  <i className="bbx-lock">
                    <LockGlyph />
                  </i>
                )}
              </span>
            ))}
          </div>

          {/* The period's figure, and how much of it was measured. With the cycle
              selected this is the same figure as the headline, which is the point:
              the number and its caveat in one line. */}
          <p className="bbx-meta" data-spec-anchor="split">
            <span>
              This cycle · {CYCLE_START_LABEL} – {TODAY_LABEL}
            </span>
            <span className="bbx-meta-figure">{bytes(used)}</span>
            {notes.plain && <span>{notes.plain}</span>}
            {notes.floor && <span className="bbx-meta-floor">{notes.floor}</span>}
            {notes.flag && <span className="bbx-meta-flag">{notes.flag}</span>}
          </p>

          {/* What is eating the connection in the last minute, per host, and the two
              things to do about the site in front of you. */}
          <section className="bbx-live">
            <div className="bbx-live-head" data-spec-anchor="live">
              <h3 className="bbx-live-heading">Right now</h3>
              <span className="bbx-live-note">{rate(liveTotal)} over the last minute</span>
            </div>
            <ol className="bbx-live-list">
              {live.map((host) => (
                <li
                  className="bbx-live-row"
                  key={host.host}
                  data-media={host.host === MEDIA_HOST && !held}
                >
                  <span className="bbx-live-host">
                    <span className="bbx-live-host-name">{host.host}</span>
                    {host.site !== host.host && (
                      <span className="bbx-live-site">on {host.site}</span>
                    )}
                  </span>
                  <span className="bbx-live-figures">
                    <span className="bbx-live-bytes">{bytes(host.bytes)}</span>
                    <span className="bbx-live-rate">{rate(host.bytes)}</span>
                  </span>
                  <span className="bbx-live-bar">
                    <span
                      className="bbx-live-bar-fill"
                      style={{
                        width: `${livePeak > 0 ? Math.max(2, (host.bytes / livePeak) * 100) : 0}%`,
                      }}
                    />
                  </span>
                </li>
              ))}
            </ol>
            {holdRow && (
              <p className="bbx-live-hold" data-spec-anchor="hold" data-shown={held}>
                Video and audio skipped on {SITE} · resumes {formatAgo(HOLD_UNTIL, NOW)}
              </p>
            )}
            <div className="bbx-actions-row">
              {held ? (
                <span className="bbx-ghost" data-target="hold-trim">
                  Resume now
                </span>
              ) : (
                <>
                  <span className="bbx-ghost" data-target="hold-trim" data-pressed={held}>
                    Skip video here for an hour
                  </span>
                  <span className="bbx-ghost">Pause this site for an hour</span>
                </>
              )}
            </div>
          </section>

          <section className="bbx-limit" data-state={over ? "over" : share >= 0.85 ? "near" : "within"}>
            <div className="bbx-limit-head">
              <h3 className="bbx-limit-heading">Data limit</h3>
              <span className="bbx-limit-scope">Everything — every site, not just this tab</span>
            </div>
            <p className="bbx-limit-status" data-tone={over ? "over" : undefined}>
              {statusWord(share)}
            </p>
            <p className="bbx-limit-line">
              {bytes(used)} of {bytes(PLAN)} · {formatPercent(share)} of this month&rsquo;s
              limit · resets {formatAgo(RESETS_AT, NOW)}
            </p>
            <span className="bbx-limit-bar">
              <span className="bbx-limit-bar-fill" data-over={over} />
            </span>
            <p className="bbx-limit-consequence">
              {over
                ? "Refuses everything but the page itself. The page's own HTML still loads so it can tell you what happened, but nothing else does."
                : "Everything loads normally."}
            </p>
            {refusing && (
              <p className="bbx-limit-prevented" data-spec-anchor="refused">
                ~{bytes(totals.saved - totals.savedMeasured)} refused rather than spent
              </p>
            )}
            <div className="bbx-actions-row">
              <span className="bbx-ghost">+{bytes(500_000_000)} this month</span>
              <span className="bbx-ghost">Pause limit 1 hour</span>
              <span className="bbx-ghost" data-danger="true">
                Remove
              </span>
            </div>
          </section>
        </div>
      </div>

      {/* The request the cap refused: one segment, leaving the player for the edge, met
          at the plan's end and thrown back out of the frame. It was never sent, which is
          why the popup's figure for it carries a tilde. */}
      <div className="bb-refusal" aria-hidden="true">
        <span className="bb-refusal-card">
          <i className="bb-refusal-glyph" />
          <b>{MEDIA_HOST}</b>
          <small>seg-1194.m4s · ~{bytes(REFUSED[at("refuse")] ?? 0)}</small>
        </span>
      </div>

      {/* The warning, on the visitor's own screen rather than drawn inside a picture of a
          browser: an extension whose pitch is that it reaches you before the plan is gone
          cannot make that point inside a 940px panel. Keyed on the threshold, so the 90
          arrives as a fresh card rather than the 75 changing its mind. Gated on the
          section being the one in front of the visitor as well as on the beat. */}
      <ViewportLayer className="bb-alert-layer">
        {alerting && focused && announced !== null && (
          <div className="bb-os-alert" key={`${run}-${announced}`}>
            <span className="bb-alert-icon">
              <Mark />
            </span>
            <div className="bb-alert-copy">
              <p className="bb-alert-source">
                <span>Byte Budget</span>
                <small>now</small>
              </p>
              <p className="bb-alert-title">{formatPercent(announced)} of your data allowance used</p>
              <p className="bb-alert-body">
                {bytes(used)} of {bytes(PLAN)}. {bytes(Math.max(0, PLAN - used))} left. Resets{" "}
                {formatAgo(RESETS_AT, NOW)}.
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
          pressing={CLICKS.has(beat)}
          onPress={onPress}
          token={`${run}-${beat}`}
        />
      )}

      {/* No caption. Every figure one could carry is printed on screen already, and what a
          caption cannot do is stand next to the one it is about. See `SPECS`. */}
      <SpecTags beats={BEATS} beat={beat} tags={SPECS} origin={SPEC_ORIGIN} className="bb-specs" />
    </div>
  );
}
