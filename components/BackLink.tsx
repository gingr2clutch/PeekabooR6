"use client";

import { useRouter } from "next/navigation";

export function BackLink() {
  const router = useRouter();
  return (
    <div className="mb-4 sm:mb-6">
      <button
        type="button"
        onClick={() => router.back()}
        className="-ml-3 inline-flex items-center gap-2 rounded-btn px-3 py-2 text-base font-medium text-ink transition-colors duration-150 ease-out hover:bg-ink/[0.06] hover:text-brand"
      >
        <ArrowLeftIcon />
        <span>Back</span>
      </button>
    </div>
  );
}

function ArrowLeftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden
      className="fill-none stroke-current"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}
