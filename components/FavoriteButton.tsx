"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { useFavorites } from "./FavoritesProvider";

// Heart toggle shown on peeks everywhere. Logged-in → optimistic favorite /
// unfavorite with a subtle pop. Logged-out → a friendly "log in to save"
// toast (favorites are meant to nudge sign-up). stopPropagation so it never
// triggers a surrounding card link.
export function FavoriteButton({
  peekId,
  size = 18,
  className = "",
}: {
  peekId: string;
  size?: number;
  className?: string;
}) {
  const { loggedIn, isFavorite, toggle } = useFavorites();
  const fav = isFavorite(peekId);
  const [pop, setPop] = useState(false);
  const [prompt, setPrompt] = useState(false);

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!loggedIn) {
      setPrompt(true);
      window.setTimeout(() => setPrompt(false), 4000);
      return;
    }
    setPop(true);
    window.setTimeout(() => setPop(false), 320);
    toggle(peekId);
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={fav}
        aria-label={fav ? "Remove from favorites" : "Save to favorites"}
        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors duration-150 ease-out hover:bg-ink/[0.06] hover:text-brand ${className}`}
      >
        <Heart
          size={size}
          strokeWidth={2}
          aria-hidden
          className={`transition-colors ${fav ? "fill-brand text-brand" : ""} ${
            pop ? "peek-heart-pop" : ""
          }`}
        />
      </button>
      {prompt && (
        <div
          className="fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4"
          role="status"
        >
          <div className="flex items-center gap-3 rounded-card border border-border bg-card px-4 py-2.5 shadow-lg">
            <span className="text-sm text-ink">
              Log in to save your favorite peeks
            </span>
            <Link
              href="/login"
              className="shrink-0 text-sm font-semibold text-brand hover:underline"
            >
              Log in
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
