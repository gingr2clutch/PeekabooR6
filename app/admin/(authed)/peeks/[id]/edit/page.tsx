import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/ConfirmButton";
import { DirectVideoUpload } from "@/components/DirectVideoUpload";
import { PeekForm } from "@/components/PeekForm";
import { getFloorOptions } from "@/lib/admin-data";
import { supabaseAdmin } from "@/lib/supabase";
import {
  deletePeekAction,
  togglePublishedAction,
  updatePeekAction,
  updatePeekTiktokUrlAction,
} from "../../actions";

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
  tip: string | null;
  success_rate: number;
  base_success_rate: number;
  published: boolean;
  is_pro_only: boolean;
  instructions: string[] | null;
  video_url: string | null;
  poster_url: string | null;
  tiktok_url: string | null;
};

async function getPeek(id: string): Promise<EditablePeek | null> {
  const { data, error } = await supabaseAdmin()
    .from("peeks")
    .select(
      "id, floor_id, slug, name, x_pct, y_pct, difficulty, risk, tip, success_rate, base_success_rate, published, is_pro_only, instructions, video_url, poster_url, tiktok_url"
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as EditablePeek | null;
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

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-card p-5">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Status
          </h2>
          <p className="mt-1 text-sm">
            {peek.published ? (
              <span className="font-medium text-emerald-700">
                Published — live on the public site
              </span>
            ) : (
              <span className="font-medium text-muted">
                Draft — not visible to the public
              </span>
            )}
          </p>
          <p className="mt-1 text-[11px] text-muted">
            Saving the form below never changes this — use this button to
            publish or unpublish.
          </p>
        </div>
        <form action={togglePublishedAction}>
          <input type="hidden" name="id" value={peek.id} />
          <input
            type="hidden"
            name="next"
            value={peek.published ? "off" : "on"}
          />
          <button
            type="submit"
            className={
              peek.published
                ? "rounded-btn border border-border bg-card px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-brand hover:text-brand"
                : "rounded-btn bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand/90"
            }
          >
            {peek.published ? "Unpublish" : "Publish"}
          </button>
        </form>
      </section>

      <PeekForm
        floors={floors}
        action={updatePeekAction}
        submitLabel="Save changes"
        showPublished={false}
        initial={{
          id: peek.id,
          floor_id: peek.floor_id,
          slug: peek.slug,
          name: peek.name,
          x_pct: peek.x_pct,
          y_pct: peek.y_pct,
          difficulty: peek.difficulty,
          risk: peek.risk,
          tip: peek.tip,
          success_rate: peek.success_rate,
          base_success_rate: peek.base_success_rate,
          published: peek.published,
          is_pro_only: peek.is_pro_only,
          instructions,
        }}
      />

      <section className="rounded-card border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Video clip
        </h2>
        <DirectVideoUpload peekId={peek.id} initialUrl={peek.video_url} />
      </section>

      <section className="rounded-card border border-border bg-card p-5">
        <form action={updatePeekTiktokUrlAction} className="space-y-3">
          <input type="hidden" name="id" value={peek.id} />
          <label className="block text-xs text-muted">
            <span className="mb-1 block">TikTok URL (optional)</span>
            <input
              type="url"
              name="tiktok_url"
              defaultValue={peek.tiktok_url ?? ""}
              placeholder="https://www.tiktok.com/@creator/video/..."
              className="w-full rounded-btn border border-border bg-card px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            />
            <span className="mt-1 block text-[11px] text-muted">
              When set, the public peek page swaps the inline video for an
              &ldquo;Open on TikTok&rdquo; card and the floor pin renders
              with the purple→orange gradient.
            </span>
          </label>
          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-btn bg-ink px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-brand active:scale-95"
            >
              Save TikTok URL
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
