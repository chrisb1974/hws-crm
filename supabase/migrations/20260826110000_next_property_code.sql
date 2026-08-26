-- =====================================================================
-- CRM HWS — generateur de code pour les etablissements crees depuis l'app
-- (migrate.py utilisait un simple compteur Python, pas de sequence Postgres)
-- =====================================================================

create or replace function next_property_code()
returns text
language sql
security definer
set search_path = public
as $$
  select 'HWS-' || lpad(
    (coalesce(max(substring(code from 5))::int, 0) + 1)::text, 5, '0'
  )
  from property
  where code ~ '^HWS-[0-9]+$';
$$;

revoke execute on function next_property_code() from public;
grant execute on function next_property_code() to authenticated;
