/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Local dev: uploaded images live under /public/uploads (no remote
    // pattern needed). Deployed: they live in Vercel Blob storage instead —
    // the filesystem there is read-only, so this is required for uploads
    // to show up at all in production.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
