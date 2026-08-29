/**
 * The two label helpers that lived in the extension's `popup.ts`, copied so the demo's
 * rows read exactly like the real ones.
 *
 * The interesting rule is the swap at the one-hour mark: inside the hour a rider
 * wants a countdown, past it they want a clock time, so the primary and secondary
 * lines trade places. The colour thresholds are part of the same decision — two
 * minutes is red because you are not going to make it, seven is amber because you
 * might have to move.
 *
 * READ THIS BEFORE TRUSTING THE PARAGRAPH ABOVE.
 *
 * "Copied so the demo's rows read exactly like the real ones" was true when it was
 * written and is not true now, which makes it the most dangerous kind of comment on this
 * page: one that tells you not to check. The extension was rewritten — see
 * `353b821 Redraw the popup as a list of rows that open in place` in `grt-bus-time` —
 * and this file did not follow it. What has diverged, measured against that repository:
 *
 *   - `departureLabels` changed shape entirely, to `{ countdown, clock, className }`.
 *   - It gained an overdue branch off `delaySec`, and a day prefix.
 *   - **The amber threshold moved from seven minutes to five.** The sentence above still
 *     says seven, and seven is what this file does.
 *   - `shortTimeLabel` no longer exists over there at all; later departures are clock
 *     times now.
 *
 * `format.ts` beside this one is closer but not clean either: `routeBadgeColor` returns
 * the real ION blue for 300-series and *nothing* for 200-series, selecting a neutral chip,
 * where this scene still paints an invented family tint the extension deleted for being
 * "a badge colour that matches nothing on the bus, the sign or the timetable".
 *
 * None of that is dishonesty in the scene — every number it shows is derived from one
 * simulated clock through these functions, so the frame is internally consistent. It is
 * that the popup being reconstructed is one version behind the popup that exists. Fixing
 * it properly is a scene rebuild rather than a leaf-value patch: resyncing
 * `departureLabels` alone would turn the payoff frame from `Due` into `2 min late`, and
 * the neutral route chip is a restyle of `.grt-route-badge`.
 *
 * Whoever picks this up: the honest end state is either a rebuilt scene against the row
 * list, or these two files renamed to say plainly that they are a snapshot of a previous
 * design. What must not happen is this comment going back to claiming they match.
 */

import { formatClock, formatCountdown, minutesUntil } from "./format";

export interface TimeLabels {
  primary: string;
  secondary: string;
  className: string;
}

export function departureLabels(timeMs: number, now = Date.now()): TimeLabels {
  const minutes = minutesUntil(timeMs, now);
  if (minutes < 60) {
    return {
      primary: formatCountdown(timeMs, now),
      secondary: formatClock(timeMs),
      className: `countdown${minutes <= 2 ? " is-soon" : minutes <= 7 ? " is-near" : ""}`,
    };
  }
  return {
    primary: formatClock(timeMs),
    secondary: minutes >= 90 ? `in ${Math.floor(minutes / 60)} hr` : `in ${minutes} min`,
    className: "countdown is-distant",
  };
}

/** Follow-up times use a quieter, lower-case vocabulary than the headline. */
export function shortTimeLabel(timeMs: number, now = Date.now()): string {
  const minutes = minutesUntil(timeMs, now);
  if (minutes < 1) return "due";
  if (minutes < 60) return `${minutes} min`;
  return formatClock(timeMs);
}
