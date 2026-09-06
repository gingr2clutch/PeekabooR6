import { AdminListCard, AdminPill } from "../AdminCards";
import { AdminScreen } from "../AdminScreen";
import { supabaseAdmin } from "@/lib/supabase";
import { createMapAction } from "./actions";

export const dynamic = "force-dynamic";

type MapRow = {
  id: string;
  slug: string;
  name: string;
  published: boolean;
  cover_image_url: string | null;
  floors: {
    id: string;
    slug: string;
    name: string;
    display_order: number;
    birds_eye_url: string | null;
  }[];
};

async function getMapsWithFloors(): Promise<MapRow[]> {
  const { data, error } = await supabaseAdmin()
    .from("maps")
    .select(
      "id, slug, name, published, cover_image_url, floors(id, slug, name, display_order, birds_eye_url)"
    )
    .order("name", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as MapRow[]).map((m) => ({
    ...m,
    floors: [...m.floors].sort((a, b) => a.display_order - b.display_order),
  }));
}

export default async function AdminMapsPage() {
  const maps = await getMapsWithFloors();
  const floorCount = maps.reduce((n, m) => n + m.floors.length, 0);

  return (
    <AdminScreen
      title="Maps"
      back={{ href: "/admin/home", label: "Admin" }}
      subtitle={`${maps.length} maps · ${floorCount} floors`}
    >
      {/* One card per map. Everything editable about a map moved to its own
          screen: this used to be 18 accordion panels, each with a rename form,
          a cover uploader and a floor list, all expanded at once. */}
      {maps.length === 0 ? (
        <p className="rounded-card border border-border bg-card p-5 text-sm text-muted">
          No maps yet. Add one below.
        </p>
      ) : (
        <div className="space-y-2">
          {maps.map((map) => (
            <AdminListCard
              key={map.id}
              href={`/admin/maps/${map.id}`}
              title={map.name}
              meta={`/${map.slug} · ${map.floors.length} floor${
                map.floors.length === 1 ? "" : "s"
              }`}
              right={
                <AdminPill tone={map.published ? "good" : "muted"}>
                  {map.published ? "Live" : "Draft"}
                </AdminPill>
              }
            />
          ))}
        </div>
      )}

      <form
        action={createMapAction}
        className="space-y-3 rounded-card border border-dashed border-border p-4"
      >
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Add a map
        </h2>
        <Field label="Name" name="name" placeholder="e.g. Oregon" required />
        <Field label="Slug" name="slug" placeholder="auto from name if blank" />
        <SaveButton>Add map</SaveButton>
      </form>
    </AdminScreen>
  );
}

function Field({
  label,
  name,
  className = "",
  ...rest
}: {
  label: string;
  name: string;
  className?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block text-xs text-muted">
      <span className="mb-1 block">{label}</span>
      <input
        name={name}
        className={`w-full rounded-btn border border-border bg-card px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-brand ${className}`}
        {...rest}
      />
    </label>
  );
}

function SaveButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="w-full rounded-btn bg-ink px-3 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-brand active:scale-95 sm:w-auto"
    >
      {children}
    </button>
  );
}
