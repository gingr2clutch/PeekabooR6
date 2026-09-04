import Link from "next/link";
import { notFound } from "next/navigation";
import { PeekForm } from "@/components/PeekForm";
import { getFloorOptions } from "@/lib/admin-data";
import { supabaseAdmin } from "@/lib/supabase";
import { isVideoPath } from "@/lib/submission-media";
import { publishSubmissionAction } from "../../community-actions";

export const dynamic = "force-dynamic";

// Copying a 50MB clip out of Supabase Storage and into R2 can outrun Vercel's
// default function budget on a slow link. Nothing else in the app sets this.
export const maxDuration = 60;

type Params = { params: { id: string } };

export default async function PublishSubmissionPage({ params }: Params) {
  const sb = supabaseAdmin();

  const [{ data: sub, error }, floors] = await Promise.all([
    sb
      .from("community_submissions")
      .select("*")
      .eq("id", params.id)
      .maybeSingle(),
    getFloorOptions(),
  ]);
  if (error) throw error;
  if (!sub) notFound();

  const s = sub as {
    id: string;
    kind: "peek" | "gadget";
    map: string;
    spot_name: string;
    submitter_name: string;
    source_url: string | null;
    file_path: string | null;
    status: string;
  };

  // The submission stores a map NAME and no floor, so the best available
  // prefill is the first floor of the matching map. The admin picks the real
  // one — they are placing the pin anyway, which is the whole point of this
  // screen.
  const mapMatch = floors.find(
    (f) => f.mapName.toLowerCase() === s.map.trim().toLowerCase()
  );

  // Private bucket: a signed URL is minted per view so the clip can be watched
  // while filling the form. This is only for preview — publishing copies the
  // object server-side rather than relying on this URL.
  let previewUrl: string | null = null;
  if (s.file_path) {
    const { data: signed } = await sb.storage
      .from("submissions")
      .createSignedUrl(s.file_path, 60 * 60);
    previewUrl = signed?.signedUrl ?? null;
  }

  const clipIsVideo = isVideoPath(s.file_path);
  const label = "text-[10px] font-semibold uppercase tracking-[0.12em] text-muted";

  return (
    <div className="space-y-6">
      <Link
        href="/admin/submissions"
        className="text-sm text-muted transition-colors hover:text-brand"
      >
        ← Back to submissions
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Publish “{s.spot_name}”
        </h1>
        <p className="mt-1 text-sm text-muted">
          From {s.submitter_name} · {s.map} · {s.kind}. Saving creates the peek,
          moves the clip into peek storage, and marks this submission approved.
        </p>
      </div>

      {/* What the submitter actually sent, alongside the form. */}
      <section className="rounded-card border border-border bg-card p-4">
        <h2 className={label}>What they sent</h2>
        <div className="mt-3 flex flex-wrap items-start gap-4">
          {previewUrl && clipIsVideo ? (
            <video
              src={previewUrl}
              controls
              preload="metadata"
              className="max-h-56 w-full max-w-sm rounded-inner border border-border bg-black"
            />
          ) : previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt=""
              className="max-h-56 rounded-inner border border-border"
            />
          ) : s.source_url ? (
            <a
              href={s.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-sm text-brand hover:underline"
            >
              {s.source_url}
            </a>
          ) : (
            <p className="text-sm text-muted">Nothing attached.</p>
          )}
        </div>

        {s.file_path && !clipIsVideo && (
          <p className="mt-3 rounded-btn border border-brand/30 bg-brand/[0.06] p-2 text-xs text-ink">
            This submission is an image, not a clip, so it cannot become a peek
            video. The peek will be created without one.
          </p>
        )}
        {!s.file_path && s.source_url && (
          <p className="mt-3 rounded-btn border border-border bg-bg p-2 text-xs text-muted">
            Link-only submission — there is no file to move. Create the peek,
            then attach a video on its edit page.
          </p>
        )}
      </section>

      {floors.length === 0 ? (
        <p className="rounded-card border border-border bg-card p-5 text-sm text-muted">
          You need at least one floor before creating a peek.{" "}
          <Link href="/admin/maps" className="text-brand">
            Add one →
          </Link>
        </p>
      ) : (
        <>
          {/* Reused as-is, no fork. The submission id is bound to the action
              rather than passed as a prop, so the bound function still matches
              PeekForm's existing action signature. PinPlacer lives inside PeekForm, so placing the pin
              — the one thing a submitter cannot provide — works exactly as it
              does on the normal new-peek form, including the Published
              checkbox for draft-vs-live at save time. */}
          <PeekForm
            floors={floors}
            action={publishSubmissionAction.bind(null, s.id)}
            submitLabel="Create peek & approve submission"
            initial={{
              floor_id: mapMatch?.id,
              name: s.spot_name,
            }}
          />
        </>
      )}
    </div>
  );
}
