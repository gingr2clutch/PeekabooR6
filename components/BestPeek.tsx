import Image from "next/image";
import Link from "next/link";
import { GradeBadge } from "@/components/GradeBadge";
import type { PeekWithContext } from "@/lib/db";
import { rating, votesText } from "@/lib/rate";

type Props = {
  peek: PeekWithContext;
  // Small mono eyebrow, e.g. "Peek of the Day" or "Top Peek". Omit for none.
  eyebrow?: string;
  // Homepage shows "Map · Floor"; a map page shows just the floor.
  showMap?: boolean;
  // `bare` drops the card chrome (border/shadow/bg/padding) so the row can sit
  // inside another card; still a link, just no bubble of its own.
  bare?: boolean;
};

// Compact featured "best peek" card — preview thumbnail, name, location, grade
// badge, and vote count. The whole card links to the peek. Server component:
// no client hooks; the thumbnail is the video's first frame (the same #t=0.1
// trick used elsewhere), non-interactive so taps hit the card link.
export function BestPeek({ peek, eyebrow, showMap = false, bare = false }: Props) {
  const floor = peek.floors;
  const map = floor?.maps ?? null;
  const r = rating(peek.base_success_rate, peek.worked_votes, peek.vote_count);
  const location = showMap && map ? `${map.name} · ${floor?.name}` : floor?.name;

  return (
    <Link
      href={`/peeks/${peek.slug}`}
      className={
        bare
          ? "group flex items-center gap-3 transition-colors duration-150 ease-out sm:gap-4"
          : "peek-lift group flex items-center gap-3 rounded-card border border-border bg-card p-3 hover:border-brand sm:gap-4 sm:p-4"
      }
    >
      <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-btn border border-border bg-black sm:w-32">
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
            sizes="128px"
            className="object-cover"
          />
        ) : (
          <div className="placeholder-stripes h-full w-full" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        {eyebrow && (
          <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-teal">
            {eyebrow}
          </div>
        )}
        <h3 className="mt-0.5 truncate text-sm font-semibold tracking-tight text-ink group-hover:text-brand sm:text-base">
          {peek.name}
        </h3>
        {location && (
          <p className="mt-0.5 truncate text-xs text-muted">{location}</p>
        )}
      </div>

      <div className="shrink-0 text-right">
        <GradeBadge label={r.label} score={r.score} />
        <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
          {votesText(peek.vote_count ?? 0)}
        </div>
      </div>
    </Link>
  );
}
