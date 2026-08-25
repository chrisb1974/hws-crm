-- =====================================================================
-- CRM HWS — verifications post-chargement
-- Chaque bloc : la requete, un commentaire "attendu" au-dessus, le
-- resultat s'affiche a l'execution (psql "$DATABASE_URL" -f scripts/verify.sql).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Volumes globaux — attendu (README) :
--    property=636, legal_entity=184, external_id=659, subscription=770,
--    contact=912, gosiyaha_dossier=244
-- ---------------------------------------------------------------------
select
  (select count(*) from property)          as nb_property,
  (select count(*) from legal_entity)      as nb_legal_entity,
  (select count(*) from external_id)       as nb_external_id,
  (select count(*) from subscription)      as nb_subscription,
  (select count(*) from contact)           as nb_contact,
  (select count(*) from gosiyaha_dossier)  as nb_gosiyaha_dossier;

-- ---------------------------------------------------------------------
-- 1a. Etablissements par source declaree (custom_fields.import_sources,
--     tel qu'ecrit par migrate.py) — attendu (README) : 385 HR, 190 GS,
--     223 MGH, 3 MANUEL. Un etablissement peut porter plusieurs tags.
-- ---------------------------------------------------------------------
select tag, count(*) as nb_etablissements
from property p, unnest(string_to_array(
       trim(both '[]' from replace(p.custom_fields->>'import_sources','''','')), ', '
     )) as tag
group by tag
order by nb_etablissements desc;

-- ---------------------------------------------------------------------
-- 1b. Etablissements par identifiant externe REELLEMENT resolu
--     (external_id.system) — c'est la mesure qui fait foi : l'identite
--     passe par external_id, jamais par le tag declaratif du 1a.
--     Attendu : mgh=223 et zoho_crm=190 collent au tag declaratif (1a) ;
--     hotelrunner est structurellement inferieur a 385 (voir 1c).
-- ---------------------------------------------------------------------
select system, count(distinct property_id) as nb_etablissements
from external_id
where property_id is not null
group by system
order by nb_etablissements desc;

-- ---------------------------------------------------------------------
-- 1c. Ecart HotelRunner : etablissements tagges 'HR' sans identifiant
--     hotelrunner resolu dans external_id — ecart connu et attendu
--     (cf. supabase/migrations/..._schema.sql, commentaire sur la table
--     external_id : "probleme 136/192 et 14/224"). PAS une anomalie de
--     chargement : la source Zoho/HotelRunner n'a jamais fourni ces
--     identifiants. A arbitrer (README, "Ce qui reste a faire", point 3).
-- ---------------------------------------------------------------------
select p.custom_fields->>'import_sources' as import_sources, count(*) as nb
from property p
where p.custom_fields->>'import_sources' like '%HR%'
  and not exists (
    select 1 from external_id e where e.property_id = p.id and e.system = 'hotelrunner'
  )
group by 1
order by nb desc;

-- ---------------------------------------------------------------------
-- 2. Etablissements sans aucun identifiant externe (tous systemes) —
--    attendu : les 3 proprietes Anika ajoutees a la main (MANUEL, sans
--    identifiant HR/GS/MGH) + les etablissements tagges 'HR' seul dont
--    le rapprochement HotelRunner a echoue (cf. 1c) — 139 au chargement
--    de reference du 2026-08-25.
-- ---------------------------------------------------------------------
select p.code, p.name, p.lifecycle_status, p.custom_fields->>'import_sources' as import_sources
from property p
where not exists (select 1 from external_id e where e.property_id = p.id)
order by p.code;

-- ---------------------------------------------------------------------
-- 3. Abonnements orphelins (property_id sans etablissement existant) —
--    attendu : 0 ligne. Une contrainte FK l'empeche structurellement ;
--    ce controle verifie qu'aucune ligne n'a echappe au chargement par lots.
-- ---------------------------------------------------------------------
select s.id, s.property_id, s.role, s.status
from subscription s
left join property p on p.id = s.property_id
where p.id is null;

-- ---------------------------------------------------------------------
-- 4. Dossiers Go Siyaha non rattaches a un etablissement — attendu :
--    > 0, c'est un ecart connu et documente (README, point 3 : 54 comptes
--    Go Siyaha sans compte HotelRunner correspondant, a arbitrer)
-- ---------------------------------------------------------------------
select count(*) as nb_dossiers_sans_property
from gosiyaha_dossier
where property_id is null;

select id, code, data->>'Go Siyaha Name' as go_siyaha_name
from gosiyaha_dossier
where property_id is null
order by code
limit 20;

-- ---------------------------------------------------------------------
-- 5. Statuts Jira bruts sans correspondance dans jira_status_alias —
--    attendu : 0 ligne (les 28 valeurs brutes couvrent les 19 statuts,
--    cf. README — probleme U+2060 WORD JOINER deja resolu dans seed.sql)
-- ---------------------------------------------------------------------
select distinct d.data->>'Status Jira' as raw_status,
       count(*) over (partition by d.data->>'Status Jira') as occurrences
from gosiyaha_dossier d
where d.data ? 'Status Jira'
  and d.data->>'Status Jira' is not null
  and not exists (
    select 1 from jira_status_alias a where a.raw_value = d.data->>'Status Jira'
  );

-- ---------------------------------------------------------------------
-- 6. Doublons de name_normalized parmi les etablissements actifs (non
--    fusionnes) — attendu : 0 ligne. property.name_normalized n'a qu'un
--    index (pas de contrainte unique), une collision reelle indiquerait
--    un doublon d'import a fusionner via merged_into.
-- ---------------------------------------------------------------------
select name_normalized, count(*) as nb, array_agg(code order by code) as codes
from property
where merged_into is null
  and name_normalized is not null
group by name_normalized
having count(*) > 1
order by nb desc;

-- ---------------------------------------------------------------------
-- 7. Doublons de legal_name_normalized — attendu : 0 ligne, deja garanti
--    par l'index unique (legal_name_normalized, country) sur legal_entity ;
--    controle de coherence, pas un test de contrainte.
-- ---------------------------------------------------------------------
select legal_name_normalized, country, count(*) as nb, array_agg(id) as ids
from legal_entity
group by legal_name_normalized, country
having count(*) > 1;
