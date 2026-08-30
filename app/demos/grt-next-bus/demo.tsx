"use client";

/**
 * GRT Next Bus, as a bus actually arriving.
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
 *     `departureLabels`;
 *   the clock times under them, and the ones inside an opened row;
 *   the toolbar badge text and colour, via its own `formatBadge` and thresholds;
 *   the "5 stops away" note;
 *   and the position of the bus on the route line under the window.
 *
 * Deriving them together is what keeps them honest. When the note says five stops
 * away there are five stops drawn between the bus and the pole, because both come
 * from the same subtraction rather than from two lists someone has to remember to
 * keep in step.
 *
 * WHAT THIS SCENE IS A RECONSTRUCTION OF, AND HOW CURRENT IT IS
 *
 * The popup is a list of rows that open in place — `353b821 Redraw the popup as a
 * list of rows that open in place` in `grt-bus-time`. One card per physical stop, a
 * row per saved route and destination inside it, and the row's own disclosure holding
 * the later departures and the entry's controls. Collapsed, a row answers the only
 * urgent question: which bus, where to, how long, and whether that number came from a
 * live vehicle.
 *
 * This scene used to reconstruct the design *before* that one: a stack of cards, a
 * distance and a `Closest` tag on each, a `then 5:26 5:39` line always visible, and
 * `departureLabels` swapping its two lines at the one-hour mark. It was one version
 * behind and the comment on top of `labels.ts` said so at length. The files it named
 * are re-vendored — see the banners in `format.ts`, `time.ts` and `labels.ts`, all of
 * which are diffable against the extension now — and the frames below are the row
 * list rather than the card stack.
 *
 * Things that went with the redraw, and are therefore not drawn here any more: the
 * per-card distance and the `Closest` chip (the closest stop is signalled by being
 * hoisted to the top with its card outlined and its reorder grip locked, and nothing
 * else), the invented per-family route badge tint, and `shortTimeLabel`.
 *
 * The timetable is invented and the interface is not. The real popup's first act is
 * to download the region's GTFS feed — about twelve megabytes of zipped CSV — and
 * parse 310,000 stop times, which is a fine thing to do once for someone who
 * installed it and an unreasonable thing to do to someone who scrolled past a
 * portfolio. So `format.ts`, `time.ts` and `labels.ts` are copies, which is why the
 * countdown says `Due` rather than `now`, why a live bus past its predicted instant
 * reads `2 min late` rather than `Due`, why the 301's badge is ION blue and the 7's
 * and 201's are neutral chips, and why the notification reads `7 in 5 min` over
 * `stop → headsign` with `Live prediction` under it: that is the exact payload
 * `background.ts` hands to `chrome.notifications.create`.
 *
 * The clock anchor is a fixed timestamp rather than `Date.now()`. A demo whose
 * wall-clock times differ between the server render and the client render is a
 * hydration mismatch, and the times themselves carry no information here — the
 * distances between them do.
 */

import { useRef } from "react";
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
  formatDelay,
  formatFreshness,
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
  | "later"
  | "near"
  | "late"
  | "gone";

/**
 * Ten beats over 18.5 seconds.
 *
 * Three of them are sized by something other than taste. `street` asks the visitor to
 * find a 26px badge on a toolbar and notice that the number in it is going down —
 * that is the project's lead feature, and it needs longer than the notification that
 * follows it. `open` and `expand` are the two clicks, and both are gated on the
 * pointer actually pressing rather than on the beat starting (see `usePressGate`), so
 * each has to be long enough to hold a flight, a press and the transition it causes:
 * the popup grows over 260ms and a row's disclosure opens over 300ms.
 *
 * The route line is the other constraint. The bus is a continuous function of scene
 * time rather than a `left` per beat — see `busAt` — so no beat is too short for it
 * any more, but `late` and `gone` are the two beats where the bus is the subject and
 * both are long enough to watch it move.
 */
