# Ported verbatim from the extension

These eight files are byte-identical copies of `night-neutralizer/src/core/`:

| file | what it holds |
| --- | --- |
| `math.ts` | `clamp`, `lerp`, `smoothstep`, `approach`, dB conversions |
| `soft-clip.ts` | the final audio safety clipper's transfer function |
| `types.ts` | `Settings`, `VideoParams`, `AudioParams`, `DEFAULT_SETTINGS` |
| `strength.ts` | the 0–100 slider mapped to real DSP and tone-curve numbers |
| `tone-curve.ts` | the whole video algorithm: scene stats, adaptation loop, knee solver |
| `readings.ts` | the plain-language captions, derived from the real curves |
| `meter.ts` | the popup's live meter: gain applied now, light ratio, and its wording |
| `presets.ts` | the three preset chips, what each sets, and which one a setting matches |

They are pure: no DOM, no `chrome.*`, no dependencies. That is the entire reason
the demo on this site can be honest — it is not a video of the extension working,
it is the extension's own maths running in the visitor's browser.

**Do not edit them here.** If the algorithm changes, recopy from the extension so
the two stay diffable. Anything site-specific belongs in `../scene.ts` or
`../demo.tsx` instead.
