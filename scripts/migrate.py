#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CRM HWS — migration Zoho -> Supabase.
Idempotent : rejouable autant de fois que necessaire.
La cle d'identite est external_id (systeme, valeur), pas le nom.

Usage :
    python migrate.py --in ./exports --out ./out              # genere le SQL
    psql "$DATABASE_URL" -f out/03_data.sql                   # charge
"""
import argparse, json, re, unicodedata, sys
from pathlib import Path
import pandas as pd

HEADER_ROW = 6          # les exports Zoho ont 6 lignes de preambule
STOPWORDS = r"\b(riad|riyad|hotel|dar|maison|dhotes|the|le|la|les|sarl|sa|sas|spa|by|and|et)\b"

# --- proprietes absentes des exports, a creer (source : Chris, aout 2026) ---
MANUAL = [
    dict(name="Ksar Anika",  group="Anika", city="Marrakech", country="MA",
         property_type="riad", vendor="simple_booking", plan="SB", role="BE"),
    dict(name="Dar Anika",   group="Anika", city="Marrakech", country="MA",
         property_type="riad", vendor="simple_booking", plan="SB", role="BE"),
    dict(name="Riad Kaiss",  group="Anika", city="Marrakech", country="MA",
         property_type="riad", vendor="simple_booking", plan="SB", role="BE"),
]

# --- HR : colonne booleenne -> (vendor, product, plan, role) ---
HR_STACK = {
    "License HotelRunner":        ("hotelrunner", "channel_manager", "PMC",  "CM"),
    "HotelRunner CM":             ("hotelrunner", "channel_manager", "PMC",  "CM"),
    "PMS HotelRunner":            ("hotelrunner", "pms",             "PMS",  "PMS"),
    "PMS Pluriel":                ("pluriel",     "pms",             None,   "PMS"),
    "PMS Opera":                  ("opera",       "pms",             None,   "PMS"),
    "PMS Hotix":                  ("hotix",       "pms",             None,   "PMS"),
    "PMS Arabsoft":               ("arabsoft",    "pms",             None,   "PMS"),
    "PMS My Fidelio":             ("my_fidelio",  "pms",             None,   "PMS"),
    "PMS Fractalite (et autres)": ("lightresa",   "pms",             None,   "PMS"),
    "Payzone":                    ("payzone",     "gateway",         None,   "PAYMENT"),
    "Simple Booking":             ("simple_booking","booking_engine","SB",   "BE"),
    "Siteminder":                 ("siteminder",  "channel_manager", "SM",   "CM"),
    "Site Made by HWS":           ("hws",         "website",         None,   "SITE"),
    "HRAM - Autopilot":           ("hotelrunner", "addon",           None,   "ADDON"),
    "HRAM - Insights":            ("hotelrunner", "addon",           None,   "ADDON"),
    "HRAM - Guest Center":        ("hotelrunner", "addon",           None,   "ADDON"),
    "HRAM - Competition Analysis":("hotelrunner", "addon",           None,   "ADDON"),
}
HR_ACTIVATION = {  # colonne booleenne -> colonne date d'activation
    "License HotelRunner": "Activation Date HotelRunner",
    "PMS HotelRunner": "Activation Date PMS HotelRunner",
    "PMS Pluriel": "Activation Date PMS Pluriel",
    "PMS Opera": "Activation Date PMS Opera",
    "PMS Hotix": "Activation Date PMS Hotix",
    "PMS Arabsoft": "Activation Date PMS Arabsoft",
    "PMS My Fidelio": "Activation Date PMS My Fidelio",
    "PMS Fractalite (et autres)": "Activation Date PMS Fractalite ou autres",
    "Payzone": "Activation Date Payzone",
    "Simple Booking": "Activation Date Simple Booking",
    "Siteminder": "Activation Date Siteminder",
}
HR_RENEWAL = {
    "License HotelRunner": "Renewal Date HotelRunner CM",
    "PMS HotelRunner": "Renewal Date PMS HotelRunner",
    "PMS Pluriel": "Renewal Date PMS Pluriel",
    "PMS Opera": "Renewal Date PMS Opera",
    "PMS Hotix": "Renewal Date PMS Hotix",
    "PMS Arabsoft": "Renewal Date PMS Arabsoft",
    "PMS My Fidelio": "Renewal Date PMS My Fidelio",
    "PMS Fractalite (et autres)": "Renewal Date PMS Fractalite ou autres",
}
# MGH : texte libre du CM/BE constate -> vendor
MGH_VENDOR = {"octorate":"octorate","eviivo":"eviivo","amenitiz":"amenitiz",
              "hotelrunner":"hotelrunner","simple booking":"simple_booking",
              "siteminder":"siteminder","channex":"channex","pluriel":"pluriel"}

# ---------------------------------------------------------------- utils
def norm(s):
    if pd.isna(s) or s is None: return None
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii","ignore").decode().lower()
    s = re.sub(STOPWORDS, " ", s)
    s = re.sub(r"[^a-z0-9]+", " ", s).strip()
    s = re.sub(r"\s+", " ", s)
    return s or None

def jclean(s):
    """Nettoie un statut Jira : U+2060 WORD JOINER, NBSP, espaces multiples."""
    if pd.isna(s): return None
    s = "".join(ch for ch in str(s) if unicodedata.category(ch) != "Cf")
    s = s.replace("\u00a0"," ").replace("\u202f"," ")
    s = unicodedata.normalize("NFKD", s).encode("ascii","ignore").decode()
    return re.sub(r"\s+"," ", s).strip().upper()

def jira_code(s):
    c = jclean(s)
    if not c: return None
    m = re.match(r"^([\d.]+)", c)
    return m.group(1).rstrip(".") if m else None

def q(v):
    """Litteral SQL."""
    if v is None or (isinstance(v,float) and pd.isna(v)) or (isinstance(v,str) and not v.strip()):
        return "null"
    if isinstance(v, bool): return "true" if v else "false"
    if isinstance(v,(int,)): return str(v)
    if isinstance(v,float): return f"{v:.6g}"
    if isinstance(v,(pd.Timestamp,)): return f"'{v.date().isoformat()}'"
    return "'" + str(v).replace("'","''") + "'"

def qdate(v):
    if pd.isna(v) or v is None or v == "": return "null"
    try: return f"'{pd.to_datetime(v).date().isoformat()}'"
    except Exception: return "null"

def qjson(d):
    clean = {}
    for k, v in d.items():
        if v is None or (isinstance(v,float) and pd.isna(v)): continue
        clean[k] = v.isoformat() if isinstance(v, pd.Timestamp) else (
                   str(v) if not isinstance(v,(int,float,bool,str)) else v)
    return "'" + json.dumps(clean, ensure_ascii=False).replace("'","''") + "'::jsonb"

def as_int(v):
    """Le CRM Zoho laisse passer du texte libre dans les champs numeriques
    ('At least 7', '12 chambres'). On extrait le premier entier, sinon None."""
    if v is None or (isinstance(v, float) and pd.isna(v)): return None
    if isinstance(v, (int, float)): return int(v)
    m = re.search(r"\d+", str(v))
    return int(m.group()) if m else None

def truthy(v):
    return str(v).strip().lower() in ("true","1","yes","oui","vrai")

# ------------------------------------------------------------ chargement
def load(indir: Path):
    f = lambda n: pd.read_excel(indir / n, header=HEADER_ROW)
    return f("ALL_Active_HR.xlsx"), f("ALL_GO_SIYAHA.xlsx"), f("MGH_All_Properties.xlsx")

# ------------------------------------------------------------ resolution
class Registry:
    """Un etablissement = une cle normalisee. Sert de table d'appariement."""
    def __init__(self):
        self.props = {}   # key -> dict
        self.seq = 0
    def upsert(self, key, name, **fields):
        if key not in self.props:
            self.seq += 1
            self.props[key] = dict(key=key, code=f"HWS-{self.seq:05d}", name=name,
                                   ext=[], subs=[], memberships=[], contacts=[], sources=set())
        p = self.props[key]
        for k, v in fields.items():
            if v is not None and not (isinstance(v,float) and pd.isna(v)) and not p.get(k):
                p[k] = v
        return p

