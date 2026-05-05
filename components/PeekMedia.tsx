"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { BirdsEyeWatermark } from "./BirdsEyeWatermark";

type Props = {
  screenshotUrl: string | null;
  videoUrl: string | null;
  name: string;
};

// Single media block for the peek detail page. Default state is the
// screenshot with a centred play button if a clip exists. Clicking the play
// button (or the screenshot itself) swaps in the <video> element and starts
// it playing. Watermark stays in the bottom-left throughout.
export function PeekMedia({ screenshotUrl, videoUrl, name }: Props) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Empty state: nothing uploaded yet.
  if (!screenshotUrl && !videoUrl) {
    return (
      <div className="placeholder-stripes flex aspect-video w-full items-center justify-center overflow-hidden rounded-card border border-border">
        <span className="rounded-btn bg-card/80 px-3 py-1 text-sm text-muted backdrop-blur-sm">
          No image yet
        </span>
      </div>
    );
  }

  // Playing the video.
  if (playing && videoUrl) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-card border border-border bg-black">
        <video
          ref={videoRef}
          src={videoUrl}
          poster={screenshotUrl ?? undefined}
          autoPlay
          controls
          playsInline
          className="absolute inset-0 h-full w-full object-contain"
        />
        <BirdsEyeWatermark placement="flush" size="compact" />
      </div>
    );
  }

  // Default: screenshot with optional play overlay.
  const clickable = !!videoUrl;
  return (
    <div
      onClick={() => clickable && setPlaying(true)}
      className={`relative aspect-video w-full overflow-hidden rounded-card border border-border bg-bg ${
        clickable ? "cursor-pointer" : ""
      }`}
    >
      {screenshotUrl ? (
        <Image
          src={screenshotUrl}
          alt={`Screenshot for ${name}`}
          fill
          sizes="(max-width: 768px) 100vw, 600px"
          className="object-cover"
        />
      ) : (
        <div className="placeholder-stripes h-full w-full" />
      )}

      {clickable && (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label="Play video"
          className="group absolute z-20 flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-ink shadow-lg backdrop-blur-sm transition-transform duration-150 ease-out hover:scale-105"
          style={{
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width="28"
            height="28"
            aria-hidden
            className="ml-1 fill-current"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      )}

      <BirdsEyeWatermark placement="flush" size="compact" />
    </div>
  );
}
