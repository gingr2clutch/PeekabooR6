"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import { createPeek } from "../peeks/actions";
import { copySubmissionClipToR2 } from "@/lib/submission-media";

// Approve/reject for the community submission queue.
//
// Kept as its own file rather than merged into ./actions.ts: that one drives
// the legacy peek_submissions flow, writes to a different table, and creates
// draft peeks on approve. Sharing a file would invite one to be edited for the
// other's sake.
//
// The plain approve/reject/reopen/delete actions below only set status — they
// create nothing. publishSubmissionAction at the end of this file is the one
// that builds a real peek, moves the clip and sets linked_peek_id.
//
// Still outstanding: contributor attribution. contributor_id exists on the
// table (migration 032) but nothing writes it yet, so "Clipped by {name}" has
// no source of truth and the leaderboard has nothing to rank.
//
// Form-action signature in Next 14 must return void | Promise<void>, so errors
// are thrown — Next surfaces them and the row stays put for a retry.

function revalidate() {
  revalidatePath("/admin/submissions");
}

async function setStatus(id: string, status: "approved" | "rejected") {
  if (!id) return;
  const { error } = await supabaseAdmin()
    .from("community_submissions")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
  revalidate();
}

export async function approveCommunitySubmissionAction(formData: FormData) {
  await setStatus(String(formData.get("id") ?? ""), "approved");
}

export async function rejectCommunitySubmissionAction(formData: FormData) {
  await setStatus(String(formData.get("id") ?? ""), "rejected");
}

// Back to pending, so a mis-click is recoverable rather than final.
export async function reopenCommunitySubmissionAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { error } = await supabaseAdmin()
    .from("community_submissions")
    .update({ status: "pending" })
    .eq("id", id);
  if (error) throw error;
  revalidate();
}

// Deletes the row and its uploaded file. Separate from reject on purpose:
// rejecting keeps the record (and the evidence) so a decision can be revisited,
// while delete is the irreversible one the UI confirms first.
export async function deleteCommunitySubmissionAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const filePath = String(formData.get("file_path") ?? "");
  if (!id) return;

  const sb = supabaseAdmin();
  if (filePath) {
    // Best effort — a missing object must not block removing the row.
    await sb.storage.from("submissions").remove([filePath]);
  }
  const { error } = await sb
    .from("community_submissions")
    .delete()
    .eq("id", id);
  if (error) throw error;
  revalidate();
}

/**
 * Turns an approved-in-principle submission into a real peek.
 *
 * The peek is created through createPeek — the same function /admin/peeks/new
 * uses — so every validation rule, default and side effect is identical. No
 * peek row is written here directly.
 *
 * Order is deliberate: copy the clip FIRST, then create the peek, then approve
 * the submission. The copy is the flakiest step, so it runs while there is
 * still nothing to undo. That gives:
 *   copy fails    -> nothing created, submission still pending
 *   create fails  -> an orphaned R2 object, submission still pending
 *   approve fails -> peek exists (with video), submission still pending
 * In every case the submission stays pending and comes back around, which is
 * the guarantee that matters: it is never marked handled unless the peek is
 * genuinely there.
 *
 * There is no cross-service transaction available here, so errors name the
 * peek id whenever one exists — a silent half-finish is the thing to avoid.
 *
 * The submission id arrives via .bind() rather than a hidden input, so the
 * bound action matches PeekForm's existing action prop exactly and PeekForm
 * needs no changes.
 */
export async function publishSubmissionAction(
  submissionId: string,
  formData: FormData
) {
  if (!submissionId) throw new Error("submission_id required");

  const sb = supabaseAdmin();
  const { data: sub, error: subErr } = await sb
    .from("community_submissions")
    .select("id, kind, file_path, source_url, status")
    .eq("id", submissionId)
    .maybeSingle();
  if (subErr) throw subErr;
  if (!sub) throw new Error("Submission not found.");

  // 1. Clip first. A link-only submission has nothing to copy and publishes
  //    without a video — the admin can attach one on the peek's edit page.
  let videoUrl: string | null = null;
  if (sub.file_path) {
    try {
      videoUrl = await copySubmissionClipToR2(sub.file_path as string);
    } catch (e) {
      throw new Error(
        `Clip copy failed, so nothing was created and the submission is still pending. ${
          e instanceof Error ? e.message : String(e)
        }`
      );
    }
  }

  // 2. Then the peek, through the shared creation path.
  let peekId: string;
  try {
    peekId = await createPeek(formData, videoUrl);
  } catch (e) {
    if (e instanceof Error && e.message === "MISSING_REQUIRED_FIELD") {
      throw new Error("Pick a floor and give the peek a name before publishing.");
    }
    throw e;
  }

  // 3. Only now is the submission handled.
  const { error: updErr } = await sb
    .from("community_submissions")
    .update({ status: "approved", linked_peek_id: peekId })
    .eq("id", submissionId);
  if (updErr) {
    throw new Error(
      `Peek ${peekId} was created, but marking the submission approved failed — it is still pending. ${updErr.message}`
    );
  }

  revalidatePath("/admin/submissions");
  revalidatePath("/admin/peeks");
  redirect(`/admin/submissions?published=${peekId}`);
}