def build(hr, gs, mg, report):
    R = Registry()
    legal = {}          # key -> dict entite juridique
    dossiers = []

    # ---------- 1. HotelRunner : la source la plus fiable pour l'identite ----------
    for _, r in hr.iterrows():
        key = norm(r["Account Name"])
        if not key: continue
        p = R.upsert(key, str(r["Account Name"]).strip(),
                     country="MA", rooms_total=as_int(r.get("Number of Rooms")),
                     support_whatsapp=r.get("Phone"),
                     lifecycle_status="active")
        p["sources"].add("HR")
        if pd.notna(r.get("HotelRunner ID (Not HWS)")):
            p["ext"].append(("hotelrunner", str(r["HotelRunner ID (Not HWS)"]).strip(),
                             r.get("HR Admin URL")))
        # societe juridique (79/387 seulement)
        if pd.notna(r.get("Company Name (Société Juridique)")):
            lk = norm(r["Company Name (Société Juridique)"])
            legal.setdefault(lk, dict(legal_name=str(r["Company Name (Société Juridique)"]).strip(),
                                      country="MA"))
            p["legal_key"] = lk
        # projet CRT
        if pd.notna(r.get("Project CRT")) and truthy(r["Project CRT"]):
            p["memberships"].append(("CRT", "member", None))
        # contacts
        for col, role in (("Email 1","daily_support"), ("Email 2","daily_support")):
            if pd.notna(r.get(col)):
                p["contacts"].append(dict(email=str(r[col]).strip(), roles=[role]))
        # stack
        for col,(vendor, product, plan, role) in HR_STACK.items():
            if col not in hr.columns or not truthy(r.get(col)): continue
            p["subs"].append(dict(
                vendor=vendor, product=product, plan=plan, role=role, status="active",
                activation=r.get(HR_ACTIVATION.get(col)) if HR_ACTIVATION.get(col) in hr.columns else None,
                renewal=r.get(HR_RENEWAL.get(col)) if HR_RENEWAL.get(col) in hr.columns else None,
                funded_by=("TGS03" if truthy(r.get("Go Siyaha Selected property")) and role=="CM" else "direct"),
                subsidy_end=r.get("License Go Siyaha END Date"),
                note="import HR"))
        # aucun releve de stack n'a ete fait : role vide = INCONNU, pas AUCUN
        p["stack_surveyed_at"] = None

    # ---------- 2. Go Siyaha : entites juridiques + dossiers ----------
    for _, r in gs.iterrows():
        acct = r.get("Go Siyaha Account") or r.get("Enseigne Commerciale (Account)")
        key = norm(acct)
        if not key:
            report["gs_sans_compte"] += 1
            continue
        name = str(acct).strip()
        p = R.upsert(key, name,
                     rooms_total=as_int(r.get("Capacité")),
                     star_rating=r.get("Categorie"), property_type=r.get("Type"),
                     city=r.get("Ville Enseigne Cciale"), website=r.get("7. Website"),
                     description=r.get("DESCRIPTIF PROPRIÉTÉ FOR RO ET LIVRABLES"),
                     facilities=r.get("Infrasture"), country="MA")
        p["sources"].add("GS")
        if pd.notna(r.get("HotelRunner Admin ID")):
            p["ext"].append(("hotelrunner", str(r["HotelRunner Admin ID"]).strip(), None))
        if pd.notna(r.get("Record Id")):
            p["ext"].append(("zoho_crm", str(r["Record Id"]).strip(), None))

        # entite juridique : Go Siyaha est la MEILLEURE source (159 vs 79 cote HR)
        lname = r.get("Nom Societe RC") or r.get("Raison Sociale Entreprise")
        lk = norm(lname)
        if lk:
            e = legal.setdefault(lk, dict(legal_name=str(lname).strip(), country="MA"))
            e.setdefault("rc_activity", r.get("RC Activite"))
            e.setdefault("rc_date", r.get("Date immatriculation RC"))
            e.setdefault("capital", r.get("Capital Societe"))
            e.setdefault("headcount", as_int(r.get("Effectif")))
            e.setdefault("founded_on", r.get("Date de creation Entreprise"))
            e.setdefault("address", r.get("Adresse Société"))
            e.setdefault("shareholding", r.get("Structure Actionnariat"))
            e.setdefault("director_profile", r.get("Profil du dirigeant"))
            p["legal_key"] = lk
            if pd.notna(r.get("Nom Signataire")):
                p["contacts"].append(dict(full_name=str(r["Nom Signataire"]).strip(),
                    job_title=r.get("Fonction Signataire"), email=r.get("Email Signataire"),
                    phone=r.get("Phone Signataire"), roles=["signatory"], legal=True))

        code = jira_code(r.get("Status Jira"))
        if pd.isna(r.get("Status Jira")): report["gs_sans_statut"] += 1
        gsname = str(r.get("Go Siyaha Name") or "")
        atype = "EOS01" if "EOS" in gsname.upper() else ("TGS04" if "TGS04" in gsname.upper().replace(" ","") else "TGS03")
        dossiers.append(dict(
            key=key, legal_key=p.get("legal_key"), code=gsname or None,
            data={c: r[c] for c in gs.columns if pd.notna(r[c])},
            action=dict(type=atype, market=r.get("Nº de Marché MarocPME"), jira=code,
                        jira_changed=r.get("Status Jira changé le"),
                        amount=r.get("Montant du Devis"),
                        i10n=r.get("Facture Hotel 10% Nº"), i10a=r.get("Facture Hotel 10% Amount"),
                        i10p=r.get("Facture Hotel 10% Payment Date"),
                        i90n=r.get("Facture MarocPME 90% Nº"), i90a=r.get("Facture MarocPME 90% Amount"),
                        i90p=r.get("Facture MarocPME 90% Payment Date"),
                        cancelled=truthy(r.get("Dossier Annulé Définitivement")) or code == "24"),
            has_logo=False))

    # ---------- 3. MGH ----------
    for _, r in mg.iterrows():
        key = norm(r["MGHproperties Name"])
        if not key: continue
        p = R.upsert(key, str(r["MGHproperties Name"]).strip(),
                     city=r.get("Address - City"), address=r.get("Address - Street Address"),
                     country="MA", website=r.get("Hotel Website"),
                     property_type=r.get("Property Type"),
                     latitude=r.get("Address - Latitude"), longitude=r.get("Address - Longitude"))
        if "MGH" not in p["sources"] and not p["sources"]:
            p["lifecycle_status"] = "program_only"
        p["sources"].add("MGH")
        if pd.notna(r.get("Record Id")):
            p["ext"].append(("mgh", str(r["Record Id"]).strip(), None))
        p["memberships"].append(("MGH_MARRAKECH", "member", None))
        for fn, ln, em, ph in [(r.get("Owner First Name"), r.get("Owner Last Name"),
                                r.get("Owner Email"), r.get("Owner phone"))]:
            if pd.notna(em) or pd.notna(fn):
                p["contacts"].append(dict(
                    full_name=" ".join(str(x).strip() for x in (fn, ln) if pd.notna(x)) or None,
                    email=em, phone=ph, roles=["owner"]))
        # stack constate (texte libre)
        cm = str(r.get("Channel Manager - Booking Engine") or "").lower()
        for token, vendor in MGH_VENDOR.items():
            if token in cm:
                p["subs"].append(dict(vendor=vendor, product=None, plan=None, role="CM",
                                      status="active", activation=None, renewal=None,
                                      funded_by=None, subsidy_end=None, note="stack constate MGH"))
                p["stack_surveyed_at"] = "2026-08-01"   # le releve MGH fait foi
                break

    # ---------- 4. proprietes manuelles ----------
    for m in MANUAL:
        p = R.upsert(norm(m["name"]), m["name"], city=m["city"], country=m["country"],
                     property_type=m["property_type"], lifecycle_status="active")
        p["sources"].add("MANUEL")
        p["group"] = m["group"]
        p["subs"].append(dict(vendor=m["vendor"], product="booking_engine", plan=m["plan"],
                              role=m["role"], status="active", activation=None, renewal=None,
                              funded_by="direct", subsidy_end=None,
                              note="cree manuellement — absent des exports Zoho"))
    return R, legal, dossiers

