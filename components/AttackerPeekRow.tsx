import Image from "next/image";
import Link from "next/link";
import { GradeBadge } from "@/components/GradeBadge";
import { dangerForGrade } from "@/lib/attacker";
import type { PeekWithContext } from "@/lib/db";
import { rating } from "@/lib/rate";

// Attacker-framed ranked-list row: the clip's first frame (the counter-
// education), rank, name, floor, grade badge + danger chip, and a
// "N defenders vouch" count. Links to the peek's normal detail page. Server
// component — no client hooks. Reused by the by-danger list and by-floor groups.
export function AttackerPeekRow({
  peek,
  rank,
  showFloor = true,
}: {
  peek: PeekWithContext;
  rank: number;
  showFloor?: boolean;
}) {
  const floor = peek.floors;
  const map = floor?.maps ?? null;
  const r = rating(peek.base_success_rate, peek.worked_votes, peek.vote_count);
  const danger = dangerForGrade(r.grade);
  const votes = peek.vote_count ?? 0;

  return (
    <Link
      href={`/peeks/${peek.slug}?from=attacking`}
      className="peek-lift group flex items-center gap-3 rounded-card border border-border bg-card p-3 hover:border-brand sm:gap-4 sm:p-4"
    >
      <span
        aria-hidden
        className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand sm:flex"
      >
        {rank}
      </span>

      <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-btn border border-border bg-black sm:w-28">
        {peek.video_url ? (
          <video
            src={`${peek.video_url}#t=0.1`}
            preload="metadata"
            muted
            playsInline
            aria-hidden
            {...{ "webkit-playsinline": "true" }}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
        ) : map?.cover_image_url ? (
          <Image
            src={map.cover_image_url}
            alt=""
            fill
            sizes="112px"
            className="object-cover"
          />
        ) : (
          <div className="placeholder-stripes h-full w-full" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className="rounded-btn px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-white"
            style={{ backgroundColor: danger.color }}
          >
            {danger.label}
          </span>
          <GradeBadge label={r.label} score={r.score} />
        </div>
        <h3 className="mt-1 truncate text-sm font-semibold tracking-tight text-ink group-hover:text-brand sm:text-base">
          {peek.name}
        </h3>
        <p className="mt-0.5 truncate text-xs text-muted">
          {showFloor && floor?.name ? `${floor.name} · ` : ""}
          {votes > 0
            ? `${votes} defender${votes === 1 ? "" : "s"} vouch`
            : "Community estimate"}
        </p>
      </div>
    </Link>
  );
}
