import type { Metadata } from "next";
import Link from "next/link";
import { loadGadgets } from "@/content/gadgets";

export const metadata: Metadata = {
  title: "Gadgets",
  robots: { index: false, follow: false },
};

// Gadgets management, read-only for now. There is no `gadgets` table yet, so
// this lists the placeholder set from content/gadgets.ts and deliberately
// exposes no create/edit/delete: writing here would mean inventing a storage
// path that the real schema would immediately replace.
//
// When Supabase is ready this page keeps its shape — swap loadGadgets() for the
// query and add actions alongside the peek ones.
export default function AdminGadgetsPage() {
  const gadgets = loadGadgets();

  return (
    <main>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Gadgets
        </h1>
        <span className="rounded-btn border border-blue/30 bg-blue/[0.06] px-2.5 py-1 text-xs font-medium text-blue">
          Placeholder data — no database yet
        </span>
      </div>

      <p className="mt-2 text-sm text-muted">
        {gadgets.length} gadgets from <code>content/gadgets.ts</code>. Read-only
        until the Supabase table exists.
      </p>

      <div className="mt-6 overflow-x-auto rounded-card border border-border bg-card">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-border text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2 font-semibold">Name</th>
              <th className="px-3 py-2 font-semibold">Operator</th>
              <th className="px-3 py-2 font-semibold">Side</th>
              <th className="px-3 py-2 font-semibold">Category</th>
              <th className="px-3 py-2 font-semibold">View</th>
            </tr>
          </thead>
          <tbody>
            {gadgets.map((g) => (
              <tr key={g.id} className="border-b border-border last:border-0">
                <td className="px-3 py-2 font-medium text-ink">{g.name}</td>
                <td className="px-3 py-2 text-muted">{g.operator}</td>
                <td className="px-3 py-2 text-muted">
                  {g.side === "attack" ? "Attack" : "Defense"}
                </td>
                <td className="px-3 py-2 text-muted">{g.category}</td>
                <td className="px-3 py-2">
                  <Link
                    href={`/gadgets/${g.slug}`}
                    target="_blank"
                    rel="noopener"
                    className="text-blue underline-offset-2 hover:underline"
                  >
                    Open →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
