import Link from "next/link";
import { PeekForm } from "@/components/PeekForm";
import { getFloorOptions } from "@/lib/admin-data";
import { createPeekAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminNewPeekPage() {
  const floors = await getFloorOptions();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-sm">
        <Link
          href="/admin/peeks"
          className="text-muted transition-colors hover:text-brand"
        >
          ← Back to peeks
        </Link>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight">New peek</h1>

      {floors.length === 0 ? (
        <p className="rounded-card border border-border bg-card p-5 text-sm text-muted">
          You need at least one floor before creating a peek.{" "}
          <Link href="/admin/maps" className="text-brand">
            Add one →
          </Link>
        </p>
      ) : (
        <PeekForm
          floors={floors}
          action={createPeekAction}
          submitLabel="Create peek"
        />
      )}
    </div>
  );
}
