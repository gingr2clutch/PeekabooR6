import { BirdsEyeWatermark } from "./BirdsEyeWatermark";

type Props = {
  videoUrl: string | null;
  name: string;
};

// Bare native <video> with the `#t=0.1` media-fragment trick: the
// fragment hash makes the browser render the frame at 0.1s as the
// visible thumbnail. No canvas, no CORS, no JS, no extra DB column.
// playsInline + the kebab-case webkit-playsinline alias keep the clip
// inline on iOS instead of taking over the whole screen on play.
// preload="metadata" fetches just enough to show that first frame.
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
        preload="metadata"
        controls
        playsInline
        muted
        aria-label={name}
        // React maps playsInline → playsinline. iOS < 10 / some embedded
        // WebViews still read the kebab-case webkit alias, so add it
        // explicitly via spread to satisfy both without a TS escape.
        {...{ "webkit-playsinline": "true" }}
        className="absolute inset-0 h-full w-full object-contain"
      />
      <BirdsEyeWatermark placement="flush" size="compact" />
    </div>
  );
}
