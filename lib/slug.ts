import { supabaseAdmin } from "./supabase";

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(s: string): boolean {
  return UUID_RE.test(s);
}

// Build the canonical base slug for a peek: map slug + kebab(name). Falls
// back to "peek" when the name has no alphanumeric characters.
export function buildBasePeekSlug(mapSlug: string, peekName: string): string {
  const nameSlug = slugify(peekName) || "peek";
  return `${mapSlug}-${nameSlug}`;
}

// Returns base, or base-2, base-3, ... such that no row (other than
// excludeId, if given) currently uses that slug.
export async function ensureUniquePeekSlug(
  base: string,
  excludeId?: string
): Promise<string> {
  const sb = supabaseAdmin();
  let candidate = base;
  for (let n = 2; n < 200; n++) {
    let q = sb.from("peeks").select("id").eq("slug", candidate).limit(1);
    if (excludeId) q = q.neq("id", excludeId);
    const { data, error } = await q;
    if (error) throw error;
    if (!data || data.length === 0) return candidate;
    candidate = `${base}-${n}`;
  }
  throw new Error(`Could not find a free slug starting with "${base}"`);
}
