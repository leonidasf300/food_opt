-- profiles.id references auth.users(id), but nothing ever created the profiles row --
-- every write that depends on it (preferences, user_nutrient_targets, recipes) failed
-- with a foreign key violation for a brand new user. Auto-create it on signup, the
-- standard Supabase pattern: a SECURITY DEFINER function (bypasses RLS, since the
-- new user has no session yet at insert time) fired by a trigger on auth.users.

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: the trigger only covers new signups going forward. Anyone who signed up
-- before this migration (e.g. during testing) still has no profiles row.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;
