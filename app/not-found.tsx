import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";

export default function NotFound() {
  return (
    <>
      <PageHeader />
      <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">Not found</h1>
        <p className="mt-3 text-muted">
          That page doesn't exist — or it isn't published yet.
        </p>
        <Link
          href="/"
          className="mt-8 rounded-btn bg-ink px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand"
        >
          Back to maps
        </Link>
      </main>
    </>
  );
}
