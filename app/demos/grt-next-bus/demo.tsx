"use client";

/**
 * GRT Next Bus, as a bus actually arriving — and the popup saying where it is.
 *
 * The old version of this pod was the popup rebuilt at its real size with live
 * countdowns and a working stop picker, and it was the weakest thing on the page for
 * a reason worth writing down: a countdown that ticks proves nothing. Every transit
 * site has one. What this extension actually does is remove the trip to a transit
 * site — the wait is on the toolbar, and a notification arrives five minutes out
 * whether or not you thought to look. That is a story about time passing, so it is
 * staged as one.
 *
 * The whole scene runs off a single number. Each beat names a simulated clock
 * position in seconds (`CLOCK`), the timetable is a list of departure times in the
 * same units, and everything visible is derived from the difference:
 *
 *   the countdowns, their colours and the overdue label, via the extension's own
 *     `departureLabels`, and in leave-by mode via its `leaveLabels`;
 *   the clock times under them, and the "leave by" time inside an opened row;
 *   the toolbar badge text and colour, via its own `formatBadge` and thresholds;
 *   and — through one more number, `BUS_P` — where the bus is.
 *
 * `BUS_P` is the bus's position in stops before the rider's own, and it is drawn
 * twice from the same value: once as a 20px glyph on the strip inside the opened
 * row, and once as a 138px bus on the street under the window. That is the point of
 * the scene rather than a convenience. The strip is the product's new "where is my
 * bus" — `src/busStrip.ts` projects the vehicle's reported position onto the segment
 * between the two stops the feed says it is between — and a visitor cannot check a
 * strip against a feed. They can check it against a street, so the street agrees
 * with it by construction, and on the beat the strip appears its bus glyph leaves the
 * popup and lands on the road as the bus. One becomes the other.
 *
 * WHAT THIS SCENE IS A RECONSTRUCTION OF, AND HOW CURRENT IT IS
 *
 * The 1.1.0 popup: a list of stop cards, a row per saved route and destination, the
 * row's own disclosure holding the bus strip, the leave-by line, the later departures
 * and the entry's controls; a bottom bar carrying "Add a stop"; and a picker whose
 * search understands "uw station" and lists the five stops of University Of Waterloo
 * Station under one heading, each named by its platform. Every string the popup
 * prints here is one it prints there — the strings were read out of the implementation
 * report and the screenshots that accompanied it, and the two vendored formatters are
 * byte-compared with the extension by `tests/rendered-html.test.mjs`.
 *
 * What is re-expressed rather than vendored, and says so where it happens:
 * `departureNoteNodes`, `leaveLabels`, `leaveLine` and `rowLabels` return DOM nodes
 * or live in files the tests do not pin. Each is transcribed beside the JSX that
 * renders it, under the name it has upstream.
 *
 * The timetable is invented and the interface is not. The real popup's first act is
 * to download the region's GTFS feed and parse a few hundred thousand stop times,
 * which is a fine thing to do once for someone who installed it and an unreasonable
 * thing to do to someone who scrolled past a portfolio. The stops, the route and the
 * order the bus calls at them are the real ones for route 7 toward Conestoga Mall.
 *
 * The clock anchor is a fixed timestamp rather than `Date.now()`. A demo whose
 * wall-clock times differ between the server render and the client render is a
 * hydration mismatch, and the times themselves carry no information here — the
 * distances between them do.
 */

import { useEffect, useRef, type CSSProperties } from "react";
import { PhantomCursor } from "../scene/cursor";
import { usePressGate } from "../scene/press-gate";
import { SpecPlate, SpecTags, type SpecTag } from "../scene/spec";
import { useStoryboard, type Beat } from "../scene/storyboard";
import { ViewportLayer } from "../scene/viewport-layer";
import { useOnScreen } from "../use-on-screen";
import { useSceneRun } from "../scene/use-scene-run";
import { useSectionFocused } from "../use-section-focus";
import {
  formatBadge,
  formatClock,
  formatCountdown,
  formatDelay,
  formatWalkTime,
  formatWeekday,
  minutesUntil,
  readableTextColor,
  routeBadgeColor,
} from "./format";
import { departureLabels, type TimeLabels } from "./labels";
import "./demo.css";

type BeatName =
  | "street"
  | "alert"
  | "reach"
  | "open"
  | "stops"
  | "expand"
  | "strip"
  | "leave"
  | "soon"
  | "late"
  | "add"
  | "search"
  | "results";

/**
 * Thirteen beats over 19.8 seconds, in three acts.
 *
 * The wait: a badge counting down on a toolbar nobody is looking at, and the alert
 * that reaches the corner of the visitor's own window five minutes out. The row: the
 * popup opens, a row opens inside it, the strip says where the bus is and the street
 * agrees, the walk gets counted and the countdown becomes an instruction — "Leave in
 * 4 min", then "Leave now", then "1 min late" as the bus pulls up. The coda: the
 * "Add a stop" bar, and a search that understands a station.
 *
 * Three of the beats carry a click and are gated on the pointer actually pressing
 * rather than on the beat starting (see `usePressGate`): `open`, `expand` and `add`.
 * Each is long enough to hold the flight, the press and the transition it causes —
 * the popup grows over 260ms, a row's disclosure opens over 300ms.
 */
const BEATS: readonly Beat<BeatName>[] = [
  // Long enough to notice that the badge is counting down on its own.
  { name: "street", ms: 2000 },
  { name: "alert", ms: 2100 },
  { name: "reach", ms: 700 },
  // The click, and the popup growing out of its own button.
  { name: "open", ms: 600 },
  // Two cards, two rows, each with a countdown, a clock and a line saying where the
  // number came from. The most text in the scene so far.
  { name: "stops", ms: 1400 },
  // The pointer crosses from the toolbar to the first row and presses it.
  { name: "expand", ms: 1200 },
  // The strip: the next stops as dots, the bus between the two it is between. Its bus
  // glyph leaves the popup here and lands on the street. See `.gx-hop`.
  { name: "strip", ms: 1900 },
  // The position lands: the closest card is outlined, the walk is counted, and the
  // countdown becomes the moment to set off.
  { name: "leave", ms: 1900 },
  { name: "soon", ms: 1400 },
  // The predicted instant passes. The countdown reads the delay instead of "Due",
  // and the bus on the road reaches the pole.
  { name: "late", ms: 2000 },
  // The bar at the foot of the popup, pressed.
  { name: "add", ms: 1000 },
  { name: "search", ms: 1400 },
  { name: "results", ms: 2200 },
];

/**
 * Simulated seconds elapsed at each beat. Time moves in uneven jumps because the
 * interesting parts of a seven-minute wait are not evenly spaced.
 *
 * The positions are chosen so every beat's numbers are worth the frame, and two of
 * them are pinned by the extension's own arithmetic. `alert` sits inside the minute
 * where the departure is exactly five minutes out, because that is when
 * `DEFAULT_ALERT_LEAD_MINUTES` fires. `leave` sits inside the same minute, because
 * "Leave in 4 min" with a one-minute walk is a bus five minutes out — so the alert
 * and the instruction it leads to are about the same sixty seconds.
 */
const CLOCK: Record<BeatName, number> = {
  street: 0,
  alert: 35,
  reach: 50,
  open: 55,
  stops: 58,
  expand: 62,
  strip: 66,
  leave: 76,
  soon: 300,
  /* The predicted instant itself: `board()` keeps a run as the head until the clock
     passes it, and `formatOverdueDelay` refuses the case where the prediction is still
     in the future, so this is the one second at which the row reads the delay instead
     of "Due" — which is the branch the label on it is about. */
  late: 390,
  add: 470,
  search: 480,
  results: 490,
};

