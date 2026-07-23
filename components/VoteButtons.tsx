"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { castVote } from "@/app/peeks/actions";

type Choice = "worked" | "didnt";

type Props = {
  peekId: string;
  // Logged-in state is server truth (from the append-only history). Anonymous
  // voting stays one-time, gated only by a localStorage flag.
  isLoggedIn: boolean;
  initialVote: Choice | null;
  initialDaysUntilRevote: number;
};

// Bumped v1 → v2 at launch: the DB vote counts were reset, so test-era
// "voted" flags in existing browsers must be invalidated too. Old
// `voted_peek_<id>` keys no longer match and are simply ignored, letting
// everyone vote again. Bump this version again for any future vote reset.
// (Anonymous-only — logged-in vote history lives in the peek_votes table.)
const storageKey = (id: string) => `voted_peek_v2_${id}`;

// localStorage stores "kill" for "Worked for me" and "no-kill" for "Didn't
// work" — the same values written since launch, so remembered anonymous votes
// light up on return visits with no migration.
const readAnonChoice = (id: string): Choice | null => {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(storageKey(id));
  if (v === "kill") return "worked";
  if (v === "no-kill") return "didnt";
  return null;
};

export function VoteButtons({
  peekId,
  isLoggedIn,
  initialVote,
  initialDaysUntilRevote,
}: Props) {
  const [choice, setChoice] = useState<Choice | null>(initialVote);
  const [daysLeft, setDaysLeft] = useState(initialDaysUntilRevote);
  const [pending, startTransition] = useTransition();

  // Anonymous vote memory is client-only; ignored entirely when logged in.
  useEffect(() => {
    if (isLoggedIn) return;
    setChoice(readAnonChoice(peekId));
  }, [peekId, isLoggedIn]);

  const voted = choice !== null;
  // Anonymous voting is one-time (locked forever once voted). Logged-in unlocks
  // again after the 7-day cooldown.
  const locked = voted && (!isLoggedIn || daysLeft > 0);
  const canVoteAgain = isLoggedIn && voted && daysLeft === 0;

  function vote(next: Choice) {
    if (pending || locked) return;
    startTransition(async () => {
      const result = await castVote(peekId, next === "worked");
      if (!result) return;
      if (isLoggedIn) {
        setChoice(result.myVote ?? next);
        setDaysLeft(result.daysUntilRevote ?? 7);
      } else {
        window.localStorage.setItem(
          storageKey(peekId),
          next === "worked" ? "kill" : "no-kill"
        );
        setChoice(next);
      }
    });
  }

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-3">
      {voted ? (
        <div className="flex flex-col items-center gap-0.5 text-center">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <CheckIcon className="h-4 w-4 text-[#1a9f4d]" />
            You voted: {choice === "worked" ? "Worked for me" : "Didn't work for me"}
          </p>
          {isLoggedIn && daysLeft > 0 && (
            <p className="text-sm text-muted">
              You can vote again in {daysLeft} {daysLeft === 1 ? "day" : "days"}.
            </p>
          )}
          {canVoteAgain && (
            <p className="text-sm text-muted">
              You can vote again — pick below.
            </p>
          )}
          {!isLoggedIn && (
            <p className="text-sm text-muted">
              <Link href="/login" className="underline hover:text-brand">
                Log in
              </Link>{" "}
              to vote again later.
            </p>
          )}
        </div>
      ) : (
        <p className="text-center text-sm text-muted">
          Cast your vote — every vote makes the grades more accurate.
        </p>
      )}

      <div className="flex w-full gap-3">
        <VoteButton
          onClick={() => vote("worked")}
          disabled={pending || locked}
          active={choice === "worked"}
          dimmed={locked && choice !== "worked"}
        >
          <CheckIcon className="h-5 w-5" />
          Worked for me
        </VoteButton>
        <VoteButton
          onClick={() => vote("didnt")}
          disabled={pending || locked}
          active={choice === "didnt"}
          dimmed={locked && choice !== "didnt"}
        >
          <XIcon className="h-5 w-5" />
          Didn't work for me
        </VoteButton>
      </div>

      {!isLoggedIn && !voted && (
        <p className="text-center text-xs text-muted">
          <Link href="/login" className="underline hover:text-brand">
            Log in
          </Link>{" "}
          to vote again later.
        </p>
      )}
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
