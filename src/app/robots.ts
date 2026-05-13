import type { MetadataRoute } from "next";

// Demo is publicly accessible but should NOT be indexed by search engines.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}
