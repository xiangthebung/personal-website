"use client";

/* eslint-disable @next/next/no-img-element -- This local poster is the hydration-safe fallback for an embedded video. */
import type { CSSProperties } from "react";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function HydrationSafeVideo({
  src,
  poster,
  ariaLabel,
  style,
}: {
  src: string;
  poster: string;
  ariaLabel: string;
  style?: CSSProperties;
}) {
  const isHydrated = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  if (!isHydrated) {
    return (
      <img
        src={poster}
        alt={ariaLabel}
        loading="lazy"
        decoding="async"
        fetchPriority="low"
        draggable={false}
        data-project-image
        style={style}
      />
    );
  }

  return (
    <video
      controls
      loop
      muted
      playsInline
      preload="metadata"
      poster={poster}
      aria-label={ariaLabel}
      style={style}
    >
      <source src={src} type="video/mp4" />
      Your browser does not support embedded video.
    </video>
  );
}
