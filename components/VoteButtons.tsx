"use client";

import { useEffect, useState, useTransition } from "react";
import { castVote } from "@/app/peeks/actions";

type Props = {
  peekId: string;
};

// Bumped v1 → v2 at launch: the DB vote counts were reset, so test-era
// "voted" flags in existing browsers must be invalidated too. Old
// `voted_peek_<id>` keys no longer match and are simply ignored, letting
// everyone vote again. Bump this version again for any future vote reset.
const storageKey = (id: string) => `voted_peek_v2_${id}`;

export function VoteButtons({ peekId }: Props) {
  const [hasVoted, setHasVoted] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(storageKey(peekId))) {
      setHasVoted(true);
    }
  }, [peekId]);

  function vote(isKill: boolean) {
    if (hasVoted || pending) return;
    startTransition(async () => {
      const result = await castVote(peekId, isKill);
      if (!result) return;
      window.localStorage.setItem(storageKey(peekId), isKill ? "kill" : "no-kill");
      setHasVoted(true);
    });
  }

  if (hasVoted) {
    return (
      <div className="flex items-center gap-1.5 text-sm font-medium text-[#1a9f4d]">
        <CheckIcon className="h-4 w-4" />
        <span>Voted</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap justify-center gap-2">
      <GhostButton onClick={() => vote(true)} disabled={pending}>
        <CheckIcon className="h-3.5 w-3.5" />
        Worked for me
      </GhostButton>
      <GhostButton onClick={() => vote(false)} disabled={pending}>
        <XIcon className="h-3.5 w-3.5" />
        Didn't work
      </GhostButton>
    </div>
  );
}

function GhostButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-btn border border-border bg-card px-3 py-1.5 text-sm text-ink transition-all duration-150 ease-out hover:border-brand hover:text-brand active:scale-95 disabled:opacity-50 disabled:active:scale-100"
    >
      {children}
    </button>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className={`fill-none stroke-current ${className ?? ""}`}
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 8.5l3.5 3.5L13 5" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className={`fill-none stroke-current ${className ?? ""}`}
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}
