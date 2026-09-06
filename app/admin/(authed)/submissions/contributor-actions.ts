"use server";

import { revalidatePath } from "next/cache";
import { resolveContributor } from "@/lib/contributors";
import { supabaseAdmin } from "@/lib/supabase";

// Attaching and detaching credit on a community submission.
//
// Its own file, matching the convention already set by ./actions.ts (legacy
// queue) and ./community-actions.ts (approve/reject/publish): one file per
// thing it writes. These two touch community_submissions.contributor_id and
// the contributors table, nothing else. No peek row is read or written.
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

  revalidate();
}
