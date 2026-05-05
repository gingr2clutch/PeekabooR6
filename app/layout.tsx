import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "peekabooR6 — spawn peek library for Rainbow Six Siege",
  description:
    "Community library of spawn peek locations for Rainbow Six Siege. Pick a map, pick a floor, see every peek.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg text-ink">{children}</body>
    </html>
  );
}
