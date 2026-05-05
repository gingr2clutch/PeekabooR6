"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { castVote } from "@/app/peeks/actions";

type Props = {
  peekId: string;
  initialRate: number;
};

const storageKey = (id: string) => `voted_peek_${id}`;

export function SuccessRateVoter({ peekId, initialRate }: Props) {
  const [rate, setRate] = useState(initialRate);
  const [displayRate, setDisplayRate] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);
  const [pending, startTransition] = useTransition();
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(storageKey(peekId))) {
      setHasVoted(true);
    }
  }, [peekId]);

  // Count-up: animates 0 → rate over 600ms once on mount. After that, the
  // displayed value just mirrors `rate` (which can change after a vote).
  useEffect(() => {
    if (hasAnimatedRef.current) {
      setDisplayRate(rate);
      return;
    }
    hasAnimatedRef.current = true;
    const target = rate;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 600);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayRate(Math.round(eased * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [rate]);

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
    "flex flex-1 items-center justify-center gap-2 rounded-btn border px-3 py-2 text-sm font-medium transition-all duration-200 active:scale-95 disabled:opacity-60 disabled:active:scale-100";

  return (
    <div className="space-y-3">
      <div className="text-center">
        <div className="text-5xl font-semibold tracking-tight tabular-nums">
          {displayRate}%
        </div>
        <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
          Success rate
        </div>
      </div>

      {hasVoted ? (
        <div className="flex items-center justify-center gap-1.5 pt-2 text-sm font-medium text-[#1a9f4d]">
          <svg
            viewBox="0 0 16 16"
            width="14"
            height="14"
            aria-hidden
            className="fill-none stroke-current"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 8.5l3.5 3.5L13 5" />
          </svg>
          <span>Voted</span>
        </div>
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
