import type { Metadata } from "next";
import { AdminListCard } from "../AdminCards";
import { AdminScreen } from "../AdminScreen";

export const metadata: Metadata = {
  title: "Tools",
  robots: { index: false, follow: false },
};

// Low-frequency screens, kept off the hub so the six things you actually open
// every day are not diluted by the two you open every few weeks.
//
// This is also how /admin/live stops being unreachable. It was never in the old
// nav bar and nothing linked to it, so it could only be opened by typing the
// URL from memory.

export default function AdminToolsPage() {
  return (
    <AdminScreen
      title="Tools"
      back={{ href: "/admin/home", label: "Admin" }}
      subtitle="Occasional jobs."
    >
      <div className="space-y-3">
        <AdminListCard
          href="/admin/contributors"
          title="Contributors"
          meta="Rename, merge duplicates, hide someone from the leaderboard"
        />
        <AdminListCard
          href="/admin/copy"
          title="Copy cleanup"
          meta="Every peek's instructions and tip on one page, edited in place"
        />
        <AdminListCard
          href="/admin/live"
          title="Live traffic"
          meta="Page views, refreshed every 5 seconds"
        />
      </div>
    </AdminScreen>
  );
}
