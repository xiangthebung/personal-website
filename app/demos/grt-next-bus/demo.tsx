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
 *   the countdowns and their colours, via the extension's own `departureLabels`;
 *   the toolbar badge text and colour, via its own `formatBadge` and thresholds;
 *   the "5 stops away" note;
 *   and the position of the bus on the route line under the window.
 *
 * Deriving them together is what keeps them honest. When the note says five stops
 * away there are five stops drawn between the bus and the pole, because both come
 * from the same subtraction rather than from two lists someone has to remember to
 * keep in step.
 *
 * The timetable is invented and the interface is not. The real popup's first act is
 * to download the region's GTFS feed — about twelve megabytes of zipped CSV — and
 * parse 310,000 stop times, which is a fine thing to do once for someone who
 * installed it and an unreasonable thing to do to someone who scrolled past a
 * portfolio. So `format.ts` and `labels.ts` are verbatim copies, which is why the
 * countdown says `Due` rather than `now`, why a delay beyond an hour is suppressed
 * instead of printed, and why the notification reads `7 in 5 min` over
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
import { useStoryboard, type Beat } from "../scene/storyboard";
import { ViewportLayer } from "../scene/viewport-layer";
import { useOnScreen } from "../use-on-screen";
import { useSceneRun } from "../scene/use-scene-run";
import { useSectionFocused } from "../use-section-focus";
import {
  formatBadge,
  formatDelay,
  formatDistance,
  formatFreshness,
  formatWeekday,
  minutesUntil,
  routeBadgeColor,
} from "./format";
import { departureLabels, shortTimeLabel } from "./labels";

type BeatName =
  | "street"
  | "alert"
  | "reach"
  | "open"
  | "stops"
  | "tick"
  | "near"
  | "due"
  | "gone";

/**
 * Nine beats over 18.7 seconds.
 *
 * Two of them were doing work they could not finish in the time they had. `street`
 * asks the visitor to find a 26px badge on a toolbar and notice that the number in it
 * is going down — that is the project's entire lead feature, and it had 1.8s to land
 * before a notification arrived and took the eye off it. `open` was 300ms, which is
 * right for the click but meant the popup's arrival and the popup's contents were the
 * same event; the three cards, three countdowns and the stops-away note all showed up
 * at once and the first thing a visitor read was whichever one their eye happened to
 * fall on.
 *
 * The route line is the other constraint. `.gx-bus-slot` transitions `left` over
 * 1.5s, so any beat shorter than that shows a bus part-way through a move it never
 * completes — which is why `due` and `gone`, the two beats where the bus is the
 * subject, are both comfortably past it now.
 */
const BEATS: readonly Beat<BeatName>[] = [
  // Long enough to notice that the badge is counting down on its own.
  { name: "street", ms: 2600 },
  { name: "alert", ms: 2700 },
  { name: "reach", ms: 900 },
  // The click, and the popup growing out of its own button — a 260ms transition in
  // the stylesheet. Still the shortest beat in the scene; reading the popup is the
  // next beat's job, not this one's.
  { name: "open", ms: 600 },
  // Three saved stops, each with a countdown, a delay and a stops-away count. The
  // most text in the scene by a distance.
  { name: "stops", ms: 3100 },
  { name: "tick", ms: 2100 },
  // Two minutes: the countdown turns red and the bus is visibly close.
  { name: "near", ms: 2100 },
  { name: "due", ms: 2400 },
  { name: "gone", ms: 2200 },
];

/**
 * Simulated seconds elapsed at each beat. Time moves in uneven jumps because the
 * interesting parts of a five-minute wait are not evenly spaced: the descent from
 * five to two minutes is the story, the middle of it is not.
 */
const CLOCK: Record<BeatName, number> = {
  street: 0,
  alert: 30,
  reach: 95,
  open: 100,
  stops: 130,
  tick: 200,
  near: 260,
  due: 360,
  gone: 400,
};

const CURSOR: Partial<Record<BeatName, string>> = {
  reach: "toolbar",
  open: "toolbar",
};

/**
 * A fixed afternoon so the server and the client agree: 17:12 in the agency's
 * timezone, which puts the first bus at 5:18 PM and the thing you are trying to get
 * to at 5:30.
 */
const ANCHOR = Date.UTC(2026, 6, 28, 21, 12, 0);

interface StopCard {
  id: string;
  code: string;
  name: string;
  /** Metres away. Only present once location has been granted. */
  meters?: number;
  closest?: boolean;
  route: string;
  headsign: string;
  live: boolean;
  delaySec: number;
  /** Departure times as seconds from ANCHOR, ascending. */
  times: readonly number[];
}

