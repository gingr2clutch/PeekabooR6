// Homepage network card: compact HowItEnds cross-promo for the daily clip
// game. Card surface matches the site cards (white, hairline border, elev-sm)
// with a purple (#6d6de0) left accent + mini video-player logo. Kept to one
// tight row at ~the old height so it never pushes the Mediavine ad slots below
// it down.
export function HowItEndsBanner() {
  return (
    <a
      href="https://how-it-ends.com"
      target="_blank"
      rel="noopener"
      aria-label="Play How It Ends — daily clip prediction game (opens in new tab)"
      className="elev-sm group mx-auto flex w-[86%] max-w-sm items-center gap-2.5 rounded-card border border-border border-l-[3px] border-l-[#6d6de0] bg-card px-3 py-0.5 transition-[filter] duration-150 ease-out hover:brightness-[0.985]"
    >
      {/* Mini video-player logo: rounded frame, purple play triangle, a short
          progress bar (filled + faint remainder). */}
      <span className="shrink-0" aria-hidden>
        <svg viewBox="0 0 32 32" width={26} height={26} fill="none">
          <rect x="4" y="6" width="24" height="20" rx="4" stroke="#6d6de0" strokeWidth="2" />
          <path d="M13 12l6 4-6 4v-8z" fill="#6d6de0" />
          <rect x="8" y="22" width="8" height="1.6" rx="0.8" fill="#6d6de0" />
          <rect x="16.5" y="22" width="7.5" height="1.6" rx="0.8" fill="#6d6de0" opacity="0.3" />
        </svg>
      </span>

      {/* Title + tag on line 1, subtitle on line 2. leading-tight so both lines
          fit the old single-line height. min-w-0 + truncate = clean at 320px. */}
      <span className="min-w-0 flex-1 leading-[1.15]">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[13px] font-bold text-ink">HowItEnds</span>
          <span className="shrink-0 rounded-full bg-[#6d6de0]/10 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-[#6d6de0]">
            New clip daily
          </span>
        </span>
        <span className="block truncate text-[11px] text-muted">Guess how the clip ends</span>
      </span>

      {/* Orange CTA. */}
      <span className="inline-flex shrink-0 items-center gap-1 rounded-btn bg-brand px-3 py-1.5 text-xs font-semibold text-white transition-colors group-hover:bg-[#d9560b]">
        PLAY <span aria-hidden>→</span>
      </span>
    </a>
  );
}
