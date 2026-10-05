-- 0006_profiles_on_signup.sql — give every new auth user a profiles row (and therefore a role).
-- Why: 0004's RLS policies call current_app_role(), which reads profiles. A signed-in user with
-- no profile row has role NULL, so every policy denies. This trigger closes that trap.
-- Apply in the SQL editor AFTER 0001-0005, and BEFORE creating the user (so the trigger fires).
-- STATUS: written, not yet applied.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    coalesce(nullif(new.raw_user_meta_data ->> 'role', '')::public.app_role, 'owner')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- The role defaults to 'owner' (Ram is the principal). Change it deliberately for other users:
--   update public.profiles set role = 'sales' where id = '<user-uuid>';
--
-- If you already created a user BEFORE applying this migration, add their profile by hand:
--   insert into public.profiles (id, full_name, role)
--   select id, email, 'owner' from auth.users where email = '<your-email>'
--   on conflict (id) do nothing;
