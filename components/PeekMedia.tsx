import { BirdsEyeWatermark } from "./BirdsEyeWatermark";

type Props = {
  videoUrl: string | null;
  name: string;
};

// Single video block on the peek detail page. The video is the only visual
// element — when nothing's been uploaded yet, falls back to a clean
// placeholder pane.
export function PeekMedia({ videoUrl, name }: Props) {
  if (!videoUrl) {
    return (
      <div className="placeholder-stripes flex aspect-video w-full items-center justify-center overflow-hidden rounded-card border border-border">
        <span className="rounded-btn bg-card/80 px-3 py-1 text-sm text-muted backdrop-blur-sm">
          No clip yet
        </span>
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-card border border-border bg-black">
      <video
        key={videoUrl}
        src={videoUrl}
        controls
        playsInline
        preload="metadata"
        aria-label={name}
        className="absolute inset-0 h-full w-full object-contain"
      />
      <BirdsEyeWatermark placement="flush" size="compact" />
    </div>
  );
}
