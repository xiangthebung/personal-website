/**
 * The one constant the two vendored files need from the extension's `types.ts`.
 *
 * `format.ts` and `time.ts` beside this one are verbatim copies, so they keep their
 * import path — `from "./types"` — and this supplies the value rather than dragging
 * across three hundred lines of GTFS index shapes to satisfy one import. That is the
 * whole of the adaptation, and it is why those two can stay diffable.
 *
 * The value itself is copied too: `AGENCY_TIME_ZONE` in `grt-bus-time/src/types.ts`.
 */

/**
 * Clock times are rendered in the agency's timezone, so a visitor in another one
 * still reads Waterloo Region departure times rather than their own.
 */
export const AGENCY_TIME_ZONE = "America/Toronto";
