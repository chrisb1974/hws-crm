-- 02_seed.sql — referentiels. A completer/valider par Christophe (phase, responsable).

insert into billing_entity(code,legal_name,default_currency,invoice_prefix,notes) values
  ('HWS_MA','HWS Maroc SARL','MAD','MA', 'Proprietes marocaines en general'),
  ('HWS_ES','HWS Spain','EUR','ES', 'Tunisie, Egypte et certaines proprietes marocaines')
on conflict (code) do nothing;

insert into vendor(code,name,is_partner) values
  ('hotelrunner','HotelRunner',true),
  ('centra','Centra',true),
  ('simple_booking','Simple Booking',true),
  ('siteminder','SiteMinder',true),
  ('channex','Channex',true),
  ('pluriel','Pluriel',true),
  ('payzone','Payzone',true),
  ('stripe','Stripe',false),
  ('paypal','PayPal',false),
  ('octorate','Octorate',false),
  ('eviivo','eviivo',false),
  ('amenitiz','Amenitiz',false),
  ('opera','Oracle Hospitality (Opera)',false),
  ('hotix','Hotix',false),
  ('arabsoft','Arabsoft',false),
  ('my_fidelio','My Fidelio',false),
  ('lightresa','Lightresa',false),
  ('ezee','eZee',false),
  ('hws','HWS',true)
on conflict (code) do nothing;

insert into product(vendor_code,code,name,stance) values
  ('hotelrunner','channel_manager','HotelRunner Channel Manager','offer'),
  ('hotelrunner','booking_engine','HotelRunner Booking Engine','offer'),
  ('hotelrunner','pms','HotelRunner PMS','offer'),
  ('hotelrunner','website','HotelRunner Website','offer'),
  ('hotelrunner','addon','HotelRunner Add-ons','offer'),
  ('centra','crs','Centra CRS','offer'),
  ('centra','pms','Centra PMS','offer'),
  ('centra','booking_engine','Centra Booking Engine','offer'),
  ('simple_booking','booking_engine','Simple Booking','offer'),
  ('siteminder','channel_manager','SiteMinder','offer'),
  ('channex','channel_manager','Channex (white label)','offer'),
  ('pluriel','pms','Pluriel / Pluriel Cloud','coexist'),
  ('pluriel','website','Site Pluriel','coexist'),
  ('payzone','gateway','Payzone','offer'),
  ('stripe','gateway','Stripe','coexist'),
  ('paypal','gateway','PayPal','coexist'),
  ('octorate','all_in_one','Octorate','competitor'),
  ('eviivo','all_in_one','eviivo','competitor'),
  ('amenitiz','all_in_one','Amenitiz','competitor'),
  ('opera','pms','Opera / Opera Cloud','coexist'),
  ('hotix','pms','Hotix','coexist'),
  ('arabsoft','pms','Arabsoft','coexist'),
  ('my_fidelio','pms','My Fidelio','coexist'),
  ('lightresa','pms','Lightresa','coexist'),
  ('hws','website','Site realise par HWS','offer'),
  ('hws','service','Prestation HWS (Go Siyaha, yield, formation)','offer')
on conflict (vendor_code,code) do nothing;

-- Plans : offres datees. Prix et paliers a completer.
insert into plan(product_id,code,name,roles_covered,billing_unit,valid_from,valid_to) values
  ((select id from product where vendor_code='hotelrunner' and code='channel_manager'),'PMC','PMC (historique)','{CM}','licence',null,'2025-12-31'),
  ((select id from product where vendor_code='hotelrunner' and code='channel_manager'),'SELL','Sell','{CM}','licence','2026-01-01',null),
  ((select id from product where vendor_code='hotelrunner' and code='channel_manager'),'COMPLETE','Complete','{CM,BE}','licence','2026-01-01',null),
  ((select id from product where vendor_code='hotelrunner' and code='channel_manager'),'MANAGE','Manage','{CM,BE,PMS}','licence','2026-01-01',null),
  ((select id from product where vendor_code='hotelrunner' and code='pms'),'PMS','HotelRunner PMS','{PMS}','licence',null,null),
  ((select id from product where vendor_code='hotelrunner' and code='booking_engine'),'BE','HotelRunner Booking Engine','{BE}','licence',null,null),
  ((select id from product where vendor_code='siteminder' and code='channel_manager'),'SM','SiteMinder (CM seul)','{CM}','tier',null,null),
  ((select id from product where vendor_code='siteminder' and code='channel_manager'),'SM_PLUS','SiteMinder+ (CM + BE)','{CM,BE}','tier',null,null),
  ((select id from product where vendor_code='simple_booking' and code='booking_engine'),'SB','Simple Booking','{BE}','flat',null,null),
  ((select id from product where vendor_code='centra' and code='crs'),'CRS','Centra CRS','{CM}','flat',null,null),
  ((select id from product where vendor_code='centra' and code='pms'),'PMS','Centra PMS','{PMS}','flat',null,null),
  ((select id from product where vendor_code='centra' and code='booking_engine'),'BE','Centra Booking Engine','{BE}','flat',null,null)
