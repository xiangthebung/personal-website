"use client";

/**
 * Holds a beat's consequences back until the pointer has actually pressed something.
 *
 * THE PROBLEM
 *
 * A scene's state is derived from its beat — `index >= at("pick")`, `ACT[beat]` — and a
 * beat starts when it starts. A click does not: `PhantomCursor` schedules the press
 * against the flight it just measured, because the travel time is not a fact the caller
 * has. So on any beat where the pointer both arrives and clicks, the thing being clicked
 * changed at 0ms and the click landed somewhere between 90 and 460ms later.
 *
 * That is a demonstration playing in the wrong order, and it was reported twice in those
 * words: the library tab opening before the pointer got to it, the reader unfolding with
 * nothing pressed. Both were answered by re-choreographing the beats — give the flight a
 * beat of its own, so the pointer is already standing on the control when the beat that
 * presses it begins. `BEATS` in PagePack still carries the note. It works, and it costs a
 * beat per click, and it still leaves the state change 90ms ahead of the press.
 *
 * PDF Explainer is where that arrangement ran out. It has eleven clicks in a twelve-beat
 * act, six of them a matching game played at 600ms a tap, and doubling the beats to buy
 * each one an approach would add three and a half seconds to the longest scene on the page
 * to fix an ordering fault.
 *
 * THE FIX
 *
 * So the cursor reports its press — see `onPress` in `cursor.tsx` — and this turns the
 * report into an answer to "which beat's effects may be drawn". Until the press lands, a
 * gated beat renders as the one before it. The pointer still sets off at the start of the
 * beat, because it is aimed from `beat`; only the consequences wait.
 *
 * WHAT NOT TO GATE
 *
 * The set is "beats whose visible change the click causes", which is not the same as
 * "beats that contain a click", and the difference is load-bearing. Two of PDF Explainer's
 * eleven presses are aimed at a control that only exists because of the beat they are on —
 * `to-blank` clicks into a field inside the card that beat swaps in. Gating those deadlocks
 * the gesture: the card would wait for a press aimed at a target that is not in the
 * document. And a beat whose effect lands on the *next* beat has nothing to gate; holding
 * it back only erases the previous beat's work for as long as the flight takes.
 *
 * WHEN THE PRESS NEVER COMES
 *
 * The failure is bounded and needs no timeout. A scene with no cursor, or a beat naming a
 * target that is not in the document, simply never reports — and because the gate is keyed
 * to the current beat, the next beat opens it. The worst case is one beat of a consequence
 * arriving late, which is what the code did on purpose before this existed.
 */

import { useCallback, useState } from "react";
import type { Beat, SceneState } from "./storyboard";

export interface PressGate<Name extends string> {
  /** The beat whose effects may be drawn. The beat before it, while a click is pending. */
  readonly did: Name;
  /** Its index, for the `>=` states that accumulate. */
  readonly reached: number;
  /** Hand to `PhantomCursor`'s `onPress`. */
  readonly onPress: () => void;
}

export function usePressGate<Name extends string>(
  beats: readonly Beat<Name>[],
  { beat, index, run }: SceneState<Name>,
  /** The beats whose visible change is caused by a click. See the note above. */
  clicks: ReadonlySet<Name>,
): PressGate<Name> {
  /* Keyed by the lap as well as the beat, so a loop does not inherit the press that
     opened the same beat last time round. */
  const token = `${run}:${beat}`;
  const [pressed, setPressed] = useState<string | null>(null);

  /* A new function once per beat, closing over the beat it belongs to, so a press can only
     ever open the gate for the beat it was scheduled in. The cursor holds this in a ref
     rather than watching it, precisely so that a fresh identity per beat cannot restart a
     flight — see `report` in `cursor.tsx`. */
  const onPress = useCallback(() => setPressed(token), [token]);

  /* `index > 0` because a click on the opening beat has no earlier beat to render as, and
     a scene that opens on a click is not a scene anybody arrives in the middle of. */
  const waiting = index > 0 && clicks.has(beat) && pressed !== token;

  return {
    did: waiting ? beats[index - 1].name : beat,
    reached: waiting ? index - 1 : index,
    onPress,
  };
}
