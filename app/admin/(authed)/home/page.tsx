import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabase";
import { AdminHubCard } from "../AdminCards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

// The admin hub. Every section is reached from here, and every inner screen
// links back up to it, so this replaces the wrapping nav bar entirely.
//
// The counts are the point: the reason to open the admin on a phone is usually
// "is there anything waiting", and answering that here saves drilling into four
// sections to find out. They are all head-only count queries fired in parallel,
// so the whole hub costs one round trip.

type Counts = {
  peeks: number;
  drafts: number;
  noClip: number;
  maps: number;
  floors: number;
  sites: number;
  sitesPublished: number;
  sitesWithPlacements: number;
  operators: number;
  pending: number;
};

async function loadCounts(): Promise<Counts> {
  const sb = supabaseAdmin();
  const head = (table: string, apply?: (q: any) => any) => {
    const q = sb.from(table).select("id", { count: "exact", head: true });
    return apply ? apply(q) : q;
  };

  const [
    peeks,
    drafts,
    noClip,
    maps,
    floors,
    sites,
    sitesPublished,
    operators,
    pending,
    placements,
  ] = await Promise.all([
    head("peeks"),
    head("peeks", (q) => q.eq("published", false)),
    head("peeks", (q) => q.is("video_url", null)),
    head("maps"),
    head("floors"),
    head("gadget_sites"),
    head("gadget_sites", (q) => q.eq("published", true)),
    head("gadget_operators"),
    head("community_submissions", (q) => q.eq("status", "pending")),
    // Not a count: how many DISTINCT sites have a placement, which is the
    // number that says how much of the gadget section is actually built out.
    sb.from("gadget_placements").select("site_id"),
  ]);

  const siteIds = new Set(
    ((placements.data ?? []) as { site_id: string }[]).map((p) => p.site_id)
  );

  return {
    peeks: peeks.count ?? 0,
    drafts: drafts.count ?? 0,
    noClip: noClip.count ?? 0,
    maps: maps.count ?? 0,
    floors: floors.count ?? 0,
    sites: sites.count ?? 0,
    sitesPublished: sitesPublished.count ?? 0,
    sitesWithPlacements: siteIds.size,
    operators: operators.count ?? 0,
    pending: pending.count ?? 0,
  };
}

export default async function AdminHomePage() {
  const c = await loadCounts();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Admin</h1>
        <p className="mt-1 text-sm text-muted">
          Tap a section to drill in. Every screen links back up to here.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <AdminHubCard
          href="/admin/submissions"
          title="Submissions"
          badge={c.pending}
          detail={
            c.pending > 0
              ? `${c.pending} waiting on you`
              : "Nothing pending right now"
          }
        />
        <AdminHubCard
          href="/admin/peeks"
          title="Peeks"
          detail={`${c.peeks} peeks · ${c.drafts} draft${
            c.drafts === 1 ? "" : "s"
          }, ${c.noClip} without a clip`}
        />
        <AdminHubCard
          href="/admin/gadgets"
          title="Gadgets"
          accent="blue"
          detail={`${c.sites} sites · ${c.sitesPublished} published, ${c.sitesWithPlacements} with placements`}
        />
        <AdminHubCard
          href="/admin/gadgets/operators"
          title="Operators"
          accent="blue"
          detail={`${c.operators} operator${c.operators === 1 ? "" : "s"}`}
        />
        <AdminHubCard
          href="/admin/maps"
          title="Maps & floors"
          detail={`${c.maps} maps · ${c.floors} floors`}
        />
        <AdminHubCard
          href="/admin/tools"
          title="Tools"
          detail="Copy cleanup, live traffic"
        />
      </div>
    </div>
  );
}
