import { FlameBadge } from "./FlameBadge";
import { GemBadge } from "./GemBadge";
import { BeginnerBadge } from "./BeginnerBadge";

// One badge, max, per card — resolved in a fixed priority so a peek that
// qualifies for several never stacks them:
//   flame (top peek) > gem (underrated top-10) > beginner (easy + low risk).
// Pins reuse this too but only pass flame/gem (beginner is card-only), so the
// same priority holds there with beginner simply absent.
export function PeekBadge({
  isFlame,
  isGem,
  isBeginner,
  className,
}: {
  isFlame?: boolean;
  isGem?: boolean;
  isBeginner?: boolean;
  className?: string;
}) {
  if (isFlame) return <FlameBadge className={className} />;
  if (isGem) return <GemBadge className={className} />;
  if (isBeginner) return <BeginnerBadge className={className} />;
  return null;
}
