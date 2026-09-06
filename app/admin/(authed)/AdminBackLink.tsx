import Link from "next/link";

// One back link, used by every screen that is not the hub.
//
// Extracted so the removal of AdminNav cannot strand a screen: if a page has no
// back link it has no way up, because the header no longer carries navigation.
// AdminScreen renders this for the screens it wraps; screens with bespoke
// layouts render it directly.
export function AdminBackLink({
  href = "/admin/home",
  label = "Admin",
  accent = "brand",
}: {
  href?: string;
  label?: string;
  accent?: "brand" | "blue";
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1 text-sm font-medium text-muted transition-colors ${
        accent === "blue" ? "hover:text-blue" : "hover:text-brand"
      }`}
    >
      <span aria-hidden>←</span> {label}
    </Link>
  );
}
