-- =====================================================================
-- CRM HWS — durcissement suite a get_advisors (security) apres la RLS
--
-- 1. ERREUR reelle : v_gosiyaha_record / v_gosiyaha_ready (compat_gosiyaha.sql)
--    tournent avec les droits du proprietaire (postgres), donc contournent
--    la RLS qu'on vient de poser si un compte staff les appelle via l'API
--    REST. Elles sont la surface de l'integration Apps Script, pas un ecran
--    staff : on retire l'acces direct a anon/authenticated. Ne modifie pas
--    compat_gosiyaha.sql (regle "ce fichier dort") — durcissement par
--    migration separee, la definition des vues reste intacte.
--
-- 2. Avertissements search_path mutable sur des fonctions existantes
--    (immutable_unaccent dans schema.sql ; gosiyaha_record,
--    gosiyaha_search_trigger, gosiyaha_logo_url, gosiyaha_write_back dans
--    compat_gosiyaha.sql). ALTER FUNCTION ... SET, pas d'edition des
--    fichiers d'origine, meme regle qu'au point 1.
--
-- 3. handle_new_auth_user() est un trigger interne (on_auth_user_created) :
--    aucun client ne doit pouvoir l'appeler directement via /rpc.
--    current_app_role() / is_active_staff() restent executables par
--    authenticated (utile a un futur ecran "qui suis-je"), mais pas par anon.
-- =====================================================================

revoke all on v_gosiyaha_record, v_gosiyaha_ready from anon, authenticated;

alter function immutable_unaccent(text) set search_path = public;
alter function gosiyaha_record(uuid) set search_path = public;
alter function gosiyaha_search_trigger(text) set search_path = public;
alter function gosiyaha_logo_url(uuid) set search_path = public;
alter function gosiyaha_write_back(uuid,text,text,text,text) set search_path = public;

revoke execute on function handle_new_auth_user() from anon, authenticated;
revoke execute on function current_app_role() from anon;
revoke execute on function is_active_staff() from anon;

-- CORRECTION : CREATE FUNCTION accorde EXECUTE a PUBLIC par defaut ; revoke
-- ... from anon/authenticated ne retire pas ce droit herite de PUBLIC (confirme
-- par get_advisors, toujours flagge apres le premier passage ci-dessus).
-- Il faut revoquer PUBLIC explicitement, puis regranter authenticated ou l'on
-- veut le garder.
revoke execute on function handle_new_auth_user() from public;
revoke execute on function current_app_role() from public;
grant execute on function current_app_role() to authenticated;
revoke execute on function is_active_staff() from public;
grant execute on function is_active_staff() to authenticated;
