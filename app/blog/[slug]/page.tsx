import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { PeekMedia } from "@/components/PeekMedia";
import {
  BLOG_BASE_URL,
  articleSlugFor,
  listEligibleMaps,
  loadArticleData,
  mapSlugFromArticle,
  peekLeadIn,
  type ArticleData,
  type BlogPeek,
} from "@/lib/blog";
import { rating, votesText } from "@/lib/rate";
import { GradeBadge } from "@/components/GradeBadge";

export const dynamic = "force-dynamic";

const SITE_NAME = "peekabooR6";
const SITE_AUTHOR = "peekabooR6";

export async function generateStaticParams() {
  const eligible = await listEligibleMaps();
  return eligible.map((e) => ({ slug: articleSlugFor(e.map.slug) }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const mapSlug = mapSlugFromArticle(params.slug);
  if (!mapSlug) return { title: "Not found" };
  const data = await loadArticleData(mapSlug);
  if (!data) return { title: "Not found" };

  const title = `Best Spawn Peeks on ${data.map.name} in Rainbow Six Siege (2026 Guide)`;
  const description = `${data.peeks.length} community-ranked spawn peek angles on ${data.map.name}, with video clips, success rates, difficulty, and counter-play tips for Rainbow Six Siege.`;
  const url = `${BLOG_BASE_URL}/blog/${params.slug}`;
  const image = data.map.cover_image_url ?? undefined;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      siteName: SITE_NAME,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function BlogArticlePage({
  params,
}: {
  params: { slug: string };
}) {
  const mapSlug = mapSlugFromArticle(params.slug);
  if (!mapSlug) notFound();
  const data = await loadArticleData(mapSlug);
  if (!data) notFound();

  const url = `${BLOG_BASE_URL}/blog/${params.slug}`;
  const articleJsonLd = buildArticleJsonLd(data, url);
  const videoJsonLd = buildVideoJsonLd(data);
  const faqJsonLd = buildFaqJsonLd(data);

  return (
    <>
      <PageHeader />
      <main className="fade-in-up mx-auto max-w-3xl px-4 pb-24 pt-10 sm:px-6">
        <article>
          <header className="mb-8">
            <div className="mb-3 text-center">
              <Link
                href="/blog"
                className="inline-flex items-center gap-1.5 rounded-btn px-2.5 py-1 text-sm font-medium text-muted transition-colors duration-150 ease-out hover:bg-ink/[0.06] hover:text-brand"
              >
                <BackArrowIcon />
                <span>All guides</span>
              </Link>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Best Spawn Peeks on {data.map.name} in Rainbow Six Siege (2026
              Guide)
            </h1>
            <p className="mt-3 text-sm text-muted">
              {data.peeks.length} peeks · {data.floors.length} floors ·
              Community-ranked
            </p>
          </header>

          <section className="space-y-4 text-[16px] leading-[1.7]">
            {data.intro.split("\n\n").map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </section>

          <section className="mt-12">
            <h2 className="text-xl font-semibold tracking-tight">
              Why spawn peek on {data.map.name}?
            </h2>
            <p className="mt-4 text-[16px] leading-[1.7]">{data.why}</p>
          </section>

          <section className="mt-12 space-y-12">
            <h2 className="text-xl font-semibold tracking-tight">
              Every documented spawn peek on {data.map.name}
            </h2>
            {data.peeks.map((peek, idx) => (
              <PeekSection key={peek.id} peek={peek} rank={idx + 1} />
            ))}
          </section>

          <section className="mt-12 rounded-card border border-border bg-card p-6">
            <h2 className="text-xl font-semibold tracking-tight">
              Wrap-up + next steps
            </h2>
            {data.outro.split("\n\n").map((para, i) => {
              const interactiveUrl = `/maps/${data.map.slug}`;
              if (para.includes(interactiveUrl)) {
                const [before, after] = para.split(interactiveUrl);
                return (
                  <p key={i} className="mt-3 text-[16px] leading-[1.7]">
                    {before}
                    <Link
                      href={interactiveUrl}
                      className="font-medium text-brand hover:underline"
                    >
                      {interactiveUrl}
                    </Link>
                    {after}
                  </p>
                );
              }
              return (
                <p key={i} className="mt-3 text-[16px] leading-[1.7]">
                  {para}
                </p>
              );
            })}
            <div className="mt-5">
              <Link
                href={`/maps/${data.map.slug}`}
                className="inline-flex items-center gap-2 rounded-btn bg-ink px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-brand active:scale-95"
              >
                Open the interactive {data.map.name} map →
              </Link>
            </div>
          </section>

          <section className="mt-12">
            <h2 className="text-xl font-semibold tracking-tight">
              Frequently asked questions
            </h2>
            <div className="mt-5 space-y-5">
              {data.faq.map((item, i) => (
                <div key={i}>
                  <h3 className="text-base font-semibold tracking-tight">
                    {item.q}
                  </h3>
                  <p className="mt-2 text-[15px] leading-[1.65] text-ink/85">
                    {item.a}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </article>
      </main>

      <script
        type="application/ld+json"
        // JSON-LD structured data must not be JSX-escaped.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      {videoJsonLd.map((v, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(v) }}
        />
      ))}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </>
  );
}

function PeekSection({ peek, rank }: { peek: BlogPeek; rank: number }) {
  const steps = Array.isArray(peek.instructions) ? peek.instructions : [];
  return (
    <div className="border-t border-border pt-10 first:border-0 first:pt-0">
      <div className="mb-2 text-xs uppercase tracking-[0.12em] text-muted">
        #{rank} · {peek.floor.name}
      </div>
      <h3 className="text-2xl font-semibold tracking-tight">{peek.name}</h3>
      <p className="mt-3 text-[16px] leading-[1.7]">{peekLeadIn(peek)}</p>

      <dl className="mt-4 grid grid-cols-3 gap-3 rounded-card border border-border bg-card p-4 text-sm">
        <ReliabilityCell peek={peek} />
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-muted">
            Difficulty
          </dt>
          <dd className="mt-1 text-2xl font-bold leading-none tracking-tight">
            {peek.difficulty}/5
          </dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-muted">
            Risk
          </dt>
          <dd className="mt-1 text-2xl font-bold leading-none tracking-tight capitalize">
            {peek.risk}
          </dd>
        </div>
      </dl>

      <div className="mt-5">
        <PeekMedia videoUrl={peek.video_url} name={peek.name} />
      </div>

      {steps.length > 0 && (
        <div className="mt-5">
          <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            Where to look and how to execute
          </h4>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-[15px] leading-[1.65]">
            {steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </div>
      )}

      {peek.tip && (
        <div className="mt-5 rounded-card border border-brand/20 bg-brand/[0.04] p-4">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand">
            Pro tip
          </span>
          <p className="mt-1 text-[15px] leading-[1.65]">{peek.tip}</p>
        </div>
      )}

      <div className="mt-5 text-sm">
        <Link
          href={`/peeks/${peek.slug}`}
          className="text-brand hover:underline"
        >
          Open the full {peek.name} breakdown →
        </Link>
      </div>
    </div>
  );
}

// Effectiveness grade chip. Grade for every peek; measured-tier peeks add
// their vote count beneath so the grade reads as community-backed.
function ReliabilityCell({ peek }: { peek: BlogPeek }) {
  const r = rating(peek.base_success_rate, peek.worked_votes, peek.vote_count);
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-muted">
        Effectiveness
      </dt>
      <dd className="mt-1">
        <GradeBadge label={r.label} score={r.score} />
        {r.tier === "measured" && (
          <span className="mt-1 block text-[11px] font-medium normal-case text-muted">
            {votesText(r.votes)}
          </span>
        )}
      </dd>
    </div>
  );
}

function BackArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden
      className="fill-none stroke-current"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

// --- JSON-LD builders ---

function buildArticleJsonLd(data: ArticleData, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `Best Spawn Peeks on ${data.map.name} in Rainbow Six Siege (2026 Guide)`,
    description: `${data.peeks.length} community-ranked spawn peek angles on ${data.map.name}, with video clips, success rates, difficulty, and counter-play tips for Rainbow Six Siege.`,
    image: data.map.cover_image_url ? [data.map.cover_image_url] : undefined,
    author: { "@type": "Organization", name: SITE_AUTHOR },
    publisher: { "@type": "Organization", name: SITE_NAME },
    datePublished: data.publishedDate,
    dateModified: data.modifiedDate,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
  };
}

// Structured-data description per peek video. Mirrors the on-page copy rule:
// an effectiveness grade, with the vote count once it's community-backed.
function videoPeekDescription(p: BlogPeek, mapName: string): string {
  const r = rating(p.base_success_rate, p.worked_votes, p.vote_count);
  const base = `${p.name} is a ${p.risk}-risk spawn peek on ${mapName} ${p.floor.name}`;
  if (r.tier === "estimate") {
    return `${base}, graded ${r.grade} for effectiveness.`;
  }
  return `${base}, graded ${r.grade} for effectiveness from ${votesText(
    r.votes
  )} of community feedback.`;
}

function buildVideoJsonLd(data: ArticleData) {
  return data.peeks
    .filter((p) => !!p.video_url)
    .map((p) => ({
      "@context": "https://schema.org",
      "@type": "VideoObject",
      name: `${p.name} — spawn peek on ${data.map.name}`,
      description: videoPeekDescription(p, data.map.name),
      thumbnailUrl: p.poster_url ? [p.poster_url] : undefined,
      uploadDate: p.created_at,
      contentUrl: p.video_url ?? undefined,
      embedUrl: `${BLOG_BASE_URL}/peeks/${p.slug}`,
    }));
}

function buildFaqJsonLd(data: ArticleData) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: data.faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}
