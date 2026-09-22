// Pass-through layout.
//
// This used to export `robots: { index: false, follow: false }` for the whole
// /gadgets tree, from when every row here was placeholder data. Chalet and
// Clubhouse now carry real setups with real clips, so a blanket noindex was
// suppressing the pages that have earned indexing along with the ones that have
// not.
//
// Indexing is now decided per page, by the only question that matters: does
// this page have a published setup behind it? Each of /gadgets/[map],
// /gadgets/[map]/[site] and .../[operator] answers it in its own
// generateMetadata and emits noindex,follow when the answer is no. Those routes
// are force-dynamic, so the answer is read live and the tag lifts on the next
// crawl after the first setup publishes — nothing to remember to undo.
//
// follow rather than nofollow throughout: the links are real and should still
// be crawled, so pages are discovered and ready the moment they have content.
//
// The layout stays because gadget routes may want shared chrome later; it
// simply asserts nothing about indexing now.
export default function GadgetsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
