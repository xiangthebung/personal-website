"use client";

import { useEffect, useRef } from "react";

export function ProjectSwirlArrow() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

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
      const color = getComputedStyle(canvas).color;
      const lineWidth = Math.max(5, Math.min(9, width * 0.016));

      context.strokeStyle = color;
      context.fillStyle = color;
      context.lineWidth = lineWidth;
      context.lineCap = "round";
      context.lineJoin = "round";

      context.beginPath();
      context.moveTo(width * 0.04, height * 0.55);
      context.bezierCurveTo(
        width * 0.14,
        height * 0.54,
        width * 0.22,
        height * 0.62,
        width * 0.34,
        height * 0.57,
      );
      context.bezierCurveTo(
        width * 0.45,
        height * 0.52,
        width * 0.48,
        height * 0.31,
        width * 0.38,
        height * 0.27,
      );
      context.bezierCurveTo(
        width * 0.29,
        height * 0.23,
        width * 0.25,
        height * 0.39,
        width * 0.29,
        height * 0.57,
      );
      context.bezierCurveTo(
        width * 0.33,
        height * 0.77,
        width * 0.48,
        height * 0.84,
        width * 0.62,
        height * 0.73,
      );
      context.bezierCurveTo(
        width * 0.78,
        height * 0.61,
        width * 0.82,
        height * 0.36,
        width * 0.86,
        height * 0.19,
      );
      context.bezierCurveTo(
        width * 0.88,
        height * 0.11,
        width * 0.88,
        height * 0.08,
        width * 0.93,
        height * 0.06,
      );
      context.stroke();

      const tipX = width * 0.93;
      const tipY = height * 0.06;
      const previousX = width * 0.88;
      const previousY = height * 0.14;
      const angle = Math.atan2(tipY - previousY, tipX - previousX);
      const headLength = Math.max(22, Math.min(36, width * 0.07));
      const headWidth = headLength * 0.88;
      const baseX = tipX - Math.cos(angle) * headLength;
      const baseY = tipY - Math.sin(angle) * headLength;
      const perpendicularX = -Math.sin(angle) * (headWidth / 2);
      const perpendicularY = Math.cos(angle) * (headWidth / 2);

      context.beginPath();
      context.moveTo(tipX, tipY);
      context.lineTo(baseX + perpendicularX, baseY + perpendicularY);
      context.lineTo(baseX - perpendicularX, baseY - perpendicularY);
      context.closePath();
      context.fill();
    };

    const resizeObserver = new ResizeObserver(draw);
    resizeObserver.observe(canvas);
    draw();

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="scene-end-project-arrow"
      aria-hidden="true"
    />
  );
}
