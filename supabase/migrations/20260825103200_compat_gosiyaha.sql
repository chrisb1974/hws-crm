-- =====================================================================
-- Couche de compatibilite pour les scripts Google Apps de livrables
-- (TGS03 v5, TGS03 « doc a presigner », TGS04 v3, Rapport d'Opportunite)
--
-- Constat : ces scripts ne lisent PAS une liste de colonnes. Ils recuperent
-- l'integralite du dossier et remplacent tout {{Nom_API}} present dans les
-- templates. Une vue a colonnes figees ne peut donc pas les servir.
-- Ils ont besoin de QUATRE choses, reproduites ici :
--   1. lire un dossier complet, clefs = noms d'API Zoho
--   2. chercher les dossiers dont une case a cocher est vraie
--   3. lister et telecharger les pieces jointes (le logo)
--   4. ecrire en retour l'URL du dossier genere (anti-doublon)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. La correspondance libelle <-> nom d'API. NON DERIVABLE : un nom d'API
--    Zoho est fige a la creation du champ et ne suit pas les renommages.
--    Sur les 66 noms d'API utilises par les scripts, 21 ne se deduisent pas
--    du libelle de l'export. A charger depuis dumpZohoFields().
-- ---------------------------------------------------------------------
create table zoho_field_map (
  api_name        text primary key,
  field_label     text not null,
  data_type       text,
  read_only       boolean default false,
  is_formula      boolean default false,
  used_by_script  boolean default false,   -- true = ne JAMAIS renommer
  crm_destination text                      -- bac A/B/C : ou va le champ a terme
);
create index on zoho_field_map (field_label);

-- ---------------------------------------------------------------------
-- 2. Le dossier complet, clefs = noms d'API.
--    data est stocke avec les libelles de l'export ; on re-cle a la volee.
-- ---------------------------------------------------------------------
-- CORRECTION (echec migration, 42803 "column d.id must appear in the GROUP BY
-- clause") : jsonb_object_agg() est un agregat, d.id/d.code ne l'etaient pas.
-- Ajout d'un group by, seule modification apportee a ce fichier — la logique
-- (re-cle des colonnes jsonb vers les noms d'API Zoho) est inchangee.
create or replace function gosiyaha_record(p_dossier_id uuid)
returns jsonb language sql stable as $$
  select coalesce(jsonb_object_agg(m.api_name, d.data -> m.field_label), '{}'::jsonb)
         || jsonb_build_object(
              'id',        d.id::text,
              'Record_Id', d.id::text,
              'Name',      d.code)
  from gosiyaha_dossier d
  join zoho_field_map m on d.data ? m.field_label
  where d.id = p_dossier_id
  group by d.id, d.code;
$$;

create or replace view v_gosiyaha_record as
select d.id, p.code as property_code, d.code as dossier_code,
       gosiyaha_record(d.id) as record
from gosiyaha_dossier d
left join property p on p.id = d.property_id;

comment on view v_gosiyaha_record is
  'Equivalent de GET /crm/v8/Go_Siyaha/{id} : un objet JSON clef = nom d''API Zoho.';

-- ---------------------------------------------------------------------
-- 3. Recherche par declencheur.
--    Les cases a cocher deviennent des actions avec prerequis, mais pendant
--    la transition les scripts continuent d'interroger un « champ » booleen.
-- ---------------------------------------------------------------------
create or replace function gosiyaha_search_trigger(p_trigger text)
returns table (id uuid, name text, record jsonb)
language sql stable as $$
  select d.id, d.code, gosiyaha_record(d.id)
  from gosiyaha_dossier d
  join zoho_field_map m on m.api_name = p_trigger
  where (d.data ->> m.field_label) in ('True','true','1')
    and d.data ->> 'Link Livrables' is null;   -- anti-doublon, comme Link_RO_Livrables
$$;

-- ---------------------------------------------------------------------
-- 4. Le logo. Prerequis bloquant cote CRM, piece jointe cote script.
--    La convention de nommage « logo_riadx » disparait : le type de document
--    fait foi.
-- ---------------------------------------------------------------------
create or replace function gosiyaha_logo_url(p_dossier_id uuid)
returns text language sql stable as $$
  select coalesce(
    (select doc.drive_url from document doc
      where doc.dossier_id = p_dossier_id and doc.type_code = 'logo'
      order by doc.uploaded_at desc limit 1),
    (select doc.drive_url from document doc
      join gosiyaha_dossier d on d.property_id = doc.property_id
      where d.id = p_dossier_id and doc.type_code = 'logo'
      order by doc.uploaded_at desc limit 1),
    (select p.logo_url from gosiyaha_dossier d
      join property p on p.id = d.property_id where d.id = p_dossier_id)
  );
$$;

-- ---------------------------------------------------------------------
-- 5. Ecriture en retour de l'URL du dossier genere + trace d'execution.
--    Remplace writeBackFolderUrl_ ET la memoire PROCESSED_IDS du script
--    « doc a presigner », qui vit aujourd'hui dans PropertiesService et se
--    perd a chaque redeploiement.
-- ---------------------------------------------------------------------
create table generation_run (
  id bigserial primary key,
  dossier_id uuid references gosiyaha_dossier(id) on delete cascade,
  action_id  uuid references gosiyaha_action(id) on delete cascade,
  kind text not null,                    -- TGS03 | TGS03_PRESIGN | TGS04 | RO
  drive_url text,
  status text not null default 'ok',     -- ok | error
  message text,
  run_at timestamptz default now()
);
create index on generation_run (dossier_id, kind);

create or replace function gosiyaha_write_back(
  p_dossier_id uuid, p_kind text, p_url text,
  p_status text default 'ok', p_message text default null)
returns bigint language plpgsql as $$
declare v_id bigint;
begin
  insert into generation_run(dossier_id, kind, drive_url, status, message)
  values (p_dossier_id, p_kind, p_url, p_status, p_message)
  returning id into v_id;

  update gosiyaha_dossier
     set data = data || jsonb_build_object('Link Livrables', p_url),
         updated_at = now()
   where id = p_dossier_id and p_status = 'ok';

  insert into audit_log(entity, entity_id, action, after)
  values ('gosiyaha_dossier', p_dossier_id, 'generate_' || p_kind,
          jsonb_build_object('url', p_url, 'status', p_status));
  return v_id;
end $$;

-- ---------------------------------------------------------------------
-- 6. Etat des prerequis, lu par le bouton « Generer les livrables ».
--    Le script ne doit plus pouvoir generer un livrable sans logo.
-- ---------------------------------------------------------------------
create or replace view v_gosiyaha_ready as
select a.id as action_id, d.id as dossier_id, a.action_type,
       count(*) filter (where not pr.satisfied) as missing_count,
       array_agg(pr.label order by pr.code) filter (where not pr.satisfied) as missing,
       count(*) filter (where not pr.satisfied) = 0 as can_generate
from gosiyaha_action a
join gosiyaha_dossier d on d.id = a.dossier_id
left join gosiyaha_prerequisite pr on pr.action_id = a.id
group by a.id, d.id, a.action_type;

-- ---------------------------------------------------------------------
-- 7. Droits de l'integration : lecture seule, plus l'ecriture en retour.
-- ---------------------------------------------------------------------
-- create role svc_gscripts nologin;
-- grant select on v_gosiyaha_record, v_gosiyaha_ready to svc_gscripts;
-- grant execute on function gosiyaha_record(uuid), gosiyaha_search_trigger(text),
--                           gosiyaha_logo_url(uuid),
--                           gosiyaha_write_back(uuid,text,text,text,text) to svc_gscripts;
