-- =====================================================================
-- CRM HWS — schema Supabase / Postgres
-- Phase 0-2 : noyau, stack, projets, Go Siyaha, extensibilite
-- Convention : api_name anglais, snake_case, jamais renomme.
-- =====================================================================

create extension if not exists "pgcrypto";
create extension if not exists "unaccent";

-- unaccent() est STABLE (pas IMMUTABLE) dans l'extension standard : une colonne
-- "generated always as" avec unaccent() echoue au create table (42P17). Wrapper
-- IMMUTABLE standard pour debloquer name_normalized / legal_name_normalized.
create or replace function immutable_unaccent(text)
returns text
language sql
immutable
parallel safe
as $$
  select unaccent('unaccent', $1)
$$;

-- ------------------------- ENUMS -------------------------------------
create type stack_role        as enum ('PMS','CM','BE','SITE','PAYMENT','ADDON','SERVICE');
create type hws_stance        as enum ('offer','competitor','coexist');
create type sub_status        as enum ('prospect','trial','active','suspended','terminated','migrated');
create type lifecycle_status  as enum ('prospect','onboarding','active','suspended','churned','program_only');
create type membership_status as enum ('member','prospect','left');
create type gs_action_type    as enum ('TGS03','TGS04','EOS01');
create type field_storage     as enum ('column','jsonb');

-- ------------------------- REFERENTIELS ------------------------------
create table billing_entity (
  code             text primary key,            -- 'HWS_MA' | 'HWS_ES'
  legal_name       text not null,
  default_currency char(3) not null,
  invoice_prefix   text,
  notes            text
);

create table territory (
  code text primary key, label_fr text, label_en text, country char(2)
);

create table city (
  id serial primary key,
  name text not null,
  country char(2) not null,
  name_normalized text generated always as (lower(immutable_unaccent(name))) stored,
  unique (name_normalized, country)
);

create table vendor (
  code text primary key,                        -- 'hotelrunner'
  name text not null,
  is_partner boolean default false,             -- HWS a un contrat de revente
  extranet_url_template text
);

create table product (
  id serial primary key,
  vendor_code text not null references vendor(code),
  code text not null,                           -- 'channel_manager'
  name text not null,
  stance hws_stance not null default 'offer',
  unique (vendor_code, code)
);

-- Un plan = une offre commerciale datee. PMC -> Sell/Complete/Manage, SM -> SM+.
create table plan (
  id serial primary key,
  product_id int not null references product(id),
  code text not null,                           -- 'PMC' | 'SELL' | 'SM_PLUS'
  name text not null,
  roles_covered stack_role[] not null,          -- SM+ = '{CM,BE}'
  billing_unit text not null default 'licence', -- licence | room | flat | pct_revenue | tier
  valid_from date, valid_to date,
  stance_override hws_stance,
  superseded_by int references plan(id),
  unique (product_id, code)
);

create table jira_status (
  code text primary key,                        -- '02', '22.6'
  label text not null,
  phase smallint check (phase between 1 and 7),
  responsible text check (responsible in ('HWS','MAROCPME','HOTEL')),
  stall_alert_days smallint default 14,
  is_terminal boolean default false
);

-- Toute valeur brute rencontree pointe vers un statut propre (U+2060 & co).
create table jira_status_alias (
  raw_value   text primary key,
  status_code text not null references jira_status(code)
);

create table churn_reason (
  code text primary key, label_fr text, label_en text, counts_as_churn boolean default true
);

create table document_type (
  code text primary key, label_fr text, label_en text, blocks_deliverable boolean default false
);

create table contact_role (
  code text primary key, label_fr text, label_en text
);

create table project (
  id serial primary key,
  code text unique not null,                    -- 'MGH_MARRAKECH'
  name text not null,
  type text not null,                           -- association|convention|institutionnel|campagne
  partner_org text, country char(2), city text,
  owner_user uuid, starts_on date, ends_on date,
  status text default 'active'
);

