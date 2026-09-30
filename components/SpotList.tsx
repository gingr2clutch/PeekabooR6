"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { GradeBadge } from "@/components/GradeBadge";
import { rating, votesText } from "@/lib/rate";
import { isPeekNew } from "@/lib/peek-recency";

/**
 * One peek inside a spot, as the client sees it.
 *
 * Deliberately flat and serializable: the floor page resolves the credit to a
 * string on the server, so no contributor row — or any other column of the
 * peeks table — crosses into the client bundle.
 */
export type SpotMember = {
  id: string;
  slug: string;
  name: string;
  x_pct: number;
  y_pct: number;
  tiktok_url: string | null;
  base_success_rate: number;
  worked_votes: number;
  vote_count: number;
  created_at: string;
  /** Already resolved through clipCreditName on the server. */
  credit: string;
  /**
   * Only the single-pin card reads these two, for its Difficulty and Risk
   * tiles. They are beyond the fields the spot list itself needs, but a single
   * pin has to keep behaving exactly as it does today, and dropping them would
   * silently delete two of its three stat tiles. Both are already public — the
   * peek page renders them.
   */
  difficulty: number;
  risk: "low" | "medium" | "high";
};

// The list of peeks filmed at one spot. Shared by the mobile card and the
// desktop popover so the two can never drift.
export function SpotList({ members }: { members: SpotMember[] }) {
  return (
    <ul>
      {members.map((m) => {
        const r = rating(m.base_success_rate, m.worked_votes, m.vote_count);
        return (
          <li key={m.id}>
            <Link
              href={`/peeks/${m.slug}`}
              className="flex items-center gap-2.5 border-t border-border px-3.5 py-2.5 transition-colors hover:bg-bg"
            >
              {/* min-w so every name starts at the same x, whatever the grade */}
              <span className="flex min-w-[34px] shrink-0 justify-center">
                <GradeBadge label={r.label} score={r.score} />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-semibold text-ink">
                  {m.name}
                </span>
                <span className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-muted">
                  {/* An estimate has no vote count to quote, so say so rather
                      than printing "0 votes" as if it were measured. */}
                  <span className="shrink-0">
                    {r.tier === "measured" ? votesText(r.votes) : "Estimate"}
                  </span>
                  <span aria-hidden className="shrink-0">
                    ·
                  </span>
                  <span className="flex min-w-0 items-baseline gap-1">
                    <span className="shrink-0">by</span>
                    {/* Plain text, never a link: this row is already one link,
                        and nesting an anchor inside it is invalid. Truncation
                        goes HERE so a long name eats its own space rather than
                        pushing the vote count out of the row. */}
                    <span className="truncate font-semibold text-ink">
                      {m.credit}
                    </span>
                  </span>
                  {isPeekNew(m.created_at) && (
                    <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-500 px-1.5 py-px text-[8.5px] font-semibold uppercase tracking-wider text-white">
                      New
                    </span>
                  )}
                </span>
              </span>

              <ArrowRight
                size={16}
                strokeWidth={2}
                aria-hidden
                className="shrink-0 text-muted"
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
