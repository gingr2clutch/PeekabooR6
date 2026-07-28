import Link from "next/link";
import { dangerForGrade } from "@/lib/attacker";
import type { Floor, Map, Peek } from "@/lib/db";
import { rating } from "@/lib/rate";

// One compact, auto-generated attacker line on the peek detail page. Fills a
// single template from the peek's grade/votes/floor — no manual writing. Styled
// as a standard info card with a danger-colored left rule.
export function AttackerCallout({
  peek,
  map,
  floor,
}: {
  peek: Peek;
  map: Map;
  floor: Floor;
}) {
  const r = rating(peek.base_success_rate, peek.worked_votes, peek.vote_count);
  const danger = dangerForGrade(r.grade);

  return (
    <section className="mt-6">
      <div
        className="rounded-card border border-l-[3px] border-border bg-card p-4"
        style={{ borderLeftColor: danger.color }}
      >
        <h2 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-ink">
          <span aria-hidden>⚔️</span> Playing Attacker?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink">
          {r.tier === "measured" ? (
            <>
              This angle is rated <span className="font-semibold">{r.label}</span> by{" "}
              <span className="font-semibold">{r.votes}</span>{" "}
              {r.votes === 1 ? "defender" : "defenders"} — treat it as{" "}
              <span className="font-bold" style={{ color: danger.color }}>
                {danger.priority}
              </span>{" "}
              priority to pre-aim or clear when approaching {floor.name}.
            </>
          ) : (
            <>
              This angle is graded <span className="font-semibold">{r.grade}</span> — treat it
              as{" "}
              <span className="font-bold" style={{ color: danger.color }}>
                {danger.priority}
              </span>{" "}
              priority to pre-aim or clear when approaching {floor.name}.
            </>
          )}
        </p>
        <Link
          href={`/maps/${map.slug}/attacking`}
          className="mt-2 inline-block text-sm font-semibold text-brand hover:underline"
        >
          See all dangerous angles on {map.name} →
        </Link>
      </div>
    </section>
  );
}
