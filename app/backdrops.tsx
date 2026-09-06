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

      {/* A register of measure numbers used to stand here — 17, 33, 49, 65 under
          "SATB · 104 bars" — describing a score the pod stopped opening a long time
          ago, and then a live echo of the app's bar ruler, which the right-hand
          manuscript leaf covered. The ruler is on the stand's own ledge now, in the
          pod, where it sits under the score it echoes: see `.choir-ledger`. */}
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
        {/* `soft clip`, not `limiter ceiling`, and the rename is about a collision rather
            than accuracy — both were true of the extension. The scene in front of this
            draws its own line across two meters, and that line is explicitly *not* the
            limiter's ceiling: it is the part of the scale you do not want to be in, and
            the note on `CEILING` in the pod says so at length. Two lines a few hundred
            pixels apart, both labelled as a ceiling, meaning different things, is a
            reader's problem rather than a writer's. This one names the mechanism it
            belongs to — `core/soft-clip.ts` — and the other keeps the plain meaning. */}
        <b>soft clip</b>
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

      {/* There was a huge echo of the notice card's "Hold 3s" ring here, and it is gone
          because of what it looked like rather than what it was for. At the size this
          section gives it, clipped to the right two thirds by the editorial safe zone, all
          that survived was the bottom of the arc: a pale curve under the browser window,
          attached to nothing. Reported as exactly that — "there's a line in the background,
          what is that?"
          The idea is already in the frame twice, and better both times: the real hold ring
          inside the notice, and the ladder below, which is the part that says the wait gets
          longer each time. */}

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
 * The lecture's own figure, at wall size.
 *
 * The pod runs a lecture on gradient descent, so the room behind it is the loss
 * surface drawn as contours, with the two descents the deck compares walking into the
 * same minimum: batch, one exact and expensive step per pass, a clean curve; and
 * stochastic, one cheap noisy step per example, a zig-zag. That second one is the
 * phrase the film highlights on the slide and asks about, so it is the one a ball
 * walks.
 *
 * This replaced a GPS constellation — four satellites and their ranges — which was the
 * diagram of the lecture the previous film read and stopped being true of the section
 * the moment the deck changed.
 *
 * Coordinates are in the bowl SVG's own 1600x1010 space. `preserveAspectRatio="xMidYMid
 * slice"` scales to *cover* the section, so the closer the viewBox is to the section's
 * own proportions the less is thrown away; 1600x1010 lands the scale near 1 at a
 * 1440x1009 section. `slice` rather than `none` because ellipses must not be stretched
 * into something else.
 */
const PDF_BOWL = { w: 1600, h: 1010 } as const;

/** Where both paths end, off the section's centre so the pod does not sit on it. */
const PDF_MINIMUM = { x: 1010, y: 650 } as const;

/** Seven contours, outermost first, as the ellipse's long radius. */
const PDF_CONTOURS = [640, 520, 410, 310, 220, 140, 70] as const;

/**
 * The stochastic path, stepped: each pair of moves is one noisy step, and the jitter
 * shrinks as the minimum nears — which is what a decaying learning rate looks like,
 * and is slide 4. The same string is handed to the stylesheet as `--sgd`, so the ball's
 * `offset-path` and the drawn line cannot disagree.
 */
const PDF_SGD =
  "M180 150 L262 212 L236 262 L332 298 L320 356 L422 370 L432 430 L522 428 L548 494 " +
  "L642 486 L666 548 L760 542 L790 594 L872 588 L900 628 L962 620 L992 648 " +
  `L${PDF_MINIMUM.x} ${PDF_MINIMUM.y}`;

/** Batch descent: the same start and end, one smooth curve between. */
const PDF_BATCH = `M180 150 C 420 210, 720 430, ${PDF_MINIMUM.x} ${PDF_MINIMUM.y}`;

