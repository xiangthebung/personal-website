/**
 * Project-specific ambience, keyed by subject rather than palette.
 *
 * Every layer here is decorative, inert server markup. The project section owns
 * the accessible explanation; these shapes are allowed to leave the demo well,
 * but the stylesheet gives the editorial copy a hard protected zone.
 */

/* ---------------------------------------------------------------- transit ---- */

/** A bus, side on. Boxy on purpose: a GRT bus is a boxy vehicle. */
function Bus({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 132 46" aria-hidden="true">
      <g fill="currentColor">
        <rect x="2" y="6" width="126" height="30" rx="5" />
        <g fill="var(--backdrop-hole)">
          <rect x="10" y="11" width="20" height="13" rx="2" />
          <rect x="35" y="11" width="20" height="13" rx="2" />
          <rect x="60" y="11" width="20" height="13" rx="2" />
          <rect x="85" y="11" width="14" height="13" rx="2" />
          <rect x="104" y="11" width="18" height="15" rx="2.5" />
        </g>
        <circle cx="30" cy="38" r="7" />
        <circle cx="100" cy="38" r="7" />
      </g>
      <g fill="var(--backdrop-hole)">
        <circle cx="30" cy="38" r="2.6" />
        <circle cx="100" cy="38" r="2.6" />
      </g>
    </svg>
  );
}

/** A car, side on. Lower and rounder than the bus so the silhouettes differ. */
function Car({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 92 34" aria-hidden="true">
      <g fill="currentColor">
        <path d="M4 24V17c0-2 1.4-3.6 3.4-4l12-2.4 6.6-5.2C27.4 4.5 29 4 30.7 4h16.6c2 0 3.8.9 5 2.5L58 14l24 2.6c3 .3 5.2 2.6 5.2 5.4V24z" />
        <circle cx="24" cy="26" r="6.5" />
        <circle cx="68" cy="26" r="6.5" />
      </g>
      <g fill="var(--backdrop-hole)">
        <path d="M31 8.5h14.5c1 0 2 .5 2.6 1.3l3.6 4.9-20.7-.6z" />
        <circle cx="24" cy="26" r="2.4" />
        <circle cx="68" cy="26" r="2.4" />
      </g>
    </svg>
  );
}

/** A stop pole with its flag, the thing the extension is actually about. */
function StopPole({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 26 84" aria-hidden="true">
      <g fill="currentColor">
        <rect x="11" y="10" width="3.4" height="74" rx="1.7" />
        <rect x="0" y="0" width="26" height="17" rx="3" />
      </g>
      <g fill="var(--backdrop-hole)">
        <rect x="4" y="5" width="18" height="2.6" rx="1.3" />
        <rect x="4" y="10" width="11" height="2.6" rx="1.3" />
      </g>
    </svg>
  );
}

