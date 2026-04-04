import type { NextConfig } from "next";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const nextConfig: NextConfig = {
  // @ts-expect-error – adapterPath is new in Next.js 16
  adapterPath: require.resolve('./vercel-adapter.js'),
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'img.spoonacular.com',
      },
      {
        protocol: 'https',
        hostname: 'spoonacular.com',
      },
    ],
  },
};

export default nextConfig;
