import type { Metadata } from "next";
import type { CSSProperties } from "react";

// Dev-only preview for the ghost mosaic. Not linked anywhere; noindex.
export const metadata: Metadata = {
  title: "Ghost mosaic preview",
  robots: { index: false, follow: false },
};

// A sample block: the ghost-mosaic layer at a given opacity behind real content,
// so readability is judged in context. Optional tinted background to check how
// it reads inside a tinted section.
function Sample({
  opacity,
  tinted = false,
}: {
  opacity: number;
  tinted?: boolean;
}) {
  return (
    <div
      className={`relative isolate overflow-hidden rounded-card border border-border p-6 ${
        tinted ? "bg-brand/[0.11]" : "bg-bg"
      }`}
      style={{ ["--ghost-mosaic-opacity"]: String(opacity) } as CSSProperties}
    >
      <div aria-hidden className="ghost-mosaic" />
      <div className="relative z-10">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-teal">
          {Math.round(opacity * 1000) / 10}% {tinted ? "· tinted" : "· cream"}
        </p>
        <h3 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
          Readability check
        </h3>
        <p className="mt-2 max-w-md text-[15px] leading-relaxed text-muted">
          Body copy in muted grey — the smallest, lowest-contrast text on the
          site. If this stays crisp, the mosaic is safe everywhere.
        </p>
        <div className="mt-3 inline-flex rounded-card border border-border bg-card px-4 py-2 text-sm font-semibold text-ink shadow-sm">
          A white card sits on top, unaffected.
        </div>
      </div>
    </div>
  );
}

export default function MosaicPreviewPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">
        Ghost mosaic preview
      </h1>
      <p className="mt-2 text-[15px] text-muted">
        The homepage ships at <code>--ghost-mosaic-opacity: 0.05</code>. Judge
        the strength below; it&apos;s one CSS variable to tune.
      </p>

      <section className="mt-8 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Opacity ladder — over cream
        </h2>
        <Sample opacity={0.03} />
        <Sample opacity={0.04} />
        <Sample opacity={0.05} />
        <Sample opacity={0.07} />
        <Sample opacity={0.1} />
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Inside a tinted section
        </h2>
        <Sample opacity={0.05} tinted />
        <Sample opacity={0.07} tinted />
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          The raw asset (ghost-mosaic.webp, ~14&nbsp;KB)
        </h2>
        {/* Plain img — a single decorative asset, no next/image needed here. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/ghost-mosaic.webp"
          alt="Ghost mosaic — greyscaled, blurred grid of map thumbnails"
          className="mt-3 w-full rounded-card border border-border"
        />
        <p className="mt-2 text-xs text-muted">
          Shown at full strength for reference — on the site it renders at ~5%.
        </p>
      </section>
    </main>
  );
}
