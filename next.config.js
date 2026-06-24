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
  },
  // Serve ads.txt via Grow by Mediavine's hosted redirect so it stays
  // auto-updated (no static file to maintain). redirects() run before the
  // filesystem, and the static public/ads.txt has been removed, so /ads.txt
  // always 301s to Grow's hosted file. ads.txt crawlers follow this redirect.
  async redirects() {
    return [
      {
        source: "/ads.txt",
        destination:
          "https://adstxt.journeymv.com/sites/cf3a28fc-8c16-4c04-9940-96ae46697dfa",
        statusCode: 301,
      },
    ];
  },
};

module.exports = nextConfig;
