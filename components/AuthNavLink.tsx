"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CircleUserRound } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// Nav link that reflects auth state: "Account" when logged in, "Log in"
// otherwise. Self-contained (browser client) so it doesn't force a server auth
// check on every page — and instantiating the browser client here keeps the
// access token fresh while any page is open. While state is still unknown it
// links to /account, which itself redirects to /login if you're signed out.
export function AuthNavLink({
  className = "",
  iconSize = 16,
  onClick,
}: {
  className?: string;
  iconSize?: number;
  onClick?: () => void;
}) {
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

  const href = loggedIn === false ? "/login" : "/account";
  const label = loggedIn === false ? "Log in" : "Account";

  return (
    <Link href={href} onClick={onClick} className={className}>
      <CircleUserRound size={iconSize} strokeWidth={2} aria-hidden />
      <span>{label}</span>
    </Link>
  );
}