# --------------------------------------------------------------- ecriture
def emit(R, legal, dossiers, out: Path, report):
    L = ["-- 03_data.sql — genere par migrate.py. Idempotent : rejouable.",
         "begin;", ""]

    L.append("-- Entites juridiques")
    for k, e in legal.items():
        L.append(f"insert into legal_entity(legal_name,country,rc_activity,rc_date,capital,headcount,"
                 f"founded_on,address,shareholding,director_profile) values ("
                 f"{q(e['legal_name'])},{q(e.get('country'))},{q(e.get('rc_activity'))},"
                 f"{qdate(e.get('rc_date'))},{q(e.get('capital'))},{q(e.get('headcount'))},"
                 f"{qdate(e.get('founded_on'))},{q(e.get('address'))},{q(e.get('shareholding'))},"
                 f"{q(e.get('director_profile'))}) "
                 f"on conflict (legal_name_normalized,country) do nothing;")
    L.append("")

    groups = {p["group"] for p in R.props.values() if p.get("group")}
    for g in sorted(groups):
        L.append(f"insert into hotel_group(name) values ({q(g)}) on conflict (name) do nothing;")
    L.append("")

    L.append("-- Etablissements")
    for p in R.props.values():
        le = (f"(select id from legal_entity where legal_name_normalized = lower(unaccent({q(legal[p['legal_key']]['legal_name'])})) limit 1)"
              if p.get("legal_key") in legal else "null")
        gr = f"(select id from hotel_group where name = {q(p['group'])})" if p.get("group") else "null"
        L.append(
          "insert into property(code,name,name_normalized,legal_entity_id,group_id,country,city,address,"
          "latitude,longitude,property_type,star_rating,rooms_total,website,description,facilities,"
          "lifecycle_status,support_whatsapp,stack_surveyed_at,billing_entity_code,custom_fields) values ("
          f"{q(p['code'])},{q(p['name'])},{q(p['key'])},{le},{gr},{q(p.get('country'))},{q(p.get('city'))},"
          f"{q(p.get('address'))},{q(p.get('latitude'))},{q(p.get('longitude'))},{q(p.get('property_type'))},"
          f"{q(p.get('star_rating'))},{q(p.get('rooms_total'))},{q(p.get('website'))},{q(p.get('description'))},"
          f"{q(p.get('facilities'))},{q(p.get('lifecycle_status') or 'prospect')},{q(p.get('support_whatsapp'))},"
          f"{qdate(p.get('stack_surveyed_at'))},"
          f"{q('HWS_MA' if p.get('country')=='MA' else None)},"
          f"{qjson({'import_sources': sorted(p['sources'])})}) "
          "on conflict (code) do update set name=excluded.name, rooms_total=coalesce(excluded.rooms_total,property.rooms_total), "
          "website=coalesce(excluded.website,property.website), updated_at=now();")
    L.append("")

    L.append("-- Identifiants externes (la cle d'identite du CRM)")
    seen = set()
    for p in R.props.values():
        for sysname, val, url in p["ext"]:
            if not val or (sysname, val) in seen: continue
            seen.add((sysname, val))
            L.append(f"insert into external_id(property_id,system,value,url) values ("
                     f"(select id from property where code={q(p['code'])}),{q(sysname)},{q(val)},{q(url)}) "
                     f"on conflict (system,value) do nothing;")
    report["external_ids"] = len(seen)
    L.append("")

    L.append("-- Abonnements")
    nsub = 0
    for p in R.props.values():
        for s in p["subs"]:
            nsub += 1
            plan = (f"(select pl.id from plan pl join product pr on pr.id=pl.product_id "
                    f"where pr.vendor_code={q(s['vendor'])} and pl.code={q(s['plan'])} limit 1)"
                    if s.get("plan") else "null")
            L.append(
              "insert into subscription(property_id,plan_id,vendor_code,role,status,activation_date,"
              "renewal_date,funded_by,subsidy_end_date,source_note) values ("
              f"(select id from property where code={q(p['code'])}),{plan},{q(s['vendor'])},"
              f"{q(s['role'])},{q(s['status'])},{qdate(s.get('activation'))},{qdate(s.get('renewal'))},"
              f"{q(s.get('funded_by'))},{qdate(s.get('subsidy_end'))},{q(s.get('note'))});")
    report["subscriptions"] = nsub
    L.append("")

    L.append("-- Appartenance aux projets")
    for p in R.props.values():
        for code, status, since in p["memberships"]:
            L.append(f"insert into project_membership(property_id,project_id,status,since) values ("
                     f"(select id from property where code={q(p['code'])}),"
                     f"(select id from project where code={q(code)}),{q(status)},{qdate(since)}) "
                     f"on conflict (property_id,project_id) do nothing;")
    L.append("")

    L.append("-- Contacts")
    ncon = 0
    for p in R.props.values():
        for c in p["contacts"]:
            ncon += 1
            roles = "{" + ",".join(c["roles"]) + "}"
            L.append("insert into contact(property_id,full_name,email,phone,job_title,roles) values ("
                     f"(select id from property where code={q(p['code'])}),{q(c.get('full_name'))},"
                     f"{q(c.get('email'))},{q(c.get('phone'))},{q(c.get('job_title'))},{q(roles)});")
    report["contacts"] = ncon
    L.append("")

    L.append("-- Dossiers Go Siyaha : les 147 colonnes en jsonb, noms d'origine conserves")
    for i, d in enumerate(dossiers):
        L.append(f"with d as (insert into gosiyaha_dossier(property_id,legal_entity_id,code,data) values ("
                 f"(select id from property where name_normalized={q(d['key'])} limit 1),"
                 + ((f"(select id from legal_entity where legal_name_normalized = lower(unaccent("
                     f"{q(legal[d['legal_key']]['legal_name'])})) limit 1)") if d.get("legal_key") in legal else "null")
                 + f",{q(d['code'])},{qjson(d['data'])}) returning id)")
        a = d["action"]
        L.append(f"insert into gosiyaha_action(dossier_id,action_type,market_number,jira_status_code,"
                 f"jira_status_changed_at,phase,amount,invoice_10_number,invoice_10_amount,invoice_10_paid_on,"
                 f"invoice_90_number,invoice_90_amount,invoice_90_paid_on,cancelled) "
                 f"select d.id,{q(a['type'])},{q(a['market'])},"
                 + (f"(select code from jira_status where code={q(a['jira'])})" if a['jira'] else "null")
                 + f",{qdate(a['jira_changed'])},"
                 + (f"(select phase from jira_status where code={q(a['jira'])})" if a['jira'] else "null")
                 + f",{q(a['amount'])},{q(a['i10n'])},{q(a['i10a'])},{qdate(a['i10p'])},"
                 f"{q(a['i90n'])},{q(a['i90a'])},{qdate(a['i90p'])},{q(bool(a['cancelled']))} from d;")
    report["dossiers"] = len(dossiers)
    L.append("")
    L.append("-- Prerequis bloquants : le logo conditionne toute generation de livrable")
    L.append("insert into gosiyaha_prerequisite(action_id,code,label,satisfied) "
             "select a.id,'logo','Logo haute definition',false from gosiyaha_action a "
             "where not exists (select 1 from gosiyaha_prerequisite p where p.action_id=a.id and p.code='logo');")
    L.append("insert into gosiyaha_prerequisite(action_id,code,label,satisfied) "
             "select a.id,'signatory','Contact signataire designe',"
             "exists(select 1 from gosiyaha_dossier d join contact c on c.legal_entity_id=d.legal_entity_id "
             "       where d.id=a.dossier_id and 'signatory'=any(c.roles)) "
             "from gosiyaha_action a "
             "where not exists (select 1 from gosiyaha_prerequisite p where p.action_id=a.id and p.code='signatory');")
    L.append("")
    L.append("commit;")
    (out / "03_data.sql").write_text("\n".join(L), encoding="utf-8")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="indir", default="./exports")
    ap.add_argument("--out", dest="outdir", default="./out")
    a = ap.parse_args()
    indir, outdir = Path(a.indir), Path(a.outdir)
    outdir.mkdir(parents=True, exist_ok=True)
    report = dict(gs_sans_compte=0, gs_sans_statut=0)
    hr, gs, mg = load(indir)
    R, legal, dossiers = build(hr, gs, mg, report)
    emit(R, legal, dossiers, outdir, report)
    report.update(proprietes=len(R.props), entites_juridiques=len(legal),
                  sources={s: sum(1 for p in R.props.values() if s in p["sources"])
                           for s in ("HR","GS","MGH","MANUEL")})
    (outdir / "rapport_migration.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
