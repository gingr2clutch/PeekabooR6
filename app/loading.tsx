import { PageHeader } from "@/components/PageHeader";

export default function Loading() {
  return (
    <>
      <PageHeader home />
      <main className="mx-auto max-w-6xl px-6 pb-20 pt-10">
        <div className="mx-auto h-8 w-32 animate-pulse rounded-btn bg-border" />
        <div className="mx-auto mt-3 h-4 w-48 animate-pulse rounded-btn bg-border/70" />
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 14 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square animate-pulse rounded-card border border-border bg-card"
            />
          ))}
        </div>
      </main>
    </>
  );
}
