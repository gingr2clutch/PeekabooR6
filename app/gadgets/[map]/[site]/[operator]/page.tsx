import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { resolveClip } from "@/lib/gadget-embed";
import { ClipLinkCard } from "@/components/ClipLinkCard";
import { ClipCredit } from "@/components/ClipCredit";
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

  // The leaf. Its own setups are the content, so an operator with none is the
  // thinnest page in the section — the grid above links every operator whether
  // or not they have anything here. Same self-lifting rule; see
  // app/gadgets/layout.tsx.
  const setups = await getGadgetSetups(site.id, op.id);

  return {
    title: `${op.name} on ${site.name} — ${map.name}`,
    description: `${op.name} gadget setups for ${site.name} on ${map.name} — where the pins go and a clip showing the setup.`,
    ...(setups.length > 0 ? {} : { robots: { index: false, follow: true } }),
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

  // A setup carries either a hosted file or an external link, never neither —
  // the database CHECK guarantees that. embed_url wins when both somehow exist,
  // because it is the newer, deliberate choice.
  const clip = active?.embed_url ? resolveClip(active.embed_url) : null;
  // A rejected URL should never be in the database — the admin write paths
  // refuse one — but if an older row predates that check, it falls through to
  // the <video> branch, which wants the ordinary 16:9 box.
  const clipAspect = clip && clip.kind !== "rejected" ? clip.aspect : "video";

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
          {/* Credited to whoever filmed the ACTIVE setup, so switching tabs
              switches the name with it. */}
          {active && (
            <ClipCredit
              contributor={active.contributor}
              // embed_url means the clip lives on someone else's platform,
              // whether we frame it or link to it. Either way it is not ours to
              // claim, so the house credit is only reachable for a hosted file.
              platform={clip && clip.kind !== "rejected" ? clip.platform : null}
              externalUnknown={!!active.embed_url && clip?.kind === "rejected"}
              label="Setup"
              className="mt-2"
            />
          )}
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
            {/* The clip. This is the content — the pins above are an index
                into it.

                The box is sized from the platform, not from the media: a
                TikTok player is 9:16, everything else is 16:9. Because that
                comes off the resolved clip on the server, the height is fixed
                before anything loads, so neither shape shifts on arrival. The
                portrait box is width-capped so a vertical clip does not become
                a full-viewport-tall column on desktop. */}
            <div
              className={`mt-5 overflow-hidden rounded-card border border-border bg-black ${
                clipAspect === "portrait" ? "mx-auto w-full max-w-[22rem]" : ""
              }`}
            >
              {clip?.kind === "embed" ? (
                // Embedded because the source file is not hotlinkable. Only
                // hosts verified in lib/gadget-embed.ts reach this branch, so
                // an arbitrary pasted URL can never be framed on the site.
                <iframe
                  key={active.id}
                  src={clip.src}
                  title={`${op.name} — ${active.name}`}
                  loading="lazy"
                  // allow-same-origin lets the frame keep ITS OWN origin
                  // (youtube.com, tiktok.com) — it does not hand it anything of
                  // ours. A cross-origin frame can never reach our DOM whatever
                  // the sandbox says; that is enforced by the origin, not here.
                  // YouTube and TikTok need it for storage access or they
                  // refuse to play. allow-popups is so the player's own
                  // "watch on …" controls still work.
                  sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allow="fullscreen; picture-in-picture"
                  className={`w-full border-0 ${
                    clip.aspect === "portrait" ? "aspect-[9/16]" : "aspect-video"
                  }`}
                />
              ) : clip?.kind === "link" ? (
                // A host on the allowlist that we do not frame — TikTok,
                // YouTube and friends. Better an honest click-out than an
                // iframe pointed at a host nobody has checked. Same
                // aspect-video box as the iframe, so the two are
                // interchangeable without reflow.
                <ClipLinkCard
                  href={clip.href}
                  platform={clip.platform}
                  aspect={clip.aspect}
                />
              ) : (
                <video
                  key={active.id}
                  src={active.video_url ?? undefined}
                  controls
                  playsInline
                  preload="metadata"
                  className="aspect-video w-full"
                />
              )}
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
