import Link from "next/link";

export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 text-xl font-semibold tracking-tight transition-colors"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/favicon.svg"
        alt=""
        width={32}
        height={32}
        className="h-7 w-7 sm:h-8 sm:w-8"
      />
      <span>
        <span className="text-brand">peekaboo</span>
        <span className="text-ink">R6</span>
      </span>
    </Link>
  );
}
