"use server";

import { isEmbeddable, normalizeEmbed } from "@/lib/gadget-embed";
import { supabaseAdmin } from "@/lib/supabase";

// Quick-add writes, for the repeat-entry screen.
//
// Separate from ../actions.ts on purpose: that file backs the per-site editor,
// which stays the fallback if this screen misbehaves, and a shared file would
// let a change for one break the other.
//
// Writes gadget_setups and gadget_setup_pins. No peek table is read or written.
//
// NO revalidatePath here, deliberately. Every page a setup touches — the public
// gadget routes and both admin gadget screens — is already force-dynamic, so
// revalidation refreshes nothing that was stale. What it DID do, when this
// screen handled placements, was trigger a router refresh that remounted the
// client component and wiped the session count and the undo target about a
// second after each save. Measured, not guessed.
//
// These also differ from createSetupAction in ../actions.ts by RETURNING the
// new id. A <form action> must return void, so it cannot hand one back — and
// without the id there is nothing to undo.

export type QuickAddResult = {
  id: string;
  summary: string;
};

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function parsePins(raw: FormDataEntryValue | null) {
  if (!raw) return [] as { x: number; y: number }[];
  try {
    const v = JSON.parse(String(raw));
    if (!Array.isArray(v)) return [];
    return v
      .filter((p) => p && typeof p === "object" && "x" in p && "y" in p)
      .map((p) => ({ x: clamp(Number(p.x), 0, 100), y: clamp(Number(p.y), 0, 100) }))
      .filter((p) => !Number.isNaN(p.x) && !Number.isNaN(p.y));
  } catch {
    return [];
  }
}

export async function quickAddSetup(formData: FormData): Promise<QuickAddResult> {
  const site_id = String(formData.get("site_id") ?? "");
  const operator_id = String(formData.get("operator_id") ?? "");
  if (!site_id) throw new Error("Pick a bomb site first.");
  if (!operator_id) throw new Error("Pick an operator first.");

  // A setup needs a clip and it can be either kind — an uploaded file or a
  // Medal link we embed. The database CHECK from 036 is the real guarantee;
  // this just makes the failure readable. Embed links are validated against the
  // same allowlist the public renderer uses, so an unembeddable URL cannot be
  // stored and then silently degrade to a click-out on the live page.
  const video_url = String(formData.get("video_url") ?? "").trim() || null;
  const rawEmbed = String(formData.get("embed_url") ?? "").trim() || null;
  const embed_url = rawEmbed ? normalizeEmbed(rawEmbed) : null;
  if (!video_url && !embed_url) {
    throw new Error("Add a clip — upload one, or paste a Medal link to embed.");
  }
  if (embed_url && !isEmbeddable(embed_url)) {
    throw new Error(
      "That link cannot be embedded. Medal clip links work; anything else has to be uploaded."
    );
  }
  const clip = embed_url
    ? { video_url: null, embed_url }
    : { video_url, embed_url: null };

  const sb = supabaseAdmin();

  // "Setup N" counts what already exists for this site and operator. The
  // database only requires a name; the default is application logic.
  const { count } = await sb
    .from("gadget_setups")
    .select("id", { count: "exact", head: true })
    .eq("site_id", site_id)
    .eq("operator_id", operator_id);
  const n = (count ?? 0) + 1;
  const name = String(formData.get("name") ?? "").trim() || `Setup ${n}`;

  const { data, error } = await sb
    .from("gadget_setups")
    .insert({ site_id, operator_id, name, ...clip, display_order: n })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") {
      throw new Error(
        `A setup already uses order ${n} for this operator. Open the site editor and renumber.`
      );
    }
    throw error;
  }
  const id = (data as { id: string }).id;

  const pins = parsePins(formData.get("pins"));
  if (pins.length > 0) {
    const { error: pinErr } = await sb.from("gadget_setup_pins").insert(
      pins.map((p, i) => ({
        setup_id: id,
        x_pct: p.x,
        y_pct: p.y,
        display_order: i,
      }))
    );
    // The setup exists at this point. Rather than leave it silently pinless,
    // say so — the admin can add the pins in the site editor.
    if (pinErr) {
      throw new Error(
        `"${name}" was created, but its pins failed to save: ${pinErr.message}`
      );
    }
  }

  const [{ data: site }, { data: op }] = await Promise.all([
    sb.from("gadget_sites").select("name, maps(name)").eq("id", site_id).maybeSingle(),
    sb.from("gadget_operators").select("name").eq("id", operator_id).maybeSingle(),
  ]);
  const sRow = site as unknown as { name: string; maps: { name: string } | null } | null;
  const summary = `${name} — ${(op as { name: string } | null)?.name ?? "?"} on ${
    sRow?.maps?.name ?? "?"
  } · ${sRow?.name ?? "?"} (${pins.length} pin${pins.length === 1 ? "" : "s"})`;

  return { id, summary };
}

/**
 * Undo. Deletes a setup this session just created; its pins cascade.
 *
 * Takes the id straight from quickAddSetup's return value, so undo can only
 * ever remove the row it just made.
 */
export async function quickUndoSetup(id: string): Promise<void> {
  if (!id) return;
  const { error } = await supabaseAdmin()
    .from("gadget_setups")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