/**
 * Three saved stops, chosen to exercise every state worth seeing: a live
 * prediction running late with a stops-away count, a live one running early, and a
 * purely scheduled stop with no distance because it is not the closest.
 */
const STOPS: readonly StopCard[] = [
  {
    id: "a",
    code: "1123",
    name: "University Ave / Hazel St",
    meters: 318,
    closest: true,
    route: "7",
    headsign: "Conestoga Station",
    live: true,
    delaySec: 132,
    times: [360, 1560, 2340],
  },
  {
    id: "b",
    code: "2045",
    name: "King St / Allen St",
    meters: 1420,
    route: "301",
    headsign: "Conestoga Station",
    live: true,
    delaySec: -60,
    times: [420, 1180, 1560],
  },
  {
    id: "c",
    code: "3301",
    name: "Fairway Station",
    route: "201",
    headsign: "Ainslie St Terminal",
    live: false,
    delaySec: 0,
    times: [1500, 2580],
  },
];

/** The lead time an alert fires at, from the extension's own defaults. */
const ALERT_LEAD_MINUTES = 5;

/**
 * The afternoon behind the popup. It is set dressing with one job: the thing at
 * 5:30 is what a bus at 5:18 is being measured against, and without it the
 * countdown is a number with no stake in it.
 */
const AGENDA: readonly { time: string; event?: string }[] = [
  { time: "3:30" },
  { time: "4:00" },
  { time: "4:30" },
  { time: "5:00" },
  { time: "5:30", event: "Studio critique · Room 2014" },
  { time: "6:00" },
];

/**
 * Where the pole stands on the route line, as a percentage of its width. Left of
 * centre so the bus pulls up clear of the popup, which hangs below its window.
 */
const YOUR_STOP = 42;

/**
 * The stops behind yours, spaced so that the number of them between the bus and the
 * pole is the number the card is claiming.
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
 * The soonest departure and the two after it — the popup's own rule, which is that
 * a card shows exactly one departure with its later runs on a quieter line.
 */
function board(stop: StopCard, clock: number) {
  const position = stop.times.findIndex((time) => time >= clock);
  const index = position === -1 ? stop.times.length - 1 : position;
  return {
    head: stop.times[index],
    rest: stop.times.slice(index + 1, index + 3),
  };
}

/**
 * How many stops back the bus is, at roughly the 45 seconds a stop takes on an
 * urban route. Suppressed beyond ten minutes out, which is the honest answer: a
 * trip that has not started yet has no vehicle position to count from.
 */
function stopsAway(secondsLeft: number): number | undefined {
  if (secondsLeft > 600) return undefined;
  return Math.max(0, Math.round(secondsLeft / 45));
}

function stopsAwayLabel(count: number): string {
  if (count === 0) return "at your stop";
  return count === 1 ? "1 stop away" : `${count} stops away`;
}

/** The extension's badge colours, by the same thresholds as its label text. */
function badgeColor(minutes: number): string {
  if (minutes <= 2) return "#c2352f";
  if (minutes <= 7) return "#c26a15";
  return "#1f7a52";
}

