/**
 * A EXECUTER UNE FOIS, dans le projet Apps Script existant (les identifiants
 * Zoho y sont deja). Produit la correspondance api_name <-> libelle du module
 * Go_Siyaha, qui est la piece manquante de la migration.
 *
 * Un nom d'API Zoho est fige a la creation du champ : renommer le libelle ne
 * le change pas. Il ne peut donc pas etre derive de l'export Excel.
 *
 * Sortie : une feuille Google Sheets "Zoho Go_Siyaha — champs".
 * A telecharger en CSV et a charger via scripts/load_field_map.py.
 */
function dumpZohoFields() {
  var token = getAccessToken_();   // reutilise l'helper du script « Doc a presigner »
  var url = 'https://www.zohoapis.com/crm/v8/settings/fields?module=Go_Siyaha';
  var res = UrlFetchApp.fetch(url, {
    headers: { Authorization: 'Zoho-oauthtoken ' + token },
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) throw new Error('settings/fields : ' + res.getContentText());

  var fields = JSON.parse(res.getContentText()).fields || [];
  var rows = [['api_name', 'field_label', 'data_type', 'json_type', 'read_only',
               'formula', 'picklist_values', 'length']];

  fields.forEach(function (f) {
    rows.push([
      f.api_name,
      f.field_label,
      f.data_type,
      f.json_type || '',
      f.read_only === true,
      f.formula ? (f.formula.expression || 'oui') : '',
      (f.pick_list_values || []).map(function (p) { return p.display_value; }).join(' | '),
      f.length || ''
    ]);
  });

  var ss = SpreadsheetApp.create('Zoho Go_Siyaha — champs');
  ss.getActiveSheet().getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  Logger.log(fields.length + ' champs exportes : ' + ss.getUrl());
  return ss.getUrl();
}

/**
 * Verifie quels {{tokens}} des templates n'ont AUCUN champ Zoho correspondant.
 * Un token orphelin reste tel quel dans le livrable genere — c'est la cause la
 * plus frequente d'un document livre avec des accolades visibles.
 */
function auditTemplateTokens() {
  var TEMPLATE_IDS = [
    '1xqvGKte3MACDICkGp1MoXS7ca2BD2seVYbX3DYM2Cu8',  // TGS03 doc a presigner
    '1MHrWjotVqmO7IbzaFmqDHbLkm9ppXlFpABpsofDFbUU'   // Rapport d'Opportunite
  ];
  var token = getAccessToken_();
  var res = UrlFetchApp.fetch(
    'https://www.zohoapis.com/crm/v8/settings/fields?module=Go_Siyaha',
    { headers: { Authorization: 'Zoho-oauthtoken ' + token }, muteHttpExceptions: true });
  var known = {};
  (JSON.parse(res.getContentText()).fields || []).forEach(function (f) { known[f.api_name] = 1; });

  TEMPLATE_IDS.forEach(function (id) {
    var doc = DocumentApp.openById(id);
    var text = '';
    var tabs = doc.getTabs ? doc.getTabs() : null;
    if (tabs && tabs.length) tabs.forEach(function (t) { text += t.asDocumentTab().getBody().getText(); });
    else text = doc.getBody().getText();

    var seen = {}, m, re = /\{\{\s*=?\s*([A-Za-z0-9_]+)\s*\}\}/g;
    while ((m = re.exec(text)) !== null) seen[m[1]] = 1;

    var orphans = Object.keys(seen).filter(function (k) {
      return !known[k] && k !== 'LOGO' && !/^[A-Za-z]{1,3}\d+$/.test(k);  // exclut les refs KPI {{=L30}}
    });
    Logger.log(doc.getName() + ' : ' + Object.keys(seen).length + ' tokens, ' +
               orphans.length + ' orphelin(s) -> ' + orphans.join(', '));
  });
}
