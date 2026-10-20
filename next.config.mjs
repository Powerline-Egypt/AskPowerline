/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // Lets a verification/preview process use an isolated build dir
  // (NEXT_DIST_DIR=.next-preview) so it never clobbers the user's `.next`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    // WebP only: the source images are already WebP, so resizing to WebP is fast to
    // generate on first request. AVIF re-encoding was ~10x slower on the first load
    // of each variant (then cached), which made images feel slow on first visit.
    formats: ["image/webp"],
    // Local bundled assets only; allow Shopify CDN as a fallback if ever needed.
    remotePatterns: [{ protocol: "https", hostname: "powerlinei.com" }],
  },
  experimental: {
    // The gated catalogue routes read protected files from /private at runtime
    // via fs. They aren't statically imported, so force-include them in the
    // serverless function bundles (they'd otherwise be missing on Vercel):
    // the viewer serves page images, the download serves the full PDF.
    outputFileTracingIncludes: {
      "/api/catalog/page/[slug]/[n]": ["./private/catalogs/**/pages/**"],
      "/api/catalog/download/[slug]": ["./private/catalogs/**/*.pdf"],
    },
  },
  // Keep the old slugs working after renaming them to match page/product names.
  async redirects() {
    return [
      { source: "/assembly-lines", destination: "/our-products", permanent: true },
      { source: "/products/pral24", destination: "/products/pral", permanent: true },
      { source: "/products/minicenter-abb", destination: "/products/minicenter", permanent: true },
      { source: "/products/gis-ring-main-units-12-24-kv", destination: "/products/aegis-plus-12-24-kv", permanent: true },
      // Split into Current + Voltage transformers — send the old combined
      // product URL to the line page that now lists both.
      { source: "/products/instrument-transformers", destination: "/instrument-transformers", permanent: true },
    ];
  },
};

export default nextConfig;
