import type { Metadata } from "next";
import Script from "next/script";
import { GoogleAnalytics } from "@next/third-parties/google";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "peekabooR6 — Rainbow Six spawn peek database",
    template: "%s — peekabooR6",
  },
  description:
    "Community library of spawn peek locations for Rainbow Six Siege. Pick a map, pick a floor, see every peek.",
  icons: {
    icon: [
      { url: "/favicon-32x32.png?v=2", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png?v=2", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png?v=2",
    shortcut: "/favicon.ico?v=2",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Ezoic — privacy scripts MUST come before the header script.
            Raw <script> tags so data-cfasync="false" passes through to
            HTML verbatim (Cloudflare Rocket Loader skips tagged scripts). */}
        <script
          data-cfasync="false"
          src="https://cmp.gatekeeperconsent.com/min.js"
        ></script>
        <script
          data-cfasync="false"
          src="https://the.gatekeeperconsent.com/cmp.min.js"
        ></script>
        <script async src="//www.ezojs.com/ezoic/sa.min.js"></script>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "window.ezstandalone = window.ezstandalone || {};\nezstandalone.cmd = ezstandalone.cmd || [];",
          }}
        />
        <script src="//ezoicanalytics.com/analytics.js"></script>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9948436713506762"
          crossOrigin="anonymous"
        ></script>
      </head>
      <body className="flex min-h-screen flex-col bg-bg text-ink">
        <div className="flex-1">{children}</div>
        <SiteFooter />
        <Script
          defer
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon='{"token": "5dfe065169644aecb43f6b7794b7264e"}'
          strategy="afterInteractive"
        />
        {process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}
      </body>
    </html>
  );
}
