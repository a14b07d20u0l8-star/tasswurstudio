
create or replace function public.update_updated_at_column()
returns trigger language plpgsql
set search_path = public
as $$
begin new.updated_at = now(); return new; end;
$$;

revoke execute on function public.increment_visitor() from public;
grant execute on function public.increment_visitor() to anon, authenticated;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
