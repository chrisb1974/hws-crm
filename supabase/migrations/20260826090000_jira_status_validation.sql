-- =====================================================================
-- CRM HWS — validation des 19 statuts Jira (README, point 2)
-- Corrections confirmees par Christophe, une ligne par correction.
-- =====================================================================

-- 08 ATTENTE DOSSIER PHYSIQUE - BESOIN SIGNATURE HOTELIER : le responsable
-- au sens suivi/relance est HWS (qui gere aupres de l'hotel), pas HOTEL.
update jira_status set responsible = 'HWS' where code = '08';
