/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
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
