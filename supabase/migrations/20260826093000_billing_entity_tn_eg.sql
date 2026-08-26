-- =====================================================================
-- CRM HWS — README point 4 (entite de facturation), premiere passe
--
-- migrate.py codait country="MA" en dur pour toutes les proprietes HR/GS/MGH,
-- sans jamais lire le vrai pays. 10 proprietes identifiees par leur nom
-- comme etant en Tunisie ou en Egypte, confirmees par Christophe :
-- correction du pays (fait, independamment de la facturation) et
-- rattachement a HWS_ES (Spain) plutot que HWS_MA par defaut.
-- D'autres proprietes marocaines pourront rejoindre HWS_ES au cas par cas,
-- sur indication explicite — jamais deduites du pays (regle du README).
-- =====================================================================

update property set country = 'TN', billing_entity_code = 'HWS_ES'
where code in ('HWS-00128','HWS-00199','HWS-00209','HWS-00269','HWS-00270','HWS-00055','HWS-00231');

update property set country = 'EG', billing_entity_code = 'HWS_ES'
where code in ('HWS-00107','HWS-00259','HWS-00260');
