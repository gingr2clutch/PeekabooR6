"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";

// Approve/reject for the community submission queue.
//
// PHASE 1 ONLY: approve flips status and nothing else. Attaching an approved
// clip to a peek page and rendering "Clipped by {name}" is phase 2, so
// linked_peek_id stays null and no peek row is created, read or altered here.
//
// Form-action signature in Next 14 must return void | Promise<void>, so errors
// are thrown — Next surfaces them and the row stays put for a retry.

function revalidate() {
  revalidatePath("/admin/submissions/community");
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
