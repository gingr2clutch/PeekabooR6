import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with peekabooR6.",
};

export default function ContactPage() {
  return (
    <>
      <PageHeader />
      <main className="fade-in-up mx-auto max-w-[700px] px-6 pb-20 pt-10">
        <h1 className="text-3xl font-semibold tracking-tight">Contact</h1>

        <div className="mt-6 space-y-5 text-[15px] leading-relaxed">
          <p>
            Found a peek that&apos;s out of date? Have one to submit? Spotted
            a bug or just want to say hi? Email us and we&apos;ll get back to
            you.
          </p>

          <p>
            <a
              href="mailto:contact@peekaboor6.com"
              className="text-brand hover:underline"
            >
              contact@peekaboor6.com
            </a>
          </p>
        </div>
      </main>
    </>
  );
}
