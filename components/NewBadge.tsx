type Props = {
  size?: "sm" | "xs";
};

// Small brand-orange "NEW" pill shown next to recent peeks.
export function NewBadge({ size = "sm" }: Props) {
  const cls =
    size === "xs"
      ? "inline-flex items-center rounded-full bg-brand px-1.5 py-px text-[9px] font-semibold uppercase tracking-[0.08em] text-white"
      : "inline-flex items-center rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-white";
  return (
    <span aria-label="New" className={cls}>
      New
    </span>
  );
}
