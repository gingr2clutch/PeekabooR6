"use server";

import { revalidatePath } from "next/cache";
import { resolveContributor } from "@/lib/contributors";
import { supabaseAdmin } from "@/lib/supabase";

// Attaching and detaching credit on a community submission.
//
// Its own file, matching the convention already set by ./actions.ts (legacy
// queue) and ./community-actions.ts (approve/reject/publish).
//
// These used to write community_submissions.contributor_id and nothing else,
// which made attaching credit to an ALREADY-PUBLISHED submission a no-op as far
// as anyone could see: the admin card showed the name, the live page kept
// rendering the house credit, and nothing reported a problem. The public pages
// read contributor_id off the peek or setup, so credit has to be mirrored onto
// whatever the submission produced.
//
// For a submission that has not been published yet there is nothing to mirror
// to, and the publish flow picks the credit up from here later.
//
// Form-action signature in Next 14 must return void | Promise<void>, so a
// failure is thrown — Next surfaces it and the submission keeps whatever
// attribution it already had.

function revalidate() {
  revalidatePath("/admin/submissions");
}

/**
 * Attaches a submission to the contributor with this display name, creating
 * that contributor if no one holds the name yet.
 *
 * The name is typed by an admin, not taken from submitter_name — the field is
 * only PREFILLED with what the submitter claimed. That difference is the whole
 * anti-impersonation story: a stranger writing "gingr2clutch" into a public
 * form gets credited to the real one only if a human agrees.
 */
export async function attachContributorAction(formData: FormData) {
  const submissionId = String(formData.get("submission_id") ?? "");
  const name = String(formData.get("contributor_name") ?? "").trim();
  if (!submissionId) return;
  if (!name) throw new Error("Type a contributor name before attaching.");

  const { contributor } = await resolveContributor(name);

  const { error } = await supabaseAdmin()
    .from("community_submissions")
    .update({ contributor_id: contributor.id })
    .eq("id", submissionId);
  if (error) throw error;

  await mirrorToPublished(submissionId, contributor.id);
  revalidate();
}

/**
 * Removes credit from a submission. The contributor row itself is left alone —
 * it may hold credit for other submissions, and deleting it here would take
 * those with it.
 */
export async function detachContributorAction(formData: FormData) {
  const submissionId = String(formData.get("submission_id") ?? "");
  if (!submissionId) return;

  const { error } = await supabaseAdmin()
    .from("community_submissions")
    .update({ contributor_id: null })
    .eq("id", submissionId);
  if (error) throw error;

  await mirrorToPublished(submissionId, null);
  revalidate();
}

/**
 * Copy a submission's credit onto the peek or setup it produced.
 *
 * Runs after the submission itself is updated, so the submission is the record
 * of intent and this is the projection of it onto the public row. A submission
 * with nothing published yet has no target and is a no-op.
 *
 * Errors propagate. Leaving the two out of step is exactly the failure this
 * function exists to close, so it must not be swallowed.
 */
async function mirrorToPublished(
  submissionId: string,
  contributorId: string | null
): Promise<void> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("community_submissions")
    .select("linked_peek_id, linked_gadget_setup_id")
    .eq("id", submissionId)
    .maybeSingle();
  if (error) throw error;

  const row = data as {
    linked_peek_id: string | null;
    linked_gadget_setup_id: string | null;
  } | null;
  if (!row) return;

  if (row.linked_peek_id) {
    const { error: e } = await sb
      .from("peeks")
      .update({ contributor_id: contributorId })
      .eq("id", row.linked_peek_id);
    if (e) throw e;
    revalidatePath(`/peeks`);
  }
  if (row.linked_gadget_setup_id) {
    const { error: e } = await sb
      .from("gadget_setups")
      .update({ contributor_id: contributorId })
      .eq("id", row.linked_gadget_setup_id);
    if (e) throw e;
    revalidatePath(`/gadgets`);
  }
}