on conflict (product_id,code) do nothing;

-- 19 statuts Jira reels (28 valeurs brutes dans Zoho). PHASE ET RESPONSABLE A VALIDER.
insert into jira_status(code,label,phase,responsible,is_terminal) values
  ('01','DEMANDE ELIGIBILITE A CREER',1,'HWS',false),
  ('02','ACTION A CREER PAR MAROCPME',2,'MAROCPME',false),
  ('03','INFOS COMPLEMENTAIRES',2,'HWS',false),
  ('04','ATTENTE OFFRE PRESTATAIRE',4,'HWS',false),
  ('05','EN COURS EVALUATION OFFRE',4,'MAROCPME',false),
  ('06','EN COURS DE VALIDATION',4,'MAROCPME',false),
  ('08','ATTENTE DOSSIER PHYSIQUE - BESOIN SIGNATURE HOTELIER',5,'HOTEL',false),
  ('10','ATTENTE DOSSIER PHYSIQUE - ENVOYE A RABAT',5,'HWS',false),
  ('12','EN COURS DE SIGNATURE CONVENTION',4,'HWS',false),
  ('14','AFFECTATION POUR SUIVI',4,'MAROCPME',false),
  ('15','ACTION A DEMARRER',6,'HWS',false),
  ('16','ACTION DEMARREE - LIVRABLES A POSTER',6,'HWS',false),
  ('18','A TRAITER PAR MAROCPME - LIVRABLES POSTES',6,'MAROCPME',false),
  ('19','INFOS COMPLEMENTAIRES - LIVRABLES POSTES',6,'HWS',false),
  ('20','ATTENTE DOSSIER PHYSIQUE LIVRABLES (HWS PRINT & SIGN)',5,'HWS',false),
  ('22.5','A VISITER',6,'MAROCPME',false),
  ('22.6','EN COURS DE PAIEMENT',7,'MAROCPME',false),
  ('23','ACTION PAYEE TOTALEMENT',7,'MAROCPME',true),
  ('24','DOSSIER ANNULE',null,'HWS',true)
on conflict (code) do nothing;

