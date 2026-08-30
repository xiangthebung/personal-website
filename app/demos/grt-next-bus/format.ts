/**
 * VENDORED — a verbatim copy of `grt-bus-time/src/format.ts`.
 *
 * Copied at `ce8c4d2`; the file itself was last touched by `564d0b6`. Everything
 * below this banner is byte-for-byte that file. Nothing is adapted, nothing is
 * added, and no helper here is one the extension does not have.
 *
 * That is a check, not a claim: "the GRT copies are still copies of the extension"
 * in `tests/rendered-html.test.mjs` strips this banner and compares the rest against
 * the sibling checkout, skipping only when there is no sibling checkout to compare
 * with. It is the check the last copy never had.
 *
 * This banner exists because the last copy drifted without saying so. It kept a
 * `routeBadgeColor` that painted invented family tints — deleted over there for
 * being "a badge colour that matches nothing on the bus, the sign or the timetable"
 * — and a `formatCountdown` that still wrote `1h 20`, a bare trailing number with no
 * unit, in the same column as `4 min`. Both had been fixed upstream for months. The
 * comment on top said the file was copied, which is exactly what stopped anyone
 * checking.
 *
 * The only import is `AGENCY_TIME_ZONE`, and `./types` beside this file supplies it
 * rather than the extension's 300 lines of GTFS shapes. See that file.
 */

/**
 * Display formatting. Clock times use the agency timezone so a rider in
 * another timezone still reads Waterloo Region departure times.
 */

import { AGENCY_TIME_ZONE } from "./types";

const clockFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
  timeZone: AGENCY_TIME_ZONE,
});

const weekdayFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  timeZone: AGENCY_TIME_ZONE,
});

export function formatClock(timestamp: number): string {
  return clockFormatter.format(new Date(timestamp));
}

export function formatWeekday(timestamp: number): string {
  return weekdayFormatter.format(new Date(timestamp));
}

/**
 * Countdown label for a departure: `Due`, `4 min`, `2 hr`, `1 hr 20 min`.
 *
 * One shape, `number unit`, at every scale. The over-an-hour case used to read
 * `1h 20` -- a bare trailing number with no unit at all, sitting in the same
 * column as `4 min` and `2 hr`, so the largest type on the card was the one
 * place a rider had to infer what the number meant.
 */
export function formatCountdown(timeMs: number, now = Date.now()): string {
  const minutes = Math.floor((timeMs - now) / 60_000);
  if (minutes <= 0) return "Due";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours} hr` : `${hours} hr ${remainder} min`;
}

/** Minutes until a departure, floored, never negative. */
export function minutesUntil(timeMs: number, now = Date.now()): number {
  return Math.max(0, Math.floor((timeMs - now) / 60_000));
}

/**
 * Short badge text for the toolbar icon.
 *
 * `Due` rather than `now`: for a Pro rider the badge and the card's countdown
 * are on screen together, and two different words for the same moment read as
 * two different facts.
 */
export function formatBadge(timeMs: number, now = Date.now()): string {
  const minutes = minutesUntil(timeMs, now);
  if (minutes < 1) return "Due";
  if (minutes < 60) return String(minutes);
  const hours = Math.floor(minutes / 60);
  return hours < 10 ? `${hours}h` : "9h+";
}

/**
 * `3 min late` / `1 min early`, empty when effectively on time. Implausible
 * gaps are suppressed rather than shown: they mean the prediction could not be
 * lined up with the timetable, and a wrong number is worse than none.
 */
export const MAX_REPORTABLE_DELAY_MINUTES = 60;

export function formatDelay(delaySeconds: number): string {
  const minutes = Math.round(delaySeconds / 60);
  if (minutes === 0 || Math.abs(minutes) > MAX_REPORTABLE_DELAY_MINUTES) return "";
  return minutes > 0
    ? `${minutes} min late`
    : `${Math.abs(minutes)} min early`;
}

/**
 * A live prediction is overdue only after its predicted instant has passed.
 * Keep the schedule delay separate from the countdown boundary: a bus can be
 * late to the timetable while still having a future predicted arrival.
 */
export function formatOverdueDelay(
  timeMs: number,
  delaySeconds: number,
  now = Date.now(),
): string | undefined {
  if (
    !Number.isFinite(timeMs) ||
    !Number.isFinite(delaySeconds) ||
    timeMs > now ||
    delaySeconds <= 0
  ) {
    return undefined;
  }
  return formatDelay(delaySeconds) || undefined;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  return `${(meters / 1000).toFixed(meters < 10_000 ? 1 : 0)} km`;
}

/** Relative freshness label for the last successful refresh. */
export function formatFreshness(timestamp: number, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  return formatClock(timestamp);
}

/** Walking time estimate at a relaxed 1.25 m/s. */
export function formatWalkTime(meters: number): string {
  const minutes = Math.max(1, Math.round(meters / 75));
  return `${minutes} min walk`;
}

/**
 * The colour Google Maps paints ION with.
 *
 * GRT's public feed has no colour columns, but the feed Google renders from
 * does for this one line, and #006bb7 is what the 301 badge is drawn with in
 * the Maps directions panel today. It is the agency's own line colour, not a
 * tint invented here, which is the only kind of colour a badge should carry.
 */
export const ION_ROUTE_COLOR = "#006bb7";

/**
 * Badge colour for a route, following the rule Google Maps actually uses.
 *
 * Google does not assign a palette to bus numbers. It paints the badge with
 * the agency's own `route_color`/`route_text_color`, and where the feed omits
 * them it falls back to a neutral chip -- documented as white on black, and
 * drawn in the directions panel as a white chip with a 1px hairline and the
 * number set a weight heavier to make up for the missing colour. Returning
 * `undefined` here is what selects that fallback in the stylesheet.
 *
 * So every GRT local and iXpress route takes the neutral chip, which is
 * exactly how Maps draws 7, 31 and 201 today. This used to hand the 200- and
 * 300-series invented family tints; a badge colour that matches nothing on
 * the bus, the sign or the timetable is worse than no colour at all, which is
 * why Google's own feed guidance ties the field to what riders see on the
 * street. ION keeps a colour because ION genuinely has one.
 */
export function routeBadgeColor(route: {
  shortName: string;
  color?: string;
}): string | undefined {
  if (route.color) return route.color;
  const number = Number.parseInt(route.shortName, 10);
  if (!Number.isFinite(number)) return undefined;
  if (number >= 300 && number < 400) return ION_ROUTE_COLOR;
  return undefined;
}

/**
 * A text colour that is actually readable on `background`.
 *
 * The badge used to hardcode white, on the stated assumption that "family
 * colours are dark". `route_color` comes from the feed, so that is an
 * assumption about data the agency can change at any time -- and a light
 * `route_color` produced white-on-light, i.e. an unreadable route number, which
 * is the single most important character in the row.
 *
 * Uses the WCAG relative-luminance threshold, which is the same rule the
 * contrast ratio is defined from.
 */
export function readableTextColor(background: string): string {
  const hex = background.replace("#", "");
  if (hex.length !== 6) return "#ffffff";
  const channel = (offset: number): number => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const luminance =
    0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
  // Contrast against white is (1.05 / (L + 0.05)); against black it is
  // ((L + 0.05) / 0.05). They cross at L = 0.1791.
  return luminance > 0.1791 ? "#101010" : "#ffffff";
}
