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
-- 1. Etablissements par source — attendu (README) :
--    385 hotelrunner, 190 go_siyaha/zoho_crm, 223 mgh, 3 crees a la main
--    (un etablissement peut compter dans plusieurs sources : identifiants
--    multiples sur une meme fiche)
-- ---------------------------------------------------------------------
select system, count(distinct property_id) as nb_etablissements
from external_id
where property_id is not null
group by system
order by nb_etablissements desc;

-- ---------------------------------------------------------------------
-- 2. Etablissements sans aucun identifiant externe — attendu : 0 ou les
--    3 proprietes Anika ajoutees a la main (creees sans identifiant HR/GS/MGH)
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
