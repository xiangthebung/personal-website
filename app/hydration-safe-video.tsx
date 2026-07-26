"use client";

/* eslint-disable @next/next/no-img-element -- This local poster is the hydration-safe fallback for an embedded video. */
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function HydrationSafeVideo({
  src,
  poster,
  ariaLabel,
}: {
  src: string;
  poster: string;
  ariaLabel: string;
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
        data-project-image
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
    >
      <source src={src} type="video/mp4" />
      Your browser does not support embedded video.
    </video>
  );
}