const CURSOR: Partial<Record<BeatName, string>> = {
  reach: "toolbar",
  open: "toolbar",
  expand: "row",
  add: "add",
  search: "search",
};

/**
 * The three beats that carry a click, and wait for it. See `usePressGate`.
 *
 * All three qualify under that file's rule — "beats whose visible change the click
 * causes" — and none is aimed at a control the same beat introduces: the toolbar
 * button has been on screen since the first frame, the row since `stops`, and the bar
 * since the popup opened.
 */
const OPENS: ReadonlySet<BeatName> = new Set<BeatName>(["open", "expand", "add"]);

/**
 * A fixed evening: 9:22:30 PM in the agency's timezone on a Monday, which puts the
 * next bus six and a half minutes out and the leave-by moment at 9:28.
 *
 * Written as an instant rather than as text because every clock time on screen comes
 * out of `formatClock`, which asks the platform for the reader's convention — so this
 * frame says 9:28 PM or 21:28 depending on who is looking at it, and the calendar
 * column beside the popup says whichever the popup does.
 */
const ANCHOR = Date.UTC(2026, 6, 28, 1, 22, 30);

/** One saved route and destination at a stop — one `.service-row` in the popup. */
interface ServiceRow {
  id: string;
  /** `route_short_name`. The badge takes its colour from this, via `routeBadgeColor`. */
  route: string;
  /** The headsign, with the popup's leading "Toward " already stripped. */
  destination: string;
  /**
   * Whether the soonest run is a live prediction. Only the soonest ever is: the
   * departures behind it come out of the timetable, which is why an opened row can
   * say `scheduled` about them while the row above says `Live`.
   */
  live: boolean;
  /** Signed seconds late against the published time. Only meaningful when live. */
  delaySec: number;
  /**
   * Whether the feed reports a vehicle for the live run. The 7 has one, which is what
   * the strip is drawn from; ION's does not report one to this feed, so its row reads
   * `Live · 3 min late` and stops there, exactly as the popup's own screenshots do.
   */
  tracked: boolean;
  /** Departure times as seconds from ANCHOR, ascending. */
  times: readonly number[];
}

/** One physical stop — one `.stop-card`, holding a row per saved service. */
interface StopCard {
  id: string;
  name: string;
  /** `platformLabel`: the sign the rider stands under, printed beside the name. */
  platform?: string;
  /**
   * Straight-line metres from the rider, once a position is known. This is the
   * number leave-by mode turns into a walk, and the reason the two rows read so
   * differently once it lands: ninety metres is a minute, five kilometres is not.
   */
  meters: number;
  rows: readonly ServiceRow[];
}

/**
 * Two saved stops, chosen to exercise every state a row has.
 *
 * Charles St Terminal carries the service the whole scene is about: route 7, live,
 * a minute behind its timetable, with a vehicle position one stop back. Fairway
 * Station's card carries the other shape of the redraw — a station with a platform
 * label beside its name, an ION chip painted with the line's own colour, and a
 * prediction with no vehicle behind it. Both are the extension's fixture stops.
 *
 * The route numbers are also the badge test. `routeBadgeColor` returns ION blue for
 * the 300-series and nothing at all for everything else, which selects the neutral
 * chip — so 7 is a white chip with a hairline and 301 is blue.
 */
const STOPS: readonly StopCard[] = [
  {
    id: "charles",
    name: "Charles St Terminal",
    meters: 90,
    rows: [
      {
        id: "r7",
        route: "7",
        destination: "Conestoga Mall",
        live: true,
        delaySec: 60,
        tracked: true,
        times: [390, 1410, 2010],
      },
    ],
  },
  {
    id: "fairway",
    name: "Fairway Station",
    platform: "Platform 4",
    meters: 5400,
    rows: [
      {
        id: "r301",
        route: "301",
        destination: "Conestoga",
        live: true,
        delaySec: 180,
        tracked: false,
        times: [490, 1290, 1930],
      },
    ],
  },
];

/** The service the whole scene is about: the badge, the alert and the bus on the road. */
const HEAD_STOP = STOPS[0];
const HEAD_ROW = HEAD_STOP.rows[0];

/**
 * The row the pointer opens, and the one every label hangs off.
 *
 * One at a time is the popup's own rule: `toggleServiceRow` closes the others,
 * because a 600px panel cannot hold several open at once and the row a rider just
 * tapped has to stay on screen together with its detail.
 */
const OPEN_ROW = HEAD_ROW.id;

/**
 * `DEFAULT_DEPARTURES_PER_STOP` in `src/types.ts` — the "Times shown per route"
 * setting, which defaults to 3. It is the reason an opened row has an "Also at" line.
 */
const DEPARTURES_PER_ROUTE = 3;

/**
 * The lead time an alert fires at: `DEFAULT_ALERT_LEAD_MINUTES` in `src/types.ts`,
 * which `getAlertSettings` falls back to when a rider has not chosen one, and the
 * option the row's own control prints as "5 min before".
 *
 * It sets the notification's headline — "7 in 5 min" — and the label hanging off it.
 * See `ALERT_SPEC`.
 */
const ALERT_LEAD_MINUTES = 5;

/**
 * The rider's "Countdown" setting: `countdownMode` in `src/storage.ts`, set from the
 * settings panel's "Bus departs | Time to leave" pair. This scene is staged with it on
 * "Time to leave", which is the new capability and the one the film is about. The
 * mode does nothing until a position is known, which is why the countdown reads
 * "5 min" for the first half of the scene and "Leave in 4 min" after the fix lands —
 * `rowLabels` below, which is the extension's own rule for that.
 */
const COUNTDOWN_MODE: "departure" | "leave" = "leave";

/**
 * Route 7's stops around the rider's, in the order the bus calls at them — the seven
 * the extension's own "Browse routes" pane lists for the route, toward Conestoga Mall.
 *
 * `p` is each stop's distance from the rider's in stops, positive behind. It is the
 * one coordinate both drawings use: the strip inside the row places a dot at
 * `(3 - p) / 4` of its track, and the street places a tick at `YOUR_STOP - p * GAP`
 * percent of the road. The bus is drawn on both by the same `p` — see `BUS_P`.
 */
const ROUTE_STOPS: readonly { name: string; code: string; p: number }[] = [
  { name: "Fairway Station", code: "3513", p: 3 },
  { name: "Ottawa St / Mill St", code: "1310", p: 2 },
  { name: "Queen St / Charles St", code: "1122", p: 1 },
  { name: "Charles St Terminal", code: "1123", p: 0 },
  { name: "King St / University Ave", code: "2033", p: -1 },
  { name: "University Ave / Phillip St", code: "2087", p: -2 },
  { name: "Conestoga Mall Station", code: "2140", p: -3 },
];

/**
 * The stops the strip draws: `busStripModel` in `src/busStrip.ts` takes one stop
 * behind the segment the bus is on (`CONTEXT_BEHIND`), the segment, the rider's own
 * stop and one beyond it (`CONTEXT_BEYOND`). With the bus one stop away that is
 * Fairway Station through King St / University Ave — five dots, the ring fourth.
 */
const STRIP_STOPS = ROUTE_STOPS.filter((stop) => stop.p <= 3 && stop.p >= -1);
const STRIP_FIRST = 3;
const STRIP_SPAN = 4;
/** `x` for a stop on the strip, as the extension's `at()` computes it: 0..1. */
const stripX = (p: number) => (STRIP_FIRST - p) / STRIP_SPAN;

