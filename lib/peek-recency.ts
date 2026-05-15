export const NEW_PEEK_WINDOW_DAYS = 7;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function isPeekNew(createdAt: string, now: Date = new Date()): boolean {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  const diffMs = now.getTime() - created;
  return diffMs >= 0 && diffMs < NEW_PEEK_WINDOW_DAYS * ONE_DAY_MS;
}

// Calendar-week bucketed label used on the /whats-new feed. "This week"
// matches what people mean colloquially (since the most recent Monday),
// not a rolling 7-day window. 2-3 weeks ago stay in week units, 4+ weeks
// roll up to months (and then years), measured against actual elapsed
// time so we don't get "0 months ago" near a month boundary.
export function weeklyBucket(
  createdAt: string,
  now: Date = new Date()
): string {
  const created = new Date(createdAt);
  const createdMs = created.getTime();
  if (Number.isNaN(createdMs)) return "";

  const sow = startOfIsoWeek(now);
  if (createdMs >= sow.getTime()) return "This week";

  const lastSow = new Date(sow.getTime() - 7 * 86_400_000);
  if (createdMs >= lastSow.getTime()) return "Last week";

  const createdSow = startOfIsoWeek(created);
  const weeksAgo = Math.round(
    (sow.getTime() - createdSow.getTime()) / (7 * 86_400_000)
  );
  if (weeksAgo <= 3) return `${weeksAgo} weeks ago`;

  const totalDays = (now.getTime() - createdMs) / 86_400_000;
  if (totalDays < 365.25) {
    const months = Math.max(1, Math.floor(totalDays / 30.44));
    return months === 1 ? "1 month ago" : `${months} months ago`;
  }
  const years = Math.floor(totalDays / 365.25);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

function startOfIsoWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  // 0 = Sunday … 6 = Saturday. Roll back to Monday.
  const daysSinceMonday = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - daysSinceMonday);
  return x;
}

// Compact relative-time string ("just now", "3h ago", "5d ago", "2w ago", ...)
// suitable for badges where space is tight.
export function relativeAgo(createdAt: string, now: Date = new Date()): string {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return "";
  const diffMs = Math.max(0, now.getTime() - created);
  const minutes = diffMs / 60000;
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${Math.floor(minutes)}m ago`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  const days = hours / 24;
  if (days < 7) return `${Math.floor(days)}d ago`;
  const weeks = days / 7;
  if (weeks < 4.34) return `${Math.floor(weeks)}w ago`;
  const months = days / 30.44;
  if (months < 12) return `${Math.floor(months)}mo ago`;
  return `${Math.floor(days / 365.25)}y ago`;
}
