-- Per-peek view counter. The public detail page fires a fire-and-forget RPC
-- on mount (debounced per session via sessionStorage). The RPC runs with
-- security definer so the anon role can call it without an UPDATE policy.

alter table peeks
  add column if not exists view_count integer not null default 0;

create or replace function increment_peek_views(peek_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update peeks
    set view_count = view_count + 1
    where id = peek_id;
end;
$$;

grant execute on function increment_peek_views(uuid) to anon;
grant execute on function increment_peek_views(uuid) to authenticated;
