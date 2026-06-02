import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { ClaimForm } from "@/components/ClaimForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Claim your creator code",
  description:
    "Got a peekabooR6 creator code? Claim it here to set up your profile.",
};

export default function ClaimPage() {
  return (
    <>
      <PageHeader />
      <main className="fade-in-up mx-auto max-w-2xl px-6 pb-20 pt-10">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">
            Claim your creator code
          </h1>
          <p className="mt-2 text-muted">
            Got a code from us? Enter it below to set up your creator profile.
          </p>
        </div>
        <ClaimForm />
      </main>
    </>
  );
}
