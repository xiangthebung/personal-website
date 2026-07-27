"use client";

import { useEffect, useRef } from "react";

type Point = { x: number; y: number };

/**
 * The stroke is authored inside a fixed design box so its proportions never
 * distort with the canvas aspect ratio. Only the points up to the hand-off are
 * taken from the design: the final point is computed at draw time so the tip
 * lands on the measured position of the "Open project" link.
 */
const DESIGN_SPAN_X = 93;
const DESIGN_SPAN_Y = 37.5;
const SAMPLES_PER_SEGMENT = 18;
const SPLINE_TENSION = 0.92;

/**
 * Waypoints of the stroke, tail first: a long low run into a single tidy curl,
 * then one sweep that climbs out of the rail. The last entry is the nominal tip;
 * it is replaced by the measured aim before drawing, and the entry before it is
 * the hand-off the final straight run starts from.
 */
const SPINE: Point[] = [
  { x: 2, y: 40 },
  { x: 12, y: 39.4 },
  { x: 22, y: 37.6 },
  { x: 30, y: 34.4 },
  { x: 36.5, y: 30 },
  { x: 38.5, y: 24.4 },
  { x: 34.5, y: 20.8 },
  { x: 28, y: 21.6 },
  { x: 25.2, y: 26.4 },
  { x: 27.6, y: 31.6 },
  { x: 34.5, y: 35 },
  { x: 44, y: 37 },
  { x: 55, y: 37.2 },
  { x: 66, y: 34.6 },
  { x: 76, y: 29 },
  { x: 85, y: 20.5 },
  { x: 91.9, y: 11 },
  { x: 95, y: 2.5 },
];

const HAND_OFF = SPINE[SPINE.length - 2];
const NOMINAL_TIP = SPINE[SPINE.length - 1];

function cubicAt(p0: Point, c0: Point, c1: Point, p1: Point, t: number): Point {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;

  return {
    x: a * p0.x + b * c0.x + c * c1.x + d * p1.x,
    y: a * p0.y + b * c0.y + c * c1.y + d * p1.y,
  };
}

/**
 * Samples a Catmull-Rom spline through `spine` into a dense polyline. The end
 * point is mirrored, which makes the outgoing tangent exactly parallel to
 * (last - secondLast) -- that property is what lets the arrowhead be aimed
 * precisely at the link.
 */
function splineToPolyline(spine: Point[]): Point[] {
  const first = spine[0];
  const second = spine[1];
  const last = spine[spine.length - 1];
  const secondLast = spine[spine.length - 2];

  const guides: Point[] = [
    { x: 2 * first.x - second.x, y: 2 * first.y - second.y },
    ...spine,
    { x: 2 * last.x - secondLast.x, y: 2 * last.y - secondLast.y },
  ];

  const points: Point[] = [];

  for (let index = 1; index < guides.length - 2; index += 1) {
    const previous = guides[index - 1];
    const start = guides[index];
    const end = guides[index + 1];
    const next = guides[index + 2];

    const control0 = {
      x: start.x + ((end.x - previous.x) / 6) * SPLINE_TENSION,
      y: start.y + ((end.y - previous.y) / 6) * SPLINE_TENSION,
    };
    const control1 = {
      x: end.x - ((next.x - start.x) / 6) * SPLINE_TENSION,
      y: end.y - ((next.y - start.y) / 6) * SPLINE_TENSION,
    };

    for (let step = index === 1 ? 0 : 1; step <= SAMPLES_PER_SEGMENT; step += 1) {
      points.push(
        cubicAt(start, control0, control1, end, step / SAMPLES_PER_SEGMENT),
      );
    }
  }

  return points;
}

function cumulativeLengths(points: Point[]): number[] {
  const totals = [0];

  for (let index = 1; index < points.length; index += 1) {
    const dx = points[index].x - points[index - 1].x;
    const dy = points[index].y - points[index - 1].y;
    totals.push(totals[index - 1] + Math.hypot(dx, dy));
  }

  return totals;
}

/**
 * Layout position of `element` inside `ancestor`. Deliberately uses the offset
 * chain rather than bounding rects: project headings and rails carry transforms
 * for their focus animation, and the arrow needs untransformed layout geometry.
 */
function offsetWithin(element: HTMLElement, ancestor: HTMLElement): Point {
  let node: HTMLElement | null = element;
  let x = 0;
  let y = 0;

  while (node && node !== ancestor) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }

  return { x, y };
}

