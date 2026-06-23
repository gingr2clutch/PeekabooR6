type Props = {
  // Extra classes for layout overrides (e.g. full-width in the mobile drawer).
  className?: string;
  // Lets the mobile drawer close itself when the link is tapped.
  onClick?: () => void;
};

const DISCORD_INVITE = "https://discord.gg/N6rv94BBE";

// Filled Discord-blurple CTA. Opens the permanent Discord invite in a new
// tab. Used in the site nav (desktop + mobile drawer) and near the top of
// the map page.
export function DiscordButton({ className = "", onClick }: Props) {
  return (
    <a
      href={DISCORD_INVITE}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 rounded-btn bg-[#5865F2] px-3 py-1.5 text-xs font-semibold text-white transition-colors duration-150 ease-out hover:bg-[#4752c4] active:scale-[0.99] ${className}`}
    >
      <DiscordIcon />
      <span>Join the Discord</span>
    </a>
  );
}

// Slim single-row Discord-blurple banner for the homepage, in the slot the
// GearUP affiliate card used to occupy (above the maps grid). Logo + text +
// a small Join button, all on one line. The whole banner is the link.
export function DiscordBanner() {
  return (
    <a
      href={DISCORD_INVITE}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Join the peekabooR6 Discord (opens in new tab)"
      className="group mx-auto flex max-w-2xl items-center gap-2.5 rounded-card bg-[#5865F2] px-3 py-2 text-white shadow-sm transition-colors duration-150 ease-out hover:bg-[#4752c4]"
    >
      <DiscordIcon size={18} />
      <span className="peek-banner-badge inline-flex shrink-0 items-center rounded-btn bg-white px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#5865F2]">
        New
      </span>
      <div className="min-w-0 flex-1 sm:text-center">
        <div className="truncate text-[11px] font-semibold leading-tight sm:text-sm">
          Join the peekabooR6 Discord
        </div>
        <div className="truncate text-[10px] font-normal leading-tight text-white/75 sm:text-[11px]">
          Be the first to see new peeks
        </div>
      </div>
      <span className="inline-flex shrink-0 items-center justify-center rounded-btn bg-white px-2.5 py-1 text-xs font-semibold text-[#5865F2] transition-colors group-hover:bg-white/90">
        Join
      </span>
    </a>
  );
}

function DiscordIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden
      className="shrink-0 fill-current"
    >
      <path d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.211.375-.444.864-.608 1.249a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.036A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.891.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}
