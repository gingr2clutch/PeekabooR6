import { supabaseAdmin } from "@/lib/supabase";

// Contributor identity resolution.
//
// The rule from migration 032: identity is resolved at APPROVAL, by a human,
// never at submission time. submitter_name is a free-text string a stranger
// typed into a public form — treating it as an identity is exactly how one
// person's credit ends up split across "Gingr", "gingr" and "Gingr " , and how
// somebody claims to be someone they are not. So nothing here runs
// automatically; every call sits behind an admin clicking Attach.

export type Contributor = {
  id: string;
  display_name: string;
  slug: string;
};

export function slugifyContributor(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .normalize("NFKD")
      // Strip combining marks so "Ubë" and "Ube" do not produce two slugs.
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "contributor"
  );
}

/** Visible contributors, for the admin picker's suggestion list. */
export async function listContributors(): Promise<Contributor[]> {
  const { data, error } = await supabaseAdmin()
    .from("contributors")
    .select("id, display_name, slug")
    .eq("is_hidden", false)
    .order("display_name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Contributor[];
}

/**
 * Case-insensitive lookup by display name.
 *
 * Deliberately compares in JS over the full list rather than with PostgREST
 * `ilike`. PostgREST passes the value straight through as a LIKE pattern with
 * no way to attach an ESCAPE clause, so a name containing `_`, `%` or `*` would
 * silently match rows it should not — and contributor names are attacker-chosen
 * text. The table is admin-scale, so reading it costs nothing.
 */
async function findByName(name: string): Promise<Contributor | null> {
  const target = name.trim().toLowerCase();
  if (!target) return null;

  const { data, error } = await supabaseAdmin()
    .from("contributors")
    .select("id, display_name, slug");
  if (error) throw error;

  return (
    ((data ?? []) as Contributor[]).find(
      (c) => c.display_name.trim().toLowerCase() === target
    ) ?? null
  );
}

/**
 * Resolves a display name to a contributor row, creating one if needed.
 *
 * Returns the row and whether it was just created, so the caller can tell the
 * admin which of the two happened — "attached to an existing contributor" and
 * "made a new one" are very different outcomes to confirm silently.
 *
 * Concurrency: the unique index on lower(display_name) is the real guarantee,
 * not the lookup above. Two approvals racing on the same new name means one
 * insert loses with 23505; that is caught and re-read rather than thrown, so
 * the loser attaches to the winner's row instead of failing.
 */
export async function resolveContributor(
  displayName: string
): Promise<{ contributor: Contributor; created: boolean }> {
  const name = displayName.trim().replace(/\s+/g, " ");
  if (!name) throw new Error("A contributor name is required.");
  if (name.length > 60) throw new Error("Contributor name is too long.");

  const existing = await findByName(name);
  if (existing) return { contributor: existing, created: false };

  const sb = supabaseAdmin();
  const base = slugifyContributor(name);

  // Slug collisions are separate from name collisions: "Gingr." and "Gingr!"
  // are different names that slugify identically. Walk suffixes until one
  // sticks. Bounded so a pathological case cannot spin.
  for (let attempt = 0; attempt < 25; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const { data, error } = await sb
      .from("contributors")
      .insert({ display_name: name, slug })
      .select("id, display_name, slug")
      .single();

    if (!error) return { contributor: data as Contributor, created: true };

    // 23505 is unique_violation. Which index tripped decides what to do:
    // the name index means somebody else created this contributor first, so
    // adopt theirs; the slug index just means try the next suffix.
    if (error.code !== "23505") throw error;

    const raced = await findByName(name);
    if (raced) return { contributor: raced, created: false };
  }

  throw new Error(`Could not find a free slug for "${name}".`);
}
