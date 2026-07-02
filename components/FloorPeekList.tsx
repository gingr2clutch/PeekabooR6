import Link from "next/link";
import type { Floor, Map, Peek } from "@/lib/db";
import { rating, votesText } from "@/lib/rate";
import { GradeBadge } from "@/components/GradeBadge";

export function FloorPeekList({
  map,
  floor,
  peeks,
}: {
  map: Map;
  floor: Floor;
  peeks: Peek[];
}) {
  if (peeks.length === 0) return null;

  const riskLabel: Record<Peek["risk"], string> = {
    low: "Low risk",
    medium: "Medium risk",
    high: "High risk",
  };

  return (
    <section
      aria-labelledby="floor-peek-list-heading"
      className="mx-auto mt-14 max-w-3xl"
    >
      <h2
        id="floor-peek-list-heading"
        className="text-xl font-semibold tracking-tight text-ink"
      >
        Every spawn peek on {map.name} — {floor.name}, ranked by grade
      </h2>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">
        These are the {peeks.length} spawn{" "}
        {peeks.length === 1 ? "peek" : "peeks"} the community has mapped on{" "}
        {map.name}&rsquo;s {floor.name} in Rainbow Six Siege, ordered from the
        highest-rated angle to the lowest. Each grade reflects how reliably the
        peek works in real matches — tap any peek to watch the clip, see the
        exact spot on the map, and get the setup steps.
      </p>

      <ol className="mt-6 space-y-3">
        {peeks.map((peek, i) => {
          const r = rating(
            peek.base_success_rate,
            peek.worked_votes,
            peek.vote_count
          );
          return (
            <li
              key={peek.id}
              className="rounded-card border border-border bg-card p-4"
            >
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand"
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Link
                      href={`/peeks/${peek.slug}`}
                      className="text-[15px] font-semibold text-ink underline-offset-2 hover:text-brand hover:underline"
                    >
                      {peek.name}
                    </Link>
                    <GradeBadge label={r.label} score={r.score} />
                  </div>
                  <p className="mt-1 text-[13px] text-muted">
                    {riskLabel[peek.risk]} · Difficulty {peek.difficulty}/5
                    {r.tier === "measured"
                      ? ` · ${votesText(r.votes)}`
                      : " · community estimate"}
                  </p>
                </div>
                {peek.video_url ? (
                  <Link
                    href={`/peeks/${peek.slug}`}
                    className="inline-flex shrink-0 items-center gap-1 rounded-btn border border-border bg-card px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-brand hover:text-brand"
                  >
                    See video
                  </Link>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-6 text-[14px] leading-relaxed text-muted">
        Know a spawn peek on {map.name} {floor.name} that isn&rsquo;t here, or
        one that&rsquo;s been patched out?{" "}
        <Link href="/submit" className="font-medium text-brand hover:underline">
          Submit it
        </Link>{" "}
        and help keep the board accurate for every {map.name} player.
      </p>
    </section>
  );
}
