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
          const steps = (peek.instructions ?? []).filter((s) => s && s.trim());
          return (
            <li
              key={peek.id}
              className="rounded-card border border-border bg-card p-5 sm:p-6"
            >
              <div className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand"
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Link
                      href={`/peeks/${peek.slug}`}
                      className="text-base font-semibold text-ink underline-offset-2 hover:text-brand hover:underline"
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

                  {/* The setup — the peek's step-by-step instructions. */}
                  {steps.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                        The setup
                      </h3>
                      <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[17px] leading-[1.7] text-ink/85">
                        {steps.map((step, si) => (
                          <li key={si}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {peek.tip ? (
                    <div className="mt-4">
                      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                        Tip
                      </h3>
                      <p className="mt-2 text-[17px] leading-[1.7] text-ink/85">
                        {peek.tip}
                      </p>
                    </div>
                  ) : null}

                  {peek.video_url ? (
                    <Link
                      href={`/peeks/${peek.slug}`}
                      className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
                    >
                      Watch the clip →
                    </Link>
                  ) : null}
                </div>
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
