// Homepage network bar: dark HIE-branded strip promoting the daily game.
// Same compact shape as DiscordBanner — the whole bar is the link.
export function HowItEndsBanner() {
  return (
    <a
      href="https://how-it-ends.com"
      target="_blank"
      rel="noopener"
      aria-label="Play How It Ends — daily clip prediction game (opens in new tab)"
      className="elev-sm group mx-auto flex w-[86%] max-w-sm items-center gap-2.5 rounded-card bg-gradient-to-r from-[#15181F] to-[#232A36] px-3.5 py-1.5 transition-[filter] duration-150 ease-out hover:brightness-110"
    >
      <span className="shrink-0 text-white" aria-hidden>
        <svg viewBox="0 0 24 24" width={20} height={20} className="fill-current">
          <path d="M8 5.5v13l11-6.5-11-6.5z" />
        </svg>
      </span>
      <span className="min-w-0 flex-1 truncate text-center text-xs font-semibold text-white sm:text-sm">
        Guess how the clip ends — new one daily
      </span>
      <span className="inline-flex shrink-0 items-center justify-center rounded-btn bg-white px-3 py-1 text-xs font-semibold text-[#15181F] transition-colors group-hover:bg-white/90">
        Play
      </span>
    </a>
  );
}
