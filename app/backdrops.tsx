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

      <span className="bd-night-seam">
        <small>as shipped</small>
        <i />
        <small>treated</small>
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
function PagePackForeground() {
  return (
    <div className="bd bd--pagepack-front">
      <svg className="bd-pack-cable" viewBox="0 0 1600 720" preserveAspectRatio="none">
        <path className="bd-pack-wire bd-pack-wire--left" d="M-40 360 C270 360 390 260 690 330" />
        <path className="bd-pack-wire bd-pack-wire--right" d="M910 330 C1190 250 1330 360 1640 360" />
        <g transform="translate(674 303)">
          <g className="bd-pack-plug bd-pack-plug--left">
            <rect width="46" height="54" rx="8" />
            <path d="M46 17h25M46 37h25" />
          </g>
        </g>
        <g transform="translate(880 303)">
          <g className="bd-pack-plug bd-pack-plug--right">
            <rect width="46" height="54" rx="8" />
            <path d="M-25 17H0M-25 37H0" />
          </g>
        </g>
        <circle className="bd-pack-packet bd-pack-packet--a" cx="0" cy="0" r="7" />
        <circle className="bd-pack-packet bd-pack-packet--b" cx="0" cy="0" r="5" />
        {/* The spark, at the instant it parts. */}
        <g className="bd-pack-spark" transform="translate(853 330)">
          {[0, 60, 120, 180, 240, 300].map((angle) => (
            <line key={angle} x1="0" y1="0" x2="34" y2="0" transform={`rotate(${angle})`} />
          ))}
        </g>
      </svg>
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

function PdfBackdrop() {
  return (
    <div className="bd bd--pdf">
      <svg className="bd-pdf-links" viewBox="0 0 1600 760" preserveAspectRatio="none">
        <path className="bd-pdf-link bd-pdf-link--notes" d="M80 190 C300 80 490 200 700 330" />
        <path className="bd-pdf-link bd-pdf-link--tutor" d="M620 120 C790 70 900 200 820 335" />
        <path className="bd-pdf-link bd-pdf-link--quiz" d="M110 650 C360 720 560 570 760 420" />
        <path className="bd-pdf-link bd-pdf-link--match" d="M520 635 C700 710 850 560 820 420" />
      </svg>

      <span className="bd-pdf-fragment bd-pdf-fragment--notes">
        <small>slide 2 note</small>
        <b>dᵢ = c · Δt</b>
        <i>1 μs → 300 m</i>
      </span>
      <span className="bd-pdf-fragment bd-pdf-fragment--tutor">
        <small>tutor</small>
        <b>Why four satellites?</b>
        <i>The fourth solves the receiver clock error.</i>
      </span>
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
