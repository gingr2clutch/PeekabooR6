import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string;
  isPro: boolean;
};

// The signed-in user (or null), plus their Pro flag. Reads is_pro defensively:
// if the profiles table isn't migrated yet (db/migrations/022_profiles.sql),
// Pro simply reads false and the whole site keeps working — Pro "lights up"
// the moment that migration is applied. Stripe's webhook will flip is_pro
// server-side (service role) later.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  let isPro = false;
  const { data, error } = await supabase
    .from("profiles")
    .select("is_pro")
    .eq("id", user.id)
    .maybeSingle();
  if (!error && data) isPro = !!data.is_pro;

  return { id: user.id, email: user.email ?? "", isPro };
}
