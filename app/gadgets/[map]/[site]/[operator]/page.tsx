import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { OperatorIcon } from "@/components/OperatorIcon";
import { BackToTop } from "@/components/BackToTop";
import {
  getMapBySlug,
  getFloorsForMap,
  getGadgetSiteBySlug,
  getGadgetOperatorBySlug,
  getGadgetSetups,
} from "@/lib/db";

export const dynamic = "force-dynamic";

type Params = {
  params: { map: string; site: string; operator: string };
  searchParams?: { setup?: string };
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const map = await getMapBySlug(params.map);
  if (!map?.published) return { title: "Not found" };
  const [site, op] = await Promise.all([
    getGadgetSiteBySlug(map.id, params.site),
    getGadgetOperatorBySlug(params.operator),
  ]);
  if (!site || !op) return { title: "Not found" };
  return {
    title: `${op.name} on ${site.name} — ${map.name}`,
    description: `${op.name} gadget setups for ${site.name} on ${map.name} — where the pins go and a clip showing the setup.`,
  };
}

// One operator's setups on one bomb site.
//
// A setup is a plan — several pins plus ONE clip that explains them. The pins
// are deliberately inert: no grades, no votes, nothing to click. They are
// numbered so the video can say "first cam here" and the viewer can match it to
// the blueprint, which is the only reason they exist alongside the clip.
//
// The chosen setup lives in ?setup=N, not in client state. That keeps every
// setup individually crawlable and linkable — the point being that a single
// setup can be dropped into Discord as a URL. Same reasoning as the
// contributors leaderboard.
export default async function OperatorPlacementsPage({
  params,
  searchParams,
}: Params) {
  const map = await getMapBySlug(params.map);
  if (!map || !map.published) notFound();
  const [site, op] = await Promise.all([
    getGadgetSiteBySlug(map.id, params.site),
    getGadgetOperatorBySlug(params.operator),
  ]);
  if (!site || !op) notFound();

  const setups = await getGadgetSetups(site.id, op.id);

  // ?setup= is 1-based because it is a URL a person might type or edit. Out of
  // range or nonsense falls back to the first setup rather than erroring — a
  // stale Discord link should still land somewhere useful.
  const requested = Number(searchParams?.setup);
  const activeIndex =
    Number.isInteger(requested) && requested >= 1 && requested <= setups.length
      ? requested - 1
      : 0;
  const active = setups[activeIndex] ?? null;
  const pins = active?.pins ?? [];

  // The site now names its own blueprint. Falling back to the first floor that
  // has one only matters while floor_id is unset — that is the mismatch the
  // column was added to fix, so a site with floor_id set is always correct.
  const floors = await getFloorsForMap(map.id);
  const floor =
    (site.floor_id ? floors.find((f) => f.id === site.floor_id) : null) ??
    floors.find((f) => f.birds_eye_url) ??
    null;

  return (
    <>
      <PageHeader />
      <main className="mx-auto max-w-4xl px-4 pb-20 pt-8 sm:px-6 sm:pt-10">
        <Link
          href={`/gadgets/${map.slug}/${site.slug}`}
          className="text-sm font-medium text-muted transition-colors hover:text-blue"
        >
          ← Operators
        </Link>

        <header className="mt-4 text-center">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-blue">
            {map.name} · {site.name}
          </p>
          {/* Same component as the picker cards, deliberately smaller — the
              header is a confirmation of the choice, not the choice itself. */}
          <OperatorIcon
            iconUrl={op.icon_url}
            name={op.name}
            size={40}
            className="mx-auto mt-3"
          />
          <h1 className="mt-2 text-3xl font-semibold tracking-tight lg:text-4xl">
            {op.name}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {[op.role, op.gadget_name].filter(Boolean).join(" · ")}
          </p>
        </header>

        {/* Setup tabs. Real links, so each setup is its own URL and the set is
            crawlable. Hidden when there is only one — a single tab is furniture,
            not a choice. */}
        {setups.length > 1 && (
          <nav
            aria-label="Setups"
            className="mt-6 flex gap-2 overflow-x-auto pb-1"
          >
            {setups.map((sx, i) => {
              const on = i === activeIndex;
              return (
                <Link
                  key={sx.id}
                  href={`/gadgets/${map.slug}/${site.slug}/${op.slug}?setup=${i + 1}`}
                  scroll={false}
                  aria-current={on ? "page" : undefined}
                  className={`inline-flex min-h-[44px] shrink-0 items-center rounded-btn border px-4 text-sm font-semibold transition-colors ${
                    on
                      ? "border-blue bg-blue/10 text-blue"
                      : "border-border bg-card text-ink hover:border-blue hover:text-blue"
                  }`}
                >
                  {sx.name}
                </Link>
              );
            })}
          </nav>
        )}

        {/* Same 16/10 box the peek floor view uses, so blueprints render at a
            familiar scale. */}
        <div className="relative mt-4 aspect-[16/10] w-full">
          <div className="absolute inset-0 overflow-hidden rounded-card border border-border bg-card">
            {floor?.birds_eye_url ? (
              <Image
                src={floor.birds_eye_url}
                alt={`${map.name} ${floor.name} bird's-eye view`}
                fill
                sizes="(max-width: 1024px) 100vw, 896px"
                className="object-cover"
                priority
              />
            ) : (
              <div className="placeholder-stripes flex h-full w-full items-center justify-center">
                <span className="rounded-btn bg-card/80 px-3 py-1 text-sm text-muted backdrop-blur-sm">
                  Bird&apos;s-eye view coming soon
                </span>
              </div>
            )}
          </div>

          {/* Pin layer. Visual only by design — not clickable, no grades, no
              votes. The number is the whole payload: it ties a dot to a moment
              in the clip below. */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            {pins.map((pin, i) => (
              <span
                key={`${pin.x_pct}-${pin.y_pct}-${i}`}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${pin.x_pct}%`, top: `${pin.y_pct}%` }}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue text-[11px] font-bold text-white ring-2 ring-white">
                  {i + 1}
                </span>
              </span>
            ))}
          </div>
        </div>

        {!active ? (
          <p className="mt-5 rounded-card border border-border bg-card p-4 text-center text-sm text-muted">
            No {op.name} setups published for {site.name} yet.
          </p>
        ) : (
          <>
            {/* The clip. This is the content — the pins above are an index into
                it. Height is reserved by the aspect box so nothing shifts when
                the video loads. */}
            <div className="mt-5 overflow-hidden rounded-card border border-border bg-black">
              <video
                key={active.id}
                src={active.video_url}
                controls
                playsInline
                preload="metadata"
                className="aspect-video w-full"
              />
            </div>

            <p className="mt-3 text-center text-sm text-muted">
              {pins.length > 0 ? (
                <>
                  <span className="font-semibold text-ink">{active.name}</span>{" "}
                  — {pins.length} pin{pins.length === 1 ? "" : "s"} on the
                  blueprint above, numbered in the order the clip covers them.
                </>
              ) : (
                <>
                  <span className="font-semibold text-ink">{active.name}</span>{" "}
                  — pins for this setup are not marked up yet. The clip shows it.
                </>
              )}
            </p>
          </>
        )}
      </main>
      <BackToTop />
    </>
  );
}
