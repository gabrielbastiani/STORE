"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { SpotBadge } from "@/utils/promotionUtils";

interface SpotBadgeCarouselProps {
  badges: SpotBadge[];
  size?: number;
  intervalMs?: number;
}

const DEFAULT_SIZE = 56;

export default function SpotBadgeCarousel({ badges, size = DEFAULT_SIZE, intervalMs = 3000 }: SpotBadgeCarouselProps) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!badges || badges.length <= 1) return;
    if (paused) return;
    const t = setInterval(() => setIdx(i => (i + 1) % badges.length), intervalMs);
    return () => clearInterval(t);
  }, [badges, paused, intervalMs]);

  if (!badges || badges.length === 0) return null;

  const current = badges[idx] ?? badges[0];
  const src = current.imageUrl ?? "";

  return (
    <div
      className="absolute top-2 right-2 z-20 flex items-center justify-center"
      style={{ width: size, height: size }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-hidden
    >
      <div className="w-full h-full bg-white rounded overflow-hidden shadow-sm border flex items-center justify-center">
        {src ? (
          // badge.imageUrl is expected to be absolute (ensureFullImageUrl applied at source)
          <Image src={src} alt={current.title ?? `badge-${idx}`} width={size} height={size} className="object-contain w-full h-full" />
        ) : (
          <div className="text-xs text-amber-700 font-medium text-center px-1">
            {current.title ?? "Selo"}
          </div>
        )}
      </div>
    </div>
  );
}