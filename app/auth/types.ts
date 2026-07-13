// Shared return shape for the auth server actions. Kept in its own module so
// both the "use server" actions file and the client forms can import it (a
// "use server" file may only export async functions).
export type AuthState = {
  error?: string;
  message?: string;
};
