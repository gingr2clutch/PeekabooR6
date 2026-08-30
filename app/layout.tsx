import type { Metadata } from "next";
import Script from "next/script";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import { ScrollToTop } from "@/components/ScrollToTop";
import { Analytics } from "@vercel/analytics/next";
import { SiteFooter } from "@/components/SiteFooter";
import { FavoritesProvider } from "@/components/FavoritesProvider";
import "./globals.css";

// Loaded as CSS variables only — the site-wide body font is unchanged. The
// Top Peeks "Arena Banners" page opts in via var(--font-*) on its own elements.
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "peekabooR6 — Rainbow Six spawn peek database",
    template: "%s — peekabooR6",
  },
  description:
    "Community library of spawn peek locations for Rainbow Six Siege. Pick a map, pick a floor, see every peek.",
  icons: {
    icon: [
      { url: "/favicon-32x32.png?v=3", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png?v=3", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png?v=3",
    shortcut: "/favicon.ico?v=3",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Open connections to the image hosts early: wsrv.nl serves resized
            cover WebPs, R2 serves the rest (floor blueprints, peek posters). */}
        <link rel="preconnect" href="https://wsrv.nl" />
        <link
          rel="preconnect"
          href="https://pub-c11cdf7d63734d52945843745d8e60a8.r2.dev"
        />
        {/* Grow by Mediavine (Journey) — site-wide ad loader. */}
        <script
          type="text/javascript"
          async
          data-noptimize="1"
          data-cfasync="false"
          src="https://scripts.scriptwrapper.com/tags/cf3a28fc-8c16-4c04-9940-96ae46697dfa.js"
        ></script>
        {/* Every page opens at the top. scrollRestoration defaults to 'auto',
            which makes the browser restore the previous position on reload and
            on back/forward — that is what left routes starting partway down.
            Set here, in <head>, so it applies before first paint on every
            route rather than after hydration on one.

            Note this is a global, session-wide setting: back/forward no longer
            return to where the reader was. That is the explicit intent — every
            navigation lands at 0. ScrollToTop in <body> handles the
            client-side half. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{history.scrollRestoration='manual';}catch(e){}`,
          }}
        />
        {/* Scroll reveal. Self-contained — does not depend on the app bundle,
            so if React fails to hydrate, content is never left hidden. Bails
            (leaving everything visible) when reduced-motion is set or
            IntersectionObserver is unavailable. Runs in <head> so the hidden
            state is set before first paint (no flash of visible content). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  var d=document,r=d.documentElement;
  try{if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)return;}catch(e){}
  if(!('IntersectionObserver' in window))return;
  r.classList.add('reveal-ready');
  var io=new IntersectionObserver(function(es){
    for(var i=0;i<es.length;i++){if(es[i].isIntersecting){es[i].target.classList.add('is-revealed');io.unobserve(es[i].target);}}
  },{threshold:0.12,rootMargin:'0px 0px -8% 0px'});
  function bind(n){if(n.nodeType===1&&n.hasAttribute('data-reveal')&&!n.hasAttribute('data-reveal-seen')){n.setAttribute('data-reveal-seen','');io.observe(n);}}
  function scan(c){var ns=(c||d).querySelectorAll('[data-reveal]');for(var i=0;i<ns.length;i++)bind(ns[i]);}
  function start(){
    scan(d);
    try{
      var mo=new MutationObserver(function(ms){
        for(var i=0;i<ms.length;i++){var a=ms[i].addedNodes;for(var j=0;j<a.length;j++){var n=a[j];if(n.nodeType===1){bind(n);if(n.querySelectorAll)scan(n);}}}
      });
      mo.observe(d.body,{childList:true,subtree:true});
    }catch(e){}
  }
  if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',start);else start();
})();`,
          }}
        />
      </head>
      <body className="flex min-h-screen flex-col bg-bg text-ink">
        <ScrollToTop />
        <FavoritesProvider>
          <div className="flex-1">{children}</div>
        </FavoritesProvider>
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
        <Analytics />
      </body>
    </html>
  );
}
