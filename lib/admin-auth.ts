// Helpers used by both the middleware (edge runtime) and server actions.
// Keep these dependency-free so they run anywhere.

export const ADMIN_COOKIE = "pkb_admin";
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Constant-time string compare. Avoids leaking equality through timing.
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function expectedCookieValue(
  password: string
): Promise<string> {
  return sha256Hex(`peekabooR6:${password}`);
}

export async function cookieIsValid(
  cookieValue: string | undefined,
  password: string | undefined
): Promise<boolean> {
  if (!cookieValue || !password) return false;
  const expected = await expectedCookieValue(password);
  return constantTimeEqual(cookieValue, expected);
}