function TransitBackdrop() {
  return (
    <div className="bd bd--transit">
      <span className="bd-sky" />
      <span className="bd-lane bd-lane--far">
        <span className="bd-road" />
        <Car className="bd-vehicle bd-vehicle--car-a" />
        <Bus className="bd-vehicle bd-vehicle--bus-a" />
      </span>
      <span className="bd-lane bd-lane--mid">
        <span className="bd-road" />
        <span className="bd-dashes" />
        <Bus className="bd-vehicle bd-vehicle--bus-b" />
        <Car className="bd-vehicle bd-vehicle--car-b" />
      </span>
      <StopPole className="bd-pole bd-pole--a" />
      <StopPole className="bd-pole bd-pole--b" />
      <span className="bd-lane bd-lane--near">
        <span className="bd-road" />
        <Car className="bd-vehicle bd-vehicle--car-c" />
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ choir ---- */

function Stave({ className }: { className?: string }) {
  return (
    <span className={`bd-stave ${className ?? ""}`}>
      <span className="bd-stave-lines" />
      <svg className="bd-clef" viewBox="0 0 34 92" aria-hidden="true">
        <path
          d="M18.5 84c6.5 0 10-4.3 10-9.2 0-5.6-4.4-9.3-10.6-9.3-2.6 0-5 .7-6.9 2M18.5 84c-3.4 0-5.6-2.2-5.6-5.3 0-4.7 3.7-9.6 8.4-16.2 4.6-6.5 7.4-11.4 7.4-17.2 0-6.6-4.2-11-9.6-11-5 0-8.6 3.6-8.6 8.4 0 4 2.4 6.8 6 8.9 7.6 4.4 12.5 8.8 12.5 16.6 0 5.7-3 10.6-8 15.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

const GLYPHS = ["♪", "♩", "♫", "♬", "♭", "♯"] as const;

/** Eight authored notes are enough to imply a stream without sixteen live layers. */
function NoteStream() {
  return (
    <>
      {Array.from({ length: 8 }, (_, index) => {
        const lane = index % 3;
        return (
          <span
            key={index}
            className={`bd-note bd-note--lane-${lane}`}
            aria-hidden="true"
            style={
              {
                "--glyph-size": `${[30, 22, 38, 26][index % 4]}px`,
                "--drift": `${((index % 5) - 2) * 1.4}vh`,
                "--spin": `${(index % 2 === 0 ? -1 : 1) * (6 + (index % 4) * 5)}deg`,
                "--dur": `${13 + (index % 5) * 2.1}s`,
                "--delay": `${-(index * 2.37).toFixed(2)}s`,
              } as React.CSSProperties
            }
          >
            {GLYPHS[index % GLYPHS.length]}
          </span>
        );
      })}
    </>
  );
}

function ChoirBackdrop() {
  return (
    <div className="bd bd--choir">
      <span className="bd-page bd-page--a" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      <span className="bd-page bd-page--b" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <Stave className="bd-stave--a" />
      <Stave className="bd-stave--b" />
      <Stave className="bd-stave--c" />
      <NoteStream />

      {/* A score-edge register: measure numbers beyond the embedded page make the
          104-bar rehearsal feel larger than the iframe without pretending to be UI. */}
      <span className="bd-choir-ledger" aria-hidden="true">
        <small>measure</small>
        {[17, 33, 49, 65].map((measure) => (
          <i key={measure}>{measure}</i>
        ))}
        <b>SATB · 104 bars</b>
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------- night --- */

/** One room drawing. The treated copy is cropped to half-width before filtering. */
function NightRoom({ className }: { className?: string }) {
  return (
    <span className={`bd-night-room ${className ?? ""}`}>
      <span className="bd-night-wall" />
      <span className="bd-night-floor" />
      <span className="bd-night-window">
        <i className="bd-night-sky" />
        <i className="bd-night-fire" />
        <i className="bd-night-mullion bd-night-mullion--v" />
        <i className="bd-night-mullion bd-night-mullion--h" />
      </span>
      <span className="bd-night-picture" />
      <span className="bd-night-chair" />
      <span className="bd-night-lamp" />
      <span className="bd-night-figure" />
    </span>
  );
}

function NightBackdrop() {
  const waveform = [4, 7, 3, 9, 5, 12, 6, 14, 8, 5, 11, 4, 7, 3, 9, 5, 12, 6, 10, 4];

  return (
    <div className="bd bd--night">
      <NightRoom className="bd-night-room--base" />
      {/* Only this half-width crop receives the SVG tone curve. The old version
          filtered two full-section room copies. */}
      <span className="bd-night-treatment">
        <NightRoom className="bd-night-room--treated" />
      </span>

      {/* "before" and "after", matching the panel labels in the demo.
          These said "as shipped" and "treated", which was asked about directly: "it's
          much easier to understand if it was just before and after". Two problems in
          four words. "As shipped" is industry shorthand for a thing the reader has no
          reason to know, and having the backdrop name the halves one way while the
          panels in front of it name them another gives a visitor two vocabularies for
          one comparison and no hint that they are the same comparison. */}
      <span className="bd-night-seam">
        <small>before</small>
        <i />
        <small>after</small>
      </span>

      <span className="bd-night-waveform">
        {waveform.map((height, index) => (
          <i
            key={index}
            style={{ "--wave": height, "--sample": index } as React.CSSProperties}
          />
        ))}
        <b>limiter ceiling</b>
      </span>

      {/* The extension stands down until night; the room now carries that rule at
          its outer edge instead of leaving it buried in a fact below the film. */}
      <span className="bd-night-hour" aria-hidden="true">
        <b>01:47</b>
        <small>quiet hours active</small>
      </span>
    </div>
  );
}

/* ---------------------------------------------------------------- pagepack --- */

const PACK_SHEETS = [
  { x: "2%", y: "54%", r: "-8deg" },
  { x: "87%", y: "45%", r: "7deg" },
  { x: "8%", y: "76%", r: "5deg" },
  { x: "84%", y: "70%", r: "-6deg" },
] as const;

/**
 * The cable, in front of the scene rather than behind it.
 *
 * This lived in the backdrop with everything else, and it was invisible. Not faint —
 * invisible. `.project-ambience` sits at `z-index: 0` and the scene sits at 1, and
 * PagePack's reader panel is an opaque white card at `z-index: 8` parked across the
 * middle of the section, so the cable, both plugs and the moment they are pulled apart
 * were all behind it. The first attempt at this fixed the stroke width, which made an
 * invisible thing invisible more thickly.
 *
 * Hit-testing the section is what settled it: nine sample points across the plug, nine
 * of them reporting `div.pp-reader`. See `work/visible.mjs`.
 *
 * So it is a foreground now, and being in front turns out to be the better image
 * anyway: a power cable crossing in front of a laptop is a thing everyone has seen, and
 * when it rips apart in front of the browser you cannot miss it. It costs almost
 * nothing to look at — a 9px line across grey placeholder bars — and it is the cause of
 * everything else in the section.
 */
/**
 * The cable, in front of the scene.
 *
 * It was one stretched SVG and it looked like a child's drawing of a cable. The
 * reason is worth keeping, because it is the sort of thing that survives review:
 * `preserveAspectRatio="none"` on a 1600x720 viewBox laid into a box roughly
 * 1440x365 scales x by 0.9 and y by 0.51, so nothing in it kept its proportions.
 * A 46x54 connector with an 8px corner radius came out 41x27 with the radius
 * squashed to an oval — the fat purple lozenge in the middle of the page — and a
 * 9px stroke rendered at 8px across and 4.6px down, so the wire changed weight
 * depending on which way it was going.
 *
 * Two fixes, and they are different fixes. The wire *should* stretch: it has to span
 * the whole section at any width, and a long shallow curve does not care. It just
 * needs `vector-effect="non-scaling-stroke"` so its weight is decided in screen
 * pixels rather than by the transform. The connectors should not stretch at all, so
 * they are plain HTML positioned over the joint, where a border radius is a border
 * radius.
 *
 * The wire is also two paths per side rather than one: a dark casing with a lighter
 * core drawn over it, which is what makes it read as a round rubber cable rather than
 * as a stroked line.
 */
function PagePackForeground() {
  const sides = ["left", "right"] as const;

  /**
   * Where the two halves meet, in the stretched viewBox, and how far apart they stop.
   *
   * One number, because the wire's gap and the connectors that fill it are one thing and
   * were briefly two. The joint used to be placed by CSS at `18%` while the paths stopped
   * at 250 and resumed at 326 — 288 of 1600 is 18%, so they agreed, silently and by
   * coincidence. Anchoring the connectors to the measured window edge then moved them
   * without moving the gap, and the section shipped with a visible hole in the cable and a
   * coupler floating eighty pixels to its right. Publishing the position from the same
   * constant the paths are built from is what stops that recurring.
   */
  const JOINT_X = 288;
  const JOINT_GAP = 38;

  /**
   * The run.
   *
   * Three placements were tried and photographed. Across the middle of the section was
   * the original and it was the complaint: a cord thrown over the article the browser is
   * showing. Along the very bottom got it out of the way and put it three pixels below
   * the fold, which the visibility harness caught. Squeezed into the gap between the
   * window's bottom edge and the caption, it had about forty pixels to live in.
   *
   * So it does what a cable on a desk does: it comes in from the left, the two halves meet
   * on the open floor beside the window, and the run continues right and disappears
   * underneath it.
   */
  const paths = {
    left: `M-40 384 C110 384 196 348 ${JOINT_X - JOINT_GAP} 340`,
    /* Runs well past any window edge on purpose. What ends this cable is a `clip-path`
       positioned from `--pack-window-left`, which the pod measures — see the effect in
       `app/demos/pagepack/demo.tsx`. Drawing it to a fixed x and hoping that x is the
       window's edge is what produced a cord across the article at every width except the
       one it was measured at. */
    right: `M${JOINT_X + JOINT_GAP} 340 C372 337 460 336 1700 336`,
  };

  return (
    <div
      className="bd bd--pagepack-front"
      /* The connectors sit exactly in the gap the paths leave. See `JOINT_X`. */
      style={{ "--pack-joint-left": `${((JOINT_X / 1600) * 100).toFixed(3)}%` } as React.CSSProperties}
    >
      <svg className="bd-pack-cable" viewBox="0 0 1600 720" preserveAspectRatio="none">
        {sides.map((side) => (
          <g key={side}>
            {/* Casing, then core. Both non-scaling, so the cable is the same weight
                at every viewport and along every part of the curve. */}
            <path
              className={`bd-pack-wire bd-pack-wire--case bd-pack-wire--${side}`}
              d={paths[side]}
              vectorEffect="non-scaling-stroke"
            />
            <path
              className={`bd-pack-wire bd-pack-wire--core bd-pack-wire--${side}`}
              d={paths[side]}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        ))}
        <circle className="bd-pack-packet bd-pack-packet--a" cx="0" cy="0" r="7" />
        <circle className="bd-pack-packet bd-pack-packet--b" cx="0" cy="0" r="5" />
      </svg>

      {/* The connectors, in HTML, so a rectangle is a rectangle. Joined at rest and
          pulled apart on the cut. Their vertical position is derived in the stylesheet
          from the same band the wire uses — see `.bd-pack-joint`. */}
      <span className="bd-pack-joint">
        <span className="bd-pack-plug bd-pack-plug--left">
          <i className="bd-pack-collar" />
          <i className="bd-pack-pin" />
          <i className="bd-pack-pin" />
        </span>
        {/* One flash across the gap, on the beat the two part. */}
        <span className="bd-pack-arc" />
        <span className="bd-pack-plug bd-pack-plug--right">
          <i className="bd-pack-collar" />
          <i className="bd-pack-pin" />
          <i className="bd-pack-pin" />
        </span>
      </span>
    </div>
  );
}

function PagePackBackdrop() {
  return (
    <div className="bd bd--pagepack">
      <span className="bd-pack-status">
        <i /> network available
      </span>

      {PACK_SHEETS.map((sheet, index) => (
        <span
          className="bd-pack-sheet"
          key={index}
          style={
            {
              "--sheet-x": sheet.x,
              "--sheet-y": sheet.y,
              "--sheet-r": sheet.r,
              "--sheet-order": index,
            } as React.CSSProperties
          }
        >
          <b>{index === 0 ? "byz.html" : `linked page ${index}`}</b>
          <i />
          <i />
          <i />
        </span>
      ))}

      <span className="bd-pack-resources" aria-hidden="true">
        <small>sealed in the pack</small>
        {['HTML', 'CSS', 'images', 'fonts'].map((resource) => (
          <i key={resource}>{resource}</i>
        ))}
        <b>served locally</b>
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ decaf --- */

const ATTENTION_CARDS = [
  { x: "69%", y: "9%", r: "-7deg", count: "48.2K" },
  { x: "84%", y: "29%", r: "6deg", count: "1.2M" },
  { x: "67%", y: "73%", r: "5deg", count: "9,417" },
  { x: "85%", y: "66%", r: "-5deg", count: "310K" },
] as const;

function DecafBackdrop() {
  return (
    <div className="bd bd--decaf">
      {ATTENTION_CARDS.map((card, index) => (
        <span
          className="bd-decaf-card"
          key={card.count}
          style={
            {
              "--card-x": card.x,
              "--card-y": card.y,
              "--card-r": card.r,
              "--card-order": index,
            } as React.CSSProperties
          }
        >
          <i className="bd-decaf-avatar" />
          <i className="bd-decaf-media">
            <b />
          </i>
          <span className="bd-decaf-count">
            <b>{card.count}</b>
            <em>—</em>
          </span>
        </span>
      ))}

      <span className="bd-decaf-badge">12</span>
      <svg className="bd-decaf-hold" viewBox="0 0 240 240">
        <circle className="bd-decaf-hold-track" cx="120" cy="120" r="104" />
        <circle className="bd-decaf-hold-fill" cx="120" cy="120" r="104" />
      </svg>

      <span className="bd-decaf-ladder" aria-hidden="true">
        <small>daily pass</small>
        {['3s', '7s', '11s', '15s'].map((delay, index) => (
          <i key={delay} data-first={index === 0}>{delay}</i>
        ))}
      </span>
    </div>
  );
}

/* ---------------------------------------------------------- PDF Explainer --- */

/**
 * The four satellites the deck is about, drawn.
 *
 * Positions are in the sky SVG's own 1600x760 space. Spread wide and at different
 * heights, because the whole point of the slide is that four ranges from four
 * directions are what pin a position — four satellites in a neat row would be a
 * picture of the wrong idea.
 *
 * `delay` staggers each one's range pulse so the sky is never all bright or all dark
 * at once, and so the four rings read as four independent signals rather than as one
 * effect applied four times.
 */
const PDF_SATS = [
  { x: 196, y: 152, delay: "0ms", label: "SV 14" },
  { x: 608, y: 98, delay: "1400ms", label: "SV 22" },
  { x: 1032, y: 142, delay: "2800ms", label: "SV 07" },
  { x: 1408, y: 216, delay: "4200ms", label: "SV 31" },
] as const;

/** Where the receiver sits — the point all four ranges are solving for. */
const PDF_RECEIVER = { x: 800, y: 792 } as const;

/**
 * The sky's coordinate space, and why it is this shape.
 *
 * `preserveAspectRatio="xMidYMid slice"` scales to *cover* the section, so the closer
 * the viewBox is to the section's own proportions the less of it is thrown away. At
 * 1600x760 in a 1440x1009 section the scale came out 1.33 and the sides were cropped
 * off: two of the four satellites were outside the frame, and the two that survived
 * were a third larger than intended and sitting on top of the pod's captions.
 *
 * 1600x1010 is close enough to the section that the scale lands near 1 and the whole
 * constellation is in shot. `slice` rather than `meet` because a backdrop that
 * letterboxes has bands of nothing at the top and bottom, and rather than `none`
 * because this drawing is full of circles and right angles that must not be stretched.
 */
const PDF_SKY = { w: 1600, h: 1010 } as const;

function PdfBackdrop() {
  return (
    <div className="bd bd--pdf">
      {/* --------------------------------------------------------------- the sky
          The section used to be pale nothing behind a few floating captions, and the
          deck in the pod is a lecture on measuring distance by time of flight. So the
          background is that lecture's own diagram at wall size: four satellites, a
          range line down from each, the rings of a signal leaving them, and the
          receiver they are all solving for.

          `xMidYMid slice` rather than `none`: this one is full of round things and
          right angles, and stretching it to the section's aspect ratio would turn the
          dishes into ovals and lean the solar panels over. The links layer below can
          stretch because it is only smooth curves. */}
      <svg
        className="bd-pdf-sky"
        viewBox={`0 0 ${PDF_SKY.w} ${PDF_SKY.h}`}
        preserveAspectRatio="xMidYMid slice"
      >
        {/* The horizon, and the ground the receiver stands on. */}
        <path className="bd-pdf-horizon" d="M-40 838 H1640" />

        {PDF_SATS.map((sat) => (
          <g className="bd-pdf-sat" key={sat.label} style={{ "--delay": sat.delay } as React.CSSProperties}>
            {/* The range line down to the receiver: what the slide calls the
                pseudorange, dashed because it is a measurement rather than a thing. */}
            <path
              className="bd-pdf-range"
              d={`M${sat.x} ${sat.y} L${PDF_RECEIVER.x} ${PDF_RECEIVER.y}`}
            />

            {/* Two rings leaving the satellite, one behind the other. This is the
                time-of-flight idea itself — the distance is how long the ring took. */}
            <circle className="bd-pdf-ping bd-pdf-ping--a" cx={sat.x} cy={sat.y} r="26" />
            <circle className="bd-pdf-ping bd-pdf-ping--b" cx={sat.x} cy={sat.y} r="26" />

            <g className="bd-pdf-sat-body" transform={`translate(${sat.x} ${sat.y})`}>
              {/* Solar panels, then the bus, then the dish pointed at the ground. */}
              <rect className="bd-pdf-panel" x="-40" y="-7" width="26" height="14" rx="1.5" />
              <rect className="bd-pdf-panel" x="14" y="-7" width="26" height="14" rx="1.5" />
              <path className="bd-pdf-spar" d="M-14 0h28" />
              <rect className="bd-pdf-bus" x="-11" y="-11" width="22" height="22" rx="3" />
              <path className="bd-pdf-dish" d="M-7 11 A9 9 0 0 0 7 11 Z" />
            </g>

            <text className="bd-pdf-sat-label" x={sat.x} y={sat.y - 26}>
              {sat.label}
            </text>
          </g>
        ))}

        {/* The trilateration triangle: three of the four, joined. The fourth is the
            one that solves the clock, which is exactly the tutor's answer in the pod. */}
        <path
          className="bd-pdf-tri"
          d={`M${PDF_SATS[0].x} ${PDF_SATS[0].y} L${PDF_SATS[1].x} ${PDF_SATS[1].y} L${PDF_SATS[2].x} ${PDF_SATS[2].y} Z`}
        />

        {/* The receiver, and the rings closing on it. */}
        <g className="bd-pdf-rx" transform={`translate(${PDF_RECEIVER.x} ${PDF_RECEIVER.y})`}>
          <circle className="bd-pdf-rx-halo" r="34" />
          <circle className="bd-pdf-rx-halo bd-pdf-rx-halo--wide" r="34" />
          <rect className="bd-pdf-rx-body" x="-13" y="-9" width="26" height="18" rx="3" />
          <path className="bd-pdf-rx-mast" d="M0 -9 V-26" />
          <circle className="bd-pdf-rx-tip" cy="-28" r="3" />
        </g>

        {/* There was a `d = c · Δt` set into the ground here, and it was the third copy
            of that equation in one section: the slide's own figure draws it, the notes
            card prints it, and this drew it again — landing on top of the matching
            fragment while it did. The diagram says it without the algebra. */}
      </svg>

      <svg className="bd-pdf-links" viewBox="0 0 1600 760" preserveAspectRatio="none">
        <path className="bd-pdf-link bd-pdf-link--notes" d="M80 190 C300 80 490 200 700 330" />
        <path className="bd-pdf-link bd-pdf-link--tutor" d="M620 120 C790 70 900 200 820 335" />
        <path className="bd-pdf-link bd-pdf-link--quiz" d="M110 650 C360 720 560 570 760 420" />
        <path className="bd-pdf-link bd-pdf-link--match" d="M520 635 C700 710 850 560 820 420" />
      </svg>

      {/* Two fragments used to sit up here: one reading `dᵢ = c · Δt`, one asking "Why
          four satellites?". Both are now drawn rather than written — the equation is set
          into the ground and the four satellites are overhead — so keeping the captions
          meant the section said each thing twice, and a photograph showed a satellite
          landing directly on top of the sentence about satellites. The drawing won. */}
      <span className="bd-pdf-fragment bd-pdf-fragment--quiz">
        <small>quiz</small>
        <b>A · 300 metres</b>
        <i>correct</i>
      </span>
      <span className="bd-pdf-fragment bd-pdf-fragment--concept">
        <small>matching</small>
        <b>Pseudorange</b>
      </span>
      <span className="bd-pdf-fragment bd-pdf-fragment--definition">
        <small>paired</small>
        <b>A distance containing clock error</b>
      </span>

      <span className="bd-pdf-deck" aria-hidden="true">
        <small>deck</small>
        <i>01</i>
        <i data-current>02</i>
        <i>03</i>
        <b>02 / 10</b>
      </span>
    </div>
  );
}

/* ----------------------------------------------------------------- n-back --- */

const MEMORY_CUES = [
  { cell: 2, letter: "K" },
  { cell: 6, letter: "R" },
  { cell: 2, letter: "T" },
  { cell: 4, letter: "R" },
] as const;

function MemoryCue({ order, cell, letter }: { order: number; cell: number; letter: string }) {
  return (
    <span className={`bd-memory-cue bd-memory-cue--${order + 1}`}>
      <span className="bd-memory-grid">
        {Array.from({ length: 9 }, (_, index) => (
          <i key={index} data-on={index === cell} />
        ))}
      </span>
      <b>{letter}</b>
      <small>{order + 1}</small>
    </span>
  );
}

function NBackBackdrop() {
  return (
    <div className="bd bd--nback">
      <svg className="bd-memory-path" viewBox="0 0 1600 760" preserveAspectRatio="none">
        <path d="M90 590 C260 350 420 610 570 360 S760 120 980 360" />
        <path className="bd-memory-return bd-memory-return--square" d="M90 590 C300 230 500 190 710 180" />
        <path className="bd-memory-return bd-memory-return--letter" d="M350 150 C560 650 790 660 980 540" />
      </svg>
      {MEMORY_CUES.map((cue, order) => (
        <MemoryCue key={order} order={order} cell={cue.cell} letter={cue.letter} />
      ))}
      <span className="bd-memory-rule">compare with two cues earlier</span>
      <span className="bd-memory-register" aria-hidden="true">
        <i><b>−2</b> target</i>
        <i><b>−1</b> hold</i>
        <i><b>now</b> compare</i>
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ export --- */

const BACKDROPS: Record<string, () => React.JSX.Element> = {
  "grt-next-bus": TransitBackdrop,
  "choir-practice": ChoirBackdrop,
  "night-neutralizer": NightBackdrop,
  pagepack: PagePackBackdrop,
  decaf: DecafBackdrop,
  "pdf-explainer": PdfBackdrop,
  "n-back": NBackBackdrop,
};

/**
 * Backdrops that have a part which belongs in *front* of the scene.
 *
 * Deliberately near-empty. A foreground is a thing that covers the software the
 * section exists to show, so the bar for putting something here is that the scene is
 * unreadable without it — which is true of exactly one thing so far: PagePack's cable,
 * whose whole job is to be seen being cut.
 */
const FOREGROUNDS: Record<string, () => React.JSX.Element> = {
  pagepack: PagePackForeground,
};

/** A backdrop selected by project id. Palettes never decide subject matter. */
export function Backdrop({ project }: { project: string }) {
  const Drawn = BACKDROPS[project];
  return Drawn ? <Drawn /> : null;
}

/** The part of a backdrop that sits over the scene. Usually nothing. */
export function BackdropFront({ project }: { project: string }) {
  const Drawn = FOREGROUNDS[project];
  return Drawn ? <Drawn /> : null;
}
