import Link from "next/link";

type Props = {
  id: string;
  name: string;
  xPct: number;
  yPct: number;
};

// A single pin overlaid on the bird's-eye view. Position is the centre of the
// dot. The hit target is larger than the visible dot so phones aren't fiddly.
export function PeekPin({ id, name, xPct, yPct }: Props) {
  return (
    <Link
      href={`/peeks/${id}`}
      className="group absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
      style={{ left: `${xPct}%`, top: `${yPct}%` }}
      aria-label={name}
    >
      <span className="absolute h-12 w-12 rounded-full" />
      <span className="block h-5 w-5 rounded-full bg-brand ring-2 ring-white shadow-md transition-transform duration-150 group-hover:scale-125" />
      <span className="pointer-events-none absolute top-full mt-2 whitespace-nowrap rounded-btn bg-ink px-2 py-1 text-xs text-white opacity-0 shadow transition-opacity duration-150 group-hover:opacity-100">
        {name}
      </span>
    </Link>
  );
}