function PdfBackdrop() {
  return (
    <div className="bd bd--pdf">
      <svg
        className="bd-pdf-bowl"
        viewBox={`0 0 ${PDF_BOWL.w} ${PDF_BOWL.h}`}
        preserveAspectRatio="xMidYMid slice"
        style={{ "--sgd": `path("${PDF_SGD}")` } as React.CSSProperties}
      >
        {/* The loss surface. Tilted, because a bowl seen square-on is a set of
            concentric circles, which reads as a target rather than as terrain. */}
        {PDF_CONTOURS.map((radius, ring) => (
          <ellipse
            className="bd-pdf-contour"
            key={radius}
            cx={PDF_MINIMUM.x}
            cy={PDF_MINIMUM.y}
            rx={radius}
            ry={Math.round(radius * 0.58)}
            transform={`rotate(-16 ${PDF_MINIMUM.x} ${PDF_MINIMUM.y})`}
            style={{ "--ring": ring } as React.CSSProperties}
          />
        ))}

        <path className="bd-pdf-path--batch" d={PDF_BATCH} />
        <path className="bd-pdf-path--sgd" d={PDF_SGD} />

        {/* The ball, walking the noisy path over and over. */}
        <g className="bd-pdf-ball">
          <circle className="bd-pdf-ball-halo" r="14" />
          <circle className="bd-pdf-ball-core" r="6" />
        </g>

        <g transform={`translate(${PDF_MINIMUM.x} ${PDF_MINIMUM.y})`}>
          <circle className="bd-pdf-minimum-halo" r="30" />
          <circle className="bd-pdf-minimum" r="5" />
        </g>

        <text className="bd-pdf-label" x="150" y="122">
          J(θ)
        </text>
        <text className="bd-pdf-label" x={PDF_MINIMUM.x + 44} y={PDF_MINIMUM.y + 5}>
          min
        </text>
      </svg>

      {/* The deck, at the section's edge: five slides, the current one stepping as the
          reader presses on and the explained ones taking the rail's violet as each batch
          lands. Keyed to the film in the stylesheet. */}
      <span className="bd-pdf-deck" aria-hidden="true">
        <small>deck</small>
        {[1, 2, 3, 4, 5].map((slide) => (
          <i key={slide} data-slide={slide}>
            {String(slide).padStart(2, "0")}
          </i>
        ))}
        <b>5 slides</b>
      </span>
    </div>
  );
}

/* ----------------------------------------------------------------- n-back --- */

/**
 * N-Back: the match, ringing out of the well.
 *
 * Nothing behind the scene any more. This section used to draw the four held cues
 * behind the well — a dashed path through them, a register of `−2 target · −1 hold ·
 * now compare`, a pill restating the rule — from when the scene was a diagram of a
 * rule the game did not show. The game shows it now, and the scene is its play
 * screen: the strip under the board holds the cues, and the scene projects them into
 * the sides of the well itself, in the game's face. A second set behind the well was
 * the same four cards twice.
 *
 * What is left is in front. When the strip's bracket snaps, a ring goes out of it and
 * across the section — one per match beat, keyed on `data-scene-beat` in the
 * stylesheet, so each can play whole. In the foreground rather than behind, because a
 * ring that leaves the frame has to be seen leaving it, and behind an opaque well it
 * would only ever be seen arriving somewhere else.
 */
function NBackForeground() {
  return (
    <div className="bd-nback-front">
      <span className="bd-nback-ring bd-nback-ring--square" />
      <span className="bd-nback-ring bd-nback-ring--letter" />
    </div>
  );
}

/* ------------------------------------------------------------- 2FA Paster --- */

/**
 * 2FA Paster: two washes, one per verdict, and nothing with a digit on it.
 *
 * It had a drawn backdrop once — four envelopes drifting at four depths, each carrying
 * six digits, one of them marked as the one that belongs to the site you are on. The
 * idea was right and the room was wrong: this is the fullest section on the page, its
 * pod runs the whole measure, and the editorial fade takes the top third. The only
 * envelope that survived landed on the scene's own "GMAIL — UNREAD INBOX" label, which
 * put an *invented* six-digit code a centimetre from the real ones the scene is about,
 * in a section whose entire subject is telling one code from another.
 *
 * So the room carries no object at all. What it carries is the scene's verdict: a
 * violet wash rises behind the pod as the code goes in and the button goes down, and
 * an amber one replaces it when the second code is held. Keyed off `data-scene-reached`,
 * which the pod publishes — see `#two-factor-paster` in the stylesheet.
 */
function PasterBackdrop() {
  return (
    <div className="bd bd--tfa">
      <span className="bd-tfa-wash bd-tfa-wash--pass" />
      <span className="bd-tfa-wash bd-tfa-wash--hold" />
    </div>
  );
}

/* -------------------------------------------------------------- names hidden --- */

/**
 * Totem: the vocabulary, scattered.
 *
 * Nine marks in nine of the app's twenty-four hues, drifting. The section in front of
 * this is about four totems; this is the room they were drawn from, which is the one
 * thing a single screen of a list cannot show.
 *
 * Shapes rather than one repeated dot, because the app's own colour-blind redundancy is
 * that every colour carries a shape — see `stimuli` in the N-Back sense, and
 * `displayColor` in Totem's. A scatter of identical circles in different colours would be
 * a picture of the thing that project deliberately does not do.
 */
