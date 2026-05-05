"use client";

import { useRef, useState } from "react";
import { BirdsEyeWatermark } from "./BirdsEyeWatermark";

type Props = {
  src: string;
  poster?: string;
};

// Renders the video at 16:9 with a perfectly centred custom play overlay.
// Native browser play buttons sit slightly off-centre because they're aligned
// inside the controls strip; this component owns the play affordance until
// the user starts the video, then hands off to native controls.
export function VideoCard({ src, poster }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showOverlay, setShowOverlay] = useState(true);

  function start() {
    setShowOverlay(false);
    videoRef.current?.play();
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-inner bg-black">
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        controls={!showOverlay}
        playsInline
        preload="metadata"
        onPlay={() => setShowOverlay(false)}
        className="absolute inset-0 h-full w-full object-contain"
      />
      <BirdsEyeWatermark placement="inset" size="compact" />
      {showOverlay && (
        <button
          type="button"
          onClick={start}
          aria-label="Play video"
          className="absolute z-10 flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-ink shadow-lg backdrop-blur-sm transition-transform duration-150 hover:scale-105"
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
    </div>
  );
}
