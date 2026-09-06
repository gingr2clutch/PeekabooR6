import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabase";
import { AdminListCard, AdminPill } from "../AdminCards";
import { AdminScreen } from "../AdminScreen";

// Reads with the service-role client, so DRAFTS ARE VISIBLE here. The public
// pages use supabasePublic() and see published rows only.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gadget sites",
  robots: { index: false, follow: false },
};

// Maps, not sites. There are 51 sites across 18 maps; listing them all at once
// with an add-site form per map — which is what this page used to do — is a
// screen you scroll past rather than read. One tap per map now, and the sites
// for that map get a screen of their own.

export default async function AdminGadgetsPage() {
  const sb = supabaseAdmin();

  const [mapsRes, sitesRes, placementsRes] = await Promise.all([
    sb.from("maps").select("id, slug, name").order("name"),
    sb.from("gadget_sites").select("id, map_id, published"),
    sb.from("gadget_placements").select("site_id"),
  ]);
  for (const r of [mapsRes, sitesRes, placementsRes]) {
    if (r.error) throw r.error;
  }

  const maps = (mapsRes.data ?? []) as {
    id: string;
    slug: string;
    name: string;
  }[];
  const sites = (sitesRes.data ?? []) as {
    id: string;
    map_id: string;
    published: boolean;
  }[];

  const withPlacements = new Set(
    ((placementsRes.data ?? []) as { site_id: string }[]).map((p) => p.site_id)
  );

  const totalPublished = sites.filter((s) => s.published).length;

  return (
    <AdminScreen
      title="Gadgets"
      back={{ href: "/admin/home", label: "Admin", accent: "blue" }}
      subtitle={`${sites.length} sites across ${maps.length} maps · ${totalPublished} published, ${withPlacements.size} with placements`}
    >
      <div className="space-y-2">
        {maps.map((m) => {
          const mine = sites.filter((s) => s.map_id === m.id);
          const live = mine.filter((s) => s.published).length;
          const built = mine.filter((s) => withPlacements.has(s.id)).length;
          return (
            <AdminListCard
              key={m.id}
              href={`/admin/gadgets/map/${m.id}`}
              accent="blue"
              title={m.name}
              meta={
                mine.length === 0
                  ? "No sites yet"
                  : `${mine.length} site${
                      mine.length === 1 ? "" : "s"
                    } · ${built} with placements`
              }
              right={
                <AdminPill tone={live > 0 ? "good" : "muted"}>
                  {live > 0 ? `${live} live` : "None live"}
                </AdminPill>
              }
            />
          );
        })}
      </div>

      <p className="text-sm text-muted">
        Drafts are listed but hidden from the public site until published.
        Photos and placements live inside each site.
      </p>
    </AdminScreen>
  );
}
