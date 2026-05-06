"use client";

import { useEffect } from "react";
import { supabasePublic } from "@/lib/supabase";

type Props = {
  peekId: string;
};

// Fires a fire-and-forget RPC to increment peeks.view_count on mount.
// SessionStorage gates against double-counting from the same tab/visit.
// All failures are silenced — view tracking is a nice-to-have, never a
// blocker for the page.
export function PeekViewTracker({ peekId }: Props) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = `viewed_peek_${peekId}`;
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, "1");

    void supabasePublic()
      .rpc("increment_peek_views", { peek_id: peekId })
      .then(({ error }) => {
        if (error) console.warn("[PeekViewTracker] rpc failed", error);
      });
  }, [peekId]);

  return null;
}