-- Alias : chaque valeur brute rencontree (dont U+2060 WORD JOINER) pointe vers son statut.
-- CORRECTION (echec migration, 42703 "column ... does not exist") : les valeurs brutes
-- etaient entre guillemets doubles, syntaxe d'identifiant en Postgres, pas de litteral.
-- Remplacees par des guillemets simples, seule modification apportee a ce fichier.
insert into jira_status_alias(raw_value,status_code) values
  ('01.⁠ ⁠DEMANDE ELIGIBILITE A CREER','01'),
  ('02.⁠ ⁠ACTION A CREER PAR MAROCPME','02'),
  ('03. INFOS COMPLEMENTAIRES','03'),
  ('03.⁠ INFOS COMPLEMENTAIRES','03'),
  ('04. ATTENTE OFFRE PRESTATAIRE','04'),
  ('04.⁠ ATTENTE OFFRE PRESTATAIRE','04'),
  ('05. EN COURS EVALUATION OFFRE','05'),
  ('05.⁠ EN COURS EVALUATION OFFRE','05'),
  ('06. EN COURS DE VALIDATION','06'),
  ('08.  ATTENTE DOSSIER PHYSIQUE - BESOIN SIGNATURE HOTELIER','08'),
  ('08. ATTENTE DOSSIER PHYSIQUE - BESOIN SIGNATURE HOTELIER','08'),
  ('08.⁠ ⁠ATTENTE DOSSIER PHYSIQUE - BESOIN SIGNATURE HOTELIER','08'),
  ('10.⁠ ⁠ATTENTE DOSSIER PHYSIQUE - ENVOYE A RABAT','10'),
  ('12. EN COURS DE SIGNATURE CONVENTION','12'),
  ('12.⁠ EN COURS DE SIGNATURE CONVENTION','12'),
  ('14. AFFECTATION POUR SUIVI','14'),
  ('15. ACTION A DEMARRER','15'),
  ('15.⁠ ACTION A DEMARRER','15'),
  ('16.  ACTION DEMARREE - LIVRABLES A POSTER','16'),
  ('16. ACTION DEMARREE - LIVRABLES A POSTER','16'),
  ('16.⁠ ⁠ACTION DEMARREE - LIVRABLES A POSTER','16'),
  ('18. A TRAITER PAR MAROCPME - LIVRABLES POSTES','18'),
  ('19. INFOS COMPLEMENTAIRES - LIVRABLES POSTES','19'),
  ('20. ATTENTE DOSSIER PHYSIQUE LIVRABLES (HWS PRINT & SIGN)','20'),
  ('22.5 A VISITER','22.5'),
  ('22.6 EN COURS DE PAIEMENT','22.6'),
  ('23. ACTION PAYEE TOTALEMENT','23'),
  ('24. DOSSIER ANNULÉ','24')
on conflict (raw_value) do nothing;

insert into churn_reason(code,label_fr,label_en,counts_as_churn) values
  ('technical','Integration / technique','Integration / technical',true),
  ('price','Prix','Price',true),
  ('no_adoption','Non-usage','No adoption',true),
  ('closed','Fermeture ou vente','Closed or sold',true),
  ('competitor','Passage chez un concurrent','Moved to a competitor',true),
  ('subsidy_end','Fin de subvention','Subsidy ended',true),
  ('unpaid','Impaye','Unpaid',true),
  ('other','Autre','Other',true)
on conflict (code) do nothing;

insert into contact_role(code,label_fr,label_en) values
  ('signatory','Signataire','Signatory'),
  ('management','Direction','Management'),
  ('revenue','Revenue / distribution','Revenue / distribution'),
  ('technical','Technique','Technical'),
  ('accounting','Comptabilite','Accounting'),
  ('daily_support','Support quotidien','Daily support'),
  ('owner','Proprietaire','Owner')
on conflict (code) do nothing;

insert into document_type(code,label_fr,label_en,blocks_deliverable) values
  ('rc','Registre de commerce','Trade register',true),
  ('statuts','Statuts','Articles of association',false),
  ('ca_attestation','Attestation de CA','Revenue certificate',false),
  ('classement','Classement','Classification',false),
  ('dsh','DSH','DSH',false),
  ('quote_signed','Devis signe','Signed quote',true),
  ('contract','Contrat','Contract',false),
  ('logo','Logo','Logo',true),
  ('presigned','Pages pre-signees','Pre-signed pages',false),
  ('pv_recette','PV de reception','Acceptance report',true),
  ('invoice','Facture','Invoice',false)
on conflict (code) do nothing;

insert into project(code,name,type,partner_org,country,city) values
  ('MGH_MARRAKECH','MGH Marrakech','association','MGH','MA','Marrakech'),
  ('CNT_CONVENTION','Convention tripartite CNT / MGH / HWS','convention','CNT','MA',null),
  ('CRT','Projet CRT','institutionnel','CRT','MA',null)
on conflict (code) do nothing;

insert into integration(code,name,db_role,allowed_views,can_write) values
  ('google_scripts_livrables','Scripts Google Apps — livrables Go Siyaha','svc_gscripts','{v_gosiyaha_livrables}',false),
  ('onboarding_portal','Portail onboarding partenaires','svc_onboarding','{v_property_api}',true),
  ('base44_agents','Agents Base44 / Jisr','svc_agents','{v_gosiyaha_livrables,v_property_api}',true)
on conflict (code) do nothing;
