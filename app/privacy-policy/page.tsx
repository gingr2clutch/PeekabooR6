import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How peekabooR6 collects and uses information from visitors.",
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <PageHeader />
      <main className="fade-in-up mx-auto max-w-[700px] px-6 pb-20 pt-10">
        <h1 className="text-3xl font-semibold tracking-tight">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-muted">Last updated: May 6, 2026</p>

        <div className="mt-8 space-y-6 text-[15px] leading-relaxed">
          <p>
            peekabooR6 (&ldquo;we&rdquo;, &ldquo;the site&rdquo;) is a free
            community library of Rainbow Six Siege spawn peeks. This page
            explains what information we collect when you visit.
          </p>

          <section>
            <h2 className="mb-2 text-lg font-semibold">What we collect</h2>
            <p>
              We use Vercel Analytics to count page views and approximate
              visitor counts. We also keep aggregate vote counts on individual
              peeks (helpful / not helpful). We do not collect names, email
              addresses, or other personal information from regular visitors.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">How we use it</h2>
            <p>
              The data is used to understand which maps and peeks are popular
              so we can prioritize what to add and improve. That&apos;s it.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">Third-party services</h2>
            <p>
              We rely on a handful of providers to run the site:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Vercel — hosting and basic analytics</li>
              <li>Cloudflare R2 — image and video storage</li>
              <li>Supabase — database</li>
              <li>Google AdSense — advertising</li>
            </ul>
            <p className="mt-2">
              Google AdSense and its partners may use cookies to serve ads
              based on your prior visits to this site or other sites. You can
              opt out of personalized advertising at{" "}
              <a
                href="https://www.google.com/settings/ads"
                className="text-brand hover:underline"
              >
                google.com/settings/ads
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">Cookies</h2>
            <p>
              We do not set tracking cookies ourselves. Third-party services
              listed above may set their own cookies; you can clear or block
              them in your browser settings.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">Your rights</h2>
            <p>
              If you&apos;d like data associated with you removed, or have any
              other privacy question, email us and we&apos;ll handle it.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">Contact</h2>
            <p>
              <a
                href="mailto:gingr2clutch@gmail.com"
                className="text-brand hover:underline"
              >
                gingr2clutch@gmail.com
              </a>
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
