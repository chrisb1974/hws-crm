/**********************************************************************
 *  SHIM SUPABASE — remplace les appels Zoho des scripts de livrables.
 *
 *  Les quatre scripts (TGS03 v5, TGS03 doc a presigner, TGS04 v3, RO)
 *  isolent tous leurs acces Zoho dans quatre helpers. Il suffit donc de
 *  remplacer ces helpers : les templates, les {{tokens}}, la logique KPI,
 *  l'insertion du logo et les emails restent inchanges.
 *
 *  Installation :
 *    1. Ajouter ce fichier au projet Apps Script.
 *    2. Script Properties : SUPABASE_URL, SUPABASE_KEY (clef du role svc_gscripts).
 *    3. Dans chaque script, remplacer les appels comme indique en bas de fichier.
 *    4. Basculer un script a la fois, en verifiant le livrable produit.
 **********************************************************************/

function SB_() {
  var p = PropertiesService.getScriptProperties();
  return { url: p.getProperty('SUPABASE_URL'), key: p.getProperty('SUPABASE_KEY') };
}

function SB_fetch_(path, opts) {
  var s = SB_();
  opts = opts || {};
  opts.headers = Object.assign({
    apikey: s.key,
    Authorization: 'Bearer ' + s.key,
    'Content-Type': 'application/json'
  }, opts.headers || {});
  opts.muteHttpExceptions = true;
  var res = UrlFetchApp.fetch(s.url + path, opts);
  if (res.getResponseCode() >= 300)
    throw new Error('Supabase ' + res.getResponseCode() + ' : ' + res.getContentText());
  var txt = res.getContentText();
  return txt ? JSON.parse(txt) : null;
}

/** Remplace fetchRecordById_ / buildValuesFromRecord_ (partie lecture Zoho).
 *  Retourne le meme objet plat clef = nom d'API Zoho. */
function SB_fetchRecordById_(dossierId) {
  var r = SB_fetch_('/rest/v1/rpc/gosiyaha_record',
    { method: 'post', payload: JSON.stringify({ p_dossier_id: dossierId }) });
  if (!r) return null;
  r.id = dossierId;
  r.Record_Id = dossierId;
  return r;
}

/** Remplace fetchCheckedRecords_ / le search par criteria. */
function SB_fetchCheckedRecords_(triggerApiName) {
  var rows = SB_fetch_('/rest/v1/rpc/gosiyaha_search_trigger',
    { method: 'post', payload: JSON.stringify({ p_trigger: triggerApiName }) }) || [];
  return rows.map(function (row) {
    var rec = row.record || {};
    rec.id = row.id;
    rec.Record_Id = row.id;
    if (!rec.Name) rec.Name = row.name;
    return rec;
  });
}

/** Remplace getLogoBlob_ / fetchLogoBlob_.
 *  Le logo n'est plus une piece jointe nommee « logo_xxx » mais un document
 *  type. La convention de nommage disparait. */
function SB_fetchLogoBlob_(dossierId) {
  var url = SB_fetch_('/rest/v1/rpc/gosiyaha_logo_url',
    { method: 'post', payload: JSON.stringify({ p_dossier_id: dossierId }) });
  if (!url) { Logger.log('  Pas de logo pour ' + dossierId); return null; }
  var m = String(url).match(/[-\w]{25,}/);          // id Drive dans l'URL
  if (!m) return null;
  var file = DriveApp.getFileById(m[0]);
  var name = file.getName().toLowerCase();
  var ct = /\.jpe?g$/.test(name) ? 'image/jpeg' : /\.gif$/.test(name) ? 'image/gif' : 'image/png';
  return file.getBlob().setContentType(ct);
}

/** Remplace writeBackFolderUrl_ ET la memoire PROCESSED_IDS.
 *  kind : 'TGS03' | 'TGS03_PRESIGN' | 'TGS04' | 'RO' */
function SB_writeBack_(dossierId, kind, driveUrl, status, message) {
  return SB_fetch_('/rest/v1/rpc/gosiyaha_write_back', {
    method: 'post',
    payload: JSON.stringify({
      p_dossier_id: dossierId, p_kind: kind, p_url: driveUrl,
      p_status: status || 'ok', p_message: message || null })
  });
}

/** NOUVEAU — verrou de prerequis. N'existait pas cote Zoho : une case pouvait
 *  etre cochee sans logo, et tout etait a regenerer. */
function SB_canGenerate_(dossierId, actionType) {
  var rows = SB_fetch_('/rest/v1/v_gosiyaha_ready?dossier_id=eq.' + dossierId +
                       '&action_type=eq.' + actionType) || [];
  if (!rows.length) return { ok: true, missing: [] };
  return { ok: rows[0].can_generate === true, missing: rows[0].missing || [] };
}

/**********************************************************************
 *  CE QU'IL FAUT CHANGER DANS CHAQUE SCRIPT
 *
 *  TGS03 v5 (Code.gs)
 *    buildValuesFromRecord_ : remplacer le UrlFetchApp vers /crm/v6/... par
 *        var rec = SB_fetchRecordById_(recordId);
 *      (le reste de la fonction — typage des dates, alias_, NUMERIC_FIELDS —
 *       ne bouge pas)
 *    pollAndGenerate       : var data = SB_fetchCheckedRecords_(TRIGGER_FIELD);
 *    getLogoBlob_          : return SB_fetchLogoBlob_(recordId);
 *    writeBackFolderUrl_   : SB_writeBack_(recordId, 'TGS03', url);
 *
 *  TGS03 « doc a presigner »
 *    fetchRecordById_      -> SB_fetchRecordById_
 *    fetchCheckedRecords_  -> SB_fetchCheckedRecords_(CONFIG.TRIGGER_FIELD)
 *    fetchLogoBlob_        -> SB_fetchLogoBlob_
 *    processCheckedRecords_: supprimer PROCESSED_IDS et appeler
 *        SB_writeBack_(rec.id, 'TGS03_PRESIGN', url)
 *      — la memoire anti-doublon vit desormais en base, pas dans
 *        PropertiesService (qui se perd a chaque redeploiement)
 *
 *  TGS04 v3   : memes quatre remplacements, kind = 'TGS04'
 *  RO         : RO_fetchRecordById_ / RO_fetchCheckedRecords_, kind = 'RO'
 *
 *  Et avant chaque generation, ajouter :
 *      var chk = SB_canGenerate_(rec.id, 'TGS04');
 *      if (!chk.ok) { Logger.log('Bloque — manque : ' + chk.missing.join(', ')); return; }
 **********************************************************************/