-- ------------------------- NOYAU -------------------------------------
create table legal_entity (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  legal_name_normalized text generated always as (lower(immutable_unaccent(legal_name))) stored,
  rc_number text, rc_date date, rc_activity text,
  ice text, tax_id text,
  capital numeric, capital_currency char(3),
  headcount int, founded_on date,
  address text, city text, country char(2),
  shareholding text, director_profile text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create unique index on legal_entity (legal_name_normalized, country);

create table hotel_group (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  legal_entity_id uuid references legal_entity(id),
  notes text
);

create table billing_account (
  id uuid primary key default gen_random_uuid(),
  legal_entity_id uuid references legal_entity(id),
  billing_entity_code text not null references billing_entity(code),
  currency char(3) not null,
  payment_terms text,
  zoho_books_id text
);

create table property (
  id uuid primary key default gen_random_uuid(),
  code text unique,                             -- HWS-00417
  name text not null,
  name_normalized text,
  legal_entity_id uuid references legal_entity(id),
  group_id uuid references hotel_group(id),
  logo_url text,

  country char(2), city text, address text,
  latitude numeric(9,6), longitude numeric(9,6),
  territory_code text references territory(code),

  property_type text, star_rating text, official_classification text,
  rooms_total int, rooms_online int,
  opening_date date, description text, facilities text,

  website text, booking_engine_url text, google_place_id text,
  online_presence_score int, online_presence_date date,

  lifecycle_status lifecycle_status not null default 'prospect',
  sales_owner uuid, csm_owner uuid,
  billing_account_id uuid references billing_account(id),
  billing_entity_code text references billing_entity(code),  -- saisi, jamais deduit du pays
  support_language char(2), support_whatsapp text,

  stack_surveyed_at date,                       -- sans releve : role sans ligne = INCONNU
  data_owner uuid,
  merged_into uuid references property(id),
  custom_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create index on property (name_normalized);
create index on property (lifecycle_status);
create index on property using gin (custom_fields);

-- LA table qui resout le probleme 136/192 et 14/224.
create table external_id (
  id bigserial primary key,
  property_id uuid references property(id) on delete cascade,
  legal_entity_id uuid references legal_entity(id) on delete cascade,
  system text not null,        -- hotelrunner|zoho_crm|zoho_books|jisr|mgh|simple_booking|siteminder|centra
  value text not null,
  url text,
  verified_at timestamptz, verified_by uuid,
  unique (system, value),
  check (num_nonnulls(property_id, legal_entity_id) = 1)
);
create index on external_id (property_id);

create table contact (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references property(id) on delete cascade,
  legal_entity_id uuid references legal_entity(id) on delete cascade,
  full_name text, email text, phone text, whatsapp text,
  job_title text, language char(2),
  roles text[] default '{}',
  is_primary boolean default false,
  receives_alerts boolean default false
);
create index on contact (property_id);

-- ------------------------- ABONNEMENTS -------------------------------
create table subscription (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references property(id) on delete cascade,
  plan_id int references plan(id),
  vendor_code text references vendor(code),     -- stack constate sans plan connu
  role stack_role not null,
  status sub_status not null default 'active',
  is_hws_offer_override boolean,

  activation_date date, renewal_date date,
  commitment_months int, notice_days int,
  notice_deadline date generated always as (renewal_date - coalesce(notice_days,0)) stored,
  termination_date date,
  churn_reason_code text references churn_reason(code),
  replaced_by_subscription_id uuid references subscription(id),

  sale_price numeric, sale_currency char(3),
  vendor_cost numeric, vendor_currency char(3),
  billing_frequency text, billing_unit text,
  pricing_cohort text,
  funded_by text,                               -- direct|TGS03|TGS04|CNT|offert
  subsidy_end_date date,

  onboarding_status text,
  vendor_account_ref text,
  reconciliation_flag text default 'ok',
  source_note text,
  created_at timestamptz default now()
);
create index on subscription (property_id, role);
create index on subscription (renewal_date) where status = 'active';

-- rooms_at_billing : snapshot a l'emission, jamais recalcule
create table subscription_billing_snapshot (
  id bigserial primary key,
  subscription_id uuid not null references subscription(id) on delete cascade,
  issued_on date not null,
  rooms_at_billing int,
  amount numeric, currency char(3),
  plan_id int references plan(id),
  external_invoice_ref text
);

-- ------------------------- PROJETS -----------------------------------
create table project_membership (
  id bigserial primary key,
  property_id uuid not null references property(id) on delete cascade,
  project_id int not null references project(id) on delete cascade,
  status membership_status not null default 'member',
  since date, until date, source text,
  attributes jsonb not null default '{}'::jsonb,
  unique (property_id, project_id)
);

-- ------------------------- GO SIYAHA ---------------------------------
create table gosiyaha_dossier (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references property(id),
  legal_entity_id uuid references legal_entity(id),
  code text,                                    -- 'Go Siyaha Name'
  owner_user uuid,
  data jsonb not null default '{}'::jsonb,      -- les 147 colonnes, noms d'origine
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create index on gosiyaha_dossier (property_id);
create index on gosiyaha_dossier using gin (data);

create table gosiyaha_action (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references gosiyaha_dossier(id) on delete cascade,
  action_type gs_action_type not null,
  market_number text,
  jira_status_code text references jira_status(code),
  jira_status_changed_at date,
  phase smallint,
  amount numeric, currency char(3),
  invoice_10_number text, invoice_10_amount numeric, invoice_10_paid_on date,
  invoice_90_number text, invoice_90_amount numeric, invoice_90_paid_on date,
  cancelled boolean default false
);
create index on gosiyaha_action (jira_status_code);

-- Prerequis bloquants : le bouton "Generer les livrables" lit cette table.
create table gosiyaha_prerequisite (
  id bigserial primary key,
  action_id uuid not null references gosiyaha_action(id) on delete cascade,
  code text not null,                           -- logo | signatory | ice | pv_recette
  label text not null,
  satisfied boolean not null default false,
  satisfied_at timestamptz,
  unique (action_id, code)
);

-- ------------------------- DOCUMENTS ---------------------------------
create table document (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references property(id) on delete cascade,
  dossier_id uuid references gosiyaha_dossier(id) on delete cascade,
  type_code text references document_type(code),
  drive_url text, filename text,
  uploaded_at timestamptz default now(), expires_at date, validated_by uuid
);

-- ------------------------- EXTENSIBILITE -----------------------------
create table field_definition (
  id serial primary key,
  entity text not null,                         -- property | subscription | gosiyaha_dossier
  api_name text not null,                       -- anglais, immuable
  label_fr text, label_en text,
  type text not null,
  options jsonb, ref_entity text,
  required boolean default false,
  section text, sort_order int,
  visible_roles text[] default '{admin,sales,support}',
  expose_api boolean default true,
  storage field_storage not null default 'jsonb',
  gosiyaha_phase smallint,                      -- pilote le repli par phase du formulaire
  consumed_by_script boolean default false,     -- api_name a ne JAMAIS changer
  deprecated_at timestamptz, replaced_by text,
  unique (entity, api_name)
);

create table integration (
  id serial primary key,
  code text unique not null,                    -- 'google_scripts_livrables'
  name text not null,
  db_role text not null,
  allowed_views text[] not null,
  can_write boolean default false,
  last_call_at timestamptz,
  active boolean default true
);

create table audit_log (
  id bigserial primary key,
  entity text not null, entity_id uuid,
  action text not null, changed_by uuid,
  before jsonb, after jsonb,
  at timestamptz default now()
);
create index on audit_log (entity, entity_id);

-- ------------------------- VUES --------------------------------------
-- Compatibilite : les scripts Google Apps ne sont PAS modifies.
create view v_gosiyaha_livrables as
select p.code                            as "Code HWS",
       d.data->>'Go Siyaha Name'         as "Go Siyaha Name",
       d.data->>'Go Siyaha Account'      as "Go Siyaha Account",
       d.data->>'Status Jira'            as "Status Jira",
       d.data->>'Nº de Marché MarocPME'  as "Nº de Marché MarocPME",
       d.data->>'Nom Societe RC'         as "Nom Societe RC",
       d.data->>'Nom Signataire'         as "Nom Signataire",
       d.data->>'Montant du Devis'       as "Montant du Devis",
       d.data                            as "_raw"
from gosiyaha_dossier d
left join property p on p.id = d.property_id;
comment on view v_gosiyaha_livrables is
  'Vue de compatibilite : noms de colonnes Zoho, ne jamais renommer. A completer avec les colonnes exactes consommees par les scripts Google Apps.';

-- Etat du stack, avec la distinction AUCUN / INCONNU.
create view v_property_stack as
with roles as (select unnest(enum_range(null::stack_role)) as role)
select p.id as property_id, p.code, p.name, r.role,
       s.id as subscription_id, s.status,
       coalesce(v.name, s.vendor_code) as vendor, pl.name as plan,
       case when s.id is not null then 'filled'
            when p.stack_surveyed_at is not null then 'none'
            else 'unknown' end as role_state
from property p
cross join roles r
left join subscription s on s.property_id = p.id and s.role = r.role
     and s.status in ('active','trial','suspended')
left join plan pl on pl.id = s.plan_id
left join product pr on pr.id = pl.product_id
left join vendor v on v.code = coalesce(pr.vendor_code, s.vendor_code);

create view v_property_api as
select p.id, p.code, p.name, p.city, p.country, p.property_type, p.star_rating,
       p.rooms_total, p.website, p.lifecycle_status, p.billing_entity_code,
       le.legal_name, g.name as group_name,
       exists (select 1 from subscription s
               left join plan pl on pl.id = s.plan_id
               left join product pr on pr.id = pl.product_id
               where s.property_id = p.id and s.status = 'active'
                 and coalesce(s.is_hws_offer_override, pr.stance = 'offer', false)) as is_active_client
from property p
left join legal_entity le on le.id = p.legal_entity_id
left join hotel_group g on g.id = p.group_id
where p.merged_into is null;
