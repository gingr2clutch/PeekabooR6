type Props = {
  // "flush" sits the pill in the literal corner with only the top-right
  // corner rounded (used on bird's-eye images). "inset" pulls it ~12px off
  // the edges and rounds all corners (used on video clips so it doesn't
  // crowd the native controls bar).
  placement?: "flush" | "inset";
};

// Small watermark dropped onto every public R6 capture (bird's-eye images
// and video clips). Doubles as a cover-up for the Xbox HUD ("PING: 15
// VERSION: ...") in the bottom-left corner. Uses backdrop-blur + a
// translucent dark fill so anything behind it gets softened.
export function BirdsEyeWatermark({ placement = "flush" }: Props = {}) {
  const position =
    placement === "inset"
      ? "bottom-2 left-2 rounded-btn"
      : "bottom-0 left-0 rounded-tr-btn";
  return (
    <div
      className={`pointer-events-none absolute z-10 flex items-center gap-1.5 bg-black/45 px-2.5 py-1 text-[11px] font-semibold leading-none text-brand backdrop-blur-md sm:gap-2 sm:px-3 sm:py-1.5 sm:text-[13px] ${position}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/favicon.svg"
        alt=""
        aria-hidden
        className="h-3.5 w-3.5 sm:h-4 sm:w-4"
      />
      <span>peekabooR6</span>
    </div>
  );
}
