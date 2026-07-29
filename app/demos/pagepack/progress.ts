/**
 * The save progress vocabulary, copied out of the extension's service worker.
 *
 * `captureProgressMessage` is verbatim from `background.js`, and `determinate`
 * keeps the rule that goes with it: only a single-page save can show a percentage,
 * because a link-following save discovers pages as it goes and does not know its
 * own total yet. That is why the bar in this demo switches between a filling bar
 * and a sliding one depending on the depth you pick — an honest indeterminate bar
 * instead of a percentage that would have to be invented.
 */

export type CapturePhase = "reading" | "assets" | "finishing";

export interface CaptureProgress {
  phase: CapturePhase;
  pagesDone: number;
  pagesTotal: number;
  assetsDone: number;
  assetsTotal: number;
}

/** Verbatim from `background.js`. */
export function captureProgressMessage({
  phase,
  pagesDone,
  pagesTotal,
  assetsDone,
  assetsTotal,
}: CaptureProgress): string {
  if (phase === "reading") return "Reading this page…";
  if (phase === "finishing") return "Finishing up…";
  const files = assetsTotal ? `${assetsDone} of ${assetsTotal} files` : "collecting files";
  if (pagesTotal > 1) {
    return `Page ${Math.min(pagesDone + 1, pagesTotal)} of ${pagesTotal} · ${files}`;
  }
  return `Saving ${files}`;
}

/**
 * "Link-following discovers pages as it goes, so only a single-page save can
 * promise an honest percentage."
 */
export function isDeterminate(depth: number, progress: CaptureProgress): boolean {
  return depth === 0 && progress.assetsTotal > 0 && progress.phase === "assets";
}

export function progressRatio(progress: CaptureProgress): number {
  if (progress.assetsTotal <= 0) return 0;
  return Math.min(1, progress.assetsDone / progress.assetsTotal);
}

/** The label above the bar, from `renderProgressCard`. */
export function progressTitle(pagesTotal: number, cancelling: boolean): string {
  if (cancelling) return "Cancelling…";
  return pagesTotal > 1 ? "Saving pages" : "Saving this page";
}

/** How the library summarises a saved item. Same units the extension uses. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

const DEPTH_LABEL: Record<number, string> = {
  0: "Single page",
  1: "One level of links",
  2: "Two levels of links",
  3: "Three levels of links",
};

/** The Options summary line, including the ` · no scripts` suffix. */
export function optionsSummary(depth: number, runScripts: boolean): string {
  const base = DEPTH_LABEL[depth] ?? DEPTH_LABEL[0];
  return runScripts ? base : `${base} · no scripts`;
}
