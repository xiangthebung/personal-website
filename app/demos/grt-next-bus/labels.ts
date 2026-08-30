/**
 * The one label helper that lives inside the extension's `popup.ts`, lifted out so
 * the demo's rows read like the real ones.
 *
 * VENDORED. `TimeLabels` and `departureLabels` below are copied from
 * `grt-bus-time/src/popup.ts` at `ce8c4d2` — the file was last redrawn by
 * `353b821 Redraw the popup as a list of rows that open in place` — and the bodies
 * are unchanged. The one adaptation is visibility: over there both are module-
 * private, because nothing outside `popup.ts` needs them. Here they are exported so
 * `demo.tsx` can import them. Nothing else differs — and that is checked rather than
 * asserted: "the GRT copies are still copies of the extension" in
 * `tests/rendered-html.test.mjs` strips the `export` keywords and requires the rest to
 * appear in `popup.ts` verbatim. It skips when the sibling checkout is absent.
 *
 * What is deliberately NOT here. `popup.ts` builds its rows out of DOM nodes —
 * `routeBadge`, `departureNoteNodes`, `renderLaterDepartures` — and a function that
 * returns an `HTMLElement` cannot be copied into a React scene. Those are not
 * re-expressed here under new names either, because a helper this file invents is a
 * helper nobody can diff. The scene renders their markup as JSX instead and says so
 * at each one. `shortTimeLabel`, which this file used to export, is gone for the
 * plainest reason available: it does not exist upstream any more. Later departures
 * are plain clock times now.
 *
 * THE RULES THIS FILE ENCODES
 *
 * The countdown and the clock have fixed roles, and they do not swap. The clock time
 * is the stable schedule and the countdown is the quick urgency cue, so a row keeps
 * its reading order as a departure crosses the one-hour boundary. (An earlier design
 * traded the two lines' places at that boundary. The row changed shape while you were
 * looking at it.)
 *
 * The colour thresholds are two minutes and five. Two minutes is red because you are
 * not going to make it. The next five are green — not amber — because you still can,
 * which is the same reading Google Maps' station page gives the number. Anything
 * further away is neutral ink, and past the hour the countdown grows a word ("in 1 hr
 * 20 min"), stops being a glance, and steps back down to body size. The class names
 * `is-soon`, `is-near` and `is-distant` carry those three states to the stylesheet.
 *
 * A live bus past its own predicted instant shows the delay instead of "Due". That is
 * the overdue branch, and it is the honest reading: `formatOverdueDelay` in
 * `format.ts` refuses the case where the prediction is still in the future, so a bus
 * can be late to the timetable and still have a future arrival without this claiming
 * otherwise.
 *
 * A departure on a later service day is prefixed with its weekday, which is why
 * `time.ts` is vendored beside this.
 */

import {
  formatClock,
  formatCountdown,
  formatOverdueDelay,
  formatWeekday,
  minutesUntil,
} from "./format";
import { serviceDateKey } from "./time";

export interface TimeLabels {
  countdown: string;
  clock: string;
  className: string;
}

/**
 * Clock time is the stable schedule; the countdown is the quick urgency cue.
 * Keeping those roles fixed prevents the row from changing its reading order
 * as a departure crosses the one-hour boundary.
 *
 * When a live bus is past its predicted time, the countdown shows the delay
 * instead of "Due" — that is more honest and useful at a glance.
 */
export function departureLabels(timeMs: number, delaySec?: number, now = Date.now()): TimeLabels {
  const minutes = minutesUntil(timeMs, now);
  const dayPrefix =
    serviceDateKey(timeMs) === serviceDateKey(now) ? "" : `${formatWeekday(timeMs)} `;
  const clock = `${dayPrefix}${formatClock(timeMs)}`;
  if (minutes < 60) {
    const overdue =
      delaySec === undefined ? undefined : formatOverdueDelay(timeMs, delaySec, now);
    if (overdue) {
      return {
        countdown: overdue,
        clock,
        className: "countdown is-soon",
      };
    }
    return {
      countdown: formatCountdown(timeMs, now),
      clock,
      className: `countdown${minutes <= 2 ? " is-soon" : minutes <= 5 ? " is-near" : ""}`,
    };
  }
  return {
    countdown: `in ${formatCountdown(timeMs, now)}`,
    clock,
    className: "countdown is-distant",
  };
}
