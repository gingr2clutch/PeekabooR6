"use client";

import { useRef, useState } from "react";
import { BirdsEyeWatermark } from "./BirdsEyeWatermark";

type Props = {
  videoUrl: string | null;
  name: string;
};

// Video block with a clean overlay shown until the user clicks play. The
// overlay is a soft warm-white panel with a single round play button —
// no peek title, no "click to play" copy — and the watermark stays in the
// bottom-left throughout. Once dismissed, it never returns for that page
// instance.
export function PeekMedia({ videoUrl, name }: Props) {
  const [played, setPlayed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  if (!videoUrl) {
    return (
      <div className="placeholder-stripes flex aspect-video w-full items-center justify-center overflow-hidden rounded-card border border-border">
        <span className="rounded-btn bg-card/80 px-3 py-1 text-sm text-muted backdrop-blur-sm">
          No clip yet
        </span>
      </div>
    );
  }

  function start() {
    if (played) return;
    setPlayed(true);
    videoRef.current?.play().catch(() => {});
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-card border border-border bg-bg">
      <video
        ref={videoRef}
        key={videoUrl}
        src={videoUrl}
        controls
        playsInline
        preload="metadata"
        aria-label={name}
        className="absolute inset-0 h-full w-full object-contain"
      />

      <button
        type="button"
        onClick={start}
        aria-label="Play video"
        tabIndex={played ? -1 : 0}
        className={`group absolute inset-0 flex items-center justify-center bg-bg transition-opacity duration-200 ease-out ${
          played ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-white shadow-lg transition-transform duration-150 ease-out group-hover:scale-105">
          <svg
            viewBox="0 0 24 24"
            width="28"
            height="28"
            aria-hidden
            className="ml-1 fill-ink transition-colors duration-150 group-hover:fill-brand"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </button>

      <BirdsEyeWatermark placement="flush" size="compact" />
    </div>
  );
}
