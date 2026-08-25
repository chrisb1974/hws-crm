# CRM HWS — phase 0 : schema et migration

Reprise des trois exports Zoho vers Supabase. **Idempotent** : le script se rejoue
autant de fois que necessaire, c'est le principe de la phase 0.

## Contenu

```
supabase/migrations/           schema, seed et couche de compatibilite, en migrations horodatees
  ..._schema.sql                tables, types, index, vues
  ..._seed.sql                  referentiels : fournisseurs, produits, plans, 19 statuts Jira, projets
  ..._compat_gosiyaha.sql       couche de compatibilite pour les scripts de livrables (ne pas modifier)
scripts/migrate.py             lecture des 3 exports -> out/03_data.sql
scripts/load_field_map.py      correspondance nom d'API <-> libelle -> out/05_field_map.sql
scripts/verify.sql             controles post-chargement (comptages, orphelins, doublons)
apps_script/00_dump_zoho_fields.gs   a executer UNE FOIS dans Zoho (voir ci-dessous)
apps_script/01_shim_supabase.gs      remplace les appels Zoho des 4 scripts de livrables
exports/                       non versionne : y deposer les 3 fichiers Zoho
out/                           non versionne, genere : 03_data.sql, 05_field_map.sql, rapport_migration.json
```

`exports/` et `out/` contiennent des donnees clients : ils sont dans `.gitignore` et ne
sont jamais commites. Le SQL de donnees se regenere avec `scripts/migrate.py`.

## Lancer

```bash
python3 scripts/migrate.py --in ./exports --out ./out

psql "$DATABASE_URL" -f supabase/migrations/<timestamp>_schema.sql
psql "$DATABASE_URL" -f supabase/migrations/<timestamp>_seed.sql
psql "$DATABASE_URL" -f supabase/migrations/<timestamp>_compat_gosiyaha.sql
psql "$DATABASE_URL" -f out/03_data.sql
psql "$DATABASE_URL" -f scripts/verify.sql
```

Pour rejouer a blanc : `drop schema public cascade; create schema public;` puis les trois
migrations dans l'ordre, puis `out/03_data.sql`. Aucun etat n'est conserve entre deux
passages.

## Ce que la migration produit

| Objet | Volume |
|---|---|
| Etablissements | 636 |
| Entites juridiques | 184 |
| Identifiants externes | 659 |
| Abonnements | 770 |
| Contacts | 912 |
| Dossiers Go Siyaha | 244 (147 colonnes en jsonb) |

Repartition par source : 385 HotelRunner, 190 Go Siyaha, 223 MGH, 3 crees a la main.

## Decisions inscrites dans le code

- **L'identite passe par `external_id`**, jamais par le nom. Le nom normalise ne sert qu'a
  l'appariement initial.
- **L'entite juridique se construit depuis Go Siyaha**, pas depuis HotelRunner : 159 raisons
  sociales cote GS contre 79 cote HR.
- **`stack_surveyed_at` reste null pour les imports HotelRunner** : un role sans ligne y est
  *inconnu*, pas *vide*. Seul MGH porte un releve reel.
- **Les statuts Jira passent par `jira_status_alias`** : les 28 valeurs brutes pointent vers
  19 statuts. Le caractere fautif est **U+2060 WORD JOINER**, qu'un `strip()` ne retire pas.
- **Aucune colonne Go Siyaha n'est perdue** : les 147 entrent en jsonb avec leur nom d'origine,
  et `v_gosiyaha_livrables` les ressert aux scripts Google Apps sans les modifier.
- **Les champs numeriques Zoho contiennent du texte libre** (`At least 7`) : `as_int()`
  extrait le premier entier plutot que d'echouer.

## Les scripts de livrables : ce que leur lecture a change