const SCATTER = [
  { hue: "#AB39E8", x: 10, y: 18, s: 1, shape: "disc" },
  { hue: "#10CB68", x: 78, y: 12, s: 0.7, shape: "square" },
  { hue: "#FF2D55", x: 24, y: 62, s: 0.85, shape: "diamond" },
  { hue: "#3BC6F0", x: 88, y: 48, s: 0.6, shape: "disc" },
  { hue: "#F0A93B", x: 46, y: 84, s: 0.75, shape: "square" },
  { hue: "#8A83FF", x: 64, y: 72, s: 0.55, shape: "diamond" },
  { hue: "#E8437F", x: 6, y: 88, s: 0.65, shape: "disc" },
  { hue: "#5FD9A8", x: 92, y: 82, s: 0.5, shape: "square" },
  { hue: "#C77DFF", x: 36, y: 34, s: 0.45, shape: "diamond" },
] as const;

function TotemBackdrop() {
  return (
    <div className="bd bd--totem">
      {/* The dealt totem's sound reaching the room: a wash in its colour, thrown once
          on the deal and once, quieter, as the recall card arrives. Section furniture,
          styled from `globals.css` off `data-scene-beat`, so it is on screen before the
          scene's chunk is and takes its hue from the `--totem-hue` the scene sets. */}
      <span className="bd-totem-pulse" aria-hidden="true" />

      {SCATTER.map((mark, index) => (
        <span
          className="bd-totem-mark"
          key={`${mark.hue}-${index}`}
          data-shape={mark.shape}
          style={
            {
              "--mark-x": mark.x,
              "--mark-y": mark.y,
              "--mark-s": mark.s,
              "--mark-hue": mark.hue,
              "--mark-order": index,
            } as React.CSSProperties
          }
        />
      ))}

      {/* The app's icon is not here, and it was. Placed in this backdrop it sat at a
          percentage of the section, and the well is centred in a section whose height
          is the window's: on a 1000px-tall window the well's top edge cut the mark in
          half. It is the scene's mark now, in the well's own air — see `.tot-mark`. */}
    </div>
  );
}

/* ------------------------------------------------------- measured, not guessed --- */

/**
 * Byte Budget: the page's own hosts, climbing towards the plan.
 *
 * Five runs, one per host the scene's page is spending on, each split where measurement
 * ended and estimation began — teal to the left of the seam, amber to the right, which
 * are the extension's own two semantic colours and the section's whole argument. The
 * runs climb with the film: `at` is each host's length at the four beats the scene
 * publishes, as a fraction of the way to the cap, and the stylesheet picks the one for
 * the beat the section has reached. The stream's run is the one that arrives at the
 * cap, and stops there rather than through it.
 *
 * The splits are not decorative: a video edge that streams its segments cannot be
 * measured by the page and declares no length, so the model supplies a third of it; a
 * mail client on its own origin can be measured almost entirely. A backdrop that showed
 * every host equally certain would be arguing against the section in front of it.
 */
const BYTE_HOSTS = [
  { host: "media.watch.example", split: 0.64, at: [0.3, 0.55, 0.8, 1], media: true },
  { host: "img.watch.example", split: 0.22, at: [0.16, 0.19, 0.21, 0.22], media: false },
  { host: "watch.example", split: 0.93, at: [0.11, 0.12, 0.13, 0.13], media: false },
  { host: "mail.example", split: 0.97, at: [0.07, 0.07, 0.07, 0.07], media: false },
  { host: "Background & other", split: 0.52, at: [0.05, 0.05, 0.05, 0.05], media: false },
] as const;

function BytesBackdrop() {
  return (
    <div className="bd bd--bytes">
      <span className="bd-bytes-cap" aria-hidden="true">
        <small>5.0 GB plan</small>
      </span>
      {BYTE_HOSTS.map((run, index) => (
        <span
          className="bd-bytes-run"
          key={run.host}
          data-media={run.media || undefined}
          style={
            {
              "--run-split": run.split,
              "--run-order": index,
              "--run-load": run.at[0],
              "--run-climb": run.at[1],
              "--run-surge": run.at[2],
              "--run-refuse": run.at[3],
            } as React.CSSProperties
          }
        >
          <small>{run.host}</small>
          <i />
        </span>
      ))}
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
  "two-factor-paster": PasterBackdrop,
  totem: TotemBackdrop,
  "byte-budget": BytesBackdrop,
};

/**
 * Backdrops that have a part which belongs in *front* of the scene.
 *
 * Deliberately near-empty. A foreground is a thing that covers the software the
 * section exists to show, so the bar for putting something here is that the scene is
 * unreadable without it — which is true of PagePack's cable, whose whole job is to be
 * seen being cut — or that the thing is a ring leaving the frame, which cannot be seen
 * leaving from behind an opaque well: N-Back's match.
 */
const FOREGROUNDS: Record<string, () => React.JSX.Element> = {
  pagepack: PagePackForeground,
  "n-back": NBackForeground,
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
