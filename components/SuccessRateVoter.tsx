"use client";

import { useEffect, useState, useTransition } from "react";
import { castVote } from "@/app/peeks/actions";

type Props = {
  peekId: string;
  initialRate: number;
};

const storageKey = (id: string) => `voted_peek_${id}`;

export function SuccessRateVoter({ peekId, initialRate }: Props) {
  const [rate, setRate] = useState(initialRate);
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
      setRate(result.success_rate);
      window.localStorage.setItem(storageKey(peekId), isKill ? "kill" : "no-kill");
      setHasVoted(true);
    });
  }

  const baseBtn =
    "flex flex-1 items-center justify-center gap-2 rounded-btn border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-60";

  return (
    <div className="space-y-3">
      <div className="text-center">
        <div className="text-5xl font-semibold tracking-tight">{rate}%</div>
        <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
          Success rate
        </div>
      </div>

      {hasVoted ? (
        <p className="text-center text-sm text-muted">Thanks for voting</p>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => vote(true)}
            disabled={pending}
            className={`${baseBtn} border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300`}
          >
            Kill <span aria-hidden>✅</span>
          </button>
          <button
            type="button"
            onClick={() => vote(false)}
            disabled={pending}
            className={`${baseBtn} border-red-200 bg-red-50 text-red-700 hover:border-red-300`}
          >
            No kill <span aria-hidden>❌</span>
          </button>
        </div>
      )}
    </div>
  );
}
