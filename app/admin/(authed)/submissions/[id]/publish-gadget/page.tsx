import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listContributors } from "@/lib/contributors";
import { resolveClip } from "@/lib/gadget-embed";
import { supabaseAdmin } from "@/lib/supabase";
import {
  GadgetPublishForm,
  type OperatorOption,
  type SiteOption,
} from "./GadgetPublishForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Publish gadget setup",
  robots: { index: false, follow: false },
};

type Params = { params: { id: string } };

// Loose name matching for the prefill.
//
// A submission stores what the SUBMITTER typed, not our ids: "2F Gym/2F
// Bedroom" against our "Gym / Bedroom", "2F CCTV/2F Cashroom" against "Cash /
// CCTV". Exact matching finds none of those, so this compares on letters and
// digits only and then falls back to token overlap. It only chooses a default
// for a dropdown the admin can correct — a wrong guess costs one tap, so
// guessing generously beats leaving every field blank.
function squash(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}
function tokens(s: string): string[] {
  return s.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2);
}
function bestMatch<T>(
  needle: string | null,
  items: T[],
  label: (t: T) => string
): T | null {
  if (!needle) return null;
  const n = squash(needle);
  if (!n) return null;

  const exact = items.find((i) => squash(label(i)) === n);
  if (exact) return exact;

  const contains = items.find(
    (i) => squash(label(i)).includes(n) || n.includes(squash(label(i)))
  );
  if (contains) return contains;

  // Token overlap — "2F Gym/2F Bedroom" and "Gym / Bedroom" share gym+bedroom.
  const want = new Set(tokens(needle));
  let best: { item: T; score: number } | null = null;
  for (const i of items) {
    const score = tokens(label(i)).filter((t) => want.has(t)).length;
    if (score > 0 && (!best || score > best.score)) best = { item: i, score };
  }
  return best?.item ?? null;
}

export default async function PublishGadgetSubmissionPage({ params }: Params) {
  const sb = supabaseAdmin();

  const [{ data: sub, error }, sitesRes, opsRes, floorsRes, contributors] =
    await Promise.all([
      sb
        .from("community_submissions")
        .select("*")
        .eq("id", params.id)
        .maybeSingle(),
      sb
        .from("gadget_sites")
        .select("id, name, published, floor_id, maps(name)")
        .order("display_order"),
      sb.from("gadget_operators").select("id, name").order("display_order"),
      sb.from("floors").select("id, birds_eye_url"),
      listContributors(),
    ]);
  if (error) throw error;
  if (!sub) notFound();

  const s = sub as {
    id: string;
    kind: string;
    map: string;
    bomb_site: string | null;
    operator: string | null;
    spot_name: string;
    submitter_name: string;
    source_url: string | null;
    contributor_id: string | null;
    linked_gadget_setup_id: string | null;
  };

  // Peek submissions have their own flow; sending one here would build the
  // wrong kind of thing entirely.
  if (s.kind !== "gadget") notFound();

  const blueprint = new Map(
    ((floorsRes.data ?? []) as { id: string; birds_eye_url: string | null }[]).map(
      (f) => [f.id, f.birds_eye_url]
    )
  );

  const sites: SiteOption[] = (
    (sitesRes.data ?? []) as unknown as {
      id: string;
      name: string;
      published: boolean;
      floor_id: string | null;
      maps: { name: string } | null;
    }[]
  ).map((x) => ({
    id: x.id,
    name: x.name,
    mapName: x.maps?.name ?? "?",
    published: x.published,
    blueprintUrl: x.floor_id ? blueprint.get(x.floor_id) ?? null : null,
  }));
  const operators = (opsRes.data ?? []) as OperatorOption[];

  // Narrow to the submitted map first — "Gym / Bedroom" exists on more than one
  // map, so matching the site name globally could land on the wrong map.
  const onMap = sites.filter(
    (x) => squash(x.mapName) === squash(s.map)
  );
  const pool = onMap.length > 0 ? onMap : sites;
  const guessedSite = bestMatch(s.bomb_site, pool, (x) => x.name);
  const guessedOp = bestMatch(s.operator, operators, (x) => x.name);

  // Their link, normalised to the embeddable form so the field is ready to
  // save rather than needing a manual edit.
  const clip = s.source_url ? resolveClip(s.source_url) : null;
  const suggestedEmbed = clip?.kind === "embed" ? clip.src : s.source_url ?? "";

  let creditedName: string | null = null;
  if (s.contributor_id) {
    const { data: c } = await sb
      .from("contributors")
      .select("display_name")
      .eq("id", s.contributor_id)
      .maybeSingle();
    creditedName = (c as { display_name: string } | null)?.display_name ?? null;
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/submissions"
        className="text-sm text-muted transition-colors hover:text-blue"
      >
        ← Back to submissions
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Publish “{s.spot_name}”
        </h1>
        <p className="mt-1 text-sm text-muted">
          {s.map}
          {s.bomb_site ? ` · ${s.bomb_site}` : ""}
          {s.operator ? ` · ${s.operator}` : ""}. Saving creates a published
          setup and closes this submission.
        </p>
      </div>

      {s.linked_gadget_setup_id && (
        <p className="rounded-card border border-teal/40 bg-teal/[0.06] p-3 text-sm text-ink">
          This submission already has a setup. Publishing again would create a
          second one.
        </p>
      )}

      {/* Their clip, playable here, so the pins can be placed against what the
          video actually shows rather than from the spot text alone. */}
      {clip?.kind === "embed" ? (
        <iframe
          src={clip.src}
          title={s.spot_name}
          loading="lazy"
          sandbox="allow-scripts allow-presentation"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="fullscreen; picture-in-picture"
          className="aspect-video w-full rounded-card border border-border bg-black"
        />
      ) : s.source_url ? (
        <a
          href={s.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block break-all rounded-card border border-border bg-card p-3 text-sm text-blue hover:underline"
        >
          {s.source_url}
        </a>
      ) : null}

      <GadgetPublishForm
        submissionId={s.id}
        spotText={s.spot_name}
        submitterName={s.submitter_name}
        suggestedEmbed={suggestedEmbed}
        sites={sites}
        operators={operators}
        contributors={contributors}
        initialSiteId={guessedSite?.id ?? ""}
        initialOperatorId={guessedOp?.id ?? ""}
        creditedName={creditedName}
      />
    </div>
  );
}
