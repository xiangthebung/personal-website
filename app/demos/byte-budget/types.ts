/**
 * What `format.ts` needs from the extension, and the two rules the scene is about.
 *
 * NOT A COPY OF ANY ONE FILE. This is a shim, assembled here, out of blocks that are each
 * verbatim from the Byte Budget extension (github.com/xiangthebung/byte-budget) — four
 * from `src/core/types.ts` and two from `src/limit/alerts.ts`, each named above the block
 * it holds. The only thing written rather than copied is the `Settings` interface, which
 * is the real one cut down to the single field `format.ts` reads; the note on it says so.
 * Nothing else in the file has been edited. `format.ts` beside it is different in kind:
 * that one is the whole file, byte for byte, and carries its own header saying so.
 *
 * `format.ts` beside this file is a verbatim copy of the extension's `core/format.ts`,
 * so every byte figure on this page is rounded, scaled and unit-suffixed by the code
 * that does it in the popup — including the details that would never be reinvented the
 * same way: that `999.87 GiB` prints as `1.0 TiB` rather than `1000 GiB`, that a badge
 * is at most four characters because Chrome truncates anything longer, and that a
 * percentage prints `>99%` rather than `100%` so a rounded number never reads as a
 * certainty.
 *
 * Rather than copy three hundred lines of unrelated storage shapes to satisfy one
 * `import type`, this file supplies the pieces the copy needs and nothing else. Each
 * block below is itself verbatim, from the file named above it, because each is a
 * decision rather than a convenience:
 *
 *   `UsageTotals` and `measuredShare` are the product's whole argument. The share of a
 *   figure that was measured rather than modelled is computed from the ledger and
 *   threaded end to end; this page computes it the same way from the same shape, so the
 *   percentage the popup prints here is arithmetic rather than a number someone typed.
 *
 *   `ALERT_THRESHOLDS` is the ladder the scene's warning fires on, and the reason the
 *   scene can say "75, 90, 100" without anyone having to take its word for it.
 */

/* --- from `core/types.ts` ------------------------------------------------- */

/**
 * The one field of the extension's `Settings` that `format.ts` reads.
 *
 * The real interface carries eighteen more — theme, week and month modes, retention,
 * badge mode, the plan size — none of which any formatter touches.
 */
export interface Settings {
  /** `si`: 1 kB = 1000 B. `iec`: 1 KiB = 1024 B. */
  units: "si" | "iec";
}

export interface UsageTotals {
  /** Bytes received: response headers plus response body. */
  down: number;
  /** Bytes sent: request line, request headers, and request body. */
  up: number;
  requests: number;
  /**
   * How much of `down` came from the size estimator rather than a measurement.
   * Never larger than `down`. The UI turns this into a measured percentage.
   */
  estimatedDown: number;
  /** Responses the HTTP cache served, so they cost no network bytes. */
  cacheHits: number;
  /** Bytes the HTTP cache avoided, from the size model. Always an estimate. */
  cacheAvoided: number;
  /** Bytes a limit refused or an optimizer removed. */
  saved: number;
  /**
   * How much of `saved` rests on a measurement rather than a model.
   *
   * A refused request has no size — the number is what the estimator thinks it would
   * have weighed. A *rewritten* request does: if the original variant has been seen
   * before, the difference between what it cost then and what the smaller one cost
   * now is arithmetic. The two must be reported apart, or the second is dragged down
   * to the credibility of the first.
   */
  savedMeasured: number;
  /** Requests a budget or an optimizer rule stopped. */
  blocked: number;
  /** Requests an optimizer rewrote to a smaller variant. */
  rewritten: number;
}

export function emptyTotals(): UsageTotals {
  return {
    down: 0,
    up: 0,
    requests: 0,
    estimatedDown: 0,
    cacheHits: 0,
    cacheAvoided: 0,
    saved: 0,
    savedMeasured: 0,
    blocked: 0,
    rewritten: 0,
  };
}

export function totalBytes(totals: Readonly<UsageTotals>): number {
  return totals.down + totals.up;
}

/**
 * Share of `down` that was actually measured, as 0..1.
 *
 * A total of zero counts as fully measured: there is nothing in it to be wrong
 * about, and returning 0 would make an empty popup claim 0% confidence.
 */
export function measuredShare(totals: Readonly<UsageTotals>): number {
  if (totals.down <= 0) return 1;
  return Math.max(0, Math.min(1, 1 - totals.estimatedDown / totals.down));
}

/* --- from `limit/alerts.ts` ----------------------------------------------- */

/**
 * Where an alert fires, as a share of the allowance.
 *
 * Three, and not a curve: 75% is early enough that the rest of the window can still be
 * spent differently, 90% is the last point at which what is left can be rationed, and
 * 100% is a fact rather than a warning. A fourth would not change anyone's behaviour and
 * would spend the interruption budget that makes the first three land.
 */
export const ALERT_THRESHOLDS = [0.75, 0.9, 1] as const;

/**
 * Which threshold to announce for one reading, and what the record should say after.
 *
 * Pure, and split out of `run` deliberately: the dedupe rule is the whole of this
 * module's correctness and it is the only part of it that can be asserted under
 * `node --test` rather than watched in a browser for a month.
 *
 * Two rules live here. A threshold the share has fallen back below counts as unannounced
 * again — within a window `used` only grows, so the only thing that can lower a share is
 * the allowance going up (a grant, or an edited limit), after which the person really is
 * under 75% again and should hear about it if they climb back over. And only the highest
 * fresh threshold is announced: one video takes someone from 40% to 105%, crossing all
 * three, and three notifications arriving together bury the one that matters. The lower
 * two are still returned as said, so they cannot arrive later on their own.
 */
export function decideAlert(
  share: number,
  previous: { periodKey: string; thresholds: readonly number[] } | undefined,
  periodKey: string,
): { announce: number | null; thresholds: number[] } {
  const carried =
    previous && previous.periodKey === periodKey
      ? previous.thresholds.filter((threshold) => share >= threshold)
      : [];
  const reached = ALERT_THRESHOLDS.filter((threshold) => share >= threshold);
  const fresh = reached.filter((threshold) => !carried.includes(threshold));
  return { announce: fresh[fresh.length - 1] ?? null, thresholds: [...reached] };
}
