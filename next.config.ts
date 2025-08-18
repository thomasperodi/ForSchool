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
        hostname: "example.com", // per immagini prodotti Shopify
      },
      
    ],
  },
};

export default nextConfig;
