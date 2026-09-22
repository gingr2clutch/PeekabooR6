import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { adPartner } from "@/lib/ad-partner";

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
//
// Shown only while Mediavine is the active partner. Parameterising the partner
// NAME inside this block would not be enough and would break the health check:
// the text is Mediavine-specific throughout — "Mediavine Partners (companies
// listed below with whom Mediavine shares data)", their enumerated data list,
// their version header. When the partner changes, the whole block is wrong, not
// one word of it.
const MEDIAVINE_DISCLOSURE = `<h3>Mediavine Programmatic Advertising (Ver 1.1)</h3>
<p>The Website works with Mediavine to manage third-party interest-based advertising appearing on the Website. Mediavine serves content and advertisements when you visit the Website, which may use first and third-party cookies. A cookie is a small text file which is sent to your computer or mobile device (referred to in this policy as a “device”) by the web server so that a website can remember some information about your browsing activity on the Website.</p>
<p>First party cookies are created by the website that you are visiting. A third-party cookie is frequently used in behavioral advertising and analytics and is created by a domain other than the website you are visiting. Third-party cookies, tags, pixels, beacons and other similar technologies (collectively, “Tags”) may be placed on the Website to monitor interaction with advertising content and to target and optimize advertising. Each internet browser has functionality so that you can block both first and third-party cookies and clear your browser’s cache. The "help" feature of the menu bar on most browsers will tell you how to stop accepting new cookies, how to receive notification of new cookies, how to disable existing cookies and how to clear your browser’s cache. For more information about cookies and how to disable them, you can consult the information at <a href="https://www.allaboutcookies.org/manage-cookies/" target="_blank" rel="noreferrer noopener nofollow">All About Cookies</a>.</p>
<p>Without cookies you may not be able to take full advantage of the Website content and features. Please note that rejecting cookies does not mean that you will no longer see ads when you visit our Site. In the event you opt-out, you will still see non-personalized advertisements on the Website.</p>
<p>The Website collects the following data using a cookie when serving personalized ads:</p>
<ul><li>IP Address</li><li>Operating System type</li><li>Operating System version</li><li>Device Type</li><li>Language of the website</li><li>Web browser type</li><li>Email (in hashed form)</li></ul>
<p>Mediavine Partners (companies listed below with whom Mediavine shares data) may also use this data to link to other end user information the partner has independently collected to deliver targeted advertisements. Mediavine Partners may also separately collect data about end users from other sources, such as advertising IDs or pixels, and link that data to data collected from Mediavine publishers in order to provide interest-based advertising across your online experience, including devices, browsers and apps. This data includes usage data, cookie information, device information, information about interactions between users and advertisements and websites, geolocation data, traffic data, and information about a visitor’s referral source to a particular website. Mediavine Partners may also create unique IDs to create audience segments, which are used to provide targeted advertising.</p>
<p>If you would like more information about this practice and to know your choices to opt-in or opt-out of this data collection, please visit <a href="https://thenai.org/opt-out/" target="_blank" rel="noreferrer noopener nofollow">National Advertising Initiative opt out page</a>. You may also visit <a href="http://optout.aboutads.info/#/" target="_blank" rel="noreferrer noopener nofollow">Digital Advertising Alliance website</a> and <a href="http://optout.networkadvertising.org/#" target="_blank" rel="noreferrer noopener nofollow">Network Advertising Initiative website</a> to learn more information about interest-based advertising. You may download the AppChoices app at <a href="https://youradchoices.com/appchoices" target="_blank" rel="noreferrer noopener nofollow">Digital Advertising Alliance’s AppChoices app</a> to opt out in connection with mobile apps, or use the platform controls on your mobile device to opt out.</p>`;

