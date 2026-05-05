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

  return (
    <div className="flex flex-col items-center">
      <span className="text-[60px] font-bold leading-none tracking-tight text-brand tabular-nums sm:text-[72px]">
        {displayRate}%
      </span>
      <span className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
        Success rate
      </span>

      <div className="mt-4 min-h-[36px]">
        {hasVoted ? (
          <div className="flex items-center gap-1.5 text-sm font-medium text-[#1a9f4d]">
            <CheckIcon className="h-4 w-4" />
            <span>Voted</span>
          </div>
        ) : (
          <div className="flex gap-2">
            <GhostButton onClick={() => vote(true)} disabled={pending}>
              <CheckIcon className="h-3.5 w-3.5" />
              Worked for me
            </GhostButton>
            <GhostButton onClick={() => vote(false)} disabled={pending}>
              <XIcon className="h-3.5 w-3.5" />
              Didn't work
            </GhostButton>
          </div>
        )}
      </div>
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
