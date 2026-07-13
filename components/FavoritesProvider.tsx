"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type FavoritesCtx = {
  ready: boolean;
  loggedIn: boolean;
  isFavorite: (peekId: string) => boolean;
  toggle: (peekId: string) => void;
};

const Ctx = createContext<FavoritesCtx>({
  ready: false,
  loggedIn: false,
  isFavorite: () => false,
  toggle: () => {},
});

export function useFavorites() {
  return useContext(Ctx);
}

// App-wide favorites state. Fetches the logged-in user's favorite peek_ids once
// (client-side, via the cookie-backed browser client — RLS keeps it to their
// own rows) and exposes optimistic toggles. Logged-out users get loggedIn:false
// and the heart buttons prompt sign-up instead of writing.
export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const favRef = useRef(favorites);
  favRef.current = favorites;
  const supabaseRef = useRef<ReturnType<
    typeof createSupabaseBrowserClient
  > | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabaseRef.current = supabase;
    let active = true;

    async function loadFavorites(userPresent: boolean) {
      if (!userPresent) {
        setFavorites(new Set());
        return;
      }
      const { data, error } = await supabase
        .from("favorites")
        .select("peek_id");
      if (!active) return;
      // error === table missing (pre-migration) or transient — keep empty.
      if (!error && data) {
        setFavorites(new Set(data.map((r) => r.peek_id as string)));
      }
    }

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;
      setLoggedIn(!!user);
      await loadFavorites(!!user);
      if (active) setReady(true);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const present = !!session?.user;
      setLoggedIn(present);
      loadFavorites(present);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const toggle = useCallback((peekId: string) => {
    const supabase = supabaseRef.current;
    if (!supabase) return;
    const wasFav = favRef.current.has(peekId);

    // Optimistic update.
    setFavorites((prev) => {
      const next = new Set(prev);
      if (wasFav) next.delete(peekId);
      else next.add(peekId);
      return next;
    });

    (async () => {
      const { error } = wasFav
        ? await supabase.from("favorites").delete().eq("peek_id", peekId)
        : await supabase.from("favorites").insert({ peek_id: peekId });
      if (error) {
        // Revert on failure.
        setFavorites((prev) => {
          const next = new Set(prev);
          if (wasFav) next.add(peekId);
          else next.delete(peekId);
          return next;
        });
      }
    })();
  }, []);

  const isFavorite = useCallback(
    (peekId: string) => favorites.has(peekId),
    [favorites]
  );

  return (
    <Ctx.Provider value={{ ready, loggedIn, isFavorite, toggle }}>
      {children}
    </Ctx.Provider>
  );
}
