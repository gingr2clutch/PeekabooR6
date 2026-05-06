type Props = {
  // "flush" sits the pill in the literal corner with only the inner corner
  // rounded (used on bird's-eye images). "inset" pulls it ~8px off the
  // edges and rounds all corners (used on screenshots, video clips, and
  // map-page floor cards).
  placement?: "flush" | "inset";
  // "default" is the original size used on full bird's-eye views; "compact"
  // is roughly 40% smaller for use on the smaller peek-detail cards.
  size?: "default" | "compact";
  // Which bottom corner to anchor to.
  corner?: "left" | "right";
};

// Small watermark dropped onto every public R6 capture (bird's-eye images,
// screenshots, video clips). Doubles as a cover-up for the Xbox HUD
// ("PING: 15 VERSION: ...") in the bottom-left corner. Uses backdrop-blur
// + a translucent dark fill so anything behind it gets softened.
export function BirdsEyeWatermark({
  placement = "flush",
  size = "default",
  corner = "left",
}: Props = {}) {
  const isRight = corner === "right";
  const position =
    placement === "inset"
      ? `bottom-2 ${isRight ? "right-2" : "left-2"} rounded-btn`
      : isRight
        ? "bottom-0 right-0 rounded-tl-btn"
        : "bottom-0 left-0 rounded-tr-btn";

  const pill =
    size === "compact"
      ? "gap-1 px-1.5 py-0.5 text-[11px] sm:text-[12px]"
      : "gap-1.5 px-2.5 py-1 text-[11px] sm:gap-2 sm:px-3 sm:py-1.5 sm:text-[13px]";

  const icon =
    size === "compact"
      ? "h-3 w-3 sm:h-3.5 sm:w-3.5"
      : "h-3.5 w-3.5 sm:h-4 sm:w-4";

  return (
    <div
      className={`pointer-events-none absolute z-10 flex items-center bg-black/45 font-semibold leading-none text-brand backdrop-blur-md ${pill} ${position}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/favicon.svg"
        alt=""
        aria-hidden
        className={icon}
      />
      <span>peekabooR6</span>
    </div>
  );
}
