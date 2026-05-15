import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { NewBadge } from "@/components/NewBadge";
import { PageHeader } from "@/components/PageHeader";
import { supabasePublic } from "@/lib/supabase";
import type { Floor, Map, Peek } from "@/lib/db";
import { isPeekNew, relativeAgo } from "@/lib/peek-recency";

export const dynamic = "force-dynamic";

const FEED_SIZE = 20;

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
            {peeks.map((peek) => (
              <FeedItem key={peek.id} peek={peek} />
            ))}
          </ul>
        )}
      </main>
    </>
  );
}

function FeedItem({ peek }: { peek: FeedRow }) {
  const floor = peek.floors!;
  const map = floor.maps;
  const isNew = isPeekNew(peek.created_at);

  return (
    <li>
      <Link
        href={`/peeks/${peek.slug}`}
        className="group flex items-center gap-4 overflow-hidden rounded-card border border-border bg-card p-3 transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg sm:gap-5 sm:p-4"
      >
        <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-inner bg-bg sm:h-20 sm:w-32">
          {peek.poster_url ? (
            <Image
              src={peek.poster_url}
              alt=""
              fill
              sizes="(max-width: 640px) 96px, 128px"
              className="object-cover transition-transform duration-200 group-hover:scale-105"
            />
          ) : (
            <div className="placeholder-stripes h-full w-full" />
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
          {relativeAgo(peek.created_at)}
        </div>
      </Link>
    </li>
  );
}
