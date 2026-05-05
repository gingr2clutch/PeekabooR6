import { PageHeader } from "@/components/PageHeader";

const SKELETON_PINS = [
  { x: 22, y: 35 },
  { x: 48, y: 60 },
  { x: 70, y: 28 },
  { x: 35, y: 75 },
  { x: 80, y: 70 },
];

export default function Loading() {
  return (
    <>
      <PageHeader />
      <main className="mx-auto max-w-5xl px-6 pb-20 pt-10">
        <div className="mx-auto mb-8 h-8 w-64 animate-pulse rounded-btn bg-border" />
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-card border border-border bg-card">
          <div className="placeholder-stripes h-full w-full" />
          {SKELETON_PINS.map((p, i) => (
            <span
              key={i}
              className="absolute h-9 w-9 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-border ring-2 ring-white sm:h-8 sm:w-8"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
            />
          ))}
        </div>
      </main>
    </>
  );
}
