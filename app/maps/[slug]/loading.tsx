import { PageHeader } from "@/components/PageHeader";

export default function Loading() {
  return (
    <>
      <PageHeader />
      <main className="mx-auto max-w-4xl px-6 pb-20 pt-10">
        <div className="mx-auto mb-10 h-8 w-40 animate-pulse rounded-btn bg-border" />
        <ul className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <li
              key={i}
              className="aspect-[16/10] animate-pulse rounded-card border border-border bg-card"
            />
          ))}
        </ul>
      </main>
    </>
  );
}
