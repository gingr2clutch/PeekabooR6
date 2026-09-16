"use server";

import { supabaseAdmin } from "@/lib/supabase";

// Quick-add writes. Separate from ../actions.ts on purpose: that file backs the
// existing per-site editor, which stays the fallback if this screen misbehaves,
// and a shared file would let a change for one break the other.
//
// Writes gadget_placements only. No peek table is read or written.
//
// NO revalidatePath here, deliberately. Every page a new placement touches —
// the public gadget routes and both admin gadget screens — is already
// force-dynamic, so revalidation refreshes nothing that was stale. What it DID
// do was trigger a router refresh that remounted this screen's client
// component, wiping the session count and the undo target about a second after
// each save. Measured, not guessed: the counter appeared and then disappeared.
//
// These differ from createPlacementAction in one way that matters: they RETURN
// something. The existing action is a <form action> and must return void, so it
// cannot hand back the new row's id — and without that id there is nothing to
// undo. These are called directly from a client component instead, so they can.

export type QuickAddResult = {
  id: string;
  /** For the confirmation line, resolved server-side so the client sends less. */
  summary: string;
};

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export async function quickAddPlacement(
  formData: FormData
): Promise<QuickAddResult> {
  const site_id = String(formData.get("site_id") ?? "");
  const operator_id = String(formData.get("operator_id") ?? "");
  if (!site_id) throw new Error("Pick a bomb site first.");
  if (!operator_id) throw new Error("Pick an operator first.");

  const video_url = String(formData.get("video_url") ?? "").trim() || null;
  const x_pct = clamp(Number(formData.get("x_pct") ?? 50), 0, 100);
  const y_pct = clamp(Number(formData.get("y_pct") ?? 50), 0, 100);

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("gadget_placements")
    .insert({
      site_id,
      operator_id,
      video_url,
      x_pct,
      y_pct,
      // label and note are left null. The quick flow is pin + clip by design;
      // the per-site editor is where those get filled in if they ever are.
      label: null,
      note: null,
    })
    .select("id")
    .single();
  if (error) throw error;

  // Names for the confirmation, in one round trip.
  const [{ data: site }, { data: op }] = await Promise.all([
    sb
      .from("gadget_sites")
      .select("name, maps(name, slug)")
      .eq("id", site_id)
      .maybeSingle(),
    sb.from("gadget_operators").select("name").eq("id", operator_id).maybeSingle(),
  ]);

  const s = site as unknown as {
    name: string;
    maps: { name: string; slug: string } | null;
  } | null;
  const summary = `${(op as { name: string } | null)?.name ?? "Placement"} on ${
    s?.maps?.name ?? "?"
  } · ${s?.name ?? "?"}`;

  return { id: (data as { id: string }).id, summary };
}

/**
 * Undo. Deletes a placement this session just created.
 *
 * Takes the id straight from quickAddPlacement's return value rather than
 * anything the UI holds, so undo can only ever remove the row it just made.
 */
export async function quickUndoPlacement(id: string): Promise<void> {
  if (!id) return;
  const sb = supabaseAdmin();

  const { error } = await sb.from("gadget_placements").delete().eq("id", id);
  if (error) throw error;
}
