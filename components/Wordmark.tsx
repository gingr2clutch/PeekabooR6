import Link from "next/link";

export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="text-xl font-semibold tracking-tight transition-colors"
    >
      <span className="text-brand">peekaboo</span>
      <span className="text-ink">R6</span>
    </Link>
  );
}
