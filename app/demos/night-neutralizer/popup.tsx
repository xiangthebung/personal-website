"use client";

/**
 * The extension's popup, reconstructed.
 *
 * 330px wide, near-black navy with a warm gold accent, the front of it answering three
 * questions and no more: is it on, how much sound, how much picture — plus the two things
 * added in 1.1.0 that this scene exists to show, a meter of what is being applied at this
 * moment and a button that shows the site's own sound and picture for as long as it is
 * held. Every string here is one the popup prints, taken from `popup.html` / `popup.ts`
 * in the extension; the ones that are numbers come from the vendored core rather than
 * being typed in.
 *
 * The whole front of the popup, in the extension's order: header, live row, presets,
 * Sound, Picture, the "Only at night" card, the "More options" disclosure (closed, as it
 * opens) and the footer. Nothing in the film touches the last two, but a popup drawn
 * without them is not the popup the extension shows.
 *
 * Nothing here is a control. The stage is `role="img"`; the pill is pressed by the
 * phantom cursor and the state is written by the storyboard.
 */

import type { CSSProperties } from "react";
import { describeStrength } from "./core/strength";
import { DEFAULT_SETTINGS } from "./core/types";
import { CUSTOM_PRESET_LINE, PRESET_ORDER, activePreset, presetById } from "./core/presets";

/** A switch, in the on position. `.track` and `.thumb` in the extension's `popup.css`. */
function Switch() {
  return (
    <span className="nn-pop-switch" data-on="true">
      <i />
    </span>
  );
}

/**
 * A card: a title, the strength as a word, a switch, a line saying what the slider does,
 * and the slider itself with its fill at the setting.
 */
function Card({
  title,
  strength,
  desc,
  anchor,
}: {
  title: string;
  strength: number;
  desc: string;
  anchor?: string;
}) {
  return (
    <div className="nn-pop-card">
      <p className="nn-pop-card-head">
        <b>{title}</b>
        {/* The strength readout is the word, not the number — `describeStrength` in the
            core, which is what the popup's `.value` prints. */}
        <span className="nn-pop-value">{describeStrength(strength)}</span>
        <Switch />
      </p>
      <p className="nn-pop-desc" data-spec-anchor={anchor}>
        {desc}
      </p>
      {/* `--nn-fill`, not the extension's `--fill`: another scene registers `--fill`
          document-wide with `@property … inherits: false`, which reset this track's
          `::before` and thumb to 0 and drew the slider at the far left. */}
      <span className="nn-pop-range" style={{ "--nn-fill": strength } as CSSProperties}>
        <i />
      </span>
    </div>
  );
}

/** The chips and the line under them, from `core/presets.ts`. */
const ACTIVE_PRESET = activePreset(DEFAULT_SETTINGS);

export function NightPopup({
  /** The two strengths the scene runs at; the extension's defaults, held there by a test. */
  strength,
  /** What the meter reads on this beat, worded by `describeMeter`. */
  meter,
  /** True while the phantom cursor is holding Compare down. */
  held,
  /** True on the coda, where the tab has become a protected player. */
  protectedPlayer,
}: {
  strength: number;
  meter: string;
  held: boolean;
  protectedPlayer: boolean;
}) {
  return (
    <div className="nn-popup" data-held={held} data-protected={protectedPlayer}>
      <p className="nn-pop-head">
        <span className="nn-pop-moon" />
        <b>Night Neutralizer</b>
        <Switch />
      </p>

      {/* One sentence for the whole tab, from `summarize()` in popup.ts: the dot is green
          while both halves are working, amber on a protected player because the picture
          is on a fixed curve rather than being measured. */}
      <div className="nn-pop-live">
        <p className="nn-pop-summary">
          <i className="nn-pop-dot" data-state={protectedPlayer ? "partial" : "active"} />
          <span data-spec-anchor="summary">
            {protectedPlayer
              ? "Softening the sound and picture · protected video"
              : "Softening the sound and picture"}
          </span>
        </p>
        <div className="nn-pop-row">
          <span className="nn-pop-meter" data-held={held} data-spec-anchor="meter">
            {meter}
          </span>
          <span
            className="nn-pop-compare"
            data-target="compare"
            data-spec-anchor="compare"
            data-pressed={held}
          >
            {held ? "Comparing…" : "Hold to compare"}
          </span>
        </div>
      </div>

      <div className="nn-pop-presets">
        <span className="nn-pop-chips">
          {PRESET_ORDER.map((id) => (
            <span className="nn-pop-chip" key={id} data-active={id === ACTIVE_PRESET}>
              {presetById(id).name}
            </span>
          ))}
        </span>
        <p className="nn-pop-line">
          {ACTIVE_PRESET ? presetById(ACTIVE_PRESET).sets : CUSTOM_PRESET_LINE}
        </p>
      </div>

      <Card title="Sound" strength={strength} desc="Quiet dialogue up, peaks left alone" />
      <Card
        title="Picture"
        strength={strength}
        anchor="picture"
        desc={
          protectedPlayer
            ? `Protected player: fixed curve at ${DEFAULT_SETTINGS.protectedBrightness}% brightness`
            : "Shadows lifted, glare pulled back"
        }
      />

      {/* "When to run": the "Only at night" toggle, on by default (`nightOnly` in
          `DEFAULT_SETTINGS`), and the clock window under it, which the popup shows only
          while the toggle is on. The line is `renderNightDesc`'s for the ordinary case,
          a browser with no ambient light sensor. The times are the default window as
          Chrome's en-US time field draws it. */}
      <div className="nn-pop-card">
        <p className="nn-pop-toggle">
          <span className="nn-pop-toggle-copy">
            <b>Only at night</b>
            <span>No light sensor here, so the clock decides</span>
          </span>
          <Switch />
        </p>
        <p className="nn-pop-window">
          From <span className="nn-pop-time">09:00 PM</span> to{" "}
          <span className="nn-pop-time">07:00 AM</span>
        </p>
      </div>

      {/* `<details class="more">`, closed, which is how the popup opens. */}
      <p className="nn-pop-more">
        <i className="nn-pop-chev" />
        More options
      </p>

      <p className="nn-pop-foot">Nothing leaves your browser.</p>
    </div>
  );
}
