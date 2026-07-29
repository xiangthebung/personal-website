/**
 * The one constant `format.ts` needs from the extension's `types.ts`.
 *
 * `format.ts` is copied verbatim so the countdown text on this page is exactly
 * the countdown text in the popup — including the fact that it says `Due` and not
 * `now` when a bus is at the stop. Rather than copy 300 lines of unrelated GTFS
 * shapes to satisfy one import, the module keeps its import path and this file
 * supplies the value.
 */

/**
 * Clock times are rendered in the agency's timezone, so a visitor in another one
 * still reads Waterloo Region departure times rather than their own.
 */
export const AGENCY_TIME_ZONE = "America/Toronto";
