/**
 * The two label helpers that live in the extension's `popup.ts`, copied so the
 * demo's rows read exactly like the real ones.
 *
 * The interesting rule is the swap at the one-hour mark: inside the hour a rider
 * wants a countdown, past it they want a clock time, so the primary and secondary
 * lines trade places. The colour thresholds are part of the same decision — two
 * minutes is red because you are not going to make it, seven is amber because you
 * might have to move.
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
