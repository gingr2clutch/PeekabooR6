import { FlameBadge } from "./FlameBadge";
import { GemBadge } from "./GemBadge";
import { BeginnerBadge } from "./BeginnerBadge";

// Every badge a peek earns, shown in a small even-gapped row in a FIXED order —
// flame, gem, beginner — so the layout is consistent no matter which combo a
// peek has. Cards use this; pins use PeekBadge (one badge max, no room for a
// row). Renders nothing when a peek earns none.
export function PeekBadgeRow({
  isFlame,
  isGem,
  isBeginner,
  className = "h-5 w-5",
}: {
  isFlame?: boolean;
  isGem?: boolean;
  isBeginner?: boolean;
  className?: string;
}) {
  if (!isFlame && !isGem && !isBeginner) return null;
  return (
    <span className="inline-flex items-center gap-1">
      {isFlame && <FlameBadge className={className} />}
      {isGem && <GemBadge className={className} />}
      {isBeginner && <BeginnerBadge className={className} />}
    </span>
  );
}
