import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/ConfirmButton";
import { DirectVideoUpload } from "@/components/DirectVideoUpload";
import { PeekForm } from "@/components/PeekForm";
import { getFloorOptions } from "@/lib/admin-data";
import { supabaseAdmin } from "@/lib/supabase";
import { deletePeekAction, updatePeekAction } from "../../actions";

export const dynamic = "force-dynamic";

type EditablePeek = {
  id: string;
  floor_id: string;
  slug: string;
  name: string;
  x_pct: number;
  y_pct: number;
  difficulty: number;
  risk: "low" | "medium" | "high";
  peek_type?: "spawn" | "runout" | "mid_round" | null;
  tip: string | null;
  success_rate: number;
  published: boolean;
  instructions: string[] | null;
  video_url: string | null;
  poster_url: string | null;
};

// Try with peek_type first; if the column is missing (Supabase project on
// an older schema), retry without it so the editor still loads.
async function getPeek(id: string): Promise<EditablePeek | null> {
  const base =
    "id, floor_id, slug, name, x_pct, y_pct, difficulty, risk, tip, success_rate, published, instructions, video_url, poster_url";
  const withType = supabaseAdmin()
    .from("peeks")
    .select(`${base}, peek_type`)
    .eq("id", id)
    .maybeSingle();
  const first = await withType;
  if (!first.error) return first.data as EditablePeek | null;
  if (first.error.code !== "42703") throw first.error;
  console.warn(
    "[admin/peeks/edit] peek_type column missing — falling back to legacy select"
  );
  const fallback = await supabaseAdmin()
    .from("peeks")
    .select(base)
    .eq("id", id)
    .maybeSingle();
  if (fallback.error) throw fallback.error;
  return fallback.data as EditablePeek | null;
}

export default async function AdminEditPeekPage({
  params,
}: {
  params: { id: string };
}) {
  const [peek, floors] = await Promise.all([
    getPeek(params.id),
    getFloorOptions(),
  ]);
  if (!peek) notFound();

  const instructions = Array.isArray(peek.instructions) ? peek.instructions : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <Link
          href="/admin/peeks"
          className="text-muted transition-colors hover:text-brand"
        >
          ← Back to peeks
        </Link>
        <Link
          href={`/peeks/${peek.slug}`}
          className="text-muted transition-colors hover:text-brand"
        >
          View public page →
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          Edit · {peek.name}
        </h1>
        <form action={deletePeekAction}>
          <input type="hidden" name="id" value={peek.id} />
          <ConfirmButton
            message={`Delete ${peek.name}? This cannot be undone.`}
            className="rounded-btn border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:border-red-300 hover:bg-red-100"
          >
            Delete peek
          </ConfirmButton>
        </form>
      </div>

      <PeekForm
        floors={floors}
        action={updatePeekAction}
        submitLabel="Save changes"
        initial={{
          id: peek.id,
          floor_id: peek.floor_id,
          slug: peek.slug,
          name: peek.name,
          x_pct: peek.x_pct,
          y_pct: peek.y_pct,
          difficulty: peek.difficulty,
          risk: peek.risk,
          peek_type: peek.peek_type ?? undefined,
          tip: peek.tip,
          success_rate: peek.success_rate,
          published: peek.published,
          instructions,
        }}
      />

      <section className="rounded-card border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Video clip
        </h2>
        <DirectVideoUpload peekId={peek.id} initialUrl={peek.video_url} />
      </section>
    </div>
  );
}
