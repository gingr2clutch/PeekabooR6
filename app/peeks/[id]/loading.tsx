import { PageHeader } from "@/components/PageHeader";

export default function Loading() {
  return (
    <>
      <PageHeader />
      <main className="mx-auto max-w-5xl px-6 pb-20 pt-10">
        <div className="mx-auto mb-3 h-8 w-48 animate-pulse rounded-btn bg-border" />
        <div className="mx-auto mb-8 h-3 w-72 animate-pulse rounded-btn bg-border/70" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <SkeletonCard aspect="aspect-video" />
          <SkeletonCard rows={4} />
          <SkeletonCard rows={3} />
          <SkeletonCard aspect="aspect-video" />
        </div>
      </main>
    </>
  );
}

function SkeletonCard({
  aspect,
  rows,
}: {
  aspect?: string;
  rows?: number;
}) {
  return (
    <section className="rounded-card border border-border bg-card p-5">
      <div className="mb-4 h-3 w-24 animate-pulse rounded-btn bg-border" />
      {aspect ? (
        <div
          className={`${aspect} w-full animate-pulse rounded-inner bg-border/60`}
        />
      ) : (
        <div className="space-y-3">
          {Array.from({ length: rows ?? 3 }).map((_, i) => (
            <div
              key={i}
              className="h-3 animate-pulse rounded-btn bg-border/70"
              style={{ width: `${70 + ((i * 13) % 25)}%` }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
