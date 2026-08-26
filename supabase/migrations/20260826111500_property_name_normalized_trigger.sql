-- =====================================================================
-- CRM HWS — property.name_normalized n'est pas une colonne generee ; elle
-- etait remplie par migrate.py (lower+unaccent en Python) au chargement.
-- Les etablissements crees depuis l'app doivent avoir la meme convention,
-- sinon la detection de doublons (verify.sql) les manque silencieusement.
-- =====================================================================

create or replace function property_set_name_normalized()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.name_normalized := lower(immutable_unaccent(new.name));
  return new;
end;
$$;

create trigger property_name_normalized_trigger
before insert or update of name on property
for each row execute function property_set_name_normalized();
