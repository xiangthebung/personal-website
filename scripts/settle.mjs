/**
 * Scrolls a section into focus and waits until the page agrees that it is the one
 * being looked at.
 *
 * Two things made every screenshot tool here unreliable, and both are invisible in a
 * single picture.
 *
 * Scenes mount lazily, so a section's height changes after it comes near the
 * viewport. A single `scrollIntoView({ block: "center" })` therefore lands on a
 * layout that no longer exists: asking for the GRT section centred left it at
 * `top: 1062` in a 1200px window with PagePack filling the screen instead. Scrolling
 * again once the heights have settled fixes it, which is why this loops.
 *
 * And the page dims every heading that is not the active one to 0.32 opacity — a
 * deliberate focus effect driven by an IntersectionObserver. A section photographed
 * while the page considers a different one active looks washed out, and it took a
 * measurement of the ancestor chain to establish that the pale GRT heading was this
 * and not a colour bug. So this waits for `is-active` rather than for a timeout.
 */

/**
 * @param {import("playwright").Page} page
 * @param {string} id section id, without the hash
 * @returns {Promise<boolean>} whether the section ended up active
 */
export async function focusSection(page, id) {
  const section = page.locator(`#${id}`);
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await section.evaluate((node) => node.scrollIntoView({ block: "center" }));
    // A nudge either way: a programmatic jump can land without crossing any of the
    // observer's thresholds, so the focus pass never runs.
    await page.mouse.wheel(0, 10);
    await page.waitForTimeout(120);
    await page.mouse.wheel(0, -10);
    await page.waitForTimeout(attempt === 0 ? 900 : 450);

    const active = await section.evaluate((node) => node.classList.contains("is-active"));
    if (active) {
      // Let the 260ms opacity transition and the entry transform finish.
      await page.waitForTimeout(500);
      /* And check it is still here. A neighbour's lazy chunk can mount during that wait
         and grow by more than a viewport, which pushes this section a screen away and
         takes `is-active` with it — Night Neutralizer sits under Byte Budget and was
         found 1,600px below the fold, its scene stopped on its first beat, on a run every
         tool here had reported as focused. If the page no longer agrees, go round again. */
      const settled = await section.evaluate((node) => {
        const box = node.getBoundingClientRect();
        /* Still active, and still about where `block: "center"` put it — a section
           taller than the window sits with its middle near the window's middle, and a
           shift of a quarter of the window is a neighbour having grown, not a settle. */
        const drift = Math.abs((box.top + box.bottom) / 2 - window.innerHeight / 2);
        return node.classList.contains("is-active") && drift < window.innerHeight / 4;
      });
      if (settled) return true;
    }
  }
  return false;
}