const BEATS: readonly Beat<BeatName>[] = [
  // Long enough to notice that the badge is counting down on its own.
  { name: "street", ms: 2500 },
  { name: "alert", ms: 2600 },
  { name: "reach", ms: 900 },
  // The click, and the popup growing out of its own button. Reading the popup is the
  // next beat's job, not this one's.
  { name: "open", ms: 700 },
  // Two cards, three rows, each with a countdown, a clock, and a line saying where
  // the number came from. The most text in the scene by a distance.
  { name: "stops", ms: 2800 },
  // The pointer crosses from the toolbar to the first row and presses it. A long
  // flight — most of the window's diagonal — so this is not a short beat.
  { name: "expand", ms: 1700 },
  // The row open: the departures after the next one, and the controls that used to
  // be two clicks deep in a popover.
  { name: "later", ms: 2100 },
  { name: "near", ms: 1900 },
  // The predicted instant passes. `Due` becomes `2 min late`, which is the branch
  // this scene was a version behind on.
  { name: "late", ms: 2200 },
  { name: "gone", ms: 2000 },
];

/**
 * Simulated seconds elapsed at each beat. Time moves in uneven jumps because the
 * interesting parts of a six-minute wait are not evenly spaced: the descent from
 * five minutes to overdue is the story, the middle of it is not.
 *
 * The positions are chosen so every beat's numbers are worth the frame. `alert` is
 * at 330s because that is exactly five minutes out, which is when the extension
 * actually fires (`ALERT_LEAD_MINUTES`). `stops` lands on 3 min — green, so the first
 * reading of the list is not already an emergency. `later` lands on 2 min, which is
 * where the countdown turns red and the destination beside it goes medium. `late` is
 * the predicted instant itself.
 */
const CLOCK: Record<BeatName, number> = {
  street: 0,
  alert: 30,
  reach: 95,
  open: 100,
  stops: 130,
  expand: 170,
  later: 200,
  near: 260,
  late: 360,
  gone: 400,
};

const CURSOR: Partial<Record<BeatName, string>> = {
  reach: "toolbar",
  open: "toolbar",
  expand: "row",
};

/**
 * The two beats that carry a click, and wait for it. See `usePressGate`.
 *
 * Both qualify under that file's rule — "beats whose visible change the click
 * causes" — and neither is aimed at a control the same beat introduces: the toolbar
 * button has been on screen since the first frame, and the row has been on screen
 * since `stops`.
 */
const OPENS: ReadonlySet<BeatName> = new Set<BeatName>(["open", "expand"]);

/**
 * A fixed afternoon: 17:12 in the agency's timezone, which puts the next bus six
 * minutes out and the thing you are trying to get to eighteen minutes after that.
 *
 * Written as an instant rather than as text because every clock time on screen comes
 * out of `formatClock`, which asks the platform for the reader's convention — so this
 * frame says 17:18 or 5:18 PM depending on who is looking at it, and the calendar
 * column beside the popup says whichever the popup does.
 */
const ANCHOR = Date.UTC(2026, 6, 28, 21, 12, 0);

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
  /** Departure times as seconds from ANCHOR, ascending. */
  times: readonly number[];
}

/** One physical stop — one `.stop-card`, holding a row per saved service. */
interface StopCard {
  id: string;
  /** Drawn on the pole out on the road, not in the popup. See `stopEmptyMessage`. */
  code: string;
  name: string;
  /**
   * The closest saved stop. The popup hoists it to the top of the list and outlines
   * its card, and locks its reorder grip because the order is not the rider's to set
   * while that is on. There is no distance and no `Closest` chip any more; the
   * outline and the position are the whole of the signal.
   */
  nearest?: boolean;
  rows: readonly ServiceRow[];
}

/**
 * Two saved stops and three services, chosen to exercise every state a row has.
 *
 * The first stop carries two rows, because the redraw made the physical stop the
 * top-level object and one card holding several services is the case that shape
 * exists for. Route 7 is a live prediction running late with a vehicle position
 * behind it; 201 is scheduled only; 301 is live and running early.
 *
 * The route numbers are also the badge test. `routeBadgeColor` returns ION blue for
 * the 300-series and nothing at all for everything else, which selects the neutral
 * chip — so 7 and 201 are white chips with a hairline and 301 is blue. The previous
 * copy of that function painted 201 an invented brown; it was deleted upstream for
 * being "a badge colour that matches nothing on the bus, the sign or the timetable".
 */
