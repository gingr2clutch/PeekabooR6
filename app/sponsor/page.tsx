import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Partner With Us",
  description:
    "Reach a 100% endemic Rainbow Six Siege audience. Sponsorship and placement opportunities on peekabooR6 — request the media kit.",
};

const SPONSOR_MAILTO =
  "mailto:gingr2clutch@gmail.com?subject=Media kit request";

const REASONS: { title: string; body: string }[] = [
  {
    title: "A 100% Rainbow Six audience",
    body: "Every visitor is here for one reason — getting better at Rainbow Six Siege. No wasted impressions on the wrong crowd; your message reaches players who actually buy gaming gear.",
  },
  {
    title: "Players who stick around",
    body: "This isn't a bounce-and-leave site. Visitors move through maps, floors, and clips in deep, multi-page sessions — real attention on your brand, not a passing glance.",
  },
  {
    title: "A creator brand behind it",
    body: "peekabooR6 is built and run by a Rainbow Six creator with an active TikTok following. Placements can carry the trust of a real player, not a faceless banner.",
  },
  {
    title: "A clean site that respects users",
    body: "No pop-up spam, no intrusive interstitials — just a fast, tasteful site. Your brand shows up in good company and actually gets seen.",
  },
];

const PLACEMENTS: { title: string; body: string }[] = [
  {
    title: "Featured homepage placement",
    body: "Your brand on the first screen players see — the landing page every visit starts from.",
  },
  {
    title: "Map-page placement",
    body: "Show up where players spend their time: inside the map and floor pages they study before each match.",
  },
  {
    title: "TikTok shoutout add-on",
    body: "Extend a placement off-site with a shoutout to the @gingr2clutch TikTok audience for added reach.",
  },
];

function RequestKitButton({ className = "" }: { className?: string }) {
  return (
    <a
      href={SPONSOR_MAILTO}
      className={`inline-flex items-center justify-center rounded-btn bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand/90 ${className}`}
    >
      Request the full media kit and rates
    </a>
  );
}

export default function SponsorPage() {
  return (
    <>
      <PageHeader />
      <main className="fade-in-up mx-auto max-w-3xl px-6 pb-24 pt-12">
        {/* Hero */}
        <section className="text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
            Partner with peekabooR6
          </span>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">
            Put Your Brand in Front of Rainbow Six Players
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-muted sm:text-base">
            peekabooR6 is the spawn-peek database Rainbow Six players use to
            improve — a 100% endemic gaming audience.
          </p>
          <div className="mt-7">
            <RequestKitButton />
          </div>
        </section>

        {/* Why partner */}
        <section className="mt-16">
          <h2 className="text-xl font-semibold tracking-tight">
            Why brands partner with us
          </h2>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {REASONS.map((r) => (
              <div
                key={r.title}
                className="rounded-card border border-border bg-card p-5"
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand"
                  />
                  <div>
                    <h3 className="text-[15px] font-semibold text-ink">
                      {r.title}
                    </h3>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
                      {r.body}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Placement options */}
        <section className="mt-16">
          <h2 className="text-xl font-semibold tracking-tight">
            Placement options
          </h2>
          <p className="mt-2 text-[14px] text-muted">
            A few of the ways brands show up on peekabooR6.
          </p>
          <div className="mt-5 space-y-3">
            {PLACEMENTS.map((p) => (
              <div
                key={p.title}
                className="rounded-card border border-border bg-card p-5"
              >
                <h3 className="text-[15px] font-semibold text-ink">
                  {p.title}
                </h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
                  {p.body}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[14px] font-medium text-ink">
            Custom packages available — tell us your goals and we&rsquo;ll build
            something that fits.
          </p>
        </section>

        {/* Closing CTA */}
        <section className="mt-16 rounded-card border border-brand/20 bg-brand/[0.05] p-7 text-center">
          <h2 className="text-xl font-semibold tracking-tight">
            Request the full media kit and rates
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-[14px] leading-relaxed text-muted">
            Audience numbers, placement specs, and pricing live in the media
            kit — sent straight to your inbox. Tell us a little about your brand
            and we&rsquo;ll get it over.
          </p>
          <div className="mt-6">
            <RequestKitButton />
          </div>
          <p className="mt-4 text-[13px] text-muted">
            Or email{" "}
            <a
              href={SPONSOR_MAILTO}
              className="font-medium text-brand hover:underline"
            >
              gingr2clutch@gmail.com
            </a>
          </p>
        </section>
      </main>
    </>
  );
}
