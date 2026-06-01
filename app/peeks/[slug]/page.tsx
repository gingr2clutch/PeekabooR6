import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { AnimatedRate } from "@/components/AnimatedRate";
import { PageHeader } from "@/components/PageHeader";
import { PeekMedia } from "@/components/PeekMedia";
import { VoteButtons } from "@/components/VoteButtons";
import { supabasePublic } from "@/lib/supabase";
import type { Floor, Map, Peek } from "@/lib/db";
import { displayRate } from "@/lib/rate";
import { isUuid } from "@/lib/slug";

export const dynamic = "force-dynamic";

const SITE_URL = "https://peekaboor6.com";
const MIN_VOTES_FOR_RATING = 10;

type Joined = Peek & {
  created_at: string;
  floors: (Floor & { maps: Map }) | null;
};

const JOIN_COLUMNS =
  "id, floor_id, slug, name, x_pct, y_pct, video_url, poster_url, instructions, difficulty, risk, tip, useful_pct, vote_count, success_rate, published, created_at, floors(id, map_id, slug, name, display_order, birds_eye_url, maps(id, slug, name, published, cover_image_url))";

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
  success_rate: number;
};

// One query, indexed by peeks_published_floor_idx. Returns every other
// published peek on the same floor; the caller sorts by distance.
async function fetchSameFloorPeeks(
  floorId: string,
  excludeId: string
): Promise<NearbyPeek[]> {
  const { data, error } = await supabasePublic()
    .from("peeks")
    .select("id, slug, name, x_pct, y_pct, success_rate")
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

  const videoJsonLd = buildVideoJsonLd(peek, map, floor);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(peek, map);

  // Closest 4 peeks on this floor by Euclidean distance over (x_pct, y_pct).
  // Peeks missing either coord sort last (Infinity). If none, section hides.
  const sameFloor = await fetchSameFloorPeeks(peek.floor_id, peek.id);
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
        <div className="text-center">
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
            <StatCell label="Success rate">
              <AnimatedRate
                value={displayRate(peek.success_rate)}
                className="text-4xl font-bold leading-none tracking-tight text-brand md:text-[72px]"
              />
            </StatCell>
            <StatCell label="Difficulty">
              <DifficultyDots difficulty={peek.difficulty} />
            </StatCell>
            <StatCell label="Risk">
              <RiskPill risk={peek.risk} />
            </StatCell>
          </div>
        </section>

        {/* Vote buttons — 16px below stats card */}
        <div className="mt-4 flex justify-center">
          <VoteButtons peekId={peek.id} />
        </div>

        {/* Content section — 64px below buttons */}
        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2 md:items-start">
          <PeekMedia videoUrl={peek.video_url} name={peek.name} />
          <Instructions steps={steps} tip={peek.tip} />
        </div>

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
                    <div className="shrink-0 text-right">
                      <div className="text-xl font-bold leading-none tracking-tight text-brand">
                        {displayRate(p.success_rate)}%
                      </div>
                      <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                        Success
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
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

// JSON-LD helpers ----------------------------------------------------------

// Escape `<` so a peek name containing `</script>` can't break out of the
// inline JSON-LD script tag.
function jsonLdText(obj: unknown): string {
  return JSON.stringify(obj).replace(/</g, "\\u003c");
}

function peekDescription(
  peek: Joined,
  map: Map,
  floor: Floor
): string {
  const risk = peek.risk;
  return `${peek.name} — a ${risk}-risk spawn peek on ${map.name} ${floor.name} with a ${displayRate(peek.success_rate)}% community-tested success rate in Rainbow Six Siege.`;
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

  // Only annotate ratings when there's a meaningful sample. Thin rating
  // data hurts more than helps — Google may flag it and competitors can
  // gain SEO ground if it looks fake.
  if (peek.vote_count >= MIN_VOTES_FOR_RATING) {
    video.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: String(displayRate(peek.success_rate)),
      bestRating: "100",
      worstRating: "0",
      ratingCount: peek.vote_count,
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
  return (
    <div>
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
        How to do it
      </h2>

      {steps.length > 0 ? (
        <ol className="mt-4 list-decimal space-y-5 pl-5 text-[16px] leading-[1.6]">
          {steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 text-sm text-muted">
          Step-by-step instructions will appear here.
        </p>
      )}

      {tip && (
        <>
          <hr className="my-6 border-border" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand">
            Pro tip
          </span>
          <p className="mt-2 text-[16px] leading-[1.6]">{tip}</p>
        </>
      )}
    </div>
  );
}
