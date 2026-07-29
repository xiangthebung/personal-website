/**
 * What is behind each project.
 *
 * The sections used to share their backgrounds through the theme: `.project--mint`
 * drew a dashed line with a dot travelling along it, and that one rule was the
 * background for both the transit extension and the choir application, because
 * both happen to be mint. A palette is not a subject. The result read as generic
 * decoration — a line and a dot — behind a project about a regional bus network.
 *
 * Two pseudo-elements was also the whole budget, which is not enough to draw a
 * road with traffic on it or a stave with music on it. So each project gets real
 * markup here instead.
 *
 * Everything in this file is a server component. There is no state and no
 * measurement: the motion is CSS keyframes on SVG, which the compositor handles
 * without waking React, and the ambience layer is `aria-hidden` and
 * `pointer-events: none` throughout. Nothing here is information — a screen reader
 * gets the project's heading, facts and scene caption instead.
 */

/* ---------------------------------------------------------------- transit ---- */

/** A bus, side on. Boxy on purpose: a GRT bus is a boxy vehicle. */
function Bus({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 132 46" aria-hidden="true">
      <g fill="currentColor">
        <rect x="2" y="6" width="126" height="30" rx="5" />
        {/* Windows, punched out so the body reads as glazed rather than solid. */}
        <g fill="var(--backdrop-hole)">
          <rect x="10" y="11" width="20" height="13" rx="2" />
          <rect x="35" y="11" width="20" height="13" rx="2" />
          <rect x="60" y="11" width="20" height="13" rx="2" />
          <rect x="85" y="11" width="14" height="13" rx="2" />
          <rect x="104" y="11" width="18" height="15" rx="2.5" />
        </g>
        {/* Wheels sit below the body, on the road line. */}
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

/**
 * The road, with traffic on it.
 *
 * Three lanes at different depths, each with its own speed, so the section reads
 * as a street seen from the far side rather than as sprites on a line. The far
 * lane is smaller, paler and slower, which is the whole of the parallax.
 */
function TransitBackdrop() {
  return (
    <div className="bd bd--transit">
      <span className="bd-sky" />

      {/* Far lane: slow, small, faint. */}
      <span className="bd-lane bd-lane--far">
        <span className="bd-road" />
        <Car className="bd-vehicle bd-vehicle--car-a" />
        <Bus className="bd-vehicle bd-vehicle--bus-a" />
      </span>

      {/* Middle lane: the one carrying the bus you are waiting for. */}
      <span className="bd-lane bd-lane--mid">
        <span className="bd-road" />
        <span className="bd-dashes" />
        <Bus className="bd-vehicle bd-vehicle--bus-b" />
        <Car className="bd-vehicle bd-vehicle--car-b" />
      </span>

      {/* Kerb furniture, static, to give the traffic something to pass. */}
      <StopPole className="bd-pole bd-pole--a" />
      <StopPole className="bd-pole bd-pole--b" />

      {/* Near lane: fast and large, crossing the very bottom of the section. */}
      <span className="bd-lane bd-lane--near">
        <span className="bd-road" />
        <Car className="bd-vehicle bd-vehicle--car-c" />
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ choir ---- */

/** Five lines and a clef: a stave wide enough to cross the whole section. */
function Stave({ className }: { className?: string }) {
  return (
    <span className={`bd-stave ${className ?? ""}`}>
      <span className="bd-stave-lines" />
      <svg className="bd-clef" viewBox="0 0 34 92" aria-hidden="true">
        {/* A treble clef, drawn as a stroke so it stays crisp at any size. */}
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

/**
 * Notes riding the staves, right to left.
 *
 * This started life in the demo's own spill layer, in front of everything, and it
 * was wrong twice. It converged on a point, so the notes gathered in the middle of
 * the section for no reason anybody could name — and because the layer sat above
 * the frame, they ended up scattered across the engraved score, which is litter on
 * top of the exact thing they were supposed to be drawing attention to.
 *
 * Here they are part of the background instead: behind the application, behind the
 * heading, travelling along the same three staves that are already drawn there. The
 * music flows in from the right and disappears behind the app, which is the reading
 * that was wanted, and it is now impossible for a note to cover a note.
 *
 * Sixteen of them, on a fixed pattern rather than random, at durations that share
 * no common factor so the stream never falls into step with itself.
 */
function NoteStream() {
  return (
    <>
      {Array.from({ length: 16 }, (_, index) => {
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
                "--dur": `${11 + (index % 7) * 1.7}s`,
                "--delay": `${-(index * 1.31).toFixed(2)}s`,
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

/**
 * Sheet music behind the application.
 *
 * Staves across the section, notes travelling along them, and two pages of
 * manuscript behind the frame, so the app looks like it is on a music stand rather
 * than floating on a gradient.
 */
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
    </div>
  );
}

/* ------------------------------------------------------------------ export --- */

const BACKDROPS: Record<string, () => React.JSX.Element> = {
  "grt-next-bus": TransitBackdrop,
  "choir-practice": ChoirBackdrop,
};

/**
 * The backdrop for a project, or nothing.
 *
 * Deliberately partial. A project whose section has no subject worth drawing keeps
 * the themed gradient it already had, which is better than inventing a motif to
 * fill a slot.
 */
export function Backdrop({ project }: { project: string }) {
  const Drawn = BACKDROPS[project];
  return Drawn ? <Drawn /> : null;
}
