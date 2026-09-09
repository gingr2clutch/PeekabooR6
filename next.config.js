/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Every remote image we render is R2-hosted and already CDN-served
    // through Cloudflare, so Vercel's image optimization is redundant on
    // top — and on the Hobby plan it has a monthly quota that, when hit,
    // returns 402 PAYMENT_REQUIRED and breaks every <Image> on the site.
    // Disabling the proxy means next/image emits an <img> pointing
    // directly at R2 while still giving us width/height layout
    // reservation, priority hinting, and native lazy loading.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  experimental: {
    // Allow video clips up to 50MB through server actions.
    serverActions: { bodySizeLimit: "50mb" },
    // Don't reuse a cached client render for dynamic pages on back/forward — the
    // page must re-render from the current URL. This is what lets the map page's
    // ?view= param actually take effect on browser-back (otherwise Next served a
    // stale Floors render and never re-read the URL). Our pages are force-dynamic
    // anyway, so this just makes back-nav honest.
    staleTimes: { dynamic: 0 },
  },
  // /ads.txt is a redirect to a network's hosted file rather than a static
  // file we maintain. redirects() run before the filesystem and public/ads.txt
  // has been removed, so the rule below is the only thing serving that path.
  // ads.txt crawlers follow redirects.
  //
  // It currently points at NitroPay while Mediavine is still serving the ads.
  // That is deliberate, not a mismatch: Nitro's AdX approval requires their
  // lines live on the domain first (1-2 weeks), so this is an overlap period
  // authorised in writing by Nitro, with go-live 2026-09-29. Nitro's file
  // carries Mediavine's seller lines too — including
  // journeymv.com, cf3a28fc-8c16-4c04-9940-96ae46697dfa, DIRECT — so the
  // sellers actually transacting this inventory stay authorised throughout.
  //
  // Two things follow from that, and both matter:
  //   - The ad script in app/layout.tsx is still Mediavine's and must stay
  //     that way until go-live. If you change one of these, check the other.
  //   - The status is 302, not 301. This reverses on 2026-09-29, and a
  //     permanent redirect is the kind crawlers cache past the point of
  //     usefulness.
  async redirects() {
    return [
      {
        // The Top peeks page moved from /popular to /top; keep old links/index
        // entries working.
        source: "/popular",
        destination: "/top",
        permanent: true,
      },
      {
        // /whats-new (new-peek feed) removed — new-peek visibility is now a
        // Discord perk. Send old/indexed links home instead of 404ing.
        source: "/whats-new",
        destination: "/",
        permanent: true,
      },
      {
        // /gear (affiliate shop) removed. Redirect old/indexed links home.
        source: "/gear",
        destination: "/",
        permanent: true,
      },
      {
        // /pro (Pro tier / waitlist) unlaunched — send links home. Temporary
        // (307) since the Pro tier may return; the underlying infra is dormant,
        // not deleted.
        source: "/pro",
        destination: "/",
        permanent: false,
      },
      {
        source: "/ads.txt",
        destination: "https://api.nitropay.com/v1/ads-2632.txt",
        statusCode: 302,
      },
    ];
  },
};

module.exports = nextConfig;
