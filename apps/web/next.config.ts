import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.MATRIZO_NEXT_DIR || ".next",
  // Cloudflare Pages doesn't run Next's image-optimization server —
  // next-on-pages requires this off (serve pre-sized images, or proxy
  // through Cloudflare's own image resizing later).
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
