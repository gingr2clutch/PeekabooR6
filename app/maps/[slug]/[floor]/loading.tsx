import { PageHeader } from "@/components/PageHeader";

export default function Loading() {
  return (
    <>
      <PageHeader />
      <main className="mx-auto max-w-5xl px-6 pb-20 pt-10">
        <div className="mx-auto mb-8 h-8 w-64 animate-pulse rounded-btn bg-border" />
        <div className="aspect-[16/10] w-full animate-pulse rounded-card border border-border bg-card" />
      </main>
    </>
  );
}
