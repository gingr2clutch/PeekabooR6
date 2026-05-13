-- 012_peeks_slug.sql
-- Add a human-readable slug to peeks. Slugs are unique and stable enough to
-- live in URLs (/peeks/oregon-construction-roof instead of /peeks/<uuid>).
-- Backfill is deterministic: lowercase kebab of the peek name, prefixed with
-- the map slug. Collisions get a -2, -3, ... suffix.

alter table peeks
  add column if not exists slug text;

-- Backfill in one pass. ROW_NUMBER over the computed base slug gives every
-- duplicate a stable order, and the first occurrence keeps the bare slug
-- while the rest get -2, -3, ... appended.
with computed as (
  select
    p.id,
    base_slug,
    row_number() over (
      partition by base_slug
      order by p.created_at, p.id
    ) as rn
  from peeks p
  join floors f on f.id = p.floor_id
  join maps m on m.id = f.map_id
  cross join lateral (
    select
      m.slug || '-' || trim(
        both '-' from
        lower(regexp_replace(p.name, '[^a-zA-Z0-9]+', '-', 'g'))
      ) as base_slug
  ) s
)
update peeks p
set slug = case
  when c.rn = 1 then c.base_slug
  else c.base_slug || '-' || c.rn
end
from computed c
where p.id = c.id
  and p.slug is null;

alter table peeks
  alter column slug set not null;

create unique index if not exists peeks_slug_unique
  on peeks (slug);