/**
 * Where the bus is at the start of each beat, in stops before the rider's.
 *
 * Continuous rather than a `left` per beat: the stylesheet interpolates between this
 * beat's value and the next one's with `--beat-t`, which the storyboard writes onto
 * the stage every frame without re-rendering anything, so the bus is a function of
 * scene time rather than a thing that lurches once a beat. Both drawings read the same
 * interpolated number — see `--bus-p` in the stylesheet.
 *
 * It is one stop away for the whole of the row act, because that is what the row
 * says, and inside that stop it closes on Queen St / Charles St as the minutes fall.
 * It reaches the pole on `late`, the beat the countdown stops predicting, and pulls
 * away during the coda: the departure it was counting has happened.
 *
 * Before `strip` it is not drawn at all. Until the row opens, nothing on screen knows
 * where the bus is — the badge says when, and only the strip says where.
 */
const BUS_P: Record<BeatName, number> = {
  street: 1.85,
  alert: 1.85,
  reach: 1.85,
  open: 1.85,
  stops: 1.85,
  expand: 1.85,
  strip: 1.85,
  leave: 1.7,
  soon: 1.05,
  late: 0,
  add: 0,
  search: -1.6,
  results: -4,
};

/** Where the bus is heading after the last beat: off the right-hand edge. */
const BUS_P_EXIT = -6;

/**
 * Where the rider's pole stands on the road, as a percentage of its width, and how
 * far apart the stops are. Left of centre so the bus pulls up clear of the popup,
 * which hangs on the right of its window. Twelve percent of a road 148vw wide is
 * about 256px at 1440 — room for a stop's name under each tick and a 138px bus
 * between two of them.
 */
const YOUR_STOP = 42;
const STOP_GAP = 12;

/**
 * What the picker lists for "uw station", from the extension against the live feed.
 *
 * Five stops share the name University Of Waterloo Station and no parent station
 * in GRT's feed, and `groupByStation` in `src/stations.ts` groups them by name for
 * exactly that reason; `platformLabel` names each by its `platform_code`; and
 * `destinationFor` drops the headsign naming the rider's own station, which is
 * what turns "Toward Conestoga Station / University of Waterloo Station" into a
 * destination. The summary line is `stopsSummary(5, 5)`.
 */
const QUERY = "uw station";
const STATION = {
  name: "University Of Waterloo Station",
  count: "5 platforms",
  summary: "5 stops",
  platforms: [
    {
      platform: "Platform 4",
      code: "1223",
      routes: [
        { route: "201", toward: "Toward Conestoga Station" },
        { route: "19", toward: "Toward B-Northfield Station / A-St. Jacobs Market" },
      ],
    },
    {
      platform: "Platform 6",
      code: "1078",
      routes: [{ route: "9", toward: "Toward Conestoga Station" }],
    },
  ],
} as const;

/**
 * The extension's own hint under the search box — `SEARCH_HINT` in `src/picker.ts`.
 */
const SEARCH_HINT =
  "Type a stop name, a route number, two streets, or the stop number on the pole. Stops at one station are listed together.";

/**
 * The five things the extension does, on the five things doing them.
 *
 * Each claim is pinned to its evidence and arrives on the beat the evidence does. Four
 * hang off the popup's left edge and read away from it, because the panel is 420px of
 * dense type with no gap inside it big enough for a plate; the standoff back out to the
 * edge is `nudge.x`, which is the row's own copy column — 8px of `.app` inset, 4px of
 * card padding, and the 72px `--copy-inset` the detail panel indents by. 84. The
 * picker's platform label sits at a different column: 8px inset, 16px of picker body,
 * 11px of block padding and a 1px rule. 36.
 *
 * The sixth is the alert's, and it is not a coordinate on this pod at all — see
 * `ALERT_SPEC`.
 *
 * WHAT IS DELIBERATELY NOT HERE
 *
 * "And the buses after that one" pointed at the "Also at" line for as long as the
 * later departures were the most a row could reveal. The row reveals the bus's
 * position and the moment to leave now, and a fourth plate on the same edge would be
 * a fourth thing to read on a frame that already asks for three. The line is still
 * there, unlabelled, saying what it says.
 *
 * The other absence is older and unchanged: the countdown surviving Chrome tearing the
 * service worker down. `tests/background-lifecycle.test.mjs` restarts the worker
 * between assertions and asks the new generation what the badge says. A teardown has
 * no interface, so there is no frame that contains the evidence.
 */
const SPECS: readonly SpecTag<BeatName>[] = [
  /* On the toolbar button, reading leftward because there is nothing to the right of it.
     It stays for the whole film: the badge is on screen from the first frame to the last
     and never stops counting — 6, 5, 1, Due, 15 — so its claim never stops being true.
     The first draft took it down when the popup opened, on the belief that the popup
     would cover it; the popup hangs *under* the toolbar, 44px down, and the plate's lower
     edge sat exactly on the popup's upper one. The five pixels lift it clear, and keep
     the dot inside the badge's fifteen. */
  {
    at: "street",
    text: "Countdown on your toolbar",
    x: 91.5,
    y: 4.5,
    anchor: "countdown",
    grip: "left",
    side: "left",
    nudge: { y: -5 },
  },
  /* The strip's claim, on the strip. It leaves with the list, on the beat the bar is
     pressed and the picker replaces it. */
  {
    at: "strip",
    text: "Where the bus is right now",
    until: "add",
    x: 50,
    y: 46,
    anchor: "bus-strip",
    grip: "left",
    side: "left",
    nudge: { x: -84 },
  },
  /* On the line that turns a departure into an instruction. */
  {
    at: "leave",
    text: "Leave time counts your walk",
    until: "add",
    x: 50,
    y: 53,
    anchor: "leave-line",
    grip: "left",
    side: "left",
    nudge: { x: -84 },
  },
  /* The note under the destination, which reads `Live · 1 min late · 1 stop away` until
     the predicted instant, when the countdown column takes the delay and the note reads
     `Live · at your stop`. The label arrives with that swap. */
  {
    at: "late",
    text: "Real position, so late reads late",
    until: "add",
    x: 50,
    y: 37,
    anchor: "nearest-note",
    grip: "left",
    side: "left",
    nudge: { x: -84 },
  },
  /* The coda's one claim, on the first platform label the search produces. */
  {
    at: "results",
    text: "Platforms named, not just stop numbers",
    x: 50,
    y: 62,
    anchor: "platform",
    grip: "left",
    side: "left",
    nudge: { x: -36 },
  },
];

/**
 * The alert's claim, which travels with the alert.
 *
 * The notification this label is about is not in the chrome. It is portalled to
 * `document.body` and drawn in the corner of the visitor's actual window, on purpose,
 * because an extension whose whole pitch is that it reaches you when you are not looking
 * cannot make that point inside a 900px panel. So the plate hangs off the notification
 * itself — see `SpecPlate`, and `.gx-alert-spec` for the two lines of geometry that put
 * it against the card's left edge at any window width.
 *
 * The number is checkable rather than chosen — `ALERT_LEAD_MINUTES` above is
 * `DEFAULT_ALERT_LEAD_MINUTES` from `src/types.ts`, and the same constant is what
 * decides when `background.ts` actually fires. The rest of the line is what the corner
 * of the window is evidence of.
 */
const ALERT_SPEC = "Five minutes out, wherever you are";

/** The extension's toolbar button, in the pod's own percentages. */
const SPEC_ORIGIN = { x: 91.5, y: 4.5 };

/**
 * The evening behind the popup. It is set dressing with one job: the thing at ten is
 * what the next bus is being measured against, and without it the countdown is a
 * number with no stake in it. The 7 goes to Conestoga Mall; so does the rider.
 *
 * Minutes from the anchor rather than written-out times, because the labels go
 * through `formatClock` — the extension's own formatter, which asks the platform for
 * the reader's clock convention.
 */
const AGENDA: readonly { minutes: number; event?: string }[] = [
  { minutes: -112.5 },
  { minutes: -82.5 },
  { minutes: -52.5 },
  { minutes: -22.5 },
  { minutes: 7.5 },
  { minutes: 37.5, event: "Late shift · Conestoga Mall" },
];

