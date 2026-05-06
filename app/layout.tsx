import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "peekabooR6 — Rainbow Six spawn peek database",
    template: "%s — peekabooR6",
  },
  description:
    "Community library of spawn peek locations for Rainbow Six Siege. Pick a map, pick a floor, see every peek.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg text-ink">
        {children}
        <Analytics
          beforeSend={(event) => {
            // Drop admin sessions so the dashboard reflects real visitors.
            if (event.url.includes("/admin")) return null;
            return event;
          }}
        />
      </body>
    </html>
  );
}
