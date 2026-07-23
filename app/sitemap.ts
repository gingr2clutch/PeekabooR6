import type { MetadataRoute } from "next";
import { supabasePublic } from "@/lib/supabase";
import { articleSlugFor, listEligibleMaps } from "@/lib/blog";
import { allPairings, getComparisonMaps } from "@/lib/compare";

// Supabase reads use no-store under the hood, which Next 14's static
// renderer treats as a dynamic data source. Mark this route dynamic so
// the build doesn't try (and fail) to prerender it. Sitemap regenerates
// on each request — fine for our traffic.
export const dynamic = "force-dynamic";
export const revalidate = 0;

const BASE_URL = "https://peekaboor6.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const supabase = supabasePublic();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/top`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/whats-new`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/pro`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/sponsor`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/privacy-policy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/compare`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/underrated`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.6,
    },
  ];

  const { data: maps } = await supabase
    .from("maps")
    .select("slug")
    .eq("published", true);

  const mapEntries: MetadataRoute.Sitemap = (maps ?? []).map(
    (m: { slug: string }) => ({
      url: `${BASE_URL}/maps/${m.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    })
  );

  // Per-map effectiveness trends page.
  const trendsEntries: MetadataRoute.Sitemap = (maps ?? []).map(
    (m: { slug: string }) => ({
      url: `${BASE_URL}/maps/${m.slug}/trends`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.5,
    })
  );

  // Only include peeks whose parent map is also published. Pro-only peeks are
  // gated content, so they're excluded here (and marked noindex on their page).
  const { data: peeks } = await supabase
    .from("peeks")
    .select("slug, floors!inner(maps!inner(published))")
    .eq("published", true)
    .eq("is_pro_only", false)
    .eq("floors.maps.published", true);

  const peekEntries: MetadataRoute.Sitemap = (peeks ?? []).map(
    (p: { slug: string }) => ({
      url: `${BASE_URL}/peeks/${p.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    })
  );

  const eligible = await listEligibleMaps();
  const blogEntries: MetadataRoute.Sitemap = eligible.map((e) => ({
    url: `${BASE_URL}/blog/${articleSlugFor(e.map.slug)}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  // One canonical URL per unordered pairing of comparison-eligible maps.
  const comparisonMaps = await getComparisonMaps();
  const compareEntries: MetadataRoute.Sitemap = allPairings(
    comparisonMaps.map((m) => m.map.slug)
  ).map((pair) => ({
    url: `${BASE_URL}/compare/${pair}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [
    ...staticEntries,
    ...mapEntries,
    ...trendsEntries,
    ...peekEntries,
    ...blogEntries,
    ...compareEntries,
  ];
}
