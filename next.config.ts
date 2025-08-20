import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true, // It's good practice to include this
  swcMinify: true, // and this for better performance

  // Add the transpilePackages property to handle external modules
  transpilePackages: ['@capacitor/geolocation'],

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "pjeptyhgwaevnlgpovzb.supabase.co",
      },
      {
        protocol: "https",
        hostname: "source.unsplash.com"
      },
      {
        protocol: "https",
        hostname: "via.placeholder.com"
      },
      {
        protocol: "https",
        hostname: "example.com",
      },
    ],
  },
};

export default nextConfig;