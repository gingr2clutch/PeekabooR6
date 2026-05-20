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
        src="/logo.svg"
        alt=""
        width={36}
        height={36}
        className="h-8 w-8 md:h-9 md:w-9"
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
