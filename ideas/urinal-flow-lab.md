# urinal-flow-lab

Not on the live site. Notes for a possible scene.

## What it is

Public urinals put liquid back on the person standing at them, and the shape of
the porcelain decides how much. This is a test rig for that: it fires a realistic
stream at six different urinal designs and counts, drop by drop, how much ends up
on shoes, shins and trousers — plus how much is still sitting in the bowl half a
minute after you walk away. You pick a fixture, set how far back the person
stands and where they aim, watch it play out, then run a full analysis and get a
number you can hold against the next design. The conclusion it keeps arriving at
is that one quantity governs almost everything: the angle at which the stream
meets the wall. Meet it shallowly enough and the splash simply stops happening.

## Suggested copy

**headline**
Splashback is a geometry problem.

**why**
Urinals throw liquid back at the person using them, and nobody measures how much
before the mould is cut.

**notes**
- Thirty degrees to the wall, splash collapses
- Six fixtures, same stream, same seed
- Every drop accounted for, or it fails

**invitation**
Pick a shape, count the drops.

## Ten ways to demo it

1. The section's own paragraph becomes the wall: a stream arcs in from off-screen right, strikes the text near normal incidence, and the corona fires beads that stick to the visitor's viewport as flattened droplets and slide down over the copy for the rest of the scene.
2. The entire page tips into a side-elevation drawing — nav, headings and body text rotating into a sagittal section — and the constant-angle wall integrates itself upward through the layout as a glowing curve, cutting each incoming ray at exactly 25° as it climbs.
3. Full-screen impingement takeover: every element on the page gets false-coloured by the angle at which the stream would strike it, cool teal under 30° and molten red over, with a hard break at the criterion so the visitor's own buttons read as splash hazards.
4. A dashed ballistic arc leaves the visitor's cursor, re-solving live as the pointer moves, with the landing angle printed at the impact point — and a droplet tally that ticks up along the bottom edge of the browser window whenever the arc lands somewhere steep.
5. Rayleigh–Plateau at full width: one coherent cyan jet stretched edge to edge, a sinusoidal wobble growing exponentially along it, then pinching into a droplet train spaced 4.51 jet diameters apart, each pinch snapping with a hairline flash.
6. Split-screen A/B where the flat slab and the constant-angle wall run the same seeded void side by side, until the flat side's counter overruns its box and spills digits down the page while the other never leaves zero.
7. The superhydrophobic trap: the scene offers the obvious fix as a shimmering coating that sweeps across the bowl, then every droplet refuses to wet, rebounds straight out at the reader, and freezes 40 ms from the glass with its threshold ratio printed over it.
8. The bowl breaks out of its card, rotates to a top-down plan, and the floor deposition heat map bleeds onto the real page background — a slowly spreading puddle under the surrounding paragraphs, with a residence-time clock counting up on the worst cell.
9. Uroflowmetry ribbon: the clinical flow curve draws itself as the section's own scroll progress bar, and the stream visibly slows, falls short and re-coheres as the rate comes off peak, the breakup marker sliding back toward the exit while it happens.
10. Validation cascade finale: thirty-nine rows stamp in against their references — Rayleigh 1878, Stokes 1851, Nusselt 1916, Cossali 1997 — the last landing on a 30° criterion derived from correlations that never heard of a urinal, and the volume-closure figure settling to four decimal places while everything else dims out.

## Recommended scene

Ideas 5, 3, 2 and 6, in that order — the stream, the accusation, the fix, the
receipt. It works because each beat is caused by the one before it: the jet has to
break up before the arrivals are violent, the arrivals have to be steep before the
angle is worth accusing, and the wall has to re-form before the rerun means
anything. Beads from beat 5 stay on the glass through to the end, which is the
only part that escapes the frame.

| # | beat | ms | shot |
|---|------|----|------|
| 1 | `standby` | 1000 | Dark instrument frame. Flat slab in side elevation, HUD zeroed, faint dashed aim arc from the exit marker. Nothing moving. |
| 2 | `jet` | 900 | Standing close. A coherent jet stretches in from the right and arrives intact — it sheets down the wall and throws nothing. Breakup marker sits past the wall. |
| 3 | `pinch` | 800 | Stand-off widens. A sinusoidal wobble grows along the jet and it pinches into a droplet train at 4.51 diameters. The marker slides back inside the reach. |
| 4 | `strike` | 450 | First arrivals hit the vertical slab. Impact flare, the arrival angle stamped at the contact point, film starts to sheet down the wall. |
| 5 | `corona` | 1200 | Secondaries fire back out of the bowl toward the reader. Four or five beads land on the viewport glass and stop there. The escaped-droplet counter starts climbing. |
| 6 | `accuse` | 1400 | Full-frame takeover: the wall false-colours by impingement angle, hard break at 30°, strike zone glowing red. Legend bar draws with the criterion tick. Everything else desaturates. |
| 7 | `integrate` | 1600 | The wall unstitches and re-integrates upward as a forward-curling constant-angle curve. Fourteen arrival rays draw in one at a time, each cut at 25°, angle tick riding the curve as it climbs. |
| 8 | `rerun` | 1100 | Same seed badge lights. Identical stream, identical aim. Droplets arrive grazing at 25°, under threshold: the liquid sheets down into the sump and nothing is thrown. |
| 9 | `tally` | 1500 | Two counters land side by side, flat against constant-angle, the ratio stamping in between them. Glass beads still sitting there from beat 5. |
| 10 | `settle` | 1300 | Beads evaporate one by one. False colour drains back to the plain liquid view. Volume-closure figure resolves in the corner and holds. |

Total 11,250 ms, then a 900 ms gap before it loops.

### Notes from building it

- The generated wall cannot be slim. A surface holding 25° to a stream arriving
  from a long way in front has to sweep forward as it climbs, and it can never
  rise above the exit, because meeting a near-horizontal stream shallowly needs a
  near-horizontal surface. It ends up a forward-curling horn, which is why the
  real fixture is 510 mm deep against 360 for a conventional bowl. Worth leaving
  visible rather than tuning away — it is the trade the shape actually makes.
- Integrating against the straight ray instead of the real parabola is not a
  cosmetic shortcut. The ballistic arrival is more than ten degrees steeper by the
  time it reaches the wall, which pulls the whole surface toward the vertical and
  takes about a third off the depth.
- The lip has to be carried well below the top of the generated wall, or it
  shadows it: the stream clips the inturned lip on the way in and never reaches
  the surface the design depends on.
- The honest result on the constant-angle wall is that nothing at all is ejected —
  the impact sits under threshold, so the corona never forms. The receipt beat
  therefore reads "none left the bowl" and an unbounded ratio, which is a stronger
  frame than a small number would be.
