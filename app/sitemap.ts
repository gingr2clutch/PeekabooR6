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
    {
      url: `${BASE_URL}/attacking`,
      lastModified: now,
      changeFrequency: "weekly",
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

  // Per-map attacker guide page.
  const attackingEntries: MetadataRoute.Sitemap = (maps ?? []).map(
    (m: { slug: string }) => ({
      url: `${BASE_URL}/maps/${m.slug}/attacking`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    })
  );

  // Only include peeks whose parent map is also published.
  const { data: peeks } = await supabase
    .from("peeks")
    .select("slug, floors!inner(maps!inner(published))")
    .eq("published", true)
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

  // Gadget routes.
  //
  // Only pages that pass the same test their generateMetadata uses: is there a
  // published setup behind this page? Anything that answers no emits
  // noindex,follow (see app/gadgets/layout.tsx), and submitting a URL we are
  // simultaneously asking Google not to index is a contradiction worth
  // avoiding.
  //
  // Derived from ONE query rather than re-asking per map, per site and per
  // operator. Every published setup already names its site, its map and its
  // operator, so the full set of qualifying URLs at all three levels falls out
  // of that single list — and because it is the same underlying fact the
  // metadata check reads, the sitemap cannot drift from the robots tag.
  //
  // No .eq("published") on the setup or the site: the gadget_setups RLS policy
  // already requires both. The map's published flag is NOT covered by that
  // policy, so it is filtered explicitly, matching how peekEntries above guards
  // against an unpublished parent map.
  const { data: setupRows } = await supabase
    .from("gadget_setups")
    .select(
      "gadget_sites!inner(slug, maps!inner(slug, published)), gadget_operators!inner(slug)"
    )
    .eq("gadget_sites.maps.published", true);

  const gadgetMaps = new Set<string>();
  const gadgetSites = new Set<string>();
  const gadgetOperators = new Set<string>();

  for (const row of (setupRows ?? []) as unknown as {
    gadget_sites: { slug: string; maps: { slug: string } | null } | null;
    gadget_operators: { slug: string } | null;
  }[]) {
    const mapSlug = row.gadget_sites?.maps?.slug;
    const siteSlug = row.gadget_sites?.slug;
    const opSlug = row.gadget_operators?.slug;
    if (!mapSlug || !siteSlug) continue;
    gadgetMaps.add(mapSlug);
    gadgetSites.add(`${mapSlug}/${siteSlug}`);
    if (opSlug) gadgetOperators.add(`${mapSlug}/${siteSlug}/${opSlug}`);
  }

  // The hub is listed only once something is reachable from it. It is
  // indexable either way, but submitting a grid of "coming soon" tiles is not
  // worth a crawl.
  const gadgetEntries: MetadataRoute.Sitemap =
    gadgetMaps.size === 0
      ? []
      : [
          {
            url: `${BASE_URL}/gadgets`,
            lastModified: now,
            changeFrequency: "weekly" as const,
            priority: 0.7,
          },
          ...Array.from(gadgetMaps).map((m) => ({
            url: `${BASE_URL}/gadgets/${m}`,
            lastModified: now,
            changeFrequency: "weekly" as const,
            priority: 0.6,
          })),
          ...Array.from(gadgetSites).map((s) => ({
            url: `${BASE_URL}/gadgets/${s}`,
            lastModified: now,
            changeFrequency: "weekly" as const,
            priority: 0.6,
          })),
          ...Array.from(gadgetOperators).map((o) => ({
            url: `${BASE_URL}/gadgets/${o}`,
            lastModified: now,
            changeFrequency: "weekly" as const,
            priority: 0.7,
          })),
        ];

  return [
    ...staticEntries,
    ...mapEntries,
    ...trendsEntries,
    ...attackingEntries,
    ...peekEntries,
    ...blogEntries,
    ...compareEntries,
    ...gadgetEntries,
  ];
}
