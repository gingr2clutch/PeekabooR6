import Link from "next/link";

export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      aria-label="peekabooR6 home"
      className="flex items-center gap-2.5 text-xl font-semibold tracking-tight transition-colors"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/favicon.svg"
        alt=""
        width={32}
        height={32}
        className="h-8 w-8"
      />
      <span className="hidden md:inline">
        <span className="text-brand">peekaboo</span>
        <span className="text-ink">R6</span>
      </span>
    </Link>
  );
}
