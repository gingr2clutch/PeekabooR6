import { Lock } from "lucide-react";

// Small "PRO" lock chip shown on Pro-only peeks in listings. Presentational —
// safe in server or client components.
export function ProLockBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-btn bg-brand/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand ${className}`}
    >
      <Lock size={10} strokeWidth={2.5} aria-hidden />
      Pro
    </span>
  );
}
