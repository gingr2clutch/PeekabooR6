import type { Metadata } from "next";
import { AuthShell } from "@/components/AuthShell";
import { ResetPasswordForm } from "@/components/AuthForms";

export const metadata: Metadata = {
  title: "Set a new password",
  robots: { index: false, follow: false },
};

// Reached via the emailed reset link → /auth/callback (which exchanges the code
// and establishes a session) → here. The form calls updateUser({ password }).
export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Set a new password"
      subtitle="Choose a new password for your account."
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
