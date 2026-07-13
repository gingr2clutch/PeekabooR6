export const NEW_PEEK_WINDOW_DAYS = 7;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function isPeekNew(createdAt: string, now: Date = new Date()): boolean {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  const diffMs = now.getTime() - created;
  return diffMs >= 0 && diffMs < NEW_PEEK_WINDOW_DAYS * ONE_DAY_MS;
}

// Rolling-day bucketed label used on the /whats-new feed.
//   0-6 days   → "This week"
//   7-13 days  → "Last week"
//   14-27 days → "N weeks ago"
//   28-364     → "N months ago" (28 days reads as 1 month so we don't
//                 fall through to a 0-month edge case)
//   365+       → "N years ago"
export function weeklyBucket(
  createdAt: string,
  now: Date = new Date()
): string {
  const createdMs = new Date(createdAt).getTime();
  if (Number.isNaN(createdMs)) return "";

  const days = Math.max(
    0,
    Math.floor((now.getTime() - createdMs) / 86_400_000)
  );

  if (days < 7) return "This week";
  if (days < 14) return "Last week";
  if (days < 28) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) {
    const months = Math.max(1, Math.floor(days / 30));
    return months === 1 ? "1 month ago" : `${months} months ago`;
  }
  const years = Math.floor(days / 365);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}
