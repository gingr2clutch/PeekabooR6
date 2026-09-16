import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabase";
import { AdminScreen } from "../../AdminScreen";
import {
  QuickAddClient,
  type QuickMap,
  type QuickOperator,
  type QuickSite,
} from "./QuickAddClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quick add placement",
  robots: { index: false, follow: false },
};

// Quick-add. An ADDITION alongside /admin/gadgets/[site], which is untouched
// and remains the way to edit, publish or delete an existing placement.
//
// Everything is loaded once, up front: 18 maps, 51 sites and 5 operators is a
// few KB, and holding it client-side is what lets the map → site filter and the
// blueprint swap happen with no request at all. The point of the screen is that
// the only server round trip in the loop is the save itself.

export default async function QuickAddPage() {
  const sb = supabaseAdmin();

  const [mapsRes, sitesRes, opsRes, floorsRes] = await Promise.all([
    sb.from("maps").select("id, name").order("name"),
    sb
      .from("gadget_sites")
      .select("id, map_id, name, floor_id, display_order")
      .order("display_order"),
    sb.from("gadget_operators").select("id, name, published").order("display_order"),
    sb.from("floors").select("id, birds_eye_url"),
  ]);
  for (const r of [mapsRes, sitesRes, opsRes, floorsRes]) {
    if (r.error) throw r.error;
  }

  const blueprint = new Map(
    ((floorsRes.data ?? []) as { id: string; birds_eye_url: string | null }[]).map(
      (f) => [f.id, f.birds_eye_url]
    )
  );

  const maps = (mapsRes.data ?? []) as QuickMap[];
  const sites: QuickSite[] = (
    (sitesRes.data ?? []) as {
      id: string;
      map_id: string;
      name: string;
      floor_id: string | null;
    }[]
  ).map((s) => ({
    id: s.id,
    mapId: s.map_id,
    name: s.name,
    // Resolved here so the client never has to know floors exist. A site with
    // no floor still works: PinPlacer falls back to numeric X/Y inputs.
    blueprintUrl: s.floor_id ? blueprint.get(s.floor_id) ?? null : null,
  }));
  const operators = (opsRes.data ?? []) as QuickOperator[];

  return (
    <AdminScreen
      title="Quick add"
      back={{ href: "/admin/gadgets", label: "Gadgets", accent: "blue" }}
      subtitle="Set map, site and operator once, then pin and save repeatedly. The selectors stay put between saves."
    >
      <QuickAddClient maps={maps} sites={sites} operators={operators} />
    </AdminScreen>
  );
}
