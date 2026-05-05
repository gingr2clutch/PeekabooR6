import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/ConfirmButton";
import { DropUpload } from "@/components/DropUpload";
import { supabaseAdmin } from "@/lib/supabase";
import {
  deleteFloorAction,
  removeFloorImageAction,
  updateFloorAction,
  uploadFloorImageAction,
} from "./actions";

export const dynamic = "force-dynamic";

type FloorWithMap = {
  id: string;
  slug: string;
  name: string;
  display_order: number;
  birds_eye_url: string | null;
  maps: { id: string; slug: string; name: string } | null;
};

async function getFloor(id: string): Promise<FloorWithMap | null> {
  const { data, error } = await supabaseAdmin()
    .from("floors")
    .select(
      "id, slug, name, display_order, birds_eye_url, maps(id, slug, name)"
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as FloorWithMap | null;
}

export default async function AdminFloorPage({
  params,
}: {
  params: { id: string };
}) {
  const floor = await getFloor(params.id);
  if (!floor || !floor.maps) notFound();

  const map = floor.maps;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-sm">
        <Link
          href="/admin/maps"
          className="text-muted transition-colors hover:text-brand"
        >
          ← Back to maps
        </Link>
        <span className="text-muted">/</span>
        <span className="text-muted">{map.name}</span>
        <span className="text-muted">/</span>
        <span className="font-medium">{floor.name}</span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-card border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
            Floor details
          </h2>
          <form action={updateFloorAction} className="space-y-3">
            <input type="hidden" name="id" value={floor.id} />
            <Field label="Name" name="name" defaultValue={floor.name} required />
            <Field label="Slug" name="slug" defaultValue={floor.slug} required />
            <Field
              label="Display order"
              name="display_order"
              type="number"
              min={1}
              defaultValue={floor.display_order.toString()}
            />
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                className="rounded-btn bg-ink px-3 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-brand active:scale-95"
              >
                Save
              </button>
              <ConfirmButton
                message={`Delete ${floor.name}? Its peeks will be deleted too.`}
                formAction={deleteFloorAction}
                className="rounded-btn border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:border-red-300 hover:bg-red-100"
              >
                Delete floor
              </ConfirmButton>
            </div>
          </form>
        </section>

        <section className="rounded-card border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
            Bird's-eye view
          </h2>

          {floor.birds_eye_url ? (
            <div className="space-y-3">
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-inner border border-border">
                <Image
                  src={floor.birds_eye_url}
                  alt={`${map.name} ${floor.name}`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 480px"
                  className="object-cover"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <DropUpload
                  action={uploadFloorImageAction}
                  hidden={[{ name: "id", value: floor.id }]}
                  label="Drop a new image to replace, or click to browse"
                />
              </div>
              <form action={removeFloorImageAction}>
                <input type="hidden" name="id" value={floor.id} />
                <ConfirmButton
                  message="Remove the bird's-eye image? Pins will still exist but the public view will show the placeholder."
                  className="rounded-btn border border-border bg-bg px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-brand hover:text-brand"
                >
                  Remove image
                </ConfirmButton>
              </form>
            </div>
          ) : (
            <DropUpload
              action={uploadFloorImageAction}
              hidden={[{ name: "id", value: floor.id }]}
            />
          )}

          <p className="mt-3 text-xs text-muted">
            PNG or JPG. The bird's-eye is rendered at 16:10 — best results if
            your screenshot matches that aspect.
          </p>
        </section>
      </div>
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
    <label className="block text-xs text-muted">
      <span className="mb-1 block">{label}</span>
      <input
        name={name}
        className={`w-full rounded-btn border border-border bg-card px-3 py-1.5 text-sm text-ink outline-none transition-colors focus:border-brand ${className}`}
        {...rest}
      />
    </label>
  );
}
