"use client";

/**
 * PLACEHOLDER. This is scaffolding, not the scene.
 *
 * It exists so the registry in `demo-mount.tsx` stays a total `Record<DemoId, …>` and the
 * build stays green while the real scene is written. It declares the minimum the test
 * suite parses out of a scene — a `BEATS` list and a `SPECS` list — and draws a frame that
 * says what it is. Replace the whole file.
 */

import { useRef } from "react";
import { SpecTags, type SpecTag } from "../scene/spec";
import { useStoryboard, type Beat } from "../scene/storyboard";
import { useOnScreen } from "../use-on-screen";
import { useSceneRun } from "../scene/use-scene-run";
import { useSectionFocused } from "../use-section-focus";
import "./demo.css";

type BeatName = "form" | "arrive" | "press" | "pick" | "fill" | "done";

const BEATS: readonly Beat<BeatName>[] = [
  { name: "form", ms: 2200 },
  { name: "arrive", ms: 2400 },
  { name: "press", ms: 1600 },
  { name: "pick", ms: 2400 },
  { name: "fill", ms: 2600 },
  { name: "done", ms: 2400 },
];

const SPECS: readonly SpecTag<BeatName>[] = [
  { at: "pick", text: "Matches the code to your site", x: 50, y: 22 },
  { at: "fill", text: "One keypress from email to form", x: 50, y: 74 },
];

export function TwoFactorPasterDemo() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const onScreen = useOnScreen(stageRef);
  const focused = useSectionFocused(stageRef);
  const running = useSceneRun(focused, onScreen);
  const { beat } = useStoryboard(BEATS, {
    running,
    stage: stageRef,
    stillBeat: "fill",
  });

  return (
    <div className="tfa" ref={stageRef} data-beat={beat}>
      <div className="tfa-placeholder">2FA Paster</div>
      <SpecTags beats={BEATS} beat={beat} tags={SPECS} className="tfa-specs" />
    </div>
  );
}
