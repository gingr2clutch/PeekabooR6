import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Lock } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PeekMedia } from "@/components/PeekMedia";
import { VoteButtons } from "@/components/VoteButtons";
import { FavoriteButton } from "@/components/FavoriteButton";
import { supabasePublic } from "@/lib/supabase";
import type { Floor, Map, Peek } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createCheckoutSession } from "@/app/account/actions";
import { rating, votesText, type Grade } from "@/lib/rate";
import { GradeBadge } from "@/components/GradeBadge";
import { GradeBar } from "@/components/GradeBar";
import { isUuid } from "@/lib/slug";

export const dynamic = "force-dynamic";

const SITE_URL = "https://peekaboor6.com";

// Grade on a 4-point scale for schema.org AggregateRating (measured tier only).
const GRADE_RATING_VALUE: Record<Grade, number> = { S: 4, A: 3, B: 2, C: 1 };

type Joined = Peek & {
  created_at: string;
  floors: (Floor & { maps: Map }) | null;
};

const JOIN_COLUMNS =
  "id, floor_id, slug, name, x_pct, y_pct, video_url, poster_url, tiktok_url, instructions, difficulty, risk, tip, useful_pct, vote_count, worked_votes, success_rate, base_success_rate, published, is_pro_only, created_at, floors(id, map_id, slug, name, display_order, birds_eye_url, maps(id, slug, name, published, cover_image_url))";

async function fetchBySlug(slug: string): Promise<Joined | null> {
  const { data, error } = await supabasePublic()
    .from("peeks")
    .select(JOIN_COLUMNS)
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as Joined | null;
}

async function fetchById(id: string): Promise<Joined | null> {
  const { data, error } = await supabasePublic()
    .from("peeks")
    .select(JOIN_COLUMNS)
    .eq("id", id)
    .eq("published", true)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as Joined | null;
}

type NearbyPeek = {
  id: string;
  slug: string;
  name: string;
  x_pct: number | null;
  y_pct: number | null;
  base_success_rate: number;
  worked_votes: number;
  vote_count: number;
};

// One query, indexed by peeks_published_floor_idx. Returns every other
// published peek on the same floor; the caller sorts by distance.
async function fetchSameFloorPeeks(
  floorId: string,
  excludeId: string
): Promise<NearbyPeek[]> {
  const { data, error } = await supabasePublic()
    .from("peeks")
    .select(
      "id, slug, name, x_pct, y_pct, base_success_rate, worked_votes, vote_count"
    )
    .eq("floor_id", floorId)
    .eq("published", true)
    .neq("id", excludeId);
  if (error) throw error;
  return (data ?? []) as NearbyPeek[];
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  // Don't redirect during metadata generation — just look up by whichever
  // identifier matches so the title is right.
  const peek = isUuid(params.slug)
    ? await fetchById(params.slug)
    : await fetchBySlug(params.slug);
  if (!peek || !peek.floors || !peek.floors.maps) {
    return { title: "Not found" };
  }
  const { floors: floor } = peek;
  const { maps: map } = floor;
  return {
    title: `${map.name} · ${floor.name} · ${peek.name}`,
    description: `${peek.name} — spawn peek on ${map.name} ${floor.name}.`,
    // Pro-only peeks are gated content — keep them out of Google's index
    // (paired with their exclusion from the sitemap).
    ...(peek.is_pro_only ? { robots: { index: false, follow: false } } : {}),
  };
}