Les quatre scripts (TGS03 v5, TGS03 « doc a presigner », TGS04 v3, Rapport d'Opportunite)
**ne lisent pas une liste de colonnes**. Ils recuperent l'integralite du dossier et remplacent
tout `{{Nom_API}}` present dans les templates. Une vue a colonnes figees ne peut donc pas les
servir : la migration `compat_gosiyaha` reproduit les quatre acces dont ils ont besoin —
lire un dossier complet, chercher par case a cocher, recuperer le logo, ecrire en retour.

**Le point bloquant.** Les scripts utilisent les **noms d'API Zoho** ; l'export porte les
**libelles d'affichage**. Un nom d'API est fige a la creation du champ et ne suit pas les
renommages : sur les 66 noms d'API references par les scripts, **21 ne se deduisent pas** du
libelle (`Nom_Contact_Principal_Hotel`, `Date_inscription_RC`, `Site_Internet`,
`Enseigne_Commerciale`…). La correspondance doit etre extraite de Zoho :

```
1. Coller apps_script/00_dump_zoho_fields.gs dans le projet Apps Script existant
2. Executer dumpZohoFields()   -> feuille « Zoho Go_Siyaha — champs », telecharger en CSV
3. python3 scripts/load_field_map.py --csv "....csv" --out out/05_field_map.sql
4. psql "$DATABASE_URL" -f out/05_field_map.sql
```

`auditTemplateTokens()` liste au passage les `{{tokens}}` presents dans les templates
sans champ Zoho correspondant — c'est la cause habituelle d'un livrable rendu avec des
accolades visibles.

Deux gains obtenus au passage :
- **La convention `logo_riadx` disparait.** Le logo devient un document type, et
  `SB_canGenerate_()` bloque la generation tant qu'il manque — aujourd'hui une case peut
  etre cochee sans logo et tout est a regenerer.
- **La memoire anti-doublon quitte `PropertiesService`**, ou elle se perd a chaque
  redeploiement, pour la table `generation_run`.

## Ce qui reste a faire avant de charger en production

1. ~~**Extraire la correspondance des noms d'API**~~ **Fait le 2026-08-25**, via l'API Zoho
   CRM (`ZohoCRM_getFields` sur le module `Go_Siyaha`, id `3332272000064212014`) plutot que
   par l'export manuel Apps Script decrit ci-dessus — memes 164 champs, sans manipulation
   dans Zoho. Charge en base : `zoho_field_map`, 164 lignes, 61 marquees `used_by_script`.
   Les 5 noms d'API restants de la liste des 66 utilises par les scripts (`USED_BY_SCRIPTS`
   dans `load_field_map.py`) sont des alias construits par les scripts eux-memes
   (`SCRIPT_ALIASES`), pas des champs Zoho : couverture complete, aucun `{{token}}` ne
   restera visible dans un livrable.
2. **Valider phase et responsable des 19 statuts Jira** dans la migration `seed` — les valeurs
   actuelles sont une proposition.
3. **Arbitrer les 206 etablissements tagues 'HR' sans identifiant HotelRunner resolu**
   (voir `scripts/verify.sql`, requetes 1c et 2) et les 54 comptes Go Siyaha sans compte
   HotelRunner (lignes `-G-` du classeur d'appariement).
4. **Renseigner l'entite de facturation** : le script met `HWS_MA` par defaut pour le Maroc.
   La Tunisie, l'Egypte et certaines proprietes marocaines relevent de `HWS_ES` — a saisir,
   jamais a deduire du pays.
5. **Completer les prix et couts** : aucun montant d'abonnement n'existe dans les exports.
   La marge restera vide tant que le catalogue tarifaire n'est pas saisi.
6. **RLS** : non ecrite ici. A poser avec l'authentification, avant tout acces applicatif.

## Verification

Les quatre fichiers SQL passent le parseur PostgreSQL officiel (`pglast`) :
53 + 11 + 11 + 3 634 instructions valides. Cela garantit la syntaxe, pas la justesse metier.

`scripts/verify.sql` controle le chargement reel : etablissements par source, etablissements
sans identifiant externe, abonnements orphelins, dossiers Go Siyaha non rattaches, statuts
Jira sans correspondance, doublons de `name_normalized`.

## Point de securite

Le script « doc a presigner » contient un `GRANT_CODE` Zoho en dur dans
`echangerCodeContreRefreshToken()`. Un grant code est a usage unique et expire en quelques
minutes, donc celui-ci est vraisemblablement mort — mais un identifiant ne doit pas rester
dans le source. A retirer, et a considerer comme compromis si le projet a ete partage.
