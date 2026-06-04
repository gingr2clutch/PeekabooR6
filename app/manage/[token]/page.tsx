import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { CreatorManageForm } from "@/components/CreatorManageForm";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Crawlers should never index a manage URL. Defence in depth — the
// token itself is the secret, but no need to help discover-bots.
export const metadata: Metadata = {
  title: "Manage profile",
  robots: { index: false, follow: false },
};

type InitialProfile = {
  display_name: string | null;
  tiktok: string | null;
  bio: string | null;
  profile_image_url: string | null;
  rank: string | null;
  region: string | null;
  platform: string | null;
  youtube_url: string | null;
  twitch_url: string | null;
  x_url: string | null;
};

export default async function ManagePage({
  params,
}: {
  params: { token: string };
}) {
  const token = (params.token ?? "").trim();

  // Cheap sanity bound before hitting the DB. Our minted tokens are 32
  // base64url chars; backfilled tokens are 48 hex chars. Anything wildly
  // outside that range is a misuse.
  if (!token || token.length < 16 || token.length > 128) {
    return <InvalidLink />;
  }

  const { data, error } = await supabaseAdmin()
    .from("creators")
    .select(
      "claimed_at, display_name, tiktok, bio, profile_image_url, rank, region, platform, youtube_url, twitch_url, x_url"
    )
    .eq("manage_token", token)
    .maybeSingle();

  if (error || !data || !data.claimed_at) {
    return <InvalidLink />;
  }

  const initial: InitialProfile = {
    display_name: data.display_name,
    tiktok: data.tiktok,
    bio: data.bio,
    profile_image_url: data.profile_image_url,
    rank: data.rank,
    region: data.region,
    platform: data.platform,
    youtube_url: data.youtube_url,
    twitch_url: data.twitch_url,
    x_url: data.x_url,
  };

  return (
    <>
      <PageHeader />
      <main className="fade-in-up mx-auto max-w-2xl px-6 pb-20 pt-10">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">
            Manage your profile
          </h1>
          <p className="mt-2 text-muted">
            Update any field below. Bookmark this page — it&apos;s the only
            way back in.
          </p>
        </div>
        <CreatorManageForm token={token} initial={initial} />
      </main>
    </>
  );
}

function InvalidLink() {
  return (
    <>
      <PageHeader />
      <main className="fade-in-up mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          Manage link not found
        </h1>
        <p className="mt-3 text-muted">
          This link doesn&apos;t match any creator profile. Double-check the
          URL — manage links are case-sensitive.
        </p>
        <Link
          href="/creators"
          className="mt-8 rounded-btn bg-ink px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand"
        >
          Back to creators
        </Link>
      </main>
    </>
  );
}
