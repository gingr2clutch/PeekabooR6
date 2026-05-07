import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms governing your use of peekabooR6.",
};

export default function TermsPage() {
  return (
    <>
      <PageHeader />
      <main className="fade-in-up mx-auto max-w-[700px] px-6 pb-20 pt-10">
        <h1 className="text-3xl font-semibold tracking-tight">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-muted">Last updated: May 6, 2026</p>

        <div className="mt-8 space-y-6 text-[15px] leading-relaxed">
          <section>
            <h2 className="mb-2 text-lg font-semibold">Acceptance of terms</h2>
            <p>
              By using peekabooR6 you agree to these terms. If you don&apos;t
              agree, please don&apos;t use the site.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">Content ownership</h2>
            <p>
              Rainbow Six Siege, its maps, and related artwork are the
              property of Ubisoft Entertainment. Screenshots and footage of
              gameplay shown here are used to identify and explain spawn peek
              locations. Original written guides and pin annotations are owned
              by peekabooR6.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">User conduct</h2>
            <p>
              Don&apos;t use the site for anything illegal, don&apos;t try to
              break or scrape it, and don&apos;t republish our content as your
              own. Linking to individual peek pages is fine and encouraged.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">Disclaimers</h2>
            <p>
              The site is provided as-is. Peeks change as Ubisoft updates the
              game; we do our best to keep things current but make no
              guarantees that any specific angle, line, or strategy will work
              in your match.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">
              Limitation of liability
            </h2>
            <p>
              We are not liable for any losses, damages, or ranked points
              dropped as a result of using or relying on information on this
              site. Use it at your own discretion.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">Changes to terms</h2>
            <p>
              We may update these terms from time to time. The &ldquo;Last
              updated&rdquo; date at the top reflects the most recent change.
              Continued use of the site after changes means you accept the new
              terms.
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
