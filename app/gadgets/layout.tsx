import type { Metadata } from "next";

// noindex for the whole /gadgets tree while the data is placeholder.
//
// Set here rather than on each page so it covers every current route and any
// gadget route added later. Next merges metadata down the tree: the pages below
// define title/description but no `robots`, so they inherit this. Removing the
// export is the single switch to flip when real data lands.
//
// The sitemap does not list these routes either, so nothing is being submitted
// for indexing at the same time as being told not to index.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Pass-through: this exists only to carry the metadata above.
export default function GadgetsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
