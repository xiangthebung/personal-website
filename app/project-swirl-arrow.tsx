"use client";

import { useEffect, useRef } from "react";

export function ProjectSwirlArrow() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const section = canvas.closest<HTMLElement>("[data-project-section]");
    const target = section?.querySelector<HTMLElement>(
      "[data-project-live-link]",
    );
    const endPanel = section?.querySelector<HTMLElement>("[data-project-end]");
    const scroller = section?.querySelector<HTMLElement>(".project-scroller");
    if (!section || !target || !endPanel || !scroller) return;

    let frame = 0;

    const draw = () => {
      const bounds = canvas.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) return;

      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(bounds.width * pixelRatio);
      canvas.height = Math.round(bounds.height * pixelRatio);

      const context = canvas.getContext("2d");
      if (!context) return;

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, bounds.width, bounds.height);

      const width = bounds.width;
      const height = bounds.height;
      const sectionBounds = section.getBoundingClientRect();
      const targetBounds = target.getBoundingClientRect();
      const endBounds = endPanel.getBoundingClientRect();
      const color = getComputedStyle(canvas).color;
      const lineWidth = Math.max(5, Math.min(10, width * 0.005));
      const targetX =
        targetBounds.left -
        sectionBounds.left +
        Math.min(targetBounds.width * 0.3, 44);
      const targetY =
        targetBounds.bottom - sectionBounds.top + lineWidth * 1.25;
      const endPanelX = endBounds.left - sectionBounds.left;
      const startX = Math.max(
        width * 0.12,
        Math.min(width * 0.43, endPanelX + endBounds.width * 0.05),
      );
      const startY = height * 0.56;
      const horizontalSpan = Math.max(width * 0.32, targetX - startX);

      context.strokeStyle = color;
      context.fillStyle = color;
      context.lineWidth = lineWidth;
      context.lineCap = "round";
      context.lineJoin = "round";

      context.beginPath();
      context.moveTo(startX, startY);
      context.bezierCurveTo(
        startX + horizontalSpan * 0.08,
        startY - height * 0.01,
        startX + horizontalSpan * 0.14,
        startY + height * 0.07,
        startX + horizontalSpan * 0.23,
        startY + height * 0.01,
      );
      context.bezierCurveTo(
        startX + horizontalSpan * 0.32,
        startY - height * 0.05,
        startX + horizontalSpan * 0.32,
        startY - height * 0.24,
        startX + horizontalSpan * 0.23,
        startY - height * 0.28,
      );
      context.bezierCurveTo(
        startX + horizontalSpan * 0.15,
        startY - height * 0.32,
        startX + horizontalSpan * 0.12,
        startY - height * 0.15,
        startX + horizontalSpan * 0.18,
        startY + height * 0.02,
      );
      context.bezierCurveTo(
        startX + horizontalSpan * 0.23,
        startY + height * 0.2,
        startX + horizontalSpan * 0.43,
        startY + height * 0.24,
        startX + horizontalSpan * 0.57,
        startY + height * 0.13,
      );
      context.bezierCurveTo(
        startX + horizontalSpan * 0.76,
        startY - height * 0.01,
        targetX - horizontalSpan * 0.1,
        targetY + height * 0.22,
        targetX - horizontalSpan * 0.045,
        targetY + height * 0.1,
      );
      context.bezierCurveTo(
        targetX - horizontalSpan * 0.025,
        targetY + height * 0.055,
        targetX - horizontalSpan * 0.012,
        targetY + height * 0.018,
        targetX,
        targetY,
      );
      context.stroke();

      const previousX = targetX - horizontalSpan * 0.025;
      const previousY = targetY + height * 0.055;
      const angle = Math.atan2(targetY - previousY, targetX - previousX);
      const headLength = Math.max(22, Math.min(38, width * 0.022));
      const headWidth = headLength * 0.88;
      const baseX = targetX - Math.cos(angle) * headLength;
      const baseY = targetY - Math.sin(angle) * headLength;
      const perpendicularX = -Math.sin(angle) * (headWidth / 2);
      const perpendicularY = Math.cos(angle) * (headWidth / 2);

      context.beginPath();
      context.moveTo(targetX, targetY);
      context.lineTo(baseX + perpendicularX, baseY + perpendicularY);
      context.lineTo(baseX - perpendicularX, baseY - perpendicularY);
      context.closePath();
      context.fill();
    };

    const scheduleDraw = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(draw);
    };

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        canvas.classList.toggle("is-visible", entry.isIntersecting);
        scheduleDraw();
      },
      { root: scroller, threshold: 0.22 },
    );

    const resizeObserver = new ResizeObserver(draw);
    intersectionObserver.observe(endPanel);
    resizeObserver.observe(section);
    resizeObserver.observe(target);
    resizeObserver.observe(endPanel);
    scroller.addEventListener("scroll", scheduleDraw, { passive: true });
    scheduleDraw();

    return () => {
      cancelAnimationFrame(frame);
      intersectionObserver.disconnect();
      resizeObserver.disconnect();
      scroller.removeEventListener("scroll", scheduleDraw);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="project-swirl-overlay"
      aria-hidden="true"
    />
  );
}