/**
 * How long after `strip` begins to measure the two buses for the hop.
 *
 * The row's disclosure opens over 300ms (`grid-template-rows` 0fr → 1fr), and the
 * strip inside it is not at rest until it has. Longer than that, and shorter than the
 * delay the hop's animation waits before it leaves — see `.gx-hop`.
 */
const HOP_MEASURE_MS = 360;

/**
 * The soonest departure and the ones behind it.
 *
 * `nextBus` in `popup.ts`, in the shape a simulated timetable can take: the head is
 * the first departure that has not gone, and `rest` is `slice(1, times)` of what
 * follows — the same arithmetic, against the same default of three.
 *
 * `index` comes back too, because only `index === 0` is a live prediction here. Once
 * the predicted bus has gone the row falls back to the timetable, which is what turns
 * `Live` into `Scheduled` and takes the strip away with it.
 */
function board(row: ServiceRow, clock: number) {
  const position = row.times.findIndex((time) => time >= clock);
  const index = position === -1 ? row.times.length - 1 : position;
  return {
    index,
    head: row.times[index],
    rest: row.times.slice(index + 1, index + DEPARTURES_PER_ROUTE),
  };
}

/**
 * `walkMinutesFor` in `src/leave.ts`: a relaxed 75 metres a minute, never under one.
 * The same constant sits inside `formatWalkTime` in the vendored `format.ts`, and the
 * extension's own tests hold the two together.
 */
function walkMinutesFor(meters: number): number {
  return Math.max(1, Math.round(meters / 75));
}

/**
 * `leaveLabels` in `src/leave.ts`, transcribed.
 *
 * Same thresholds as `departureLabels` — two minutes is red, five is green, past the
 * hour the label steps back down — but the minutes counted are minutes until the rider
 * must leave, not until the bus does. Once that moment has passed the label says so
 * plainly.
 *
 * Not vendored, because the tests do not pin that file and a copy nothing checks is the
 * kind of copy this scene has already paid for once. Transcribed under the upstream
 * name, beside the JSX that renders it, so it can be diffed by eye.
 */
function leaveLabels(timeMs: number, meters: number, now: number): TimeLabels {
  const walkMinutes = walkMinutesFor(meters);
  const leaveMs = timeMs - walkMinutes * 60_000;
  const minutes = Math.floor((leaveMs - now) / 60_000);
  const clock = departureLabels(timeMs, undefined, now).clock;
  if (minutes <= 0) return { countdown: "Leave now", className: "countdown is-soon", clock };
  if (minutes < 60) {
    return {
      countdown: `Leave in ${minutes} min`,
      className: `countdown${minutes <= 2 ? " is-soon" : minutes <= 5 ? " is-near" : ""}`,
      clock,
    };
  }
  return {
    countdown: `Leave in ${formatCountdown(leaveMs, now)}`,
    className: "countdown is-distant",
    clock,
  };
}

/** `leaveLine` in `src/leave.ts`: `1 min walk · leave by 9:28 PM`. */
function leaveLine(timeMs: number, meters: number): string {
  return `${formatWalkTime(meters)} · leave by ${formatClock(timeMs - walkMinutesFor(meters) * 60_000)}`;
}

/**
 * `rowLabels` in `popup.ts`: the departure, or — in leave-by mode, with the walk to
 * this stop known — the moment the rider has to set off. A bus that is due or overdue
 * reads as such in either mode: "Leave now" for a bus already at the stop is a bus
 * the rider is not going to catch by leaving now.
 */
function rowLabels(
  timeMs: number,
  delaySec: number | undefined,
  meters: number | undefined,
  now: number,
): TimeLabels {
  const departure = departureLabels(timeMs, delaySec, now);
  if (COUNTDOWN_MODE !== "leave" || meters === undefined) return departure;
  if (minutesUntil(timeMs, now) === 0) return departure;
  const leave = leaveLabels(timeMs, meters, now);
  return { countdown: leave.countdown, clock: departure.clock, className: leave.className };
}

function stopsAwayLabel(count: number): string {
  if (count === 0) return "at your stop";
  return count === 1 ? "1 stop away" : `${count} stops away`;
}

/** A fragment of the note under a destination, and how it is inked. */
interface NotePart {
  text: string;
  tone?: "live" | "late" | "early" | "scheduled";
}

/**
 * `departureNoteNodes` in `popup.ts`, which builds `Live · 1 min late · 1 stop away`.
 *
 * Not vendored, because that function returns `HTMLElement`s and a DOM builder cannot
 * be copied into a React scene. The one piece of it worth stating is the piece that is
 * easy to get wrong: the delay is dropped when the countdown is already saying it. Past
 * the predicted instant `departureLabels` puts `1 min late` in the countdown column,
 * and printing it again three inches to the left reads as two separate facts about the
 * same bus.
 */
function noteParts(
  live: boolean,
  delaySec: number,
  labels: TimeLabels,
  away: number | undefined,
): NotePart[] {
  if (!live) return [{ text: "Scheduled", tone: "scheduled" }];
  const parts: NotePart[] = [{ text: "Live", tone: "live" }];
  const delay = formatDelay(delaySec);
  if (delay && labels.countdown !== delay) {
    parts.push({ text: delay, tone: delaySec > 0 ? "late" : "early" });
  }
  if (away !== undefined) parts.push({ text: stopsAwayLabel(away) });
  return parts;
}

/**
 * The toolbar badge's colour, copied from `badgeColor` in `src/background.ts`.
 *
 * The same two thresholds `departureLabels` uses, and they have to be: the badge and
 * the row are on screen together for most of these beats, and two different opinions
 * about whether a bus is urgent is the disagreement this scene is supposed not to have.
 */
function badgeColor(minutes: number): string {
  if (minutes <= 2) return "#c2352f";
  if (minutes <= 5) return "#c26a15";
  return "#1f7a52";
}

/** `departureLabels` returns the extension's class names; this pod's are prefixed. */
function prefixed(className: string): string {
  return className
    .split(" ")
    .map((name) => `gx-${name}`)
    .join(" ");
}

/**
 * The route badge, which is `routeBadge` in `popup.ts` as JSX.
 *
 * The rule it follows is Google Maps': paint the chip with the agency's own
 * `route_color` and fall back to a neutral chip — a white pill with a hairline and
 * the number a weight heavier — wherever the feed has none. GRT's feed has no colour
 * columns, so the neutral chip is the common case and ION is the exception.
 */
function RouteBadge({ route, className }: { route: string; className?: string }) {
  const color = routeBadgeColor({ shortName: route });
  return (
    <span
      className={className ? `gx-route-badge ${className}` : "gx-route-badge"}
      style={
        color
          ? { backgroundColor: color, borderColor: color, color: readableTextColor(color) }
          : undefined
      }
    >
      {route}
    </span>
  );
}

/**
 * The countdown, as `setCountdown` in `popup.ts` writes it. "Leave in 4 min" keeps its
 * words at label size in front of the number, so the number stays the hero and the
 * column does not widen; the space between them is a real space in the text.
 *
 * Keyed by its own text, so React remounts it when the reading changes and the CSS
 * tick plays without the scene tracking minute boundaries.
 */
function Countdown({ labels }: { labels: TimeLabels }) {
  const leave = /^(Leave in|Leave) (.+)$/.exec(labels.countdown);
  return (
    <span className={prefixed(labels.className)} key={labels.countdown}>
      {leave ? (
        <>
          <span className="gx-countdown-prefix">{leave[1]}</span>
          {` ${leave[2]}`}
        </>
      ) : (
        labels.countdown
      )}
    </span>
  );
}