const STOPS: readonly StopCard[] = [
  {
    id: "hazel",
    code: "1123",
    name: "University Ave / Hazel St",
    nearest: true,
    rows: [
      {
        id: "r7",
        route: "7",
        destination: "Conestoga Station",
        live: true,
        /* 2 min late. Not invented: measured against the live feed, 670 rows read
           exactly that on the day this was staged. */
        delaySec: 132,
        times: [360, 1560, 2340],
      },
      {
        id: "r201",
        route: "201",
        destination: "Ainslie St Terminal",
        live: false,
        delaySec: 0,
        times: [900, 2700, 4500],
      },
    ],
  },
  {
    id: "allen",
    code: "2045",
    name: "King St / Allen St",
    rows: [
      {
        id: "r301",
        route: "301",
        destination: "Conestoga Station",
        live: true,
        delaySec: -60,
        times: [420, 1180, 1560],
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
 * setting, which defaults to 3. It is the reason an opened row has anything in it:
 * the value fed `nextBus(..., n)` for a year while the only call site rendered with
 * `minimal: true` and dropped the later departures on the floor, so the setting was
 * a no-op at all four of its values. `renderLaterDepartures` is what made it real.
 */
const DEPARTURES_PER_ROUTE = 3;

/**
 * The lead time an alert fires at: `DEFAULT_ALERT_LEAD_MINUTES` in `src/types.ts`, which
 * `getAlertSettings` in `src/storage.ts` falls back to when a rider has not chosen one.
 *
 * It sets the notification's own headline — "7 in 5 min" — and the label hanging off
 * it as well. See `ALERT_SPEC`.
 */
const ALERT_LEAD_MINUTES = 5;

/**
 * The four things the extension does, on the four things doing them.
 *
 * This scene has always been full of numbers and short of a reason to care about any of
 * them. A badge counting down, a notification and three rows of departures are all
 * *evidence*, and the claims they were evidence for used to be in a column beside the
 * scene: the countdown is there with nothing open, the positions are real so a late bus
 * reads as late, it reaches you before you thought to look, and a row holds the buses
 * after the next one. Nobody read them, because a road with a bus on it was moving four
 * inches to the right.
 *
 * So each claim is pinned to its evidence and arrives on the beat the evidence does.
 *
 * Three of the four are here. The fourth is the alert's, and it is not a coordinate on
 * this pod at all — see `ALERT_SPEC` below.
 *
 * WHAT IS DELIBERATELY NOT HERE
 *
 * "Your location never leaves the device" was a fifth label, and it is gone because its
 * evidence is. It was pinned to `Stop 1123 · Closest · 320 m`, a row of type the redraw
 * deleted: the closest stop is now signalled by an outline and by being first, and there
 * is no distance on the card at all. The claim is still true — `src/geo.ts` reads a
 * position only after an explicit opt-in, caches it locally, and hands it to
 * `chooseNearestSavedStop`; there is no reverse geocode and nothing that takes a
 * coordinate off the device — but a claim pinned to a 1px outline is a claim pinned to
 * nothing, which is the failure this component exists to prevent. It belongs in the
 * repository's privacy policy, which `tests/documented-truth.test.mjs` over there holds
 * to the code, and not on a frame that cannot show it.
 *
 * The other absence is older and unchanged: the countdown surviving Chrome tearing the
 * service worker down. `tests/background-lifecycle.test.mjs` restarts the worker between
 * assertions and asks the new generation what the badge says — a real check of the way
 * MV3 actually breaks things, since anything kept in a module variable is gone when the
 * next alarm boots a fresh generation. A teardown has no interface: Chrome tells a rider
 * nothing, and the frame where the badge counts down with the popup shut is evidence of
 * the popup being shut, not of the worker being dead.
 */
const SPECS: readonly SpecTag<BeatName>[] = [
  /* On the toolbar button, reading leftward because there is nothing to the right of it.
     It leaves when the popup opens: the popup hangs off this very button and covers most
     of the window beneath it, so a label parked up here would be a label on top of the
     thing the next six beats are about. The badge keeps counting behind it either way,
     which is the point it was making.

     Measured off the badge itself rather than pinned at 91.5% of the pod, which was the
     toolbar button's left edge at one window width and its middle at another. The badge
     is the countdown; the button is only what it is drawn on. */
  {
    at: "street",
    text: "Countdown on your toolbar",
    until: "open",
    x: 91.5,
    y: 4.5,
    anchor: "countdown",
    grip: "left",
    side: "left",
  },
  /* The claim the popup is evidence for, on the line that is the evidence: the note
     under the first row, which reads `Live · 2 min late · 5 stops away`.

     It hangs off the popup's left edge and reads away from it rather than sitting on the
     text: the panel is 420px of dense type and there is no gap inside it big enough for a
     plate, so pointing at the edge of the row costs a little precision and covers nothing.

     Both axes come off the note element. The standoff back out to the popup's edge is
     `nudge.x`, and it is not a taste value — it is the row's own copy column, which is a
     sum of fixed pixels in a fixed-width panel: 8px of `.app` inset, 4px of card padding,
     8px `--row-pad`, 8px `--toggle-pad`, the 40px route badge and the 16px `--badge-gap`.
     84. The detail panel below is indented to the same column by `--copy-inset`, which is
     why the label under this one carries the identical number.

     It leaves on `gone`, and that is not decoration. On that beat the predicted bus has
     departed, the row falls back to the timetable and the line this plate is pinned to
     stops saying `Live · 2 min late · at your stop` and starts saying `Scheduled`. A
     label about real vehicle positions resting on the word "Scheduled" is a label
     arguing against itself. */
  {
    at: "stops",
    text: "Real positions, so late reads late",
    until: "gone",
    x: 50,
    y: 27,
    anchor: "nearest-note",
    grip: "left",
    side: "left",
    nudge: { x: -84 },
  },
  /* And what opening a row is for. It arrives with the disclosure, on the line the
     disclosure reveals — `Also at 5:26, 5:39 · scheduled`, which is three facts at once:
     the buses after this one, that the setting choosing how many is real, and that those
     two times are timetable rather than prediction while the row above them is live. */
  {
    at: "later",
    text: "And the buses after that one",
    x: 50,
    y: 38,
    anchor: "later-times",
    grip: "left",
    side: "left",
    nudge: { x: -84 },
  },
];

/**
 * The alert's claim, which travels with the alert.
 *
 * This was a `SpecTag` at 96.5%/10% of the pod, pinned to the browser's own notification
 * bell in the simulated chrome — and it was reported as pointing at the wrong thing,
 * correctly. The notification this label is about is not in the chrome. It is portalled to
 * `document.body` and drawn in the corner of the visitor's actual window, on purpose,
 * because an extension whose whole pitch is that it reaches you when you are not looking
 * cannot make that point inside a 900px panel. So the label was several hundred pixels
 * away from its evidence, pointing at a drawing of where a notification would be if this
 * were a picture of one.
 *
 * A coordinate cannot fix that: there is no percentage of the pod that lands on something
 * in a different stacking context on the other side of the page. So the plate hangs off
 * the notification instead — see `SpecPlate`, and `.gx-alert-spec` for the two lines of
 * geometry that put it against the card's left edge at any window width.
 *
 * It read "Alerts you before the bus arrives", which is a promise with no size to it — every
 * transit app alerts you before the bus arrives, and a rider's question is how long before.
 * The card it is pinned to answers that in its own headline: "7 in 5 min". So the label says
 * the number too, and the number is checkable rather than chosen — `ALERT_LEAD_MINUTES`
 * above is `DEFAULT_ALERT_LEAD_MINUTES` from `src/types.ts`, and the same constant is what
 * decides when `background.ts` actually fires.
 */
const ALERT_SPEC = "Alerts you 5 minutes before";

/** The extension's toolbar button, in the pod's own percentages. */
const SPEC_ORIGIN = { x: 91.5, y: 4.5 };

/**
 * The afternoon behind the popup. It is set dressing with one job: the thing half an
 * hour from now is what the next bus is being measured against, and without it the
 * countdown is a number with no stake in it.
 *
 * Minutes from the anchor rather than written-out times, because the labels go
 * through `formatClock` — the extension's own formatter, which asks the platform for
 * the reader's clock convention. The calendar column used to hold literal "5:30"
 * strings beside a popup printing "17:18", which is two clocks in one frame; a reader
 * who has to convert between them has been given the disagreement to resolve.
 */
const AGENDA: readonly { minutes: number; event?: string }[] = [
  { minutes: -102 },
  { minutes: -72 },
  { minutes: -42 },
  { minutes: -12 },
  { minutes: 18, event: "Studio critique · Room 2014" },
  { minutes: 48 },
];

/**
 * Where the pole stands on the route line, as a percentage of its width. Left of
 * centre so the bus pulls up clear of the popup, which hangs below its window.
 */
const YOUR_STOP = 42;

/**
 * The stops behind yours, spaced so that the number of them between the bus and the
 * pole is the number the row is claiming.
 *
 * The bus covers `YOUR_STOP + 8` percent of the line in the six minutes the
 * countdown runs, and the note calls that eight stops at the forty-five seconds a
 * stop takes. Nine and a bit gaps rather than eight puts the boundaries slightly in
 * front of the rounding, so the count is right at every beat instead of being one
 * out on half of them. Computed rather than listed because a hand-typed list stops
 * agreeing with the arithmetic the first time the pole moves.
 */
const STOP_GAP = (YOUR_STOP + 8) / 9.2;

/**
 * Marked in both directions from the pole and across the whole line, not just
 * behind it. The route does not end where you get off, and drawing it that way left
 * the right half of the road bare — a road with stops on one side of a pole and none
 * on the other reads as a diagram of this scene rather than as a street.
 */
const LINE_STOPS = Array.from({ length: 40 }, (_, index) => YOUR_STOP + (index - 12) * STOP_GAP)
  .filter((left) => left > 1 && left < 99)
  .map((left) => Math.round(left * 100) / 100);

/**
 * The soonest departure and the ones behind it.
 *
 * `nextBus` in `popup.ts`, in the shape a simulated timetable can take: the head is
 * the first departure that has not gone, and `rest` is `slice(1, times)` of what
 * follows — the same arithmetic, against the same default of three.
 *
 * `index` comes back too, because only `index === 0` is a live prediction here. Once
 * the predicted bus has gone the row falls back to the timetable, which is what turns
 * `Live` into `Scheduled` on the last beat.
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
 * How many stops back the bus is, at roughly the 45 seconds a stop takes on an
 * urban route. Suppressed beyond ten minutes out, which is the honest answer: a
 * trip that has not started yet has no vehicle position to count from.
 *
 * The extension gets this from the vehicle positions feed (`Departure.stopsAway`).
 * There is no feed here, so it is derived from the countdown — and the ticks on the
 * road are derived from the same number, which is why the drawing and the sentence
 * cannot disagree.
 */
function stopsAway(secondsLeft: number): number | undefined {
  if (secondsLeft > 600) return undefined;
  return Math.max(0, Math.round(secondsLeft / 45));
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
 * `departureNoteNodes` in `popup.ts`, which builds `Live · 2 min late · 5 stops away`.
 *
 * Not vendored into `labels.ts`, because that function returns `HTMLElement`s and a
 * DOM builder cannot be copied into a React scene. Re-expressing it there under a new
 * name would have been worse — a helper this repository invents is a helper nobody can
 * diff against anything — so the rule lives here, beside the JSX that renders it, and
 * the one piece of it worth stating is the piece that is easy to get wrong:
 *
 *   the delay is dropped when the countdown is already saying it. Past the predicted
 *   instant `departureLabels` puts `2 min late` in the countdown column, and printing
 *   it again three inches to the left reads as two separate facts about the same bus.
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
 * the row are on screen together for six of these ten beats, and two different
 * opinions about whether a bus is urgent is the disagreement this scene is supposed
 * not to have. This said seven for the middle band for as long as `labels.ts` did.
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
 * columns, so the neutral chip is the common case and ION is the exception, and
 * `readableTextColor` rather than a hardcoded white is what stops a light
 * `route_color` producing an unreadable route number.
 *
 * `borderColor` is painted over rather than dropped, so a coloured chip and a neutral
 * one measure the same.
 */
function RouteBadge({ route }: { route: string }) {
  const color = routeBadgeColor({ shortName: route });
  return (
    <span
      className="gx-route-badge"
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

/** The bus on the route line. Boxier than the backdrop's, and it carries a sign. */
function Bus({ route }: { route: string }) {
  return (
    <span className="gx-bus" aria-hidden="true">
      <svg viewBox="0 0 132 62" className="gx-bus-body">
        {/* Body, then windows, then wheels sitting on the road line. */}
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
       Not the empty street it starts from, and not the arrival: `later` is the frame
       where the popup is doing every one of its jobs at once. The list is open, the
       first row is open inside it, the countdown is two minutes and red with its
       destination gone medium beside it, the neutral chips and the ION chip are side
       by side, the note says where the number came from, and the disclosure says what
       comes after — with the bus four stops out on the road below, which is the number
       the note is claiming. Both remaining labels are up and pinned. */
    stillBeat: "later",
  });
  const { beat, index, run, still } = state;
  /* Two clicks in this scene, and each has something large depending on it: a 420px
     panel covering most of the window, and a row unfolding inside it. The pointer is
     already on the toolbar button when `open` begins — that is what `reach` is for —
     and it crosses to the row during `expand`. Without the gate the popup opened five
     frames before the ring said anything had been pressed. See `usePressGate`. */
  const { reached, onPress } = usePressGate(BEATS, state, OPENS);

  const at = (name: BeatName) => BEATS.findIndex((entry) => entry.name === name);
  const clock = CLOCK[beat];
  const now = ANCHOR + clock * 1000;

  const open = reached >= at("open");
  const rowOpen = reached >= at("expand");
  /* One notification per trip — the real one holds a fifteen-minute repeat guard —
     held while the cursor goes for the toolbar and dismissed by the click that
     opens the popup, so the answer replaces the question rather than joining it. */
  const alerting = index >= at("alert") && !open;

  /* The closest stop's soonest service drives the badge, because that is what the
     service worker picks: the badge follows where you are, not the top of the list. */
  const headBoard = board(HEAD_ROW, clock);
  const headTimeMs = ANCHOR + headBoard.head * 1000;
  /* `formatBadge` has no delay to read, so past the predicted instant the badge says
     `Due` while the row says `2 min late`. That is not a disagreement to fix: the two
     are different surfaces answering different questions, and `updateBadge` in
     `background.ts` puts the overdue wording in the icon's tooltip rather than in the
     eighteen pixels of the badge. */
  const badgeMinutes = minutesUntil(headTimeMs, now);
  const badgeText = formatBadge(headTimeMs, now);

  /**
   * Where the bus stands at the start of a given beat, as a percentage of the road.
   *
   * Both ends of the current move are published rather than one position, and that is the
   * fix for a reported lag. The bus used to get a single `left` per beat and a 1.5s CSS
   * transition to reach it — so on a 2,600ms beat it drove for a second and a half and then
   * stood still for eleven hundred milliseconds. Nine lurches, each followed by a pause.
   * Nothing was slow; it kept stopping.
   *
   * No transition can fix that, because the thing being animated only has a value at ten
   * instants. So the stylesheet interpolates between these two with `--beat-t`, which the
   * storyboard already writes onto the stage every frame without re-rendering anything. The
   * bus becomes a continuous function of scene time, which is what it always should have
   * been, for the cost of one custom property.
   *
   * `gone` is the one beat the countdown cannot place. Past the arrival the row has rolled
   * on to the next run, so `board()` returns a departure twenty minutes out and the
   * arithmetic puts the bus back at the start of the road. It is parked at the stop for that
   * beat's start and drives off during it.
   */
  const busAt = (name: BeatName): number => {
    if (name === "gone") return YOUR_STOP;
    const when = CLOCK[name];
    const left = board(HEAD_ROW, when).head - when;
    const ridden = Math.min(1, Math.max(0, 1 - left / 360));
    return -8 + ridden * (YOUR_STOP + 8);
  };

  const busFrom = busAt(beat);
  /* Off the right-hand edge, so the last beat is a bus leaving rather than a bus parked
     somewhere arbitrary. It used to stop dead at 94% and wait there. */
  const busTo = beat === "gone" ? 104 : busAt(BEATS[(index + 1) % BEATS.length].name);

  const arrived = beat === "late";
  /* The worker refreshes predictions on a thirty-second alarm, so how stale the
     feed is depends on where in that cycle the beat lands rather than being a
     fixed string dressed up as a live one. `realtimeDetail` in `popup.ts` prints
     both halves — when this browser last fetched, and how old GRT's own feed
     header was when it did. */
  const fetchedAt = ANCHOR + (clock - (clock % 30)) * 1000;
  const feedAt = fetchedAt - 12_000;

  return (
    <div
      className="gx"
      ref={stageRef}
      data-beat={beat}
      data-lap={run}
      data-open={open}
      data-arrived={arrived}
      role="img"
      aria-label={
        "A browser with the GRT Next Bus extension pinned to its toolbar. The " +
        "toolbar badge counts down from six minutes on its own. Five minutes out, " +
        "a notification reads Route 7 in 5 min, University Ave / Hazel St to " +
        "Conestoga Station, live prediction. The popup is then opened and lists two " +
        "saved stops: University Ave / Hazel St, outlined as the closest, with a row " +
        "for route 7 to Conestoga Station and one for route 201 to Ainslie St " +
        "Terminal, and King St / Allen St with a row for the 301. Each row carries a " +
        "countdown, the clock time under it, and a line saying whether the number is " +
        "live or scheduled. The first row is opened in place to show the two " +
        "departures after it and its alert and remove controls. The countdown falls " +
        "to two minutes and turns red as the bus reaches the stop drawn on the route " +
        "line below, then reads two minutes late once its predicted time has passed, " +
        "after which the row rolls on to the next scheduled run."
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
                fires and keeps a dot until the popup is opened — so the banner has
                somewhere to have come from, and the moment before you notice it is
                on screen too. */}
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
            at 5:30 is what the countdown is measured against. */}
        <div className="gx-page" aria-hidden="true">
          <p className="gx-page-head">
            <b>{formatWeekday(ANCHOR)}</b> afternoon
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

            {/* `renderFeedLine`: what the times are, and how fresh the feed behind
                them is. "Live departures" is the string the extension prints when a
                board has live predictions and they are current. */}
            <div className="gx-feed-line">
              <span className="gx-feed-state is-live">
                <i className="gx-feed-dot" />
                <span>Live departures</span>
              </span>
              <span className="gx-feed-detail">
                Fetched {formatFreshness(fetchedAt, now)} · GRT data{" "}
                {formatFreshness(feedAt, now)}
              </span>
            </div>

            <div className="gx-stop-list">
              {STOPS.map((stop) => (
                <article
                  className={`gx-stop-card${stop.nearest ? " is-nearest" : ""}`}
                  key={stop.id}
                >
                  {/* An M3 list subheader. The stop is the loudest thing after the
                      countdown, because a rider scans this list for *their stop* —
                      it used to be small grey type above a large black destination,
                      which had the hierarchy exactly backwards. */}
                  <div className="gx-stop-group-head">
                    <div className="gx-stop-identity">
                      <p className="gx-stop-name">{stop.name}</p>
                    </div>
                    {/* The reorder grip, locked on the closest stop because that one
                        is ordered automatically. This is the only place on the card
                        that location shows at all, now that the distance is gone. */}
                    <span className="gx-stop-grip" data-locked={Boolean(stop.nearest)}>
                      <svg viewBox="0 0 24 24">
                        <path
                          d="M8 6h2v2H8zM14 6h2v2h-2zM8 11h2v2H8zM14 11h2v2h-2zM8 16h2v2H8zM14 16h2v2h-2z"
                          fill="currentColor"
                        />
                      </svg>
                    </span>
                  </div>

                  <div className="gx-service-list">
                    {stop.rows.map((row) => {
                      const { index: position, head, rest } = board(row, clock);
                      const timeMs = ANCHOR + head * 1000;
                      const live = row.live && position === 0;
                      const labels = departureLabels(
                        timeMs,
                        live ? row.delaySec : undefined,
                        now,
                      );
                      const away = live ? stopsAway(head - clock) : undefined;
                      const parts = noteParts(live, row.delaySec, labels, away);
                      const isOpen = rowOpen && row.id === OPEN_ROW;
                      /* `renderLaterDepartures` says "scheduled" only when the head is
                         a live prediction and these are not, because that is the one
                         case where two kinds of number sit side by side. */
                      const mixed = live && rest.length > 0;
                      const anchored = row.id === OPEN_ROW;

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
                                {/* `Live · 2 min late · 5 stops away`. Named, because
                                    the transit label is about this line and a
                                    percentage of the layer could not keep hold of
                                    it — see `SPECS`. */}
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
                                {/* Keyed for the same reason as the toolbar badge. */}
                                <span
                                  className={prefixed(labels.className)}
                                  key={labels.countdown}
                                >
                                  {labels.countdown}
                                </span>
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
                                {rest.length > 0 && (
                                  <p
                                    className="gx-service-later"
                                    data-spec-anchor={
                                      anchored ? "later-times" : undefined
                                    }
                                  >
                                    <span className="gx-service-later-label">Also at</span>
                                    {rest.map((time) => (
                                      <span className="gx-arrival-time" key={time}>
                                        {/* Upstream lets `now` default to `Date.now()`
                                            here, which is right inside a popup and
                                            would be a hydration mismatch inside a
                                            server-rendered page — it decides the
                                            weekday prefix. The simulated clock is
                                            passed instead; nothing else differs. */}
                                        {departureLabels(
                                          ANCHOR + time * 1000,
                                          undefined,
                                          now,
                                        ).clock}
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
                                {/* Both labelled text buttons. An earlier draft led
                                    every row with a bare bell and put a bare red cross
                                    in here; three identical unlabelled icons down the
                                    left edge said nothing about what they did, and the
                                    cross alone on its line read as an error rather
                                    than as an action. */}
                                <div className="gx-detail-actions">
                                  <span className="gx-text-button">
                                    <svg viewBox="0 0 24 24">
                                      <path
                                        d="M12 4a5 5 0 0 0-5 5v3.5L5.5 15.5h13L17 12.5V9a5 5 0 0 0-5-5Zm-2 13a2 2 0 0 0 4 0"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.7"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                    <span>Notify me</span>
                                  </span>
                                  <span className="gx-text-button is-danger">
                                    <svg viewBox="0 0 24 24">
                                      <path
                                        d="M6 6l12 12M18 6L6 18"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.7"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
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
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* The notification, on the visitor's own screen.
          This used to arrive at the top-right of the demo's own box, which made it a
          drawing of a notification — the one thing a notification cannot be. The
          extension's entire pitch is that it reaches you when you are not looking, so
          it now arrives in the top-right corner of the actual window, portalled out of
          this section, at the size the operating system would draw it.

          Gated on `onScreen` as well as on the beat. The storyboard freezes rather
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

      {/* The route, running out past both edges of the section. The bus on it is the
          same bus the countdown is counting, and the stops drawn behind it are the
          ones the note is counting. */}
      <div className="gx-street" aria-hidden="true">
        <span className="gx-road">
          <span className="gx-dashes" />
        </span>
        {/* Ticks the bus has already gone by are drawn spent, so the "five stops
            away" note has something to count against. The row says the number and
            the road shows it; neither has to be believed on its own. */}
        {LINE_STOPS.map((left) => (
          <span
            className="gx-stop-tick"
            key={left}
            /* Against where the bus *is* at the start of the beat, not where it is heading.
               Measured against the destination, every tick between here and there went spent
               the moment the beat began — so the ticks the bus was still approaching were
               already drawn as passed. */
            data-passed={left < busFrom}
            style={{ left: `${left}%` }}
          />
        ))}
        <span className="gx-pole" style={{ left: `${YOUR_STOP}%` }} data-hit={arrived}>
          <span className="gx-pole-mast" />
          <span className="gx-pole-flag" />
          <span className="gx-pole-label">
            <b>{HEAD_STOP.name}</b>
            <span>Stop {HEAD_STOP.code}</span>
          </span>
        </span>
        <span
          className="gx-bus-slot"
          style={{ "--bus-from": busFrom, "--bus-to": busTo } as React.CSSProperties}
          data-stopped={arrived}
        >
          {/* A wash of warm light thrown ahead of it. Faint on purpose: this is a
              bright mint afternoon, not a night scene, and the job is to give the
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
          badge counts down, the notification says how many minutes out, and the rows
          carry the countdown, the clock, the delay and the stops-away note. What was
          missing was any statement of why a number on a toolbar is worth having, and
          that is pinned to the number. See `SPECS`. */}
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
