import Link from "next/link";

type Props = {
  id: string;
  name: string;
  xPct: number;
  yPct: number;
  number: number;
};

// A numbered pin overlaid on the bird's-eye view. Position is the centre of
// the dot. The hit target wraps the visible circle so phones aren't fiddly:
// 36px on mobile, 32px from sm and up.
export function PeekPin({ id, name, xPct, yPct, number }: Props) {
  return (
    <Link
      href={`/peeks/${id}`}
      className="group absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
      style={{ left: `${xPct}%`, top: `${yPct}%` }}
      aria-label={`${number}. ${name}`}
    >
      <span className="absolute h-12 w-12 rounded-full" />
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white shadow-md ring-2 ring-white transition-all duration-150 group-hover:scale-[1.2] group-hover:shadow-[0_0_12px_rgba(255,106,0,0.6)] md:h-8 md:w-8 md:text-xs">
        {number}
      </span>
      <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 max-w-[180px] -translate-x-1/2 break-words rounded-btn bg-ink px-2.5 py-1 text-center text-[13px] leading-tight text-white opacity-0 shadow transition-opacity duration-150 group-hover:opacity-100 md:max-w-[240px] md:whitespace-nowrap md:text-xs">
        {name}
      </span>
    </Link>
  );
}
