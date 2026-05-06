import { Analytics } from "@vercel/analytics/react";

// Admin-only layout. Mounts Vercel Web Analytics so admin sessions are
// tracked (login + every authed page) without instrumenting the public
// site. Public pages render under the root layout where Analytics is not
// included.
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <Analytics />
    </>
  );
}
