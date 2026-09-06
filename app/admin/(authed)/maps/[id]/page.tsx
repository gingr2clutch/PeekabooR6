import Image from "next/image";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/ConfirmButton";
import { DropUpload } from "@/components/DropUpload";
import { supabaseAdmin } from "@/lib/supabase";
import { AdminListCard, AdminPill } from "../../AdminCards";
import { AdminScreen } from "../../AdminScreen";
import {
  createFloorAction,
  deleteMapAndReturnAction,
  removeMapCoverAction,
  toggleMapPublishedAction,
  updateMapAction,
  uploadMapCoverAction,
} from "../actions";

export const dynamic = "force-dynamic";

// One map. Everything that used to be crammed into an accordion row on
// /admin/maps — rename, publish, cover, floors, add floor — with room to
// breathe and one field per row on a phone.
//
// The floor list is whole-card links rather than rows with a "Manage →" button
// at the end of a wrapping line. Deleting a floor moved to the floor's own
// screen: a tappable card with a Delete button inside it is a mis-tap waiting
// to happen, and /admin/floors/[id] already has that action.

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

export default async function AdminMapDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { data, error } = await supabaseAdmin()
    .from("maps")
    .select(
      "id, slug, name, published, cover_image_url, floors(id, slug, name, display_order, birds_eye_url)"
    )
    .eq("id", params.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) notFound();

  const map = data as MapRow;
  const floors = [...map.floors].sort(
    (a, b) => a.display_order - b.display_order
  );
  const withImage = floors.filter((f) => f.birds_eye_url).length;

  return (
    <AdminScreen
      title={map.name}
      back={{ href: "/admin/maps", label: "Maps" }}
      subtitle={
        <>
          /{map.slug} · {floors.length} floor{floors.length === 1 ? "" : "s"},{" "}
          {withImage} with a bird&rsquo;s-eye
        </>
      }
      action={
        <form action={toggleMapPublishedAction}>
          <input type="hidden" name="id" value={map.id} />
          <input
            type="hidden"
            name="next"
            value={map.published ? "off" : "on"}
          />
          <button
            type="submit"
            className={`w-full rounded-btn border px-3 py-2 text-sm font-medium transition-colors sm:w-auto ${
              map.published
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300"
                : "border-border bg-bg text-muted hover:border-brand hover:text-brand"
            }`}
          >
            {map.published ? "Published" : "Draft"}
          </button>
        </form>
      }
    >
      {/* Floors first: this is the reason you opened the map. */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Floors
        </h2>
        {floors.length === 0 ? (
          <p className="rounded-card border border-border bg-card p-5 text-sm text-muted">
            No floors yet. Add one below.
          </p>
        ) : (
          <div className="space-y-2">
            {floors.map((f) => (
              <AdminListCard
                key={f.id}
                href={`/admin/floors/${f.id}`}
                title={`${f.display_order}. ${f.name}`}
                meta={`/${f.slug}`}
                right={
                  <AdminPill tone={f.birds_eye_url ? "good" : "muted"}>
                    {f.birds_eye_url ? "Image" : "No image"}
                  </AdminPill>
                }
              />
            ))}
          </div>
        )}

        <form
          action={createFloorAction}
          className="mt-3 space-y-3 rounded-card border border-dashed border-border p-4"
        >
          <input type="hidden" name="map_id" value={map.id} />
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Add a floor
          </h3>
          <Field label="Name" name="name" placeholder="e.g. Basement" required />
          <Field label="Slug" name="slug" placeholder="auto from name" />
          <Field
            label="Order"
            name="display_order"
            type="number"
            min={1}
            defaultValue={(floors.length + 1).toString()}
          />
          <SaveButton>Add floor</SaveButton>
        </form>
      </section>

      <section className="space-y-3 rounded-card border border-border bg-card p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Cover image
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[160px_1fr]">
          {map.cover_image_url ? (
            <div className="relative aspect-square w-full max-w-[160px] overflow-hidden rounded-inner border border-border">
              <Image
                src={map.cover_image_url}
                alt={`${map.name} cover`}
                fill
                sizes="160px"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="placeholder-stripes flex aspect-square w-full max-w-[160px] items-center justify-center rounded-inner">
              <span className="rounded-btn bg-card/80 px-2 py-0.5 text-[11px] text-muted">
                No cover
              </span>
            </div>
          )}
          <div className="space-y-3">
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
                  className="w-full rounded-btn border border-border bg-bg px-3 py-2 text-xs font-medium text-ink transition-colors hover:border-brand hover:text-brand sm:w-auto"
                >
                  Remove cover
                </ConfirmButton>
              </form>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-card border border-border bg-card p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Name &amp; slug
        </h2>
        <form action={updateMapAction} className="space-y-3">
          <input type="hidden" name="id" value={map.id} />
          <Field label="Name" name="name" defaultValue={map.name} required />
          <Field label="Slug" name="slug" defaultValue={map.slug} required />
          <SaveButton>Save</SaveButton>
        </form>
      </section>

      {/* Last, and visually separated: deleting a map takes its floors and
          every peek on them. Redirects to the list, since staying on a deleted
          map's screen would 404 on the next render. */}
      <section className="rounded-card border border-red-200 bg-red-50 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-red-700">
          Danger zone
        </h2>
        <p className="mt-1 text-xs text-red-700">
          Deleting {map.name} deletes its {floors.length} floor
          {floors.length === 1 ? "" : "s"} and every peek on them.
        </p>
        <form action={deleteMapAndReturnAction} className="mt-3">
          <input type="hidden" name="id" value={map.id} />
          <ConfirmButton
            message={`Delete ${map.name}? This deletes its floors and peeks too.`}
            className="w-full rounded-btn border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 sm:w-auto"
          >
            Delete map
          </ConfirmButton>
        </form>
      </section>
    </AdminScreen>
  );
}

function Field({
  label,
  name,
  ...rest
}: {
  label: string;
  name: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block text-xs text-muted">
      <span className="mb-1 block">{label}</span>
      <input
        name={name}
        className="w-full rounded-btn border border-border bg-card px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-brand"
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
