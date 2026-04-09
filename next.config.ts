const isVercelBuild = process.env.VERCEL === "1";

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(isVercelBuild ? {} : { distDir: ".next-prod" }),
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.topgear.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

module.exports = nextConfig;
