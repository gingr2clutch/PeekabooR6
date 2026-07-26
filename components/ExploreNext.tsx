import Link from "next/link";

type ExploreCard = { href: string; emoji: string; label: string };

// "Where to next" footer for the Top Peeks / Underrated pages — a short
// contextual line plus a row of explore cards in the shared card style.
export function ExploreNext({
  line,
  cards,
}: {
  line: string;
  cards: ExploreCard[];
}) {
  return (
    <section className="mx-auto mt-16 max-w-3xl px-4">
      <p className="mx-auto max-w-xl text-center text-[15px] leading-relaxed text-muted">
        {line}
      </p>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="peek-lift group flex items-center gap-3 rounded-card border border-border bg-card p-4 hover:border-brand"
          >
            <span className="text-2xl" aria-hidden>
              {c.emoji}
            </span>
            <span className="flex-1 text-sm font-medium text-ink group-hover:text-brand sm:text-base">
              {c.label}
            </span>
            <span
              className="text-muted transition-colors group-hover:text-brand"
              aria-hidden
            >
              →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
