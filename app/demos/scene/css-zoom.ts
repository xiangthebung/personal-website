/**
 * The effective CSS `zoom` on an element, counting every zoomed ancestor.
 *
 * `DemoMount` zooms a scene down to fit the window (see `useFitToViewport`). Under
 * standardised zoom, `getBoundingClientRect` reports zoomed (on-screen) pixels, while a
 * length written into a style inside the zoomed subtree is zoomed again. So a distance
 * measured between two rects and written back as `px` inside the scene has to be divided
 * by this first, or it lands `zoom` times too far.
 *
 * `currentCSSZoom` is the standard property for exactly this. Where it does not exist the
 * engine is either unzoomed or on legacy zoom, and 1 is the right answer for both.
 */
export function cssZoom(element: Element | null | undefined): number {
  const zoom = (element as (Element & { currentCSSZoom?: number }) | null | undefined)
    ?.currentCSSZoom;
  return typeof zoom === "number" && zoom > 0 ? zoom : 1;
}
