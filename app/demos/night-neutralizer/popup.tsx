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
 * Cropped after the Picture card. The real popup carries an "Only at night" card and a
 * "More options" disclosure below it; nothing in the film touches either, and the footer
 * line closes the column so it reads as a whole rather than as a fragment.
 *
 * Nothing here is a control. The stage is `role="img"`; the pill is pressed by the
 * phantom cursor and the state is written by the storyboard.
 */

import type { CSSProperties } from "react";
import { describeStrength } from "./core/strength";
import { DEFAULT_SETTINGS } from "./core/types";
import { PRESET_ORDER, activePreset, presetById } from "./core/presets";

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
      <span className="nn-pop-range" style={{ "--fill": strength } as CSSProperties}>
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
          {ACTIVE_PRESET ? presetById(ACTIVE_PRESET).sets : ""}
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

      <p className="nn-pop-foot">Nothing leaves your browser.</p>
    </div>
  );
}
