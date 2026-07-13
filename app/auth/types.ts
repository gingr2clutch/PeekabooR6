// Shared return shape for the auth server actions. Kept in its own module so
// both the "use server" actions file and the client forms can import it (a
// "use server" file may only export async functions).
export type AuthState = {
  error?: string;
  message?: string;
  // Email echoed back so the "check your email" screen and the resend button
  // know which address to use.
  email?: string;
  // Login failed specifically because the email isn't verified yet — the login
  // form uses this to offer a "resend verification" action instead of a plain
  // error.
  needsVerification?: boolean;
};
