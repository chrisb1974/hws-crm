#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Charge la correspondance api_name <-> libelle produite par dumpZohoFields().

    python3 scripts/load_field_map.py --csv "Zoho Go_Siyaha - champs.csv" --out out/05_field_map.sql

Marque used_by_script=true pour tout champ referenced par les scripts de
livrables : ces noms d'API ne doivent JAMAIS etre renommes.
Signale les champs utilises par les scripts mais absents de Zoho, et les
colonnes de l'export sans champ correspondant.
"""
import argparse, csv, re
from pathlib import Path

USED_BY_SCRIPTS = set("""
Name Nom_Societe_RC Nom_Signataire Fonction_Signataire N_de_March_MarocPME HotelRunner_Admin_ID
Facture_MarocPME_90_Amount Montant_TTC_Lettre MarocPME_AM Nom_Contact_Principal_Hotel Adresse_Soci_t
Phone_Signataire Email_Signataire Date_inscription_RC Structure_Actionnariat Capital_Societe Effectif
Infrasture Profil_du_dirigeant Ville_Enseigne_Cciale Enseigne_Commerciale Etablissement_Touristique
Type Categorie Solutions_Informatiques_utilises Site_Internet
DESCRIPTIF_PROPRI_T_FOR_RO_ET_LIVRABLES Nom_User_1 Fonction_User_1 Nom_2eme_User Titre_2eme_User
Nom_3eme_User Titre_3eme_User CA_2023 CA_2024 CA_2025 CA_2026 CA_dernier_exercice
Montant_HT Montant_TVA Montant_TTC Montant_TTC1 Montant_du_Devis Montant_du_Devis_DHS
Capacit ADR_Valeur_Fin Occupancy_Valeur_Fin Parts_de_Marche_en_Ligne ADR_Valeur_Initial
Occupancy_ValeurInitial ADR_Objective Occupancy_Valeur_Objective Emploi_cr_er Cadrage
Installationdu Link_RO_Livrables Lookup_1
TGS03_CHECK_WHEN_ALL_FIELDS_READY_FOR_LIVRABLES TGS03_Doc_a_signer_juin_2026
TGS03_RO_AUGUST26 TGS04_CHECK_WHEN_ALL_FIELDS_READY_FOR_LIVRABLES
""".split())

# Alias construits DANS les scripts, pas des champs Zoho : ne pas les chercher.
SCRIPT_ALIASES = {"Capacite", "Occupancy_Valeur_Initial", "Installatiodu",
                  "Date_Debut_Projet", "DESCRIPTIF_PROPRI_T_FOR_RO", "Record_Id",
                  "date", "DATE", "METHODE_GAIN1", "METHODE_GAIN2",
                  "METHODE_GAIN3", "METHODE_TOTAL", "LOGO"}

def q(v):
    if v is None or v == "": return "null"
    if isinstance(v, bool): return "true" if v else "false"
    return "'" + str(v).replace("'", "''") + "'"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", required=True)
    ap.add_argument("--out", default="out/05_field_map.sql")
    a = ap.parse_args()

    rows = list(csv.DictReader(open(a.csv, encoding="utf-8-sig")))
    api_names = {r["api_name"] for r in rows}

    sql = ["-- 05_field_map.sql — genere par load_field_map.py", "begin;"]
    for r in rows:
        used = r["api_name"] in USED_BY_SCRIPTS
        sql.append(
            "insert into zoho_field_map(api_name,field_label,data_type,read_only,is_formula,used_by_script) "
            f"values ({q(r['api_name'])},{q(r['field_label'])},{q(r.get('data_type'))},"
            f"{q(str(r.get('read_only','')).lower()=='true')},{q(bool(r.get('formula')))},{q(used)}) "
            "on conflict (api_name) do update set field_label=excluded.field_label, "
            "data_type=excluded.data_type, used_by_script=excluded.used_by_script;")
    sql.append("commit;")
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    Path(a.out).write_text("\n".join(sql), encoding="utf-8")

    missing = sorted(USED_BY_SCRIPTS - api_names - SCRIPT_ALIASES)
    print(f"champs Zoho          : {len(rows)}")
    print(f"utilises par scripts : {len(USED_BY_SCRIPTS & api_names)}")
    if missing:
        print(f"\nATTENTION — {len(missing)} champ(s) utilise(s) par les scripts et INTROUVABLE(S) dans Zoho.")
        print("Un token orphelin reste tel quel dans le livrable (accolades visibles) :")
        for m in missing: print("   ", m)
    print(f"\nSQL ecrit : {a.out}")

if __name__ == "__main__":
    main()
