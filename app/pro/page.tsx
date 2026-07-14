import type { Metadata } from "next";
import { BadgeCheck, Clock, Lock } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DiscordButton } from "@/components/DiscordButton";
import { WaitlistForm } from "@/components/WaitlistForm";
import { getCurrentUser } from "@/lib/auth";
import { createPortalSession } from "@/app/account/actions";

export const metadata: Metadata = {
  title: "Pro",
  description:
    "peekabooR6 Pro — exclusive spawn peeks you won't find on the free site, early access to new peeks, and a Discord Pro badge. $2.99/mo, cancel anytime.",
};

// getCurrentUser reads cookies → dynamic.
export const dynamic = "force-dynamic";

const PERKS = [
  {
    Icon: Lock,
    title: "Pro-only peeks",
    body: "Exclusive spawn peeks you can't get on the free site, with new ones added regularly.",
  },
  {
    Icon: Clock,
    title: "Early access",
    body: "See new peeks before they go public — get the angle before the lobby does.",
  },
  {
    Icon: BadgeCheck,
    title: "Discord Pro badge",
    body: "A Pro role and badge in the peekabooR6 Discord server.",
  },
];

const FAQ = [
  {
    q: "What happens if I cancel?",
    a: "You keep Pro until the end of your current billing period, then your account simply returns to free. No lock-in, cancel anytime from your account.",
  },
  {
    q: "Is the free site staying free?",
    a: "Yes. Everything that's free today stays free — Pro is purely additive. It adds extra peeks and perks on top; it never takes anything away.",
  },
];

export default async function ProPage() {
  // A public marketing page must never 500 over an auth hiccup — fall back to
  // the logged-out view.
  let user: Awaited<ReturnType<typeof getCurrentUser>> = null;
  try {
    user = await getCurrentUser();
  } catch {
    user = null;
  }

  return (
    <>
      <PageHeader />
      <main className="fade-in-up mx-auto max-w-2xl px-6 pb-20 pt-12">
        {/* Hero */}
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 rounded-btn bg-brand/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-brand">
            <Lock size={12} strokeWidth={2.5} aria-hidden />
            peekabooR6 Pro
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            The peeks that stay off the free site.
          </h1>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-muted">
            Pro unlocks exclusive spawn peeks — plus early access to new ones and
            a Discord badge. $2.99/mo, cancel anytime.
          </p>
        </div>

        {/* State-dependent CTA. Pro isn't launched yet: instead of checkout,
            non-Pro visitors get a disabled "Coming soon" + an email waitlist.
            (Anyone already Pro still gets the manage-subscription portal.) */}
        <div className="mx-auto mt-8 max-w-sm">
          {user?.isPro ? (
            <div className="rounded-card border border-teal/40 bg-teal/10 p-5 text-center">
              <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal">
                <BadgeCheck size={18} strokeWidth={2.25} aria-hidden />
                You&rsquo;re Pro
              </div>
              <p className="mt-1 text-sm text-muted">
                Thanks for supporting the site.
              </p>
              <form action={createPortalSession} className="mt-4">
                <button
                  type="submit"
                  className="w-full rounded-btn border border-border bg-card px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-brand hover:text-brand"
                >
                  Manage subscription
                </button>
              </form>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                type="button"
                disabled
                aria-disabled="true"
                className="w-full cursor-not-allowed rounded-btn bg-ink/[0.06] px-4 py-3 text-sm font-semibold text-muted"
              >
                Coming soon
              </button>
              <p className="text-center text-xs text-muted">
                Pro isn&rsquo;t live yet — join the waitlist and we&rsquo;ll
                email you the moment it launches.
              </p>
              <WaitlistForm defaultEmail={user?.email ?? ""} />
              <div className="pt-1">
                <DiscordButton variant="teal" className="w-full py-2.5" />
              </div>
            </div>
          )}
        </div>

        {/* What you get */}
        <section className="mt-14">
          <h2 className="text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
            What you get
          </h2>
          <ul className="mt-5 space-y-4">
            {PERKS.map(({ Icon, title, body }) => (
              <li
                key={title}
                className="flex items-start gap-4 rounded-card border border-border bg-card p-5 shadow-sm"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                  <Icon size={20} strokeWidth={2} aria-hidden />
                </span>
                <div>
                  <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
                  <p className="mt-0.5 text-sm leading-relaxed text-muted">
                    {body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Price strip */}
        <div className="mt-8 rounded-card border border-border bg-card p-5 text-center shadow-sm">
          <div className="text-3xl font-bold tracking-tight text-ink">
            $2.99
            <span className="text-base font-medium text-muted">/mo</span>
          </div>
          <div className="mt-1 text-sm text-muted">Cancel anytime.</div>
        </div>

        {/* FAQ */}
        <section className="mt-14">
          <h2 className="text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
            Questions
          </h2>
          <div className="mt-5 space-y-4">
            {FAQ.map(({ q, a }) => (
              <div
                key={q}
                className="rounded-card border border-border bg-card p-5"
              >
                <h3 className="text-[15px] font-semibold text-ink">{q}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{a}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
