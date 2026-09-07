"use server";

import { revalidatePath } from "next/cache";
import { slugifyContributor } from "@/lib/contributors";
import { supabaseAdmin } from "@/lib/supabase";

// Contributor maintenance: rename, re-slug, hide, merge, delete.
//
// These write contributors and community_submissions.contributor_id. No peek
// table is touched.
//
// The hazard this file exists to manage: community_submissions.contributor_id
// is ON DELETE SET NULL (migration 032). Deleting a contributor therefore does
// not fail when they still hold credit — it silently strips the attribution
// from every submission they had, with no error and nothing on screen to say
// it happened. So delete counts first and refuses, and merge exists to give a
// duplicate somewhere to go other than the bin.

function revalidate(slug?: string) {
  revalidatePath("/admin/contributors");
  revalidatePath("/contributors");
  if (slug) revalidatePath(`/contributors/${slug}`);
}

async function creditCount(id: string): Promise<number> {
  const { count, error } = await supabaseAdmin()
    .from("community_submissions")
    .select("id", { count: "exact", head: true })
    .eq("contributor_id", id);
  if (error) throw error;
  return count ?? 0;
}

/**
 * Rename, re-slug, and set the optional profile link.
 *
 * The slug IS editable here, unlike an operator's. That is a considered
 * difference: an operator slug is minted by an admin who meant it, while a
 * contributor slug is derived from a name typed during approval — so the first
 * value is exactly the one likely to contain a typo, and a wrong public URL
 * with no way to fix it is worse than a link that might break. Changing it
 * does break /contributors/<old-slug>, which is why the form says so.
 */
export async function updateContributorAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const displayName = String(formData.get("display_name") ?? "")
    .trim()
    .replace(/\s+/g, " ");
  if (!id || !displayName) return;
  if (displayName.length > 60) {
    throw new Error("Contributor name is too long (60 characters max).");
  }

  const slugInput = String(formData.get("slug") ?? "").trim();
  const slug = slugifyContributor(slugInput || displayName);
  const linkRaw = String(formData.get("link_url") ?? "").trim();

  // Only http(s). A javascript: or data: URL here would be rendered as an
  // anchor on a public profile page.
  let link_url: string | null = null;
  if (linkRaw) {
    let parsed: URL;
    try {
      parsed = new URL(linkRaw);
    } catch {
      throw new Error("Link must be a full URL, e.g. https://twitch.tv/name");
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("Link must start with http:// or https://");
    }
    link_url = parsed.toString();
  }

  const { error } = await supabaseAdmin()
    .from("contributors")
    .update({ display_name: displayName, slug, link_url })
    .eq("id", id);

  // 23505 covers both unique indexes here: slug, and lower(display_name).
  // Which one tripped decides the message, so the fix is obvious.
  if (error) {
    if (error.code === "23505") {
      throw new Error(
        error.message.includes("display_name")
          ? `Another contributor is already called "${displayName}". Merge them instead of creating a second one.`
          : `Another contributor already uses /contributors/${slug}. Pick a different slug.`
      );
    }
    throw error;
  }
  revalidate(slug);
}

export async function toggleContributorHiddenAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const next = String(formData.get("hidden") ?? "") === "true";
  if (!id) return;

  const { error } = await supabaseAdmin()
    .from("contributors")
    .update({ is_hidden: next })
    .eq("id", id);
  if (error) throw error;
  revalidate();
}

/**
 * Moves every credit from one contributor to another, then removes the empty
 * one. This is the repair for the failure the attach field warns about: a typo
 * splitting one person across two rows.
 *
 * Order matters. Reassign first, delete second — the reverse would hit ON
 * DELETE SET NULL and destroy the very credits being rescued.
 */
export async function mergeContributorsAction(formData: FormData) {
  const fromId = String(formData.get("from_id") ?? "");
  const toId = String(formData.get("to_id") ?? "");
  if (!fromId || !toId) return;
  if (fromId === toId) throw new Error("Pick a different contributor to merge into.");

  const sb = supabaseAdmin();

  const { data: target, error: tErr } = await sb
    .from("contributors")
    .select("id, display_name, slug")
    .eq("id", toId)
    .maybeSingle();
  if (tErr) throw tErr;
  if (!target) throw new Error("That contributor no longer exists.");

  const { error: moveErr } = await sb
    .from("community_submissions")
    .update({ contributor_id: toId })
    .eq("contributor_id", fromId);
  if (moveErr) throw moveErr;

  // Only now is the source empty and safe to remove. If this delete fails the
  // credits are already on the target, so nothing is lost — there is just a
  // spare empty row to clear up.
  const { error: delErr } = await sb
    .from("contributors")
    .delete()
    .eq("id", fromId);
  if (delErr) {
    throw new Error(
      `Credits moved to ${(target as { display_name: string }).display_name}, but removing the old row failed. Delete it manually. ${delErr.message}`
    );
  }

  revalidate((target as { slug: string }).slug);
}

/**
 * Deletes a contributor who holds no credit.
 *
 * Refuses otherwise. The foreign key would NOT stop this — it is ON DELETE SET
 * NULL, so the delete would succeed and quietly un-credit every submission
 * they had. There is no constraint to lean on here, which makes this check the
 * only thing standing between a click and silent data loss.
 */
export async function deleteContributorAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const held = await creditCount(id);
  if (held > 0) {
    throw new Error(
      `This contributor still holds ${held} credit${held === 1 ? "" : "s"}. Deleting would strip the attribution from ${held === 1 ? "that submission" : "those submissions"} without a trace — merge them into the right person, or hide them instead.`
    );
  }

  const { error } = await supabaseAdmin()
    .from("contributors")
    .delete()
    .eq("id", id);
  if (error) throw error;
  revalidate();
}
