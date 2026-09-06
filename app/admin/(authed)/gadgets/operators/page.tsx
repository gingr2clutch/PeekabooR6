import type { Metadata } from "next";
import { ConfirmButton } from "@/components/ConfirmButton";
import { OperatorIconUpload } from "@/components/OperatorIconUpload";
import { supabaseAdmin } from "@/lib/supabase";
import { AdminBackLink } from "../../AdminBackLink";
import {
  createOperatorAction,
  deleteOperatorAction,
  toggleOperatorPublishedAction,
  updateOperatorAction,
} from "../operator-actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gadget operators",
  robots: { index: false, follow: false },
};

type Row = {
  id: string;
  slug: string;
  name: string;
  role: string | null;
  gadget_name: string | null;
  display_order: number;
  icon_url: string | null;
  published: boolean;
};

const input =
  "w-full rounded-btn border border-border bg-card px-2 py-1.5 text-sm text-ink outline-none transition-colors focus:border-blue";

export default async function AdminOperatorsPage() {
  const sb = supabaseAdmin();

  const [opsRes, placementsRes] = await Promise.all([
    sb
      .from("gadget_operators")
      .select(
        "id, slug, name, role, gadget_name, display_order, icon_url, published"
      )
      .order("display_order", { ascending: true }),
    // Counted per operator so a row can say why it cannot be deleted before
    // you click, rather than only after.
    sb.from("gadget_placements").select("operator_id"),
  ]);
  if (opsRes.error) {
    return (
      <div className="rounded-card border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Could not load operators: {opsRes.error.message}
      </div>
    );
  }

  const operators = (opsRes.data ?? []) as Row[];
  const placementCount = new Map<string, number>();
  for (const p of (placementsRes.data ?? []) as { operator_id: string }[]) {
    placementCount.set(p.operator_id, (placementCount.get(p.operator_id) ?? 0) + 1);
  }

  const withIcon = operators.filter((o) => o.icon_url).length;

  return (
    <div className="space-y-6">
      <div>
        <AdminBackLink href="/admin/gadgets" label="Gadgets" accent="blue" />
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Operators</h1>
        <p className="mt-1 text-sm text-muted">
          {operators.length} operators, {withIcon} with an icon. Icons are
          centre-cropped to a square and capped at 256×256 on upload, so they
          need no preparation.
        </p>
        {/* The single most confusing thing about this screen, said up front. */}
        <p className="mt-2 rounded-card border border-blue/30 bg-blue/[0.06] p-2.5 text-xs text-ink">
          Operators are global — they are not attached to bomb sites here. One
          appears on a site&rsquo;s public picker only once it has a placement
          on that site, which you add from the site&rsquo;s own page.
        </p>
      </div>

      {operators.length === 0 ? (
        <p className="rounded-card border border-border bg-card p-6 text-sm text-muted">
          No operators yet. Add one below.
        </p>
      ) : (
        <ul className="space-y-2">
          {operators.map((o) => {
            const used = placementCount.get(o.id) ?? 0;
            return (
              <li
                key={o.id}
                className="rounded-card border border-border bg-card px-3 py-3"
              >
                {/* Inline edit. Slug is shown but not editable — it is the
                    public URL segment, so changing it breaks shared links. */}
                <form
                  action={updateOperatorAction}
                  className="space-y-3 sm:grid sm:grid-cols-2 sm:items-end sm:gap-3 sm:space-y-0"
                >
                  <input type="hidden" name="id" value={o.id} />
                  <label className="block">
                    <span className="mb-1 block text-xs text-muted">Name</span>
                    <input
                      name="name"
                      defaultValue={o.name}
                      required
                      className={input}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs text-muted">Role</span>
                    <input
                      name="role"
                      defaultValue={o.role ?? ""}
                      placeholder="Intel"
                      className={input}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs text-muted">
                      Gadget name
                    </span>
                    <input
                      name="gadget_name"
                      defaultValue={o.gadget_name ?? ""}
                      placeholder="Black Eye"
                      className={input}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs text-muted">Order</span>
                    <input
                      name="display_order"
                      type="number"
                      defaultValue={o.display_order}
                      className={input}
                    />
                  </label>
                  <button className="w-full rounded-btn border border-border px-3 py-2 text-sm text-ink hover:border-blue hover:text-blue">
                    Save
                  </button>
                </form>

                <div className="mt-1 text-xs text-muted">
                  /{o.slug} · {used} placement{used === 1 ? "" : "s"}
                </div>

                <div className="mt-3 border-t border-border pt-3">
                  <OperatorIconUpload
                    operatorId={o.id}
                    operatorName={o.name}
                    initialUrl={o.icon_url}
                  />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  <span
                    className={`rounded-btn px-2 py-0.5 text-[11px] font-semibold ${
                      o.published
                        ? "bg-teal/10 text-teal"
                        : "bg-ink/[0.06] text-muted"
                    }`}
                  >
                    {o.published ? "Published" : "Draft"}
                  </span>
                  <form action={toggleOperatorPublishedAction}>
                    <input type="hidden" name="id" value={o.id} />
                    <input
                      type="hidden"
                      name="published"
                      value={o.published ? "false" : "true"}
                    />
                    <button className="rounded-btn border border-border px-2 py-1 text-xs text-ink hover:border-blue hover:text-blue">
                      {o.published ? "Unpublish" : "Publish"}
                    </button>
                  </form>

                  {/* The database refuses this too (ON DELETE RESTRICT); the
                      count just makes the reason legible before the click. */}
                  <form action={deleteOperatorAction} className="ml-auto">
                    <input type="hidden" name="id" value={o.id} />
                    {used > 0 ? (
                      <span
                        title={`${o.name} has ${used} placement${used === 1 ? "" : "s"}. Delete those first.`}
                        className="cursor-not-allowed rounded-btn border border-border px-2 py-1 text-xs text-muted opacity-50"
                      >
                        Delete
                      </span>
                    ) : (
                      <ConfirmButton
                        message={`Delete ${o.name}? This cannot be undone.`}
                        className="rounded-btn border border-border px-2 py-1 text-xs text-muted hover:border-blue hover:text-blue"
                      >
                        Delete
                      </ConfirmButton>
                    )}
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Same dashed-card language as "Add a site" on the gadget sites page. */}
      <form
        action={createOperatorAction}
        className="space-y-3 rounded-card border border-dashed border-border p-4"
      >
        <label className="block">
          <span className="mb-1 block text-xs text-muted">Name</span>
          <input name="name" required placeholder="Mute" className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-muted">Role</span>
          <input name="role" placeholder="Trapper" className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-muted">Gadget name</span>
          <input
            name="gadget_name"
            placeholder="Signal Disruptor"
            className={input}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-muted">Slug (optional)</span>
          <input name="slug" placeholder="mute" className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-muted">Order</span>
          <input
            name="display_order"
            type="number"
            defaultValue={operators.length + 1}
            className={input}
          />
        </label>
        <button className="w-full rounded-btn bg-ink px-3 py-2 text-sm font-medium text-white hover:bg-blue sm:w-auto">
          Add operator
        </button>
      </form>
    </div>
  );
}
