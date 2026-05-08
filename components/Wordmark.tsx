import Link from "next/link";

type Props = {
  href?: string;
  showText?: boolean;
};

export function Wordmark({ href = "/", showText = false }: Props) {
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
        className="h-7 w-7 md:h-8 md:w-8"
      />
      {showText && (
        <span>
          <span className="text-brand">peekaboo</span>
          <span className="text-ink">R6</span>
        </span>
      )}
    </Link>
  );
}
