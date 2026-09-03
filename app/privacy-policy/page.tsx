import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How peekabooR6 collects and uses information from visitors.",
};

// Mediavine's required disclosure, verbatim. Rendered as raw HTML rather than
// rewritten into JSX because their Privacy Policy Health Check matches the
// text exactly — including the version number in the <h3>, which is the string
// their checker looks for. Do not reformat, re-word, or "fix" the punctuation
// (the curly quotes are theirs). Update only by pasting a newer official block.
const MEDIAVINE_DISCLOSURE = `<h3>Mediavine Programmatic Advertising (Ver 1.1)</h3>
<p>The Website works with Mediavine to manage third-party interest-based advertising appearing on the Website. Mediavine serves content and advertisements when you visit the Website, which may use first and third-party cookies. A cookie is a small text file which is sent to your computer or mobile device (referred to in this policy as a “device”) by the web server so that a website can remember some information about your browsing activity on the Website.</p>
<p>First party cookies are created by the website that you are visiting. A third-party cookie is frequently used in behavioral advertising and analytics and is created by a domain other than the website you are visiting. Third-party cookies, tags, pixels, beacons and other similar technologies (collectively, “Tags”) may be placed on the Website to monitor interaction with advertising content and to target and optimize advertising. Each internet browser has functionality so that you can block both first and third-party cookies and clear your browser’s cache. The "help" feature of the menu bar on most browsers will tell you how to stop accepting new cookies, how to receive notification of new cookies, how to disable existing cookies and how to clear your browser’s cache. For more information about cookies and how to disable them, you can consult the information at <a href="https://www.allaboutcookies.org/manage-cookies/" target="_blank" rel="noreferrer noopener nofollow">All About Cookies</a>.</p>
<p>Without cookies you may not be able to take full advantage of the Website content and features. Please note that rejecting cookies does not mean that you will no longer see ads when you visit our Site. In the event you opt-out, you will still see non-personalized advertisements on the Website.</p>
<p>The Website collects the following data using a cookie when serving personalized ads:</p>
<ul><li>IP Address</li><li>Operating System type</li><li>Operating System version</li><li>Device Type</li><li>Language of the website</li><li>Web browser type</li><li>Email (in hashed form)</li></ul>
<p>Mediavine Partners (companies listed below with whom Mediavine shares data) may also use this data to link to other end user information the partner has independently collected to deliver targeted advertisements. Mediavine Partners may also separately collect data about end users from other sources, such as advertising IDs or pixels, and link that data to data collected from Mediavine publishers in order to provide interest-based advertising across your online experience, including devices, browsers and apps. This data includes usage data, cookie information, device information, information about interactions between users and advertisements and websites, geolocation data, traffic data, and information about a visitor’s referral source to a particular website. Mediavine Partners may also create unique IDs to create audience segments, which are used to provide targeted advertising.</p>
<p>If you would like more information about this practice and to know your choices to opt-in or opt-out of this data collection, please visit <a href="https://thenai.org/opt-out/" target="_blank" rel="noreferrer noopener nofollow">National Advertising Initiative opt out page</a>. You may also visit <a href="http://optout.aboutads.info/#/" target="_blank" rel="noreferrer noopener nofollow">Digital Advertising Alliance website</a> and <a href="http://optout.networkadvertising.org/#" target="_blank" rel="noreferrer noopener nofollow">Network Advertising Initiative website</a> to learn more information about interest-based advertising. You may download the AppChoices app at <a href="https://youradchoices.com/appchoices" target="_blank" rel="noreferrer noopener nofollow">Digital Advertising Alliance’s AppChoices app</a> to opt out in connection with mobile apps, or use the platform controls on your mobile device to opt out.</p>`;

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
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">Cookies</h2>
            <p>
              We use cookies for basic site functionality. Our advertising and
              analytics partners set their own cookies, described below. You
              can clear or block them in your browser settings.
            </p>
          </section>

          {/* Sits directly after Cookies so the "described below" above points
              at it. Scoped styling only — the markup itself is untouched. */}
          <section
            className="mv-disclosure"
            dangerouslySetInnerHTML={{ __html: MEDIAVINE_DISCLOSURE }}
          />

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