export default async function PeekDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  // Old UUID URLs (/peeks/<uuid>) stay alive: look the peek up by id and
  // 308 to its slug URL so search engines and any external links update.
  if (isUuid(params.slug)) {
    const byId = await fetchById(params.slug);
    if (
      byId &&
      byId.slug &&
      byId.floors &&
      byId.floors.maps &&
      byId.floors.maps.published
    ) {
      permanentRedirect(`/peeks/${byId.slug}`);
    }
    notFound();
  }

  const peek = await fetchBySlug(params.slug);
  if (!peek || !peek.floors || !peek.floors.maps || !peek.floors.maps.published)
    notFound();

  const floor = peek.floors;
  const map = floor.maps;
  const floorHref = `/maps/${map.slug}/${floor.slug}`;
  const steps = Array.isArray(peek.instructions) ? peek.instructions : [];
  const hasInstructionsContent = steps.length > 0 || !!peek.tip;

  // Pro gate: a Pro-only peek shows only a teaser (name, map, floor, grade) to
  // anyone who isn't Pro. The video/instructions/position are conditionally
  // rendered below, so they never reach a locked visitor's HTML.
  //
  // A public peek page must never 500 over an auth hiccup, so failures fall
  // back to the logged-out view — which keeps Pro-only peeks LOCKED (the safe
  // default) rather than exposing gated content.
  let user: Awaited<ReturnType<typeof getCurrentUser>> = null;
  try {
    user = await getCurrentUser();
  } catch {
    user = null;
  }
  const locked = peek.is_pro_only && !user?.isPro;

  // Don't emit VideoObject JSON-LD for locked content (would expose the clip).
  const videoJsonLd = locked ? null : buildVideoJsonLd(peek, map, floor);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(peek, map);

  // Closest 4 peeks on this floor by Euclidean distance over (x_pct, y_pct).
  // Skipped when locked — nearby positions are part of the gated detail.
  const sameFloor = locked
    ? []
    : await fetchSameFloorPeeks(peek.floor_id, peek.id);
  const nearby = sameFloor
    .map((p) => {
      const ok = Number.isFinite(p.x_pct) && Number.isFinite(p.y_pct);
      const dx = ok ? (p.x_pct as number) - peek.x_pct : 0;
      const dy = ok ? (p.y_pct as number) - peek.y_pct : 0;
      return { p, dist: ok ? Math.sqrt(dx * dx + dy * dy) : Infinity };
    })
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 4)
    .map((x) => x.p);

  return (
    <>
      <PageHeader />
      <main className="fade-in-up mx-auto max-w-5xl px-4 pb-24 pt-8 sm:px-6">
        {/* Page header */}
        <div className="relative text-center">
          {/* Favorite heart — absolutely pinned to the top-right so it never
              displaces the centered title. */}
          <div className="absolute right-0 top-0">
            <FavoriteButton peekId={peek.id} size={24} className="h-11 w-11" />
          </div>
          <div className="mb-3">
            <Link
              href={floorHref}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-btn px-2.5 py-1 text-sm font-medium text-muted transition-colors duration-150 ease-out hover:bg-ink/[0.06] hover:text-brand"
            >
              <BackArrowIcon />
              <span>
                {map.name} · {floor.name}
              </span>
            </Link>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
            {peek.name}
          </h1>
          <p className="mt-3 text-sm text-muted">
            <Link href={`/maps/${map.slug}`} className="hover:text-brand">
              {map.name}
            </Link>{" "}
            ›{" "}
            <Link href={floorHref} className="hover:text-brand">
              {floor.name}
            </Link>{" "}
            › {peek.name}
          </p>
        </div>

        {/* Hero stats card — 32px below header */}
        <section className="mt-6 rounded-card border border-border bg-card p-4 md:mt-8 md:p-8">
          <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <StatCell label="Effectiveness">
              <SuccessStat peek={peek} />
            </StatCell>
            <StatCell label="Difficulty">
              <DifficultyDots difficulty={peek.difficulty} />
            </StatCell>
            <StatCell label="Risk">
              <RiskPill risk={peek.risk} />
            </StatCell>
          </div>
          <GradeBar
            baseSuccessRate={peek.base_success_rate}
            workedVotes={peek.worked_votes}
            voteCount={peek.vote_count}
          />
        </section>

        {locked ? (
          <div className="mt-8">
            <ProLockCard />
          </div>
        ) : (
          <>
            {/* Vote buttons — 16px below stats card */}
            <div className="mt-4 flex justify-center">
              <VoteButtons peekId={peek.id} />
            </div>

            {/* Content section — when there are no steps and no pro tip the
                instructions column would be empty and the media column would
                render at half width with dead space beside it. Drop to a
                single column in that case so the media spans the row. */}
            {hasInstructionsContent ? (
              <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2 md:items-start">
                {peek.tiktok_url ? (
                  <TikTokLinkCard url={peek.tiktok_url} />
                ) : (
                  <PeekMedia videoUrl={peek.video_url} name={peek.name} />
                )}
                <Instructions steps={steps} tip={peek.tip} />
              </div>
            ) : (
              <div className="mt-16">
                {peek.tiktok_url ? (
                  <TikTokLinkCard url={peek.tiktok_url} />
                ) : (
                  <PeekMedia videoUrl={peek.video_url} name={peek.name} />
                )}
              </div>
            )}
          </>
        )}

        {nearby.length > 0 && (
          <section className="mt-16">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              Peeks close by
            </h2>
            <ul className="mt-4 space-y-3">
              {nearby.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/peeks/${p.slug}`}
                    className="group flex items-center justify-between gap-4 rounded-card border border-border bg-card p-4 transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-brand hover:shadow-md"
                  >
                    <h3 className="min-w-0 flex-1 truncate text-base font-semibold text-ink group-hover:text-brand">
                      {p.name}
                    </h3>
                    <NearbyStat peek={p} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-12 text-center text-sm text-muted">
          Know a better peek?{" "}
          <Link href="/submit" className="font-medium text-brand hover:underline">
            Submit it →
          </Link>
        </p>
      </main>

      {videoJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdText(videoJsonLd) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdText(breadcrumbJsonLd) }}
      />
    </>
  );
}

// Locked teaser shown in place of the video/instructions for a Pro-only peek
// when the viewer isn't Pro. The header + stats card above stay visible (map,
// floor, grade). The button posts the checkout action (which sends logged-out
// users to /login first).
function ProLockCard() {
  return (
    <section className="mx-auto max-w-md rounded-card border border-border bg-card p-6 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand">
        <Lock size={22} strokeWidth={2.25} aria-hidden />
      </div>
      <h2 className="mt-4 text-lg font-semibold tracking-tight text-ink">
        This is a Pro peek
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">
        The clip, exact position, and setup for this peek are unlocked with Pro.
      </p>
      <form action={createCheckoutSession} className="mt-5">
        <button
          type="submit"
          className="w-full rounded-btn bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand/90"
        >
          Unlock with Pro — $2.99/mo
        </button>
      </form>
      <p className="mt-2 text-xs text-muted">
        Cancel anytime. Unlocks every Pro peek.
      </p>
    </section>
  );
}

// JSON-LD helpers ----------------------------------------------------------

// Escape `<` so a peek name containing `</script>` can't break out of the
// inline JSON-LD script tag.
function jsonLdText(obj: unknown): string {
  return JSON.stringify(obj).replace(/</g, "\\u003c");
}

// Compact rating figure for the "Peeks close by" list — grade badge with a
// caption of the vote count (measured) or "Effectiveness" (estimate).
function NearbyStat({ peek }: { peek: NearbyPeek }) {
  const r = rating(peek.base_success_rate, peek.worked_votes, peek.vote_count);
  return (
    <div className="shrink-0 text-right">
      <GradeBadge label={r.label} score={r.score} />
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
        {r.tier === "measured" ? votesText(r.votes) : "Effectiveness"}
      </div>
    </div>
  );
}

function peekDescription(
  peek: Joined,
  map: Map,
  floor: Floor
): string {
  const r = rating(peek.base_success_rate, peek.worked_votes, peek.vote_count);
  const base = `${peek.name} — a ${peek.risk}-risk spawn peek on ${map.name} ${floor.name} in Rainbow Six Siege`;
  if (r.tier === "estimate") {
    return `${base}, graded ${r.grade} for effectiveness.`;
  }
  return `${base}, graded ${r.grade} for effectiveness from ${votesText(
    r.votes
  )} of community feedback.`;
}

function buildVideoJsonLd(
  peek: Joined,
  map: Map,
  floor: Floor
): Record<string, unknown> | null {
  if (!peek.video_url) return null;

  const pageUrl = `${SITE_URL}/peeks/${peek.slug}`;
  const thumbnail = peek.poster_url ?? map.cover_image_url ?? null;

  const video: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: `${peek.name} — spawn peek on ${map.name} ${floor.name}`,
    description: peekDescription(peek, map, floor),
    uploadDate: peek.created_at,
    contentUrl: peek.video_url,
    embedUrl: pageUrl,
  };
  if (thumbnail) {
    video.thumbnailUrl = [thumbnail];
  }

  // Only emit aggregateRating for measured-tier peeks (real votes). The grade
  // is expressed on a 4-point scale (S=4 … C=1) — no raw percentage. Admin
  // estimates are never published as a numeric rating.
  const r = rating(peek.base_success_rate, peek.worked_votes, peek.vote_count);
  if (r.tier === "measured") {
    video.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: String(GRADE_RATING_VALUE[r.grade]),
      bestRating: "4",
      worstRating: "1",
      ratingCount: r.votes,
    };
  }

  return video;
}

function buildBreadcrumbJsonLd(
  peek: Joined,
  map: Map
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: map.name,
        item: `${SITE_URL}/maps/${map.slug}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: peek.name,
        item: `${SITE_URL}/peeks/${peek.slug}`,
      },
    ],
  };
}

