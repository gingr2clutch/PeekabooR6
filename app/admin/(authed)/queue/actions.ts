"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import { publishPeekNow } from "@/lib/queue";

// Publish a queued peek immediately (same as the scheduler would): flips it
// live, logs the release, and fires the Discord announce.
export async function publishNowAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const res = await publishPeekNow(id, "admin");
  revalidatePath("/admin/queue");
  revalidatePath("/admin/peeks");
  if (res.peek?.slug) revalidatePath(`/peeks/${res.peek.slug}`);
}

// Drop a peek out of the release queue — it stays an unpublished draft.
export async function removeFromQueueAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { error } = await supabaseAdmin()
    .from("peeks")
    .update({ queue_position: null })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/admin/queue");
}

// Reorder by swapping this peek's queue_position with its neighbour's.
export async function moveQueuedPeekAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const dir = String(formData.get("dir") ?? "");
  if (!id || (dir !== "up" && dir !== "down")) return;

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("peeks")
    .select("id, queue_position")
    .eq("published", false)
    .not("queue_position", "is", null)
    .order("queue_position", { ascending: true });
  if (error) throw error;

  const list = (data ?? []) as { id: string; queue_position: number }[];
  const idx = list.findIndex((p) => p.id === id);
  if (idx < 0) return;
  const swapIdx = dir === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= list.length) return;

  const a = list[idx];
  const b = list[swapIdx];
  await sb.from("peeks").update({ queue_position: b.queue_position }).eq("id", a.id);
  await sb.from("peeks").update({ queue_position: a.queue_position }).eq("id", b.id);
  revalidatePath("/admin/queue");
}
