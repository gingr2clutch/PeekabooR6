import { BirdsEyeWatermark } from "./BirdsEyeWatermark";

type Props = {
  videoUrl: string | null;
  name: string;
};

// Bare native <video> with the `#t=0.1` media-fragment trick: with
// preload="auto" the browser fetches metadata + the first chunk, then the
// fragment hash makes it render the frame at 0.1s as the visible
// thumbnail. No canvas, no CORS, no JS, no extra DB column needed.
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
        src={`${videoUrl}#t=0.1`}
        preload="auto"
        controls
        playsInline
        muted
        aria-label={name}
        className="absolute inset-0 h-full w-full object-contain"
      />
      <BirdsEyeWatermark placement="flush" size="compact" />
    </div>
  );
}
