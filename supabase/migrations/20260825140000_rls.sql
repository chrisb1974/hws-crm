-- =====================================================================
-- CRM HWS — Row Level Security
-- README, "Ce qui reste a faire", point 6 : "a poser avec l'authentification,
-- avant tout acces applicatif". Authentification confirmee : Supabase Auth,
-- un compte par membre d'equipe, email professionnel.
--
-- Modele : 3 roles, deja presents dans le schema (field_definition.visible_roles
-- vaut par defaut '{admin,sales,support}') :
--   admin   — tout, y compris l'ecriture sur les referentiels.
--   sales   — lecture + ecriture sur les donnees metier, pas sur les referentiels.
--   support — lecture seule partout.
-- Aucune restriction par ligne (sales_owner/csm_owner ne sont pas encore
-- renseignes dans les donnees chargees) : a affiner plus tard si besoin.
--
-- Les migrations et les fonctions SECURITY DEFINER tournent comme owner de
-- table (postgres) : RLS est activee (enable), jamais forcee (no FORCE ROW
-- LEVEL SECURITY), pour que gosiyaha_write_back() et l'integration Apps
-- Script (compat_gosiyaha.sql, section 7, encore en commentaire) continuent
-- de fonctionner sans changement le jour ou elles seront branchees.
-- =====================================================================

create type app_role as enum ('admin','sales','support');

create table app_user (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role app_role not null default 'support',   -- moindre privilege ; l'admin promeut ensuite
  active boolean not null default true,
  created_at timestamptz default now()
);

-- Cree automatiquement la ligne app_user au premier login d'un compte Auth
-- (invite via le dashboard Supabase, email professionnel). Role de depart
-- 'support' : c'est a un admin de promouvoir en 'sales' ou 'admin' ensuite.
create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into app_user (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();

-- SECURITY DEFINER + search_path fixe : lit app_user sans etre soumise a la
-- RLS d'app_user elle-meme (sinon recursion). Pattern standard Supabase.
create or replace function current_app_role()
returns app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from app_user where id = auth.uid() and active;
$$;

create or replace function is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from app_user where id = auth.uid() and active);
$$;

-- ---------------------------------------------------------------------
-- app_user : chacun voit sa propre ligne, l'admin voit et ecrit tout.
-- Personne (meme sales) ne peut se promouvoir soi-meme via l'API.
-- ---------------------------------------------------------------------
alter table app_user enable row level security;

create policy app_user_select on app_user for select
  to authenticated
  using (id = auth.uid() or current_app_role() = 'admin');

create policy app_user_admin_write on app_user for all
  to authenticated
  using (current_app_role() = 'admin')
  with check (current_app_role() = 'admin');

-- ---------------------------------------------------------------------
-- Referentiels : lecture pour tout compte actif, ecriture admin seule.
-- ---------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'billing_entity','territory','city','vendor','product','plan',
    'jira_status','jira_status_alias','churn_reason','document_type',
    'contact_role','project','field_definition','integration','zoho_field_map'
  ]
  loop
    execute format('alter table %I enable row level security;', t);
    execute format(
      'create policy %I_read on %I for select to authenticated using (is_active_staff());',
      t, t);
    execute format(
      'create policy %I_admin_write on %I for all to authenticated using (current_app_role() = ''admin'') with check (current_app_role() = ''admin'');',
      t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Donnees metier : lecture pour tout compte actif, ecriture admin+sales.
-- support reste lecture seule (aucune policy insert/update/delete pour lui).
-- ---------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'legal_entity','hotel_group','billing_account','property','external_id',
    'contact','subscription','subscription_billing_snapshot','project_membership',
    'gosiyaha_dossier','gosiyaha_action','gosiyaha_prerequisite','document',
    'generation_run'
  ]
  loop
    execute format('alter table %I enable row level security;', t);
    execute format(
      'create policy %I_read on %I for select to authenticated using (is_active_staff());',
      t, t);
    execute format(
      'create policy %I_write on %I for all to authenticated using (current_app_role() in (''admin'',''sales'')) with check (current_app_role() in (''admin'',''sales''));',
      t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- audit_log : journal immuable. admin+sales peuvent y ecrire (insert
-- seulement — pas de policy update/delete, donc personne ne peut l'alterer
-- via l'API), seul admin le consulte.
-- ---------------------------------------------------------------------
alter table audit_log enable row level security;

create policy audit_log_select_admin on audit_log for select
  to authenticated
  using (current_app_role() = 'admin');

create policy audit_log_insert on audit_log for insert
  to authenticated
  with check (current_app_role() in ('admin','sales'));

-- ---------------------------------------------------------------------
-- Vues destinees a un futur acces applicatif direct : security_invoker
-- pour que la RLS des tables sous-jacentes s'applique au role de l'appelant,
-- pas a celui du proprietaire de la vue (comportement par defaut Postgres).
-- v_gosiyaha_record / v_gosiyaha_ready restent au comportement par defaut :
-- elles sont la surface de l'integration Apps Script (compat_gosiyaha.sql),
-- pas un ecran staff.
-- ---------------------------------------------------------------------
alter view v_property_stack set (security_invoker = true);
alter view v_property_api set (security_invoker = true);
alter view v_gosiyaha_livrables set (security_invoker = true);
