// Small watermark dropped onto every public bird's-eye image. Doubles as a
// cover-up for the Xbox HUD ("PING: 15 VERSION: ...") that lives in the
// bottom-left corner of most R6 captures. Uses backdrop-blur + a translucent
// dark fill so anything behind it gets softened, with a rounded pill so it
// reads as a watermark and not a hard rectangle.
export function BirdsEyeWatermark() {
  return (
    <div className="pointer-events-none absolute bottom-0 left-0 z-10 flex items-center gap-1.5 rounded-tr-btn bg-black/45 px-2.5 py-1 text-[11px] font-semibold leading-none text-brand backdrop-blur-md sm:gap-2 sm:px-3 sm:py-1.5 sm:text-[13px]">
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