export function ProjectSwirlArrow() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const section = canvas.closest<HTMLElement>("[data-project-section]");
    const link = section?.querySelector<HTMLElement>(".project-live-link");
    const scroller = section?.querySelector<HTMLElement>(".project-scroller");
    if (!section || !link || !scroller) return;

    let frame = 0;

    const draw = () => {
      // Layout sizes, not rects: the project carries a transform while it is
      // animating between focus states.
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;
      if (width <= 0 || height <= 0) return;

      const context = canvas.getContext("2d");
      if (!context) return;

      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);

      // What the arrow points at: the middle of the link label.
      const linkOffset = offsetWithin(link, section);
      const aim = {
        x: linkOffset.x + link.offsetWidth * 0.5,
        y: linkOffset.y + link.offsetHeight * 0.5,
      };
      const linkBottom = linkOffset.y + link.offsetHeight;

      const railOffset = offsetWithin(scroller, section);
      const tailLimit = railOffset.y + scroller.offsetHeight * 0.82;

      // How close the tip may get to the link. On wide layouts the space below
      // the link is empty, so it stops just under the label. On narrow layouts
      // the heading copy and the scroll hint sit in the way, so the tip drops
      // below them and points at the link from further out.
      const corridorLeft = aim.x - 100;
      let floor = 0;

      section
        .querySelectorAll<HTMLElement>(
          ".project-identity, .project-summary, .project-scroll-help",
        )
        .forEach((blocker) => {
          const blockerOffset = offsetWithin(blocker, section);
          if (blockerOffset.x + blocker.offsetWidth <= corridorLeft) return;
          if (blockerOffset.x >= aim.x) return;
          floor = Math.max(floor, blockerOffset.y + blocker.offsetHeight + 8);
        });

      const widthBudget = Math.max(230, Math.min(width * 0.42, 470));
      const provisionalTipY = Math.max(linkBottom + 24, floor);
      const heightBudget = Math.max(70, tailLimit - provisionalTipY);

      const scaleY = Math.min(
        widthBudget / DESIGN_SPAN_X,
        heightBudget / DESIGN_SPAN_Y,
      );
      const scaleX = Math.min(widthBudget / DESIGN_SPAN_X, scaleY * 1.3);
      if (scaleY <= 0 || scaleX <= 0) return;

      const strokeWidth = Math.max(4.5, Math.min(9, Math.min(scaleX, scaleY) * 1.5));
      const headLength = strokeWidth * 4;
      const headHalfWidth = strokeWidth * 1.55;
      // Stop short of the label so the head reads as pointing at it rather than
      // running into the text.
      const tipY = Math.max(linkBottom + headLength * 0.5 + 10, floor);

      // Anchor the design box on the nominal approach so the body lands below
      // the tip; the exact tip is solved for once the hand-off is known.
      const nominalRun =
        ((NOMINAL_TIP.x - HAND_OFF.x) * scaleX) /
        ((HAND_OFF.y - NOMINAL_TIP.y) * scaleY);
      const anchor = {
        x: aim.x - nominalRun * (tipY - aim.y),
        y: tipY,
      };
      const offsetX = anchor.x - NOMINAL_TIP.x * scaleX;
      const offsetY = anchor.y - NOMINAL_TIP.y * scaleY;

      const body = SPINE.slice(0, -1).map((point) => ({
        x: offsetX + point.x * scaleX,
        y: offsetY + point.y * scaleY,
      }));
      const handOff = body[body.length - 1];

      // The tip sits on the line from the hand-off through the middle of the
      // link. Because the spline's end tangent is parallel to (tip - handOff),
      // the head then aims exactly at the label.
      const toAim = { x: aim.x - handOff.x, y: aim.y - handOff.y };
      const aimLength = Math.hypot(toAim.x, toAim.y);
      if (aimLength <= 0 || toAim.y >= 0) return;

      const direction = { x: toAim.x / aimLength, y: toAim.y / aimLength };
      const setback = (tipY - aim.y) / Math.max(0.25, -direction.y);
      const tip = {
        x: aim.x - direction.x * setback,
        y: aim.y - direction.y * setback,
      };

      const points = splineToPolyline([...body, tip]);
      const totals = cumulativeLengths(points);
      const total = totals[totals.length - 1];
      if (total <= 0) return;

      context.strokeStyle = getComputedStyle(canvas).color;
      context.fillStyle = context.strokeStyle;
      context.lineCap = "round";
      context.lineJoin = "round";

      // Stop the stroke inside the head so the round cap stays hidden.
      const strokeEnd = total - headLength * 0.62;
      let travelled = 0;

      for (let index = 1; index < points.length; index += 1) {
        const from = points[index - 1];
        const to = points[index];
        const segment = totals[index] - totals[index - 1];
        if (segment <= 0) continue;

        const clipped = travelled + segment > strokeEnd;
        const ratio = clipped ? (strokeEnd - travelled) / segment : 1;
        if (ratio <= 0) break;

        // Thin at the tail, full weight into the head: a marker stroke rather
        // than a uniform hairline.
        const progress = (travelled + segment * ratio * 0.5) / total;
        context.lineWidth =
          strokeWidth * (0.38 + 0.62 * Math.pow(progress, 0.7));

        context.beginPath();
        context.moveTo(from.x, from.y);
        context.lineTo(from.x + (to.x - from.x) * ratio, from.y + (to.y - from.y) * ratio);
        context.stroke();

        travelled += segment;
        if (clipped) break;
      }

      const baseX = tip.x - direction.x * headLength;
      const baseY = tip.y - direction.y * headLength;
      const notchX = tip.x - direction.x * headLength * 0.66;
      const notchY = tip.y - direction.y * headLength * 0.66;
      const perpendicularX = -direction.y * headHalfWidth;
      const perpendicularY = direction.x * headHalfWidth;

      context.beginPath();
      context.moveTo(tip.x, tip.y);
      context.lineTo(baseX + perpendicularX, baseY + perpendicularY);
      context.lineTo(notchX, notchY);
      context.lineTo(baseX - perpendicularX, baseY - perpendicularY);
      context.closePath();
      context.fill();
    };

    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(draw);
    };

    // Observe the layout around the canvas rather than the canvas itself. The
    // draw pass updates the canvas's backing-store dimensions; observing that
    // same element can create a ResizeObserver feedback loop in dev overlays.
    const resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(section);
    resizeObserver.observe(link);
    resizeObserver.observe(scroller);
    schedule();

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="scene-end-project-arrow"
      aria-hidden="true"
    />
  );
}
