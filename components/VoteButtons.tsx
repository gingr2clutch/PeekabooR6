"use client";

import { useEffect, useState, useTransition } from "react";
import { castVote } from "@/app/peeks/actions";

type Props = {
  peekId: string;
};

type Choice = "worked" | "didnt";

// Bumped v1 → v2 at launch: the DB vote counts were reset, so test-era
// "voted" flags in existing browsers must be invalidated too. Old
// `voted_peek_<id>` keys no longer match and are simply ignored, letting
// everyone vote again. Bump this version again for any future vote reset.
const storageKey = (id: string) => `voted_peek_v2_${id}`;

// localStorage stores "kill" for "Worked for me" and "no-kill" for "Didn't
// work" — the same values already written since launch, so existing remembered
// votes light up correctly on return visits with no migration.
const readChoice = (id: string): Choice | null => {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(storageKey(id));
  if (v === "kill") return "worked";
  if (v === "no-kill") return "didnt";
  return null;
};

export function VoteButtons({ peekId }: Props) {
  const [choice, setChoice] = useState<Choice | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setChoice(readChoice(peekId));
  }, [peekId]);

  const voted = choice !== null;

  function vote(next: Choice) {
    if (voted || pending) return;
    startTransition(async () => {
      const result = await castVote(peekId, next === "worked");
      if (!result) return;
      window.localStorage.setItem(
        storageKey(peekId),
        next === "worked" ? "kill" : "no-kill"
      );
      setChoice(next);
    });
  }

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-3">
      {voted ? (
        <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <CheckIcon className="h-4 w-4 text-[#1a9f4d]" />
          You voted: {choice === "worked" ? "Worked for me" : "Didn't work for me"}
        </p>
      ) : (
        <p className="text-center text-sm text-muted">
          Cast your vote — every vote makes the grades more accurate.
        </p>
      )}

      <div className="flex w-full gap-3">
        <VoteButton
          onClick={() => vote("worked")}
          disabled={pending || voted}
          active={choice === "worked"}
          dimmed={voted && choice !== "worked"}
        >
          <CheckIcon className="h-5 w-5" />
          Worked for me
        </VoteButton>
        <VoteButton
          onClick={() => vote("didnt")}
          disabled={pending || voted}
          active={choice === "didnt"}
          dimmed={voted && choice !== "didnt"}
        >
          <XIcon className="h-5 w-5" />
          Didn't work for me
        </VoteButton>
      </div>
    </div>
  );
}

function VoteButton({
  onClick,
  disabled,
  active,
  dimmed,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  dimmed?: boolean;
  children: React.ReactNode;
}) {
  const state = active
    ? "border-brand bg-brand text-white"
    : dimmed
      ? "border-border bg-card text-muted opacity-60"
      : "border-border bg-card text-ink hover:border-brand hover:text-brand";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex flex-1 items-center justify-center gap-2 rounded-btn border-2 px-5 py-3 text-base font-semibold transition-all duration-150 ease-out active:scale-95 disabled:active:scale-100 disabled:cursor-default ${state}`}
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