/** `departureLabels` returns the extension's class names; this pod's are prefixed. */
function prefixed(className: string): string {
  return className
    .split(" ")
    .map((name) => `grt-${name}`)
    .join(" ");
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

export function GrtNextBusDemo() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const onScreen = useOnScreen(stageRef);
  /* The notification is only allowed onto the visitor's screen while this is the
     section they are actually in. See `useSectionFocused`. */
  const focused = useSectionFocused(stageRef);
  const running = useSceneRun(focused, onScreen);
  const { beat, index, run, still } = useStoryboard(BEATS, {
    running,
    stage: stageRef,
    // The still that carries the argument: the board open with two minutes on it,
    // not the empty street it starts from.
    stillBeat: "near",
  });

  const at = (name: BeatName) => BEATS.findIndex((entry) => entry.name === name);
  const clock = CLOCK[beat];
  const now = ANCHOR + clock * 1000;

  const open = index >= at("open");
  /* One notification per trip — the real one holds a fifteen-minute repeat guard —
     held while the cursor goes for the toolbar and dismissed by the click that
     opens the popup, so the answer replaces the question rather than joining it. */
  const alerting = index >= at("alert") && index < at("open");

  /* The closest stop drives the badge, because that is what the service worker
     picks: the badge follows where you are, not the top of the list. */
  const closest = STOPS[0];
  const closestBoard = board(closest, clock);
  const closestLeft = closestBoard.head - clock;
  const badgeMinutes = minutesUntil(ANCHOR + closestBoard.head * 1000, now);
  const badgeText = formatBadge(ANCHOR + closestBoard.head * 1000, now);

  /* The bus runs the same six minutes the countdown does. Past the arrival it is
     driving away rather than starting over, so the position is taken from the beat
     instead of from a departure that is now in the future. */
  const ridden = beat === "gone" ? 1 : Math.min(1, Math.max(0, 1 - closestLeft / 360));
  /* Still in shot on the way out. Sending it all the way off the edge left the last
     beat of the loop looking at an empty road, which reads as the scene ending
     rather than as a bus leaving. */
  const busLeft = beat === "gone" ? 94 : -8 + ridden * (YOUR_STOP + 8);

  const arrived = beat === "due";
  /* The worker refreshes predictions on a thirty-second alarm, so how stale the
     feed is depends on where in that cycle the beat lands rather than being a
     fixed string dressed up as a live one. */
  const freshness = formatFreshness(ANCHOR + (clock - (clock % 30)) * 1000, now);

  /**
   * The caption, one line per beat, describing the frame the visitor is looking at.
   *
   * There were four lines before, keyed off `open`, `arrived` and `alerting` rather
   * than off the beat, and the widest of them covered five beats at once. So the line
   * under `reach` claimed the wait "sits on the toolbar, counting down" while the
   * frame showed a cursor travelling, and the line under `tick` and `near` — the two
   * beats where the number is visibly falling — read as a description of the stop list
   * that had already been on screen for three seconds.
   *
   * The numbers in it are derived, not typed. `CLOCK` decides what the badge and the
   * countdown say, and a caption that repeats those figures from memory is a caption
   * that goes wrong the first time a beat's clock position moves.
   */
  /* There is no caption under this scene.
     Every figure it was reporting is printed on screen already: the badge counts down,
     the notification says how many minutes out, and the three stop rows carry the
     countdown, the delay and the stops-away note. A line saying "It knows this run is 2
     min late" under a row that reads "2 min late" is a fifth layer of copy after the
     headline, the reason, the invitation and the notes — all four of which are on the
     same screen. */

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
        "Conestoga Station, live prediction. The popup is then opened and lists " +
        "three saved stops, the closest first at 320 metres, each with a live " +
        "countdown, how late the bus is running and how many stops away it is. " +
        "The countdown falls to two minutes and then to Due as the bus reaches the " +
        "stop drawn on the route line below, after which the board rolls on to the " +
        "next run."
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
            {/* The extension's own button, which is the only thing clicked in this
                scene and the only thing that has to be found. */}
            <span
              className="gx-action"
              data-target="toolbar"
              data-open={open}
              data-live={!open}
            >
              <span className="grt-mark" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <rect x="4" y="4" width="16" height="13" rx="3" fill="currentColor" />
                  <rect x="6.5" y="6.5" width="11" height="5" rx="1.6" fill="#fff" opacity="0.9" />
                  <circle cx="8" cy="19" r="1.7" fill="currentColor" />
                  <circle cx="16" cy="19" r="1.7" fill="currentColor" />
                </svg>
              </span>
              {/* Keyed by its own text: React remounts it when the minute changes,
                  which restarts the CSS tick without the scene tracking it. */}
              <b
                className="gx-badge"
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
              <li key={row.time}>
                <span className="gx-agenda-time">{row.time}</span>
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
        <div className="grt gx-popup" data-open={open}>
          <div className="grt-app">
            <div className="grt-topbar">
              <span className="grt-brand">
                <span className="grt-mark" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <rect x="4" y="4" width="16" height="13" rx="3" fill="currentColor" />
                    <rect
                      x="6.5"
                      y="6.5"
                      width="11"
                      height="5"
                      rx="1.6"
                      fill="#fff"
                      opacity="0.9"
                    />
                    <circle cx="8" cy="19" r="1.7" fill="currentColor" />
                    <circle cx="16" cy="19" r="1.7" fill="currentColor" />
                  </svg>
                </span>
                <span>
                  <p className="grt-eyebrow">Next bus</p>
                  <p className="grt-title">Saved stops</p>
                </span>
              </span>
            </div>

            <div className="grt-feed">
              <span className="grt-feed-state is-live">
                <i className="grt-feed-dot" />
                <span>Live departures</span>
              </span>
              <span className="grt-feed-detail">Last live update {freshness}</span>
            </div>

            <ul className="grt-stop-list">
              {STOPS.map((stop) => {
                const { head, rest } = board(stop, clock);
                const timeMs = ANCHOR + head * 1000;
                const labels = departureLabels(timeMs, now);
                const delay = stop.live ? formatDelay(stop.delaySec) : "";
                const away = stop.live ? stopsAway(head - clock) : undefined;
                const tint = routeBadgeColor({ shortName: stop.route });

                const notes: string[] = [];
                if (delay) notes.push(delay);
                if (away !== undefined) notes.push(stopsAwayLabel(away));

                return (
                  <li
                    className={`grt-stop-card${stop.closest ? " is-nearest" : ""}`}
                    key={stop.id}
                    data-hit={arrived && stop.closest}
                  >
                    <div className="grt-stop-head">
                      <div className="grt-stop-identity">
                        <p className="grt-stop-name">{stop.name}</p>
                        <div className="grt-stop-meta">
                          <span>Stop {stop.code}</span>
                          {stop.closest && <span className="grt-stop-tag">Closest</span>}
                          {stop.meters !== undefined && (
                            <span>{formatDistance(stop.meters)}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <ul className="grt-departures">
                      <li className="grt-departure">
                        <span
                          className="grt-route-badge"
                          {...(tint ? { style: { background: tint } } : {})}
                        >
                          {stop.route}
                        </span>
                        <div className="grt-departure-copy">
                          <p className="grt-headsign">{stop.headsign}</p>
                          <p className="grt-departure-note">
                            {stop.live && (
                              <span className="grt-note-live">Live</span>
                            )}
                            {notes.map((note, position) => (
                              <span className="grt-note-part" key={note}>
                                {(stop.live || position > 0) && (
                                  <span className="grt-note-sep">·</span>
                                )}
                                <span
                                  className={
                                    note.endsWith("late")
                                      ? "grt-note-late"
                                      : note.endsWith("early")
                                        ? "grt-note-early"
                                        : undefined
                                  }
                                >
                                  {note}
                                </span>
                              </span>
                            ))}
                          </p>
                          <p className="grt-departure-then">
                            {rest.length > 0 && (
                              <>
                                <span className="grt-then-label">then</span>
                                {rest.map((time) => (
                                  <span className="grt-then-time" key={time}>
                                    {shortTimeLabel(ANCHOR + time * 1000, now)}
                                  </span>
                                ))}
                              </>
                            )}
                          </p>
                        </div>
                        <div className="grt-departure-time">
                          {/* Keyed for the same reason as the badge. */}
                          <span className={prefixed(labels.className)} key={labels.primary}>
                            {labels.primary}
                          </span>
                          <span className="grt-clock">{labels.secondary}</span>
                        </div>
                      </li>
                    </ul>
                  </li>
                );
              })}
            </ul>
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
                {closest.route} in {ALERT_LEAD_MINUTES} min
              </p>
              <p className="gx-alert-body">
                {closest.name} → {closest.headsign}
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
          </div>
        )}
      </ViewportLayer>

      {/* There was a second copy of that card here, drawn at the top-right of the
          demo's own box. Photographing the two together settled it: an identical
          notification in two places at once does not read as emphasis, it reads as a
          bug. The bell in the toolbar above is what gives the real one an origin, so
          the drawing is not needed. */}

      {/* The route, running out past both edges of the section. The bus on it is the
          same bus the countdown is counting, and the stops drawn behind it are the
          ones the note is counting. */}
      <div className="gx-street" aria-hidden="true">
        <span className="gx-road">
          <span className="gx-dashes" />
        </span>
        {/* Ticks the bus has already gone by are drawn spent, so the "five stops
            away" note has something to count against. The card says the number and
            the road shows it; neither has to be believed on its own. */}
        {LINE_STOPS.map((left) => (
          <span
            className="gx-stop-tick"
            key={left}
            data-passed={left < busLeft}
            style={{ left: `${left}%` }}
          />
        ))}
        <span className="gx-pole" style={{ left: `${YOUR_STOP}%` }} data-hit={arrived}>
          <span className="gx-pole-mast" />
          <span className="gx-pole-flag" />
          <span className="gx-pole-label">
            <b>{closest.name}</b>
            <span>Stop {closest.code}</span>
          </span>
        </span>
        <span className="gx-bus-slot" style={{ left: `${busLeft}%` }} data-stopped={arrived}>
          {/* A wash of warm light thrown ahead of it. Faint on purpose: this is a
              bright mint afternoon, not a night scene, and the job is to give the
              bus a direction of travel rather than to light anything. */}
          <span className="gx-beam" aria-hidden="true" />
          <Bus route={closest.route} />
        </span>
      </div>

      {!still && (
        <PhantomCursor
          stage={stageRef}
          target={CURSOR[beat] ?? null}
          pressing={beat === "open"}
          token={`${run}-${beat}`}
        />
      )}

      {/* No caption. Every figure this scene is about is already printed on the badge,
          the notification and the three stop rows. */}
    </div>
  );
}
