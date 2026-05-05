import Image from "next/image";
import Link from "next/link";
import { ConfirmButton } from "@/components/ConfirmButton";
import { DropUpload } from "@/components/DropUpload";
import { supabaseAdmin } from "@/lib/supabase";
import {
  createFloorAction,
  createMapAction,
  deleteFloorFromListAction,
  deleteMapAction,
  removeMapCoverAction,
  toggleMapPublishedAction,
  updateMapAction,
  uploadMapCoverAction,
} from "./actions";

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Maps</h1>
        <p className="text-sm text-muted">
          Add or edit maps and their floors. Click Manage on a floor to upload
          its bird's-eye view.
        </p>
      </div>

      <section className="rounded-card border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Add a map
        </h2>
        <form
          action={createMapAction}
          className="flex flex-wrap items-end gap-3"
        >
          <Field label="Name" name="name" placeholder="e.g. Oregon" required />
          <Field
            label="Slug"
            name="slug"
            placeholder="auto from name if blank"
          />
          <SaveButton>Add map</SaveButton>
        </form>
      </section>

      <ul className="space-y-6">
        {maps.map((map) => (
          <li
            key={map.id}
            className="rounded-card border border-border bg-card p-5"
          >
            {/* One form per map row. Save uses the form's action; Delete
                overrides via formAction on the confirm button. */}
            <div className="flex flex-wrap items-end gap-3 border-b border-border pb-4">
              <form
                action={updateMapAction}
                className="flex flex-wrap items-end gap-3"
              >
                <input type="hidden" name="id" value={map.id} />
                <Field
                  label="Name"
                  name="name"
                  defaultValue={map.name}
                  required
                />
                <Field
                  label="Slug"
                  name="slug"
                  defaultValue={map.slug}
                  required
                />
                <SaveButton>Save</SaveButton>
                <ConfirmButton
                  message={`Delete ${map.name}? This deletes its floors and peeks too.`}
                  formAction={deleteMapAction}
                  className="rounded-btn border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:border-red-300 hover:bg-red-100"
                >
                  Delete map
                </ConfirmButton>
              </form>
              <form action={toggleMapPublishedAction} className="ml-auto">
                <input type="hidden" name="id" value={map.id} />
                <input
                  type="hidden"
                  name="next"
                  value={map.published ? "off" : "on"}
                />
                <button
                  type="submit"
                  className={`rounded-btn border px-3 py-2 text-sm font-medium transition-colors ${
                    map.published
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300"
                      : "border-border bg-bg text-muted hover:border-brand hover:text-brand"
                  }`}
                  title={
                    map.published
                      ? "Click to unpublish (lock on the public site)"
                      : "Click to publish (make clickable on the public site)"
                  }
                >
                  {map.published ? "Published" : "Draft"}
                </button>
              </form>
            </div>

            <div className="grid grid-cols-1 gap-4 border-b border-border py-4 md:grid-cols-[160px_1fr]">
              <div>
                {map.cover_image_url ? (
                  <div className="relative aspect-square w-full overflow-hidden rounded-inner border border-border">
                    <Image
                      src={map.cover_image_url}
                      alt={`${map.name} cover`}
                      fill
                      sizes="160px"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="placeholder-stripes flex aspect-square w-full items-center justify-center rounded-inner">
                    <span className="rounded-btn bg-card/80 px-2 py-0.5 text-[11px] text-muted">
                      No cover
                    </span>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
                  Cover image
                </h3>
                <DropUpload
                  action={uploadMapCoverAction}
                  hidden={[{ name: "id", value: map.id }]}
                  label={
                    map.cover_image_url
                      ? "Drop a new cover to replace, or click to browse"
                      : "Drop a cover image here, or click to browse"
                  }
                />
                {map.cover_image_url && (
                  <form action={removeMapCoverAction}>
                    <input type="hidden" name="id" value={map.id} />
                    <ConfirmButton
                      message="Remove the cover? The card will fall back to plain white."
                      className="rounded-btn border border-border bg-bg px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-brand hover:text-brand"
                    >
                      Remove cover
                    </ConfirmButton>
                  </form>
                )}
              </div>
            </div>

            <div className="pt-4">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
                Floors
              </h3>

              <ul className="mb-4 divide-y divide-border">
                {map.floors.map((floor) => (
                  <li
                    key={floor.id}
                    className="flex flex-wrap items-center gap-3 py-2.5 text-sm"
                  >
                    <span className="w-8 text-muted">
                      {floor.display_order}.
                    </span>
                    <span className="min-w-[8rem] font-medium">
                      {floor.name}
                    </span>
                    <span className="text-muted">/{floor.slug}</span>
                    <span
                      className={`rounded-btn border px-2 py-0.5 text-xs ${
                        floor.birds_eye_url
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-border bg-bg text-muted"
                      }`}
                    >
                      {floor.birds_eye_url ? "Bird's-eye uploaded" : "No image"}
                    </span>
                    <Link
                      href={`/admin/floors/${floor.id}`}
                      className="ml-auto rounded-btn border border-border px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-brand hover:text-brand"
                    >
                      Manage →
                    </Link>
                    <form action={deleteFloorFromListAction} className="inline">
                      <input type="hidden" name="id" value={floor.id} />
                      <ConfirmButton
                        message={`Delete ${floor.name}? Its peeks will be deleted too.`}
                        className="rounded-btn border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 transition-colors hover:border-red-300 hover:bg-red-100"
                      >
                        Delete
                      </ConfirmButton>
                    </form>
                  </li>
                ))}
                {map.floors.length === 0 && (
                  <li className="py-2 text-sm text-muted">No floors yet.</li>
                )}
              </ul>

              <form
                action={createFloorAction}
                className="flex flex-wrap items-end gap-3 border-t border-border pt-4"
              >
                <input type="hidden" name="map_id" value={map.id} />
                <Field
                  label="Floor name"
                  name="name"
                  placeholder="e.g. Basement"
                  required
                />
                <Field
                  label="Slug"
                  name="slug"
                  placeholder="auto from name"
                />
                <Field
                  label="Order"
                  name="display_order"
                  type="number"
                  min={1}
                  defaultValue={(map.floors.length + 1).toString()}
                  className="w-20"
                />
                <SaveButton>Add floor</SaveButton>
              </form>
            </div>
          </li>
        ))}
        {maps.length === 0 && (
          <li className="rounded-card border border-border bg-card p-5 text-sm text-muted">
            No maps yet. Add one above.
          </li>
        )}
      </ul>
    </div>
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
    <label className="flex flex-col text-xs text-muted">
      <span className="mb-1">{label}</span>
      <input
        name={name}
        className={`rounded-btn border border-border bg-card px-3 py-1.5 text-sm text-ink outline-none transition-colors focus:border-brand ${className}`}
        {...rest}
      />
    </label>
  );
}

function SaveButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="rounded-btn bg-ink px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand"
    >
      {children}
    </button>
  );
}
