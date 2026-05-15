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
};

module.exports = nextConfig;
