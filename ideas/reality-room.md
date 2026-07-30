# Reality Room

A browser-based 3D hangout with real spatial voice. Not on the live site — this is
a scene sketch.

## What it is

A video call has room for exactly one conversation. Everybody sits in one flat
channel, one person talks, the rest wait their turn, and there is no way to drift
off to the side with two friends the way you would at an actual party. Reality
Room gives the conversation somewhere to be: you send a link, the other person
opens it in an ordinary browser, and the two of you are standing in a small room
together — walk away and they thin out, step behind a wall and they go muffled,
turn your head mid-sentence and they lose the crisp edge of your voice. Ten
people in one room naturally split into three conversations happening at once,
and you rejoin one by walking over to it.

No install, no headset, no account. Four places to pick from, each built to sound
different: a carpeted basement bar with a hard-tiled back room that rings, an
open rooftop where voices fall away almost instantly, caverns with a five-second
tail, and a walled garden you can duck out of into a tea house.

## Suggested copy

**headline**
A wall takes your treble, not your volume.

**why**
A video call holds one conversation; a party holds a dozen, and only a place can
keep them apart.

**notes**
- One link, no install, no headset
- Whisper close, or address the whole room
- Every reverb tail synthesised, never downloaded

**invitation**
Headphones on, then walk behind a wall.

## Ten ways to demo it

1. **Spectrum guillotine.** The viewport becomes one live voice drawn from 20 Hz to 20 kHz, a slab of brick drops through it, and everything above 1.5 kHz is sheared off while the loudness needle beside it barely twitches.

2. **Floorplan takeover.** The tile bursts full-screen into a top-down survey of the Neon Lounge, six dots settle into two chattering clusters, then a wall slides across the doorway mid-sentence and the far cluster's subtitles lose every consonant on the frame it lands.

3. **The page acquires a reverb tail.** A first-person walk crosses into the Crystal Caverns and the site's own typography catches the room — headings ghost into five-second copies of themselves, rules smear, borders ring — and it all dries up the instant the camera steps back into the tunnel.

4. **Your cursor is the listener.** Six clusters murmur on a dark field, and whichever one sits nearest the visitor's real pointer renders crisp and legible while every other mumbles into grey, so the visitor works out they are standing in the room before anything says so.

5. **The invite escapes.** The room chip `kmp-3xd-9tq` peels off the card, flies past the top of the page into a mock of the visitor's own address bar, types itself out as `/r/kmp-3xd-9tq`, and a second avatar pops into the scene as though somebody genuinely clicked it.

6. **Eighteen times a second.** A fan of lines snaps from the listener's head to every mouth in the room, each one visibly re-firing at the real 18 Hz transform rate, and the caption points out that not one of them passes through a server.

7. **Range rings, full width.** Three labelled rings — 5.5 m whisper, 24 m normal, 95 m address-the-room — sweep out from the listener across the entire viewport, and each person's subtitle blinks into existence exactly as its ring crosses them.

8. **The head-turn.** A first-person walk approaches a group mid-sentence; the speaker turns away and the transcript shears off at 1,800 Hz on that frame, then the crosshair snaps onto the visitor's actual pointer and the whole scene collapses back into the tile.

9. **Four rooms repaint the page.** The map carousel flips through the four spaces at full screen, each one repainting the site's accent, fog depth and tail length in a single motion: lounge pink, rooftop cyan, caverns violet blooming for five whole seconds, garden green.

10. **Reverb assembling itself.** A burst of white static fills the screen, visibly splits at the 800 Hz crossover into a bass half and a treble half, and each half decays on its own clock — the impulse response being built in front of the visitor instead of arriving as a file.

## Recommended scene

Ideas 2, 1 and 3, opening on 5. It runs as one continuous argument: here is a
link, here is a place, here are two conversations, here is the wall that keeps
them apart — then the proof of *what the wall actually does*, and finally the
room's own tail ringing out through the page.

Beat 6 is the one that earns the project. Everything before it could be faked
with a volume slider; the spectrum shear cannot.

Total 14,100 ms, then an 800 ms gap before it loops.

| # | beat | ms | shot |
| --- | --- | --- | --- |
| 1 | `invite` | 1400 | Small dark tile. Room chip reads `kmp-3xd-9tq`. A phantom cursor reaches in, copies it, and a second avatar blinks in beside the first. Establishes that a link is the entire onboarding. |
| 2 | `open` | 1100 | The tile bursts to full screen. The Neon Lounge floorplan is surveyed in, perimeter first, then the tiled Vault off the east side. The takeover is the promise that this is a place, not a panel. |
| 3 | `crowd` | 1500 | Six dots drift into two clusters — one by the fire, one through the doorway in the Vault. Both sets of subtitles are fully legible at once. The listener's crosshair lands in the lounge. |
| 4 | `fan` | 1300 | A line snaps from the listener to every mouth in the room, all six clean, each re-firing on the 18 Hz tick. Makes the per-voice model visible: six separate streams, never a mix. |
| 5 | `wall` | 1600 | The Vault wall slides across the doorway. Three lines go red, the far cluster's subtitles lose their consonants, and the readout climbs to 0.70 m / 63% occluded. |
| 6 | `spectrum` | 2400 | Full-screen frequency plot of one voice, 20 Hz to 20 kHz. The brick drops through it and the cutoff marker slides from wide open down to 1.47 kHz. Everything above it collapses; the loudness meter beside it moves 5.3 dB and stops. Just under four octaves gone, almost no volume lost. The tallest bass bars punch straight through the brick, which is also correct — it is why neighbours only ever hear the bassline. |
| 7 | `strike` | 700 | Hard cut to the Crystal Caverns. A crystal is struck and a ring of light leaves the frame entirely. Short and percussive — it is an upbeat. |
| 8 | `tail` | 2400 | The ring crosses the whole viewport. The headline ghosts into blurred copies of itself, and two decay ramps draw in beneath on a decibel axis, each one reaching the floor exactly at its own RT60 — treble at 1.7 s, bass still going at 4.1 s. The tail is generated, not downloaded, and this is where that reads. |
| 9 | `settle` | 1700 | Everything folds back into the tile, the ringing dries up, the headline lands clean and the chip glows once. Returns to the opening frame so the loop is not a cut. |

### Numbers on screen, and where they come from

Every figure the scene displays is derived from the project rather than invented.

| shown | source |
| --- | --- |
| `0.70 m` | `OCCLUSION_WALL_THICKNESS` in `client/src/audio/engine.js` |
| `63 %` occluded | `1 − e^(−0.70/0.70)`, the engine's own occlusion curve at one reference thickness |
| `20 kHz → 1.47 kHz` | `OPEN_HZ · (OCCLUSION_MIN_HZ/OPEN_HZ)^occ` from `client/src/audio/spatial.js` |
| `−5.3 dB` | `1 − 0.72·occ`, the gain term applied alongside the filter in the same file |
| `4.1 s` / `1.7 s` / `5.5 s` | `cave` preset `rt60Low`, `rt60High`, `seconds` in `client/src/audio/impulse.js` |
| `800 Hz` | `cave` preset `crossoverHz`, the two-band split |
| `18 Hz` | `STATE_SEND_HZ` in `client/src/main.js` |
| `kmp-3xd-9tq` | shape of a real invite code: three groups of three from a 31-character alphabet with the ambiguous glyphs removed (`server/rooms.js`) |

One note for whoever picks this up: the inline comment beside
`OCCLUSION_WALL_THICKNESS` says "~76% occlusion", but the curve it feeds gives
`1 − e⁻¹ = 63%` at that thickness. 76% needs a metre of material. The scene
prints the derived value, not the comment.
