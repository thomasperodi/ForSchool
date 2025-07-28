import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com", // per immagini profilo Google
      },
      {
        protocol: "https",
        hostname: "pjeptyhgwaevnlgpovzb.supabase.co", // il tuo dominio Supabase
      },
    ],
  },
};

export default nextConfig;
