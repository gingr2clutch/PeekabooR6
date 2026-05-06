"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { supabasePublic } from "@/lib/supabase";

const SESSION_KEY = "pkb_session_id";

// Fire-and-forget pageview log. Inserts a row into Supabase `page_views`
// per visited path, scoped to a session_id that lives in sessionStorage so
// reloads in the same tab count as the same session. Admin paths and
// missing-pathname renders are skipped. Failures are logged but never
// surfaced — analytics must not block UX.
export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!pathname) return;
    if (pathname.startsWith("/admin")) return;

    let sessionId = window.sessionStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      sessionId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.sessionStorage.setItem(SESSION_KEY, sessionId);
    }

    void supabasePublic()
      .from("page_views")
      .insert({ path: pathname, session_id: sessionId })
      .then(({ error }) => {
        if (error) console.warn("[PageViewTracker]", error);
      });
  }, [pathname]);

  return null;
}
