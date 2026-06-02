import { supabaseAdmin } from "@/lib/supabase";
import type { Creator } from "@/lib/db";
import { CreatorsTable } from "./CreatorsTable";
import { GenerateCodeButton } from "./GenerateCodeButton";

export const dynamic = "force-dynamic";

async function loadCreators(): Promise<Creator[]> {
  const { data, error } = await supabaseAdmin()
    .from("creators")
    .select(
      "id, code, display_name, tiktok, bio, profile_image_url, claimed_at, approved_at, created_at"
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Creator[];
}

export default async function AdminCreatorsPage() {
  const creators = await loadCreators();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Creators</h1>
        <GenerateCodeButton />
      </div>
      <p className="text-sm text-muted">
        Generate a code and send it to the creator. They&apos;ll claim it via
        the signup form (phase 2), then you can approve them here.
      </p>
      <CreatorsTable creators={creators} />
    </div>
  );
}
