import type { MetadataRoute } from "next";
import { supabasePublic } from "@/lib/supabase";

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
      url: `${BASE_URL}/popular`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
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

  // Only include peeks whose parent map is also published.
  const { data: peeks } = await supabase
    .from("peeks")
    .select("id, floors!inner(maps!inner(published))")
    .eq("published", true)
    .eq("floors.maps.published", true);

  const peekEntries: MetadataRoute.Sitemap = (peeks ?? []).map(
    (p: { id: string }) => ({
      url: `${BASE_URL}/peeks/${p.id}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    })
  );

  return [...staticEntries, ...mapEntries, ...peekEntries];
}
