type Props = {
  label: string;
  aspect?: string;
};

// Diagonal-stripe panel used wherever an image or video hasn't been uploaded.
export function PlaceholderBox({ label, aspect = "aspect-[16/10]" }: Props) {
  return (
    <div
      className={`placeholder-stripes flex w-full items-center justify-center rounded-inner ${aspect}`}
    >
      <span className="rounded-btn bg-card/80 px-3 py-1 text-sm text-muted backdrop-blur-sm">
        {label}
      </span>
    </div>
  );
}