// Hero rating figure — the headline grade badge. Once a peek is vote-backed
// (measured tier) the real percentage and vote count show beneath the grade;
// estimate-tier peeks show the grade alone, never a percentage.
function SuccessStat({ peek }: { peek: Peek }) {
  const r = rating(peek.base_success_rate, peek.worked_votes, peek.vote_count);
  return (
    <div className="flex flex-col items-center gap-1.5">
      <GradeBadge label={r.label} score={r.score} size="lg" />
      {r.tier === "measured" && (
        <>
          <span className="text-[11px] font-medium text-muted md:text-xs">
            {r.pct}% · {votesText(r.votes)}
          </span>
          <PlayerVotedBadge />
        </>
      )}
    </div>
  );
}

// Shown only on measured-tier peeks so the grade reads as community-backed
// rather than an estimate.
function PlayerVotedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
      <svg
        viewBox="0 0 16 16"
        width="10"
        height="10"
        aria-hidden
        className="fill-none stroke-current"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 8.5l3.5 3.5L13 5" />
      </svg>
      Player voted
    </span>
  );
}

function StatCell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-start gap-2 px-2 py-4 md:gap-4 md:px-4 md:py-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted md:text-[11px]">
        {label}
      </span>
      <div className="flex min-h-[44px] flex-1 items-center md:min-h-[72px]">
        {children}
      </div>
    </div>
  );
}