export default function PrivacyPolicyPage() {
  const partner = adPartner();

  return (
    <>
      <PageHeader />
      <main className="fade-in-up mx-auto max-w-[700px] px-6 pb-20 pt-10">
        <h1 className="text-3xl font-semibold tracking-tight">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-muted">
          Last updated: September 22, 2026
        </p>

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
          {partner.hasOfficialDisclosure ? (
            <section
              className="mv-disclosure"
              dangerouslySetInnerHTML={{ __html: MEDIAVINE_DISCLOSURE }}
            />
          ) : (
            <section>
              <h2 className="mb-2 text-lg font-semibold">
                Advertising ({partner.name})
              </h2>
              {/* PLACEHOLDER — deliberately minimal.
                  Every sentence here is true of any interest-based ad network
                  and the opt-out links are industry-wide, so nothing is
                  asserted that cannot be supported. It is NOT a substitute for
                  the partner's own required text, which must be pasted in
                  before this partner serves a real visitor. */}
              <p>
                The Website works with {partner.name} to manage third-party
                interest-based advertising appearing on the Website.{" "}
                {partner.name} and its partners may use cookies and similar
                technologies to serve and measure advertising. You can block or
                clear cookies in your browser settings; doing so does not stop
                ads, but the ads you see will not be personalised.
              </p>
              <p className="mt-3">
                To opt out of interest-based advertising more broadly, see the{" "}
                <a
                  href="https://thenai.org/opt-out/"
                  target="_blank"
                  rel="noreferrer noopener nofollow"
                  className="text-brand hover:underline"
                >
                  Network Advertising Initiative
                </a>{" "}
                and the{" "}
                <a
                  href="http://optout.aboutads.info/#/"
                  target="_blank"
                  rel="noreferrer noopener nofollow"
                  className="text-brand hover:underline"
                >
                  Digital Advertising Alliance
                </a>{" "}
                opt-out pages.
              </p>
            </section>
          )}

          {/* id is the footer's "Do Not Sell or Share" target. Anchoring to a
              section rather than a separate page keeps one canonical statement
              of these rights. scroll-mt clears the sticky header so the heading
              is not hidden under it on arrival. */}
          <section id="do-not-sell" className="scroll-mt-24">
            <h2 className="mb-2 text-lg font-semibold">
              California privacy rights (CCPA/CPRA)
            </h2>
            <p>
              This section applies to California residents.
            </p>
            <p className="mt-3">
              <strong>Do we sell your personal information?</strong> No. We do
              not sell personal information for money, and we never have.
            </p>
            <p className="mt-3">
              <strong>Do we share it?</strong> Yes, in the specific sense the
              CPRA uses. We show interest-based advertising through{" "}
              {partner.name}, and that involves disclosing information such as
              your IP address, device and browser details, and activity on this
              site to advertising partners so they can select ads for you. The
              CPRA calls that &ldquo;sharing&rdquo; for cross-context behavioural
              advertising, and you have the right to opt out of it.
            </p>
            <p className="mt-3">
              <strong>How to opt out.</strong>{" "}
              {partner.providesOptOutControl ? (
                <>
                  Use the <em>Do Not Sell or Share My Personal Information</em>{" "}
                  button that {partner.name} places at the bottom of every page
                  on this site. That control is operated by {partner.name} and
                  applies your choice to the advertising on this site.
                </>
              ) : (
                <>
                  Email us at the address below and we will apply your opt-out.
                </>
              )}{" "}
              We also honour the{" "}
              <a
                href="https://globalprivacycontrol.org/"
                target="_blank"
                rel="noreferrer noopener"
                className="text-brand hover:underline"
              >
                Global Privacy Control
              </a>{" "}
              signal where your browser sends one.
            </p>
            <p className="mt-3">
              <strong>Your other rights.</strong> You can ask us what personal
              information we hold about you, ask us to delete it, ask us to
              correct it, and ask for a copy of it. You will not be treated
              differently for exercising any of these rights. To make a request,
              email{" "}
              <a
                href="mailto:chase@peekaboor6.com"
                className="text-brand hover:underline"
              >
                chase@peekaboor6.com
              </a>{" "}
              from the address you want us to act on, or describe the activity
              precisely enough for us to find it — we do not hold accounts for
              most visitors, so an email address is often the only identifier we
              could match.
            </p>
            <p className="mt-3">
              <strong>Sensitive personal information.</strong> We do not collect
              it, and we do not use or disclose any for the purpose of inferring
              characteristics about you.
            </p>
            <p className="mt-3">
              <strong>Minors.</strong> We do not knowingly sell or share the
              personal information of anyone under 16.
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
                href="mailto:chase@peekaboor6.com"
                className="text-brand hover:underline"
              >
                chase@peekaboor6.com
              </a>
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
