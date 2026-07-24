type Props = {
  // Extra classes for layout overrides (e.g. full-width in the mobile drawer).
  className?: string;
  // Lets the mobile drawer close itself when the link is tapped.
  onClick?: () => void;
  // Color tone: "blurple" (default, desktop nav) or "teal" (mobile drawer, to
  // match the teal homepage Discord bar).
  variant?: "blurple" | "teal";
};

const DISCORD_INVITE = "https://discord.gg/N6rv94BBE";

// Filled Discord-blurple CTA. Opens the permanent Discord invite in a new
// tab. Used in the site nav (desktop + mobile drawer) and near the top of
// the map page.
export function DiscordButton({
  className = "",
  onClick,
  variant = "blurple",
}: Props) {
  const tone =
    variant === "teal"
      ? "bg-teal hover:bg-[#357d70]"
      : "bg-[#5865F2] hover:bg-[#4752c4]";
  return (
    <a
      href={DISCORD_INVITE}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 rounded-btn ${tone} px-3 py-1.5 text-xs font-semibold text-white transition-[background-color,box-shadow,transform] duration-150 ease-out motion-safe:hover:scale-[1.04] motion-safe:hover:shadow-md motion-safe:active:scale-[0.98] ${className}`}
    >
      <DiscordIcon />
      <span>Join the Discord</span>
    </a>
  );
}

// Homepage info bar above the maps grid: a solid, full-strength Discord-blurple
// surface (kept at full opacity — not tinted by the site theme). White logo +
// two-line label, and a white Join pill. The whole bar is the link.
export function DiscordBanner() {
  return (
    <a
      href={DISCORD_INVITE}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Join the peekabooR6 Discord (opens in new tab)"
      className="elev-sm group mx-auto flex w-[92%] max-w-md items-center gap-2 rounded-card bg-gradient-to-r from-[#47a294] to-[#3a877c] px-3 py-0.5 transition-[filter] duration-150 ease-out hover:brightness-95"
    >
      <span className="shrink-0 text-white">
        <DiscordIcon size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-semibold leading-none text-white">
          Join the peekabooR6 Discord server
        </div>
        <div className="mt-0.5 truncate text-[10px] font-normal leading-none text-white/80">
          Be the first to see new peeks
        </div>
      </div>
      <span className="inline-flex shrink-0 items-center justify-center rounded-btn bg-white px-2.5 py-0.5 text-xs font-semibold text-[#3f978b] transition-colors group-hover:bg-white/90">
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
