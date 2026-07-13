"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// Compact profile-icon button for the top nav bar. Logged OUT → outlined person
// (→ /login); logged IN → filled/teal active person (→ /account). Self-contained
// (browser client) so it doesn't force a server auth check on every page, and
// keeps the access token fresh while any page is open. While state is unknown it
// links to /account (which redirects to /login if you're signed out).
export function AuthNavIcon({ iconSize = 22 }: { iconSize?: number }) {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setLoggedIn(!!data.user);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session?.user);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const isIn = loggedIn === true;
  const href = loggedIn === false ? "/login" : "/account";
  const label = isIn ? "Your account" : "Log in or sign up";

  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-btn transition-colors duration-150 ease-out ${
        isIn
          ? "text-teal hover:bg-teal/[0.08]"
          : "text-ink hover:bg-ink/[0.06] hover:text-brand"
      }`}
    >
      <UserRound
        size={iconSize}
        strokeWidth={2}
        aria-hidden
        className={isIn ? "fill-teal/20" : ""}
      />
    </Link>
  );
}
