import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Camera } from "lucide-react";
import { NewBadge } from "@/components/NewBadge";
import { PageHeader } from "@/components/PageHeader";
import { supabasePublic } from "@/lib/supabase";
import type { Floor, Map, Peek } from "@/lib/db";
import { isPeekNew, weeklyBucket } from "@/lib/peek-recency";

export const dynamic = "force-dynamic";

const FEED_SIZE = 10;

export const metadata: Metadata = {
  title: "What's new",
  description:
    "The latest spawn peeks added to peekabooR6 across every Rainbow Six Siege map.",
  alternates: { canonical: "https://peekaboor6.com/whats-new" },
};

type FeedRow = Peek & {
  floors: (Floor & { maps: Map }) | null;
};

async function loadFeed(): Promise<FeedRow[]> {
  const { data, error } = await supabasePublic()
    .from("peeks")
    .select(
      "id, floor_id, slug, name, x_pct, y_pct, video_url, poster_url, instructions, difficulty, risk, tip, useful_pct, vote_count, success_rate, published, created_at, floors(id, map_id, slug, name, display_order, birds_eye_url, maps(id, slug, name, published, cover_image_url))"
    )
    .eq("published", true)
    .order("created_at", { ascending: false })
    .limit(FEED_SIZE * 2);
  if (error) throw error;
  const rows = (data ?? []) as unknown as FeedRow[];
  return rows
    .filter((r) => r.floors?.maps?.published)
    .slice(0, FEED_SIZE);
}

export default async function WhatsNewPage() {
  const peeks = await loadFeed();

  return (
    <>
      <PageHeader />
      <main className="fade-in-up mx-auto max-w-3xl px-4 pb-20 pt-10 sm:px-6">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            What&apos;s new
          </h1>
          <p className="mt-2 text-muted">
            The {FEED_SIZE} most recently added spawn peeks.
          </p>
        </div>

        {peeks.length === 0 ? (
          <p className="text-center text-sm text-muted">
            Nothing here yet — check back soon.
          </p>
        ) : (
          <ul className="space-y-3">
            {peeks.map((peek, i) => (
              <FeedItem key={peek.id} peek={peek} priority={i < 3} />
            ))}
          </ul>
        )}
      </main>
    </>
  );
}

function FeedItem({ peek, priority }: { peek: FeedRow; priority: boolean }) {
  const floor = peek.floors!;
  const map = floor.maps;
  const isNew = isPeekNew(peek.created_at);
  const hasPin =
    typeof peek.x_pct === "number" && typeof peek.y_pct === "number";

  return (
    <li>
      <Link
        href={`/peeks/${peek.slug}`}
        className="group flex items-center gap-4 overflow-hidden rounded-card border border-border bg-card p-3 transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg sm:gap-5 sm:p-4"
      >
        <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-inner bg-bg sm:h-20 sm:w-32">
          {peek.poster_url ? (
            <>
              {/* Shimmer behind the poster — covered as soon as the
                  WebP decodes. */}
              <div aria-hidden className="peek-shimmer absolute inset-0" />
              <Image
                src={peek.poster_url}
                alt=""
                width={256}
                height={160}
                priority={priority}
                loading={priority ? "eager" : "lazy"}
                className="relative h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
            </>
          ) : floor.birds_eye_url ? (
            // Auto-generated mini-map preview: floor overhead with a pin
            // dot at the peek's stored x_pct / y_pct. Visually rhymes
            // with the live floor page; no manual screenshot needed.
            <>
              <Image
                src={floor.birds_eye_url}
                alt=""
                width={256}
                height={160}
                priority={priority}
                loading={priority ? "eager" : "lazy"}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
              {/* Subtle darken so the orange pin reads against
                  any floor texture. */}
              <div aria-hidden className="absolute inset-0 bg-ink/15" />
              {hasPin && (
                <span
                  aria-hidden
                  style={{
                    left: `${peek.x_pct}%`,
                    top: `${peek.y_pct}%`,
                  }}
                  className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand shadow-md ring-2 ring-white"
                />
              )}
            </>
          ) : (
            // Final fallback when neither poster nor floor map exists.
            <div
              aria-hidden
              className="flex h-full w-full items-center justify-center bg-brand/[0.06]"
            >
              <Camera
                size={22}
                strokeWidth={1.5}
                className="text-brand/35"
                aria-hidden
              />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-base font-semibold tracking-tight text-ink group-hover:text-brand sm:text-lg">
              {peek.name}
            </h2>
            {isNew && <NewBadge size="xs" />}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted sm:text-sm">
            <span className="inline-flex items-center rounded-full border border-border bg-bg px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-ink">
              {map.name}
            </span>
            <span className="text-muted">{floor.name}</span>
          </div>
        </div>

        <div className="shrink-0 text-right text-xs text-muted sm:text-sm">
          {weeklyBucket(peek.created_at)}
        </div>
      </Link>
    </li>
  );
}