/**
 * Material's `directions_bus` glyph — `BUS_GLYPH` in `src/busStrip.ts` — so the strip's
 * bus is the same bus as everywhere else in Chrome. It is also what leaves the popup
 * on `strip` and lands on the road.
 */
const BUS_GLYPH =
  "M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h8v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm9 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm1.5-6H6V6h12v5z";

function BusGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={BUS_GLYPH} fill="currentColor" />
    </svg>
  );
}

/** An outline icon from the extension's `ICONS` table in `src/dom.ts`. */
function Icon({ d, className }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const ICONS = {
  close: "M6 6l12 12M18 6L6 18",
  chevronRight: "M9 6l6 6-6 6",
  chevronDown: "M6 9l6 6 6-6",
  grip: "M8 6h2v2H8zM14 6h2v2h-2zM8 11h2v2H8zM14 11h2v2h-2zM8 16h2v2H8zM14 16h2v2h-2z",
  /* Alerts on: the filled counterpart to the bell, so the state is a change of shape
     and not only a change of colour. */
  bellFilled:
    "M12 3a6 6 0 0 0-6 6v3.6l-1.62 2.62A1 1 0 0 0 5.23 16.7h13.54a1 1 0 0 0 .85-1.48L18 12.6V9a6 6 0 0 0-6-6Zm0 18a2.6 2.6 0 0 0 2.54-2.1H9.46A2.6 2.6 0 0 0 12 21Z",
} as const;

/** The bus on the road. Boxier than the backdrop's, and it carries a sign. */
function Bus({ route }: { route: string }) {
  return (
    <span className="gx-bus" aria-hidden="true" data-hop="to">
      <svg viewBox="0 0 132 62" className="gx-bus-body">
        <path
          className="gx-bus-shell"
          d="M6 6h104a8 8 0 0 1 8 8v30a6 6 0 0 1-6 6H6a4 4 0 0 1-4-4V10a4 4 0 0 1 4-4Z"
        />
        <rect className="gx-bus-sign" x="8" y="11" width="30" height="12" rx="3" />
        <g className="gx-bus-glass">
          <rect x="44" y="12" width="20" height="17" rx="3" />
          <rect x="68" y="12" width="20" height="17" rx="3" />
          <rect x="92" y="12" width="20" height="17" rx="3" />
        </g>
        <g className="gx-bus-wheels">
          <circle cx="30" cy="52" r="8" />
          <circle cx="98" cy="52" r="8" />
        </g>
      </svg>
      <span className="gx-bus-route">{route}</span>
    </span>
  );
}

/** The extension's own icon, used on the toolbar, in the popup and on the alert. */
function Mark() {
  return (
    <span className="gx-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <rect x="4" y="4" width="16" height="13" rx="3" fill="currentColor" />
        <rect x="6.5" y="6.5" width="11" height="5" rx="1.6" fill="#fff" opacity="0.9" />
        <circle cx="8" cy="19" r="1.7" fill="currentColor" />
        <circle cx="16" cy="19" r="1.7" fill="currentColor" />
      </svg>
    </span>
  );
}

export function GrtNextBusDemo() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const onScreen = useOnScreen(stageRef);
  /* The notification is only allowed onto the visitor's screen while this is the
     section they are actually in. See `useSectionFocused`. */
  const focused = useSectionFocused(stageRef);
  const running = useSceneRun(focused, onScreen);
  const state = useStoryboard(BEATS, {
    running,
    stage: stageRef,
    /* The still that carries the argument.
       `late` is the frame where every claim is on screen at once: the list is open,
       the first row is open inside it, the strip shows the bus on the last segment
       before the ring, the leave-by line sits under it, and the countdown has stopped
       predicting and reads the delay in red — with the bus pulled up at the pole on
       the street below, one drawing agreeing with the other. All three of the row's
       labels are up and pinned. */
    stillBeat: "late",
  });
  const { beat, index, run, still } = state;
  /* Three clicks in this scene, and each has something large depending on it: a 420px
     panel covering most of the window, a row unfolding inside it, and a picker
     replacing the list. Without the gate the popup opened five frames before the ring
     said anything had been pressed. See `usePressGate`. */
  const { reached, onPress } = usePressGate(BEATS, state, OPENS);

  const at = (name: BeatName) => BEATS.findIndex((entry) => entry.name === name);
  const clock = CLOCK[beat];
  const now = ANCHOR + clock * 1000;

  const open = reached >= at("open");
  const rowOpen = reached >= at("expand");
  /* The position fix. `chooseNearestSavedStop` hoists and outlines the closest card,
     and the walk to every stop becomes known in the same moment — which is what
     leave-by mode was waiting for. */
  const located = index >= at("leave");
  const picking = reached >= at("add");
  /* One notification per trip — the real one holds a fifteen-minute repeat guard —
     held while the cursor goes for the toolbar and dismissed by the click that
     opens the popup, so the answer replaces the question rather than joining it. */
  const alerting = index >= at("alert") && !open;
  /* From the strip beat on, the bus is on the road. Before it, nothing on screen has
     said where the bus is. */
  const busKnown = index >= at("strip");
  const arrived = beat === "late";

  /* The closest stop's soonest service drives the badge, because that is what the
     service worker picks: the badge follows where you are, not the top of the list. */
  const headBoard = board(HEAD_ROW, clock);
  const headTimeMs = ANCHOR + headBoard.head * 1000;
  /* `formatBadge` has no delay to read, so past the predicted instant the badge says
     `Due` while the row says `1 min late`. That is not a disagreement to fix: the two
     are different surfaces answering different questions, and `updateBadge` in
     `background.ts` puts the overdue wording in the icon's tooltip rather than in the
     eighteen pixels of the badge. */
  const badgeMinutes = minutesUntil(headTimeMs, now);
  const badgeText = formatBadge(headTimeMs, now);

  /* Both ends of the current move, for the stylesheet to interpolate. See `BUS_P`. */
  const busFrom = BUS_P[beat];
  const busTo = index === BEATS.length - 1 ? BUS_P_EXIT : BUS_P[BEATS[index + 1].name];
  /* `Departure.stopsAway`, which the feed reports and the strip and the note both
     read: one until the predicted instant, none once the bus is heading for the
     rider's own stop. */
  const headAway = headBoard.index === 0 ? (clock >= HEAD_ROW.times[0] ? 0 : 1) : undefined;

  /**
   * Hides a stop name the viewport edge or the dock would cut through.
   *
   * The road is 148vw wide and centred on the stage, so which of the seven names lands
   * near an edge depends on the window: at 1440 it is Fairway Station, at 2560 it is
   * Ottawa St / Mill St. A name sliced in half by the edge of the screen reads as a
   * fault rather than as a road continuing, and no stylesheet can know where a child
   * of a 148vw element lands in the viewport — so this measures, once per lap and on
   * resize, and the stylesheet fades the ones that would be cut.
   */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    let frame = 0;
    const measure = () => {
      frame = 0;
      const width = document.documentElement.clientWidth;
      for (const label of stage.querySelectorAll<HTMLElement>(".gx-tick-label")) {
        const box = label.getBoundingClientRect();
        /* More room on the right, where the dock's rail sits over the page. */
        label.dataset.clipped = String(box.left < 8 || box.right > width - 56);
      }
    };
    const request = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    request();
    window.addEventListener("resize", request);
    const observer = new ResizeObserver(request);
    observer.observe(stage);

    return () => {
      window.removeEventListener("resize", request);
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [run]);

  /**
   * Measures the two buses for the hop, once the strip is at rest.
   *
   * The strip's glyph and the road's bus are in two different coordinate spaces — one
   * inside a popup inside a browser, one on a road 148vw wide — and the animation that
   * carries one to the other needs both as pixels of the stage. Measured rather than
   * authored for the same reason `PhantomCursor` measures its target: where a DOM node
   * is cannot be expressed as a constant, and a hop that lands a hundred pixels from
   * the bus it is supposed to become is a hop that argues against the scene.
   *
   * Written onto the stage as custom properties for the keyframes to read. Only on the
   * strip beat, and only after the disclosure has finished opening — see
   * `HOP_MEASURE_MS`.
   */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || beat !== "strip") return;

    let frame = 0;
    const timer = window.setTimeout(() => {
      frame = requestAnimationFrame(() => {
        const from = stage.querySelector<HTMLElement>('[data-hop="from"]');
        const to = stage.querySelector<HTMLElement>('[data-hop="to"]');
        const box = stage.getBoundingClientRect();
        if (!from || !to || box.width === 0) return;
        const a = from.getBoundingClientRect();
        const b = to.getBoundingClientRect();
        if (a.width === 0 || b.width === 0) return;
        const ax = a.left + a.width / 2;
        const ay = a.top + a.height / 2;
        stage.style.setProperty("--hop-x", `${Math.round(ax - box.left)}px`);
        stage.style.setProperty("--hop-y", `${Math.round(ay - box.top)}px`);
        stage.style.setProperty("--hop-dx", `${Math.round(b.left + b.width / 2 - ax)}px`);
        stage.style.setProperty("--hop-dy", `${Math.round(b.top + b.height / 2 - ay)}px`);
        stage.style.setProperty("--hop-scale", (b.height / a.height).toFixed(2));
      });
    }, HOP_MEASURE_MS);

    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [beat, run]);

  return (
    <div
      className="gx"
      ref={stageRef}
      data-beat={beat}
      data-lap={run}
      data-open={open}
      data-located={located}
      data-picking={picking}
      data-bus={busKnown}
      data-arrived={arrived}
      style={{ "--bus-from": busFrom, "--bus-to": busTo } as CSSProperties}
      role="img"
      aria-label={
        "A browser with the GRT Next Bus extension pinned to its toolbar. The " +
        "toolbar badge counts down from six minutes on its own. Five minutes out, " +
        "a notification arrives in the corner of the window reading 7 in 5 min, " +
        "Charles St Terminal to Conestoga Mall, live prediction. The popup is then " +
        "opened and lists two saved stops: Charles St Terminal, with a row for route " +
        "7 to Conestoga Mall reading live, 1 min late, 1 stop away, and Fairway " +
        "Station, platform 4, with a row for the ION 301. The first row is opened in " +
        "place. A strip of the next stops shows the bus between Ottawa St / Mill St " +
        "and Queen St / Charles St, one stop before the rider's own, marked Your " +
        "stop, and the same bus is drawn at the same place on the street under the " +
        "window. A line reads 1 min walk, leave by 9:28 PM, and the countdown " +
        "becomes Leave in 4 min, then Leave now, then 1 min late once the predicted " +
        "time has passed and the bus reaches the pole. Finally the Add a stop bar is " +
        "pressed and typing uw station lists University Of Waterloo Station as five " +
        "platforms, each named by platform and stop number, with the routes at each " +
        "heading toward Conestoga Station."
      }
    >
      <div className="gx-browser">
        <div className="gx-chrome">
          <span className="gx-lights" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="gx-tabs">
            <span className="gx-tab is-active">
              <i className="gx-favicon gx-favicon--cal" />
              This week
            </span>
            <span className="gx-tab">
              <i className="gx-favicon" />
              Notes
            </span>
          </span>
          <span className="gx-bar">
            <span className="gx-omni">calendar.local/week</span>
            {/* The extension's own button, which is the only thing on the toolbar that
                has to be found. */}
            <span
              className="gx-action"
              data-target="toolbar"
              data-open={open}
              data-live={!open}
            >
              <Mark />
              {/* Keyed by its own text: React remounts it when the minute changes,
                  which restarts the CSS tick without the scene tracking it. */}
              <b
                className="gx-badge"
                data-spec-anchor="countdown"
                key={badgeText}
                style={{ background: badgeColor(badgeMinutes) }}
              >
                {badgeText}
              </b>
            </span>

            {/* The browser's own notification bell, which is where an alert lands
                before anyone looks at it. It rings on the beat the notification
                fires and keeps a dot until the popup is opened. */}
            <span
              className="gx-bell"
              data-ringing={alerting}
              data-unread={alerting}
              aria-hidden="true"
            >
              <svg viewBox="0 0 24 24">
                <g
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 4.2a4.8 4.8 0 0 0-4.8 4.8v3.3L5.6 15.6h12.8l-1.6-3.3V9A4.8 4.8 0 0 0 12 4.2Z" />
                  <path d="M10.3 18a1.8 1.8 0 0 0 3.4 0" />
                </g>
              </svg>
              <i className="gx-bell-dot" />
            </span>
          </span>
        </div>

        {/* The tab you actually had open, and the reason the bus matters: the thing
            at ten is what the countdown is measured against. */}
        <div className="gx-page" aria-hidden="true">
          <p className="gx-page-head">
            <b>{formatWeekday(ANCHOR)}</b> evening
          </p>
          {/* Six rows, because this column is what gives the window its height. */}
          <ul className="gx-agenda">
            {AGENDA.map((row) => (
              <li key={row.minutes}>
                <span className="gx-agenda-time">
                  {formatClock(ANCHOR + row.minutes * 60_000)}
                </span>
                {row.event ? (
                  <span className="gx-agenda-slot gx-agenda-event">{row.event}</span>
                ) : (
                  <span className="gx-agenda-slot" />
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* The popup, at the 420px Chrome gives it, hanging off its own button. */}
        <div className="gx-popup" data-spec-anchor="popup" data-open={open}>
          <div className="gx-app">
            {/* M3's small top app bar: 64dp, title-large, circular icon buttons. */}
            <div className="gx-topbar">
              <span className="gx-brand">
                <Mark />
                <p className="gx-brand-title">Next departure</p>
              </span>
              <span className="gx-topbar-actions" aria-hidden="true">
                <span className="gx-icon-button">
                  <svg viewBox="0 0 24 24">
                    <path
                      d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4h-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="gx-icon-button">
                  <svg viewBox="0 0 24 24">
                    <path
                      d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z M10 2 L14 2 L14.57 4.67 A7.77 7.77 0 0 1 17.07 6.11 L19.66 5.27 L21.66 8.73 L19.63 10.56 A7.77 7.77 0 0 1 19.63 13.44 L21.66 15.27 L19.66 18.73 L17.07 17.89 A7.77 7.77 0 0 1 14.57 19.33 L14 22 L10 22 L9.43 19.33 A7.77 7.77 0 0 1 6.93 17.89 L4.34 18.73 L2.34 15.27 L4.37 13.44 A7.77 7.77 0 0 1 4.37 10.56 L2.34 8.73 L4.34 5.27 L6.93 6.11 A7.77 7.77 0 0 1 9.43 4.67Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </span>
            </div>

            {/* `renderFeedLine`: what the times are. "Live departures" is the string
                the extension prints when a board has live predictions and they are
                current. It used to carry a "Fetched 10s ago · GRT data 22s ago" detail
                on its right; the 1.1.0 popup's own screenshots show the line bare,
                so the scene does too. */}
            <div className="gx-feed-line">
              <span className="gx-feed-state is-live">
                <i className="gx-feed-dot" />
                <span>Live departures</span>
              </span>
            </div>

            <div className="gx-body" data-view={picking ? "picker" : "list"}>
              <div className="gx-stop-list">
                {STOPS.map((stop) => {
                  /* The closest saved stop, once there is a position to be closest to.
                     The popup hoists it to the top of the list and outlines its card,
                     and locks its reorder grip because the order is not the rider's to
                     set while that is on. */
                  const nearest = located && stop.id === HEAD_STOP.id;
                  const meters = located ? stop.meters : undefined;

                  return (
                    <article
                      className={`gx-stop-card${nearest ? " is-nearest" : ""}`}
                      key={stop.id}
                    >
                      {/* An M3 list subheader. The stop is the loudest thing after the
                          countdown, because a rider scans this list for *their stop*;
                          the platform is the sign they are standing under, a shade
                          quieter beside it. */}
                      <div className="gx-stop-group-head">
                        <div className="gx-stop-identity">
                          <p className="gx-stop-name">{stop.name}</p>
                          {stop.platform && (
                            <span className="gx-stop-meta">
                              <span className="gx-meta-platform">{stop.platform}</span>
                            </span>
                          )}
                        </div>
                        <span className="gx-stop-grip" data-locked={nearest}>
                          <svg viewBox="0 0 24 24">
                            <path d={ICONS.grip} fill="currentColor" />
                          </svg>
                        </span>
                      </div>

                      <div className="gx-service-list">
                        {stop.rows.map((row) => {
                          const { index: position, head, rest } = board(row, clock);
                          const timeMs = ANCHOR + head * 1000;
                          const live = row.live && position === 0;
                          const labels = rowLabels(
                            timeMs,
                            live ? row.delaySec : undefined,
                            meters,
                            now,
                          );
                          const anchored = row.id === OPEN_ROW;
                          const away = live && row.tracked && anchored ? headAway : undefined;
                          const parts = noteParts(live, row.delaySec, labels, away);
                          const isOpen = rowOpen && row.id === OPEN_ROW;
                          /* `renderLaterDepartures` says "scheduled" only when the head is
                             a live prediction and these are not, because that is the one
                             case where two kinds of number sit side by side. */
                          const mixed = live && rest.length > 0;
                          const stripShown = live && row.tracked && away !== undefined;

                          return (
                            <section
                              className="gx-service-row"
                              key={row.id}
                              data-open={isOpen}
                            >
                              <div className="gx-row-main">
                                <span
                                  className="gx-row-toggle"
                                  {...(anchored ? { "data-target": "row" } : {})}
                                >
                                  <RouteBadge route={row.route} />
                                  <span className="gx-row-copy">
                                    <span className="gx-service-destination">
                                      {row.destination}
                                    </span>
                                    {/* `Live · 1 min late · 1 stop away`. Named, because
                                        the late label is about this line. */}
                                    <span
                                      className="gx-departure-note"
                                      data-spec-anchor={anchored ? "nearest-note" : undefined}
                                    >
                                      {parts.map((part, order) => (
                                        <span className="gx-note-part" key={part.text}>
                                          {order > 0 && <span className="gx-note-sep">·</span>}
                                          <span
                                            className={
                                              part.tone ? `gx-note-${part.tone}` : undefined
                                            }
                                          >
                                            {part.text}
                                          </span>
                                        </span>
                                      ))}
                                    </span>
                                  </span>
                                  <span className="gx-row-when">
                                    <Countdown labels={labels} />
                                    <span className="gx-arrival-time">{labels.clock}</span>
                                  </span>
                                </span>
                              </div>

                              {/* The disclosure. A `grid-template-rows` 0fr→1fr, which is
                                  how the real one animates, and indented to the copy
                                  column above it by `--copy-inset`. */}
                              <div className="gx-detail-wrap">
                                <div className="gx-detail">
                                  <div className="gx-detail-inner">
                                    {/* `renderBusStrip`: a line, a dot per stop, the bus
                                        above the line where it is, and two captions. The
                                        bus is placed by `--bus-p`, the same number that
                                        places it on the road. */}
                                    {stripShown && (
                                      <div
                                        className="gx-bus-strip"
                                        data-spec-anchor="bus-strip"
                                        data-away={away}
                                        /* The strip's own `at()` arithmetic, for the
                                           stylesheet to place the bus by `--bus-p`. */
                                        style={
                                          {
                                            "--strip-first": STRIP_FIRST,
                                            "--strip-span": STRIP_SPAN,
                                            "--strip-user-x": `${(stripX(0) * 100).toFixed(2)}%`,
                                          } as CSSProperties
                                        }
                                      >
                                        <div className="gx-bus-track">
                                          <span className="gx-bus-progress" />
                                          {STRIP_STOPS.map((stop) => {
                                            const role =
                                              stop.p === 0
                                                ? "user"
                                                : stop.p < 0
                                                  ? "beyond"
                                                  : stop.p > (away ?? 0)
                                                    ? "behind"
                                                    : "ahead";
                                            return (
                                              <span
                                                className={`gx-bus-stop is-${role}`}
                                                key={stop.code}
                                                style={{ left: `${(stripX(stop.p) * 100).toFixed(2)}%` }}
                                              />
                                            );
                                          })}
                                          <span
                                            className="gx-bus-vehicle is-fixed"
                                            data-hop="from"
                                          >
                                            <BusGlyph />
                                          </span>
                                        </div>
                                        <div className="gx-bus-captions">
                                          <span className="gx-bus-caption is-first">
                                            {STRIP_STOPS[0].name}
                                          </span>
                                          <span
                                            className="gx-bus-caption is-user"
                                            style={{ left: `${(stripX(0) * 100).toFixed(2)}%` }}
                                          >
                                            Your stop
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                    {/* "1 min walk · leave by 9:28 PM": the one line that
                                        turns a departure into an instruction, shown
                                        whenever the walk is known. */}
                                    {meters !== undefined && (
                                      <p
                                        className="gx-service-leave"
                                        data-spec-anchor={anchored ? "leave-line" : undefined}
                                      >
                                        {leaveLine(timeMs, meters)}
                                      </p>
                                    )}
                                    {rest.length > 0 && (
                                      <p className="gx-service-later">
                                        <span className="gx-service-later-label">Also at</span>
                                        {rest.map((time) => (
                                          <span className="gx-arrival-time" key={time}>
                                            {departureLabels(ANCHOR + time * 1000, undefined, now).clock}
                                          </span>
                                        ))}
                                        {mixed && (
                                          <>
                                            <span className="gx-note-sep">·</span>
                                            <span className="gx-note-scheduled">scheduled</span>
                                          </>
                                        )}
                                      </p>
                                    )}
                                    {/* `renderDetailActions` with alerts on for this pair —
                                        which they are, because one fired: the filled bell,
                                        "Stop alerts", the lead the alert fires at, and
                                        Remove on its own line. */}
                                    <div className="gx-detail-actions">
                                      <span className="gx-text-button">
                                        <svg viewBox="0 0 24 24" aria-hidden="true">
                                          <path d={ICONS.bellFilled} fill="currentColor" />
                                        </svg>
                                        <span>Stop alerts</span>
                                      </span>
                                      <span className="gx-lead-select" aria-hidden="true">
                                        <span>{ALERT_LEAD_MINUTES} min before</span>
                                        <Icon d={ICONS.chevronDown} />
                                      </span>
                                      <span className="gx-text-button is-danger">
                                        <Icon d={ICONS.close} />
                                        <span>Remove</span>
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </section>
                          );
                        })}
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* The picker, open: the bar's button has become the panel's header, the
                  list has scrolled up out of the way, and the search pane is what the
                  popup is showing. Every string here is the extension's. */}
              <div className="gx-picker">
                <div className="gx-picker-toggle">
                  <span className="gx-picker-toggle-label">Close</span>
                  <Icon d={ICONS.close} className="gx-picker-toggle-icon" />
                </div>
                <div className="gx-picker-body">
                  <div className="gx-tabs-strip">
                    <span className="gx-tab-button is-selected">Search</span>
                    <span className="gx-tab-button">Browse routes</span>
                  </div>
                  <div className="gx-pane">
                    <div className="gx-pane-row">
                      <span
                        className="gx-search-input"
                        data-target="search"
                        data-filled={index >= at("search")}
                      >
                        {index >= at("search") ? (
                          <span className="gx-search-value gx-typed">
                            {Array.from(QUERY).map((character, order) => (
                              <span
                                key={`${character}-${order}`}
                                style={{ "--i": order } as CSSProperties}
                              >
                                {character === " " ? " " : character}
                              </span>
                            ))}
                          </span>
                        ) : (
                          <span className="gx-search-placeholder">
                            Stop, route, or two streets
                          </span>
                        )}
                        <i className="gx-search-caret" />
                        {index >= at("search") && (
                          <Icon d={ICONS.close} className="gx-search-clear" />
                        )}
                      </span>
                      <span className="gx-ghost-button">Near me</span>
                    </div>
                    <p className="gx-hint">{SEARCH_HINT}</p>

                    {index >= at("results") && (
                      <>
                        <p className="gx-result-summary">{STATION.summary}</p>
                        <ul className="gx-result-list">
                          <li className="gx-result-name-group">
                            <div className="gx-result-name-heading">
                              <p className="gx-result-name">{STATION.name}</p>
                              <span className="gx-result-name-count">{STATION.count}</span>
                            </div>
                            <div className="gx-result-location-list">
                              {STATION.platforms.map((stop, order) => (
                                <div className="gx-result-stop-location" key={stop.code}>
                                  <div className="gx-result-location-heading">
                                    <span className="gx-result-location-name">
                                      <span
                                        className="gx-result-platform"
                                        data-spec-anchor={order === 0 ? "platform" : undefined}
                                      >
                                        {stop.platform}
                                      </span>
                                      <span className="gx-result-stop-code">Stop {stop.code}</span>
                                    </span>
                                  </div>
                                  <div className="gx-result-route-list">
                                    {stop.routes.map((entry) => (
                                      <div className="gx-result-route-group" key={entry.route}>
                                        <RouteBadge route={entry.route} className="gx-result-route-badge" />
                                        <div className="gx-result-route-options">
                                          <div className="gx-result-route-entry">
                                            <span className="gx-result-direction-block">
                                              <span className="gx-result-direction is-static">
                                                {entry.toward}
                                              </span>
                                            </span>
                                            <span className="gx-result-add">Add</span>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </li>
                        </ul>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Closed, the picker is a bottom app bar with the Add button at its
                trailing end: an M3 extended FAB resting flat on the page colour, with
                a hairline above it so the list visibly ends. */}
            <div className="gx-picker-bar">
              <span className="gx-fab" data-target="add">
                <span className="gx-fab-icon" aria-hidden="true" />
                <span className="gx-fab-label">Add a stop</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* The strip's bus, leaving the popup for the street.
          A copy of the glyph, measured off the real one, that flies from the strip to
          where the road's bus is about to be and grows to its size on the way. It is
          the one frame-breaking moment in the row act, and it is the scene's argument
          done as a gesture: the small blue bus in the row and the big green bus on the
          street are one vehicle. See the measuring effect above and `.gx-hop`. */}
      <span className="gx-hop" aria-hidden="true">
        <span className="gx-hop-body">
          <BusGlyph />
        </span>
      </span>

      {/* The notification, on the visitor's own screen.
          This used to arrive at the top-right of the demo's own box, which made it a
          drawing of a notification — the one thing a notification cannot be. The
          extension's entire pitch is that it reaches you when you are not looking, so
          it arrives in the top-right corner of the actual window, portalled out of
          this section, at the size the operating system would draw it.

          Gated on `focused` as well as on the beat. The storyboard freezes rather
          than advancing when it goes off screen, so without that a visitor who
          scrolled away mid-alert would carry a bus notification with them for the rest
          of the page. */}
      <ViewportLayer className="vlayer--alert">
        {alerting && focused && (
          <div className="gx-os-alert">
            <span className="gx-alert-icon">
              <svg viewBox="0 0 24 24">
                <rect x="4" y="4" width="16" height="13" rx="3" fill="currentColor" />
                <rect x="6.5" y="6.5" width="11" height="5" rx="1.6" fill="#fff" opacity="0.9" />
                <circle cx="8" cy="19" r="1.7" fill="currentColor" />
                <circle cx="16" cy="19" r="1.7" fill="currentColor" />
              </svg>
            </span>
            <div className="gx-alert-copy">
              <p className="gx-alert-source">
                <span>GRT Next Bus</span>
                <small>now</small>
              </p>
              {/* The exact payload `background.ts` hands to `chrome.notifications.create`:
                  `${route} in ${minutes} min` over `${stop} → ${headsign}`, with the
                  source of the number as the context line. No walk on it yet — the walk
                  rides along only once the worker has a position, and the fix lands two
                  beats later. */}
              <p className="gx-alert-title">
                {HEAD_ROW.route} in {ALERT_LEAD_MINUTES} min
              </p>
              <p className="gx-alert-body">
                {HEAD_STOP.name} → {HEAD_ROW.destination}
              </p>
              <p className="gx-alert-context">Live prediction</p>
            </div>
            <span className="gx-alert-close">
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
            {/* The claim, on the card, wherever the window has put it. See `ALERT_SPEC`. */}
            <span className="gx-alert-spec">
              <SpecPlate text={ALERT_SPEC} side="left" />
            </span>
          </div>
        )}
      </ViewportLayer>

      {/* The route, running out past both edges of the section. The stops on it are
          the stops the strip draws, in the order the bus calls at them, with the
          rider's own as the pole; the bus on it is placed by the same number as the
          bus in the row. */}
      <div
        className="gx-street"
        aria-hidden="true"
        /* The road's geometry, for the stylesheet to place the bus by `--bus-p` on the
           same scale the ticks are placed on. */
        style={{ "--your-stop": YOUR_STOP, "--stop-gap": STOP_GAP } as CSSProperties}
      >
        <span className="gx-road">
          <span className="gx-dashes" />
        </span>
        {ROUTE_STOPS.map((stop) => (
          <span
            className="gx-stop-tick"
            key={stop.code}
            data-user={stop.p === 0}
            data-hit={stop.p === 0 && arrived}
            /* Against where the bus *is* at the start of the beat, not where it is
               heading, and only once there is a bus on the road to have passed anything. */
            data-passed={busKnown && stop.p > busFrom}
            style={{ left: `${YOUR_STOP - stop.p * STOP_GAP}%` }}
          >
            {stop.p === 0 && (
              <>
                <span className="gx-pole-mast" />
                <span className="gx-pole-flag" />
              </>
            )}
            <span className="gx-tick-label">
              <b>{stop.name}</b>
              <span>Stop {stop.code}</span>
            </span>
          </span>
        ))}
        <span className="gx-bus-slot" data-stopped={arrived}>
          {/* A wash of warm light thrown ahead of it. Faint on purpose: this is an
              evening on a mint page, not a night scene, and the job is to give the
              bus a direction of travel rather than to light anything. */}
          <span className="gx-beam" aria-hidden="true" />
          <Bus route={HEAD_ROW.route} />
        </span>
      </div>

      {!still && (
        <PhantomCursor
          stage={stageRef}
          target={CURSOR[beat] ?? null}
          pressing={OPENS.has(beat)}
          onPress={onPress}
          token={`${run}-${beat}`}
        />
      )}

      {/* No caption. Every figure one would report is printed on screen already — the
          badge counts down, the notification says how many minutes out, the row
          carries the countdown, the clock, the delay, the strip and the leave-by line.
          What was missing was any statement of why those are worth having, and that
          is pinned to each of them. See `SPECS`. */}
      <SpecTags
        beats={BEATS}
        beat={beat}
        tags={SPECS}
        origin={SPEC_ORIGIN}
        className="gx-specs"
      />
    </div>
  );
}
