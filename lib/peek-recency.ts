export const NEW_PEEK_WINDOW_DAYS = 7;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function isPeekNew(createdAt: string, now: Date = new Date()): boolean {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  const diffMs = now.getTime() - created;
  return diffMs >= 0 && diffMs < NEW_PEEK_WINDOW_DAYS * ONE_DAY_MS;
}
