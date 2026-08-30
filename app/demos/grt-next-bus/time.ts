/**
 * VENDORED — a verbatim copy of `grt-bus-time/src/time.ts`.
 *
 * Copied at `ce8c4d2`; last touched over there by `564d0b6`. Same contract as
 * `format.ts` beside it: everything below this banner is that file unchanged, and
 * "the GRT copies are still copies of the extension" in
 * `tests/rendered-html.test.mjs` is what holds it that way.
 *
 * It is here for one function. `departureLabels` prefixes a departure on a later
 * service day with its weekday, and it decides that by comparing `serviceDateKey`
 * of the departure against `serviceDateKey` of now — which is service-day maths in
 * the agency's timezone, not a date comparison. The whole file comes across rather
 * than that one function, because the interesting part of it is the reasoning about
 * DST that the header records, and a hand-trimmed copy would be the thing this
 * scene has just finished paying for.
 *
 * Most of what it exports is unused here. That is the price of a copy being a copy.
 */

/**
 * Service-day maths for the agency timezone.
 *
 * GTFS times are relative to the origin of a *service day* and can exceed 24
 * hours (GRT publishes trips up to 26:32:00). Resolving departures therefore
 * needs the exact epoch of that origin in Waterloo Region, which is what
 * these helpers provide — DST transitions included, and correct even when the
 * rider's browser is in another timezone.
 */

import { AGENCY_TIME_ZONE } from "./types";

export interface ServiceDay {
  /** `YYYYMMDD`. */
  dateKey: string;
  /**
   * Epoch ms that GTFS `stop_times` seconds are measured from: local noon on
   * this day, minus twelve hours. Equal to local midnight on ordinary days,
   * an hour away from it on a DST changeover.
   *
   * Noon is the reference because no jurisdiction moves its clocks across
   * midday, whereas midnight itself may not exist (spring forward) or may
   * happen twice (fall back). Anchoring on midnight shifted every departure
   * by an hour on both changeover days.
   */
  anchorMs: number;
}

const partsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: AGENCY_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function zonedParts(timestamp: number): ZonedParts {
  const parts = partsFormatter.formatToParts(new Date(timestamp));
  const values: Record<string, number> = {};
  for (const part of parts) {
    if (part.type === "literal") continue;
    values[part.type] = Number(part.value);
  }
  return {
    year: values.year ?? 1970,
    month: values.month ?? 1,
    day: values.day ?? 1,
    hour: values.hour ?? 0,
    minute: values.minute ?? 0,
    second: values.second ?? 0,
  };
}

function dateKeyOf(parts: ZonedParts): string {
  return (
    `${parts.year}` +
    `${String(parts.month).padStart(2, "0")}` +
    `${String(parts.day).padStart(2, "0")}`
  );
}

function datePartsFromKey(dateKey: string): { year: number; month: number; day: number } {
  return {
    year: Number(dateKey.slice(0, 4)),
    month: Number(dateKey.slice(4, 6)),
    day: Number(dateKey.slice(6, 8)),
  };
}

/**
 * Finds the epoch instant of a given wall-clock time on a local calendar day,
 * without assuming a local day is exactly 24 elapsed hours.
 *
 * Iterates because the UTC offset depends on the very instant being solved
 * for: an initial guess is formatted back into local parts, and the residual
 * is applied until it converges (two passes in practice, even across a
 * transition).
 */
function zonedWallMs(
  parts: Pick<ZonedParts, "year" | "month" | "day">,
  hour = 0,
): number {
  const wantedWallMs = Date.UTC(parts.year, parts.month - 1, parts.day, hour);
  let candidate = wantedWallMs;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const actual = zonedParts(candidate);
    const actualWallMs = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second,
    );
    const corrected = candidate + (wantedWallMs - actualWallMs);
    if (corrected === candidate) return candidate;
    candidate = corrected;
  }
  return candidate;
}

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

/**
 * The GTFS service-day origin: local noon on `parts`, minus twelve hours.
 *
 * See the file header for why this is not local midnight.
 */
function serviceDayAnchorMs(
  parts: Pick<ZonedParts, "year" | "month" | "day">,
): number {
  return zonedWallMs(parts, 12) - TWELVE_HOURS_MS;
}

function serviceDayForDateKey(dateKey: string): ServiceDay {
  const parts = datePartsFromKey(dateKey);
  return { dateKey, anchorMs: serviceDayAnchorMs(parts) };
}

function shiftDateKey(dateKey: string, days: number): string {
  const { year, month, day } = datePartsFromKey(dateKey);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return (
    `${shifted.getUTCFullYear()}` +
    `${String(shifted.getUTCMonth() + 1).padStart(2, "0")}` +
    `${String(shifted.getUTCDate()).padStart(2, "0")}`
  );
}

/** Resolves the agency-local calendar day and its midnight for an instant. */
export function serviceDayAt(timestamp: number): ServiceDay {
  const parts = zonedParts(timestamp);
  return {
    dateKey: dateKeyOf(parts),
    anchorMs: serviceDayAnchorMs(parts),
  };
}

/**
 * Service days that can contribute departures right now: yesterday (for trips
 * that run past midnight), today, and tomorrow (for a late-evening lookahead).
 */
export function relevantServiceDays(now: number): ServiceDay[] {
  const today = serviceDayAt(now);
  return [
    serviceDayForDateKey(shiftDateKey(today.dateKey, -1)),
    today,
    serviceDayForDateKey(shiftDateKey(today.dateKey, 1)),
  ];
}

/** `YYYYMMDD` for the agency-local day containing `timestamp`. */
export function serviceDateKey(timestamp: number): string {
  return dateKeyOf(zonedParts(timestamp));
}
