import { PageHeader } from "@/components/PageHeader";

export default function Loading() {
  return (
    <>
      <PageHeader />
      <main className="mx-auto max-w-5xl px-6 pb-20 pt-10">
        <div className="mx-auto mb-8 h-8 w-48 animate-pulse rounded-btn bg-border" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-card border border-border bg-card"
            />
          ))}
        </div>
      </main>
    </>
  );
}