function DifficultyDots({ difficulty }: { difficulty: number }) {
  return (
    <div className="flex gap-1 md:gap-2.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`h-2 w-2 rounded-full md:h-4 md:w-4 ${
            n <= difficulty ? "bg-ink" : "bg-border"
          }`}
        />
      ))}
    </div>
  );
}

function RiskPill({ risk }: { risk: string }) {
  const riskColor =
    risk === "low"
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : risk === "high"
        ? "text-red-700 bg-red-50 border-red-200"
        : "text-amber-700 bg-amber-50 border-amber-200";
  return (
    <span
      className={`inline-flex items-center rounded-btn border px-2 py-0.5 text-xs font-medium capitalize md:px-4 md:py-2 md:text-lg ${riskColor}`}
    >
      {risk}
    </span>
  );
}

// Replaces the in-line PeekMedia player when peek.tiktok_url is set.
// Sits in the same grid cell so the rest of the layout (Instructions /
// hero stats / nearby) is unchanged. Opens in a new tab — TikTok blocks
// iframe embeds without explicit oEmbed handling, so a link is the
// honest UX.
function TikTokLinkCard({ url }: { url: string }) {
  return (
    <div>
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
        Watch the peek
      </h2>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 flex aspect-video w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-card border border-border bg-gradient-to-br from-purple-500 via-fuchsia-500 to-brand text-white shadow-md transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.99]"
      >
        <TikTokGlyph className="h-12 w-12 drop-shadow-md" />
        <span className="text-base font-semibold drop-shadow-md sm:text-lg">
          Open on TikTok
        </span>
        <span className="text-xs font-medium opacity-90 drop-shadow-sm">
          Opens in a new tab
        </span>
      </a>
    </div>
  );
}

function TikTokGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={`fill-current ${className ?? ""}`}
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.1z" />
    </svg>
  );
}

function BackArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden
      className="fill-none stroke-current"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

function Instructions({
  steps,
  tip,
}: {
  steps: string[];
  tip: string | null;
}) {
  if (steps.length === 0 && !tip) return null;
  return (
    <div>
      {steps.length > 0 && (
        <>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            How to do it
          </h2>
          <ol className="mt-4 list-decimal space-y-5 pl-5 text-[16px] leading-[1.6]">
            {steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </>
      )}

      {tip && (
        <>
          {steps.length > 0 && <hr className="my-6 border-border" />}
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand">
            Pro tip
          </span>
          <p className="mt-2 text-[16px] leading-[1.6]">{tip}</p>
        </>
      )}
    </div>
  );
}
