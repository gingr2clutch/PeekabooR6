import type { Metadata } from "next";
import Link from "next/link";
import { OperatorIconUpload } from "@/components/OperatorIconUpload";
import { supabaseAdmin } from "@/lib/supabase";

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
  icon_url: string | null;
  published: boolean;
};

// Icons only. Operators themselves are seeded by migration 029 and there is no
// admin CRUD for them, so this page deliberately does one job rather than
// implying the rest of the row is editable here.
export default async function AdminOperatorsPage() {
  const { data, error } = await supabaseAdmin()
    .from("gadget_operators")
    .select("id, slug, name, role, gadget_name, icon_url, published")
    .order("display_order", { ascending: true });

  if (error) {
    return (
      <div className="rounded-card border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Could not load operators: {error.message}
      </div>
    );
  }

  const operators = (data ?? []) as Row[];
  const withIcon = operators.filter((o) => o.icon_url).length;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/gadgets"
          className="text-sm text-muted transition-colors hover:text-blue"
        >
          ← Gadget sites
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Operators</h1>
        <p className="mt-1 text-sm text-muted">
          Icons for the operator picker. {withIcon} of {operators.length} have
          one. Images are centre-cropped to a square and capped at 256×256 on
          upload, so they need no preparation — anything roughly square works.
        </p>
      </div>

      {operators.length === 0 ? (
        <p className="rounded-card border border-border bg-card p-6 text-sm text-muted">
          No operators yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {operators.map((o) => (
            <li
              key={o.id}
              className="rounded-card border border-border bg-card px-3 py-3"
            >
              <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-medium text-ink">{o.name}</span>
                <span className="text-xs text-muted">
                  /{o.slug}
                  {o.role ? ` · ${o.role}` : ""}
                  {o.gadget_name ? ` · ${o.gadget_name}` : ""}
                </span>
                {!o.published && (
                  <span className="rounded-btn bg-ink/[0.06] px-2 py-0.5 text-[11px] font-semibold text-muted">
                    Draft
                  </span>
                )}
              </div>
              <OperatorIconUpload
                operatorId={o.id}
                operatorName={o.name}
                initialUrl={o.icon_url}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
