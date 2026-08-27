


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "unaccent" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."app_role" AS ENUM (
    'admin',
    'sales',
    'support'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE TYPE "public"."field_storage" AS ENUM (
    'column',
    'jsonb'
);


ALTER TYPE "public"."field_storage" OWNER TO "postgres";


CREATE TYPE "public"."group_type" AS ENUM (
    'chain',
    'management_company',
    'consultant',
    'family_office',
    'association',
    'other'
);


ALTER TYPE "public"."group_type" OWNER TO "postgres";


CREATE TYPE "public"."gs_action_type" AS ENUM (
    'TGS03',
    'TGS04',
    'EOS01'
);


ALTER TYPE "public"."gs_action_type" OWNER TO "postgres";


CREATE TYPE "public"."hws_stance" AS ENUM (
    'offer',
    'competitor',
    'coexist'
);


ALTER TYPE "public"."hws_stance" OWNER TO "postgres";


CREATE TYPE "public"."lead_status" AS ENUM (
    'open',
    'won',
    'lost'
);


ALTER TYPE "public"."lead_status" OWNER TO "postgres";


CREATE TYPE "public"."lifecycle_status" AS ENUM (
    'prospect',
    'onboarding',
    'active',
    'suspended',
    'churned',
    'program_only'
);


ALTER TYPE "public"."lifecycle_status" OWNER TO "postgres";


CREATE TYPE "public"."membership_status" AS ENUM (
    'member',
    'prospect',
    'left'
);


ALTER TYPE "public"."membership_status" OWNER TO "postgres";


CREATE TYPE "public"."stack_role" AS ENUM (
    'PMS',
    'CM',
    'BE',
    'SITE',
    'PAYMENT',
    'ADDON',
    'SERVICE'
);


ALTER TYPE "public"."stack_role" OWNER TO "postgres";


CREATE TYPE "public"."sub_status" AS ENUM (
    'prospect',
    'trial',
    'active',
    'suspended',
    'terminated',
    'migrated'
);


ALTER TYPE "public"."sub_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_app_role"() RETURNS "public"."app_role"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select role from app_user where id = auth.uid() and active;
$$;


ALTER FUNCTION "public"."current_app_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."gosiyaha_logo_url"("p_dossier_id" "uuid") RETURNS "text"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  select coalesce(
    (select doc.drive_url from document doc
      where doc.dossier_id = p_dossier_id and doc.type_code = 'logo'
      order by doc.uploaded_at desc limit 1),
    (select doc.drive_url from document doc
      join gosiyaha_dossier d on d.property_id = doc.property_id
      where d.id = p_dossier_id and doc.type_code = 'logo'
      order by doc.uploaded_at desc limit 1),
    (select p.logo_url from gosiyaha_dossier d
      join property p on p.id = d.property_id where d.id = p_dossier_id)
  );
$$;


ALTER FUNCTION "public"."gosiyaha_logo_url"("p_dossier_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."gosiyaha_record"("p_dossier_id" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  select coalesce(jsonb_object_agg(m.api_name, d.data -> m.field_label), '{}'::jsonb)
         || jsonb_build_object(
              'id',        d.id::text,
              'Record_Id', d.id::text,
              'Name',      d.code)
  from gosiyaha_dossier d
  join zoho_field_map m on d.data ? m.field_label
  where d.id = p_dossier_id
  group by d.id, d.code;
$$;


ALTER FUNCTION "public"."gosiyaha_record"("p_dossier_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."gosiyaha_search_trigger"("p_trigger" "text") RETURNS TABLE("id" "uuid", "name" "text", "record" "jsonb")
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  select d.id, d.code, gosiyaha_record(d.id)
  from gosiyaha_dossier d
  join zoho_field_map m on m.api_name = p_trigger
  where (d.data ->> m.field_label) in ('True','true','1')
    and d.data ->> 'Link Livrables' is null;   -- anti-doublon, comme Link_RO_Livrables
$$;


ALTER FUNCTION "public"."gosiyaha_search_trigger"("p_trigger" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."gosiyaha_write_back"("p_dossier_id" "uuid", "p_kind" "text", "p_url" "text", "p_status" "text" DEFAULT 'ok'::"text", "p_message" "text" DEFAULT NULL::"text") RETURNS bigint
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare v_id bigint;
begin
  insert into generation_run(dossier_id, kind, drive_url, status, message)
  values (p_dossier_id, p_kind, p_url, p_status, p_message)
  returning id into v_id;

  update gosiyaha_dossier
     set data = data || jsonb_build_object('Link Livrables', p_url),
         updated_at = now()
   where id = p_dossier_id and p_status = 'ok';

  insert into audit_log(entity, entity_id, action, after)
  values ('gosiyaha_dossier', p_dossier_id, 'generate_' || p_kind,
          jsonb_build_object('url', p_url, 'status', p_status));
  return v_id;
end $$;


ALTER FUNCTION "public"."gosiyaha_write_back"("p_dossier_id" "uuid", "p_kind" "text", "p_url" "text", "p_status" "text", "p_message" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_auth_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into app_user (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_auth_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."immutable_unaccent"("text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE PARALLEL SAFE
    SET "search_path" TO 'public'
    AS $_$
  select unaccent('unaccent', $1)
$_$;


ALTER FUNCTION "public"."immutable_unaccent"("text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_active_staff"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (select 1 from app_user where id = auth.uid() and active);
$$;


ALTER FUNCTION "public"."is_active_staff"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."lead_set_followup"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.name_normalized := lower(unaccent(coalesce(new.name,'')));
  if new.status = 'lost' and new.lost_at is not null and new.followup_at is null then
    new.followup_at := new.lost_at + interval '6 months';
  end if;
  new.updated_at := now();
  return new;
end $$;


ALTER FUNCTION "public"."lead_set_followup"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."next_property_code"() RETURNS "text"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
  select 'HWS-' || lpad(
    (coalesce(max(substring(code from 5))::int, 0) + 1)::text, 5, '0'
  )
  from property
  where code ~ '^HWS-[0-9]+$';
$_$;


ALTER FUNCTION "public"."next_property_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."property_set_name_normalized"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  new.name_normalized := lower(immutable_unaccent(new.name));
  return new;
end;
$$;


ALTER FUNCTION "public"."property_set_name_normalized"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."app_user" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text",
    "role" "public"."app_role" DEFAULT 'support'::"public"."app_role" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."app_user" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_log" (
    "id" bigint NOT NULL,
    "entity" "text" NOT NULL,
    "entity_id" "uuid",
    "action" "text" NOT NULL,
    "changed_by" "uuid",
    "before" "jsonb",
    "after" "jsonb",
    "at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."audit_log" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."audit_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."audit_log_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."audit_log_id_seq" OWNED BY "public"."audit_log"."id";



CREATE TABLE IF NOT EXISTS "public"."billing_account" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "legal_entity_id" "uuid",
    "billing_entity_code" "text" NOT NULL,
    "currency" character(3) NOT NULL,
    "payment_terms" "text",
    "zoho_books_id" "text"
);


ALTER TABLE "public"."billing_account" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."billing_entity" (
    "code" "text" NOT NULL,
    "legal_name" "text" NOT NULL,
    "default_currency" character(3) NOT NULL,
    "invoice_prefix" "text",
    "notes" "text"
);


ALTER TABLE "public"."billing_entity" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."churn_reason" (
    "code" "text" NOT NULL,
    "label_fr" "text",
    "label_en" "text",
    "counts_as_churn" boolean DEFAULT true
);


ALTER TABLE "public"."churn_reason" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."city" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "country" character(2) NOT NULL,
    "name_normalized" "text" GENERATED ALWAYS AS ("lower"("public"."immutable_unaccent"("name"))) STORED
);


ALTER TABLE "public"."city" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."city_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."city_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."city_id_seq" OWNED BY "public"."city"."id";



CREATE TABLE IF NOT EXISTS "public"."contact" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid",
    "legal_entity_id" "uuid",
    "full_name" "text",
    "email" "text",
    "phone" "text",
    "whatsapp" "text",
    "job_title" "text",
    "language" character(2),
    "roles" "text"[] DEFAULT '{}'::"text"[],
    "is_primary" boolean DEFAULT false,
    "receives_alerts" boolean DEFAULT false,
    "lead_id" "uuid"
);


ALTER TABLE "public"."contact" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contact_role" (
    "code" "text" NOT NULL,
    "label_fr" "text",
    "label_en" "text"
);


ALTER TABLE "public"."contact_role" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."document" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid",
    "dossier_id" "uuid",
    "type_code" "text",
    "drive_url" "text",
    "filename" "text",
    "uploaded_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" "date",
    "validated_by" "uuid"
);


ALTER TABLE "public"."document" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."document_type" (
    "code" "text" NOT NULL,
    "label_fr" "text",
    "label_en" "text",
    "blocks_deliverable" boolean DEFAULT false
);


ALTER TABLE "public"."document_type" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."external_id" (
    "id" bigint NOT NULL,
    "property_id" "uuid",
    "legal_entity_id" "uuid",
    "system" "text" NOT NULL,
    "value" "text" NOT NULL,
    "url" "text",
    "verified_at" timestamp with time zone,
    "verified_by" "uuid",
    CONSTRAINT "external_id_check" CHECK (("num_nonnulls"("property_id", "legal_entity_id") = 1))
);


ALTER TABLE "public"."external_id" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."external_id_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."external_id_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."external_id_id_seq" OWNED BY "public"."external_id"."id";



CREATE TABLE IF NOT EXISTS "public"."field_definition" (
    "id" integer NOT NULL,
    "entity" "text" NOT NULL,
    "api_name" "text" NOT NULL,
    "label_fr" "text",
    "label_en" "text",
    "type" "text" NOT NULL,
    "options" "jsonb",
    "ref_entity" "text",
    "required" boolean DEFAULT false,
    "section" "text",
    "sort_order" integer,
    "visible_roles" "text"[] DEFAULT '{admin,sales,support}'::"text"[],
    "expose_api" boolean DEFAULT true,
    "storage" "public"."field_storage" DEFAULT 'jsonb'::"public"."field_storage" NOT NULL,
    "gosiyaha_phase" smallint,
    "consumed_by_script" boolean DEFAULT false,
    "deprecated_at" timestamp with time zone,
    "replaced_by" "text"
);


ALTER TABLE "public"."field_definition" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."field_definition_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."field_definition_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."field_definition_id_seq" OWNED BY "public"."field_definition"."id";



CREATE TABLE IF NOT EXISTS "public"."generation_run" (
    "id" bigint NOT NULL,
    "dossier_id" "uuid",
    "action_id" "uuid",
    "kind" "text" NOT NULL,
    "drive_url" "text",
    "status" "text" DEFAULT 'ok'::"text" NOT NULL,
    "message" "text",
    "run_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."generation_run" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."generation_run_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."generation_run_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."generation_run_id_seq" OWNED BY "public"."generation_run"."id";



CREATE TABLE IF NOT EXISTS "public"."gosiyaha_action" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "dossier_id" "uuid" NOT NULL,
    "action_type" "public"."gs_action_type" NOT NULL,
    "market_number" "text",
    "jira_status_code" "text",
    "jira_status_changed_at" "date",
    "phase" smallint,
    "amount" numeric,
    "currency" character(3),
    "invoice_10_number" "text",
    "invoice_10_amount" numeric,
    "invoice_10_paid_on" "date",
    "invoice_90_number" "text",
    "invoice_90_amount" numeric,
    "invoice_90_paid_on" "date",
    "cancelled" boolean DEFAULT false
);


ALTER TABLE "public"."gosiyaha_action" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gosiyaha_dossier" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid",
    "legal_entity_id" "uuid",
    "code" "text",
    "owner_user" "uuid",
    "data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."gosiyaha_dossier" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gosiyaha_prerequisite" (
    "id" bigint NOT NULL,
    "action_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "label" "text" NOT NULL,
    "satisfied" boolean DEFAULT false NOT NULL,
    "satisfied_at" timestamp with time zone
);


ALTER TABLE "public"."gosiyaha_prerequisite" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."gosiyaha_prerequisite_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."gosiyaha_prerequisite_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."gosiyaha_prerequisite_id_seq" OWNED BY "public"."gosiyaha_prerequisite"."id";



CREATE TABLE IF NOT EXISTS "public"."hotel_group" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "legal_entity_id" "uuid",
    "notes" "text",
    "type" "public"."group_type" DEFAULT 'chain'::"public"."group_type" NOT NULL,
    "country" character(2),
    "main_contact" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."hotel_group" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."integration" (
    "id" integer NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "db_role" "text" NOT NULL,
    "allowed_views" "text"[] NOT NULL,
    "can_write" boolean DEFAULT false,
    "last_call_at" timestamp with time zone,
    "active" boolean DEFAULT true
);


ALTER TABLE "public"."integration" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."integration_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."integration_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."integration_id_seq" OWNED BY "public"."integration"."id";



CREATE TABLE IF NOT EXISTS "public"."jira_status" (
    "code" "text" NOT NULL,
    "label" "text" NOT NULL,
    "phase" smallint,
    "responsible" "text",
    "stall_alert_days" smallint DEFAULT 14,
    "is_terminal" boolean DEFAULT false,
    CONSTRAINT "jira_status_phase_check" CHECK ((("phase" >= 1) AND ("phase" <= 7))),
    CONSTRAINT "jira_status_responsible_check" CHECK (("responsible" = ANY (ARRAY['HWS'::"text", 'MAROCPME'::"text", 'HOTEL'::"text"])))
);


ALTER TABLE "public"."jira_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."jira_status_alias" (
    "raw_value" "text" NOT NULL,
    "status_code" "text" NOT NULL
);


ALTER TABLE "public"."jira_status_alias" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lead" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text",
    "name" "text" NOT NULL,
    "name_normalized" "text",
    "property_id" "uuid",
    "legal_entity_id" "uuid",
    "group_id" "uuid",
    "country" character(2),
    "city" "text",
    "territory_code" "text",
    "property_type" "text",
    "star_rating" "text",
    "rooms_estimate" integer,
    "website" "text",
    "current_stack_note" "text",
    "source" "text",
    "interest_products" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "stage_code" "text" DEFAULT 'new'::"text" NOT NULL,
    "status" "public"."lead_status" DEFAULT 'open'::"public"."lead_status" NOT NULL,
    "owner" "uuid",
    "next_action_date" "date",
    "next_action_note" "text",
    "expected_value" numeric(12,2),
    "expected_currency" character(3),
    "won_at" "date",
    "converted_property_id" "uuid",
    "lost_at" "date",
    "loss_reason_code" "text",
    "loss_note" "text",
    "followup_at" "date",
    "followup_done" boolean DEFAULT false NOT NULL,
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "lead_loss_note_required" CHECK ((("loss_reason_code" IS NULL) OR ("loss_reason_code" <> 'other'::"text") OR (("loss_note" IS NOT NULL) AND ("length"("btrim"("loss_note")) > 0)))),
    CONSTRAINT "lead_lost_needs_reason" CHECK ((("status" <> 'lost'::"public"."lead_status") OR ("loss_reason_code" IS NOT NULL))),
    CONSTRAINT "lead_won_needs_property" CHECK ((("status" <> 'won'::"public"."lead_status") OR ("converted_property_id" IS NOT NULL)))
);


ALTER TABLE "public"."lead" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lead_activity" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lead_id" "uuid" NOT NULL,
    "kind" "text" NOT NULL,
    "note" "text",
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."lead_activity" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lead_loss_reason" (
    "code" "text" NOT NULL,
    "label_fr" "text" NOT NULL,
    "label_en" "text" NOT NULL,
    "requires_note" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."lead_loss_reason" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lead_stage" (
    "code" "text" NOT NULL,
    "label_fr" "text" NOT NULL,
    "label_en" "text" NOT NULL,
    "position" integer NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "probability" integer,
    CONSTRAINT "lead_stage_probability_check" CHECK ((("probability" >= 0) AND ("probability" <= 100)))
);


ALTER TABLE "public"."lead_stage" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."legal_entity" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "legal_name" "text" NOT NULL,
    "legal_name_normalized" "text" GENERATED ALWAYS AS ("lower"("public"."immutable_unaccent"("legal_name"))) STORED,
    "rc_number" "text",
    "rc_date" "date",
    "rc_activity" "text",
    "ice" "text",
    "tax_id" "text",
    "capital" numeric,
    "capital_currency" character(3),
    "headcount" integer,
    "founded_on" "date",
    "address" "text",
    "city" "text",
    "country" character(2),
    "shareholding" "text",
    "director_profile" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."legal_entity" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plan" (
    "id" integer NOT NULL,
    "product_id" integer NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "roles_covered" "public"."stack_role"[] NOT NULL,
    "billing_unit" "text" DEFAULT 'licence'::"text" NOT NULL,
    "valid_from" "date",
    "valid_to" "date",
    "stance_override" "public"."hws_stance",
    "superseded_by" integer
);


ALTER TABLE "public"."plan" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."plan_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."plan_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."plan_id_seq" OWNED BY "public"."plan"."id";



CREATE TABLE IF NOT EXISTS "public"."product" (
    "id" integer NOT NULL,
    "vendor_code" "text" NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "stance" "public"."hws_stance" DEFAULT 'offer'::"public"."hws_stance" NOT NULL
);


ALTER TABLE "public"."product" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."product_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."product_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."product_id_seq" OWNED BY "public"."product"."id";



CREATE TABLE IF NOT EXISTS "public"."project" (
    "id" integer NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "partner_org" "text",
    "country" character(2),
    "city" "text",
    "owner_user" "uuid",
    "starts_on" "date",
    "ends_on" "date",
    "status" "text" DEFAULT 'active'::"text"
);


ALTER TABLE "public"."project" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."project_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."project_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."project_id_seq" OWNED BY "public"."project"."id";



CREATE TABLE IF NOT EXISTS "public"."project_membership" (
    "id" bigint NOT NULL,
    "property_id" "uuid" NOT NULL,
    "project_id" integer NOT NULL,
    "status" "public"."membership_status" DEFAULT 'member'::"public"."membership_status" NOT NULL,
    "since" "date",
    "until" "date",
    "source" "text",
    "attributes" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."project_membership" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."project_membership_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."project_membership_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."project_membership_id_seq" OWNED BY "public"."project_membership"."id";



CREATE TABLE IF NOT EXISTS "public"."property" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text",
    "name" "text" NOT NULL,
    "name_normalized" "text",
    "legal_entity_id" "uuid",
    "group_id" "uuid",
    "logo_url" "text",
    "country" character(2),
    "city" "text",
    "address" "text",
    "latitude" numeric(9,6),
    "longitude" numeric(9,6),
    "territory_code" "text",
    "property_type" "text",
    "star_rating" "text",
    "official_classification" "text",
    "rooms_total" integer,
    "rooms_online" integer,
    "opening_date" "date",
    "description" "text",
    "facilities" "text",
    "website" "text",
    "booking_engine_url" "text",
    "google_place_id" "text",
    "online_presence_score" integer,
    "online_presence_date" "date",
    "lifecycle_status" "public"."lifecycle_status" DEFAULT 'prospect'::"public"."lifecycle_status" NOT NULL,
    "sales_owner" "uuid",
    "csm_owner" "uuid",
    "billing_account_id" "uuid",
    "billing_entity_code" "text",
    "support_language" character(2),
    "support_whatsapp" "text",
    "stack_surveyed_at" "date",
    "data_owner" "uuid",
    "merged_into" "uuid",
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."property" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "property_id" "uuid" NOT NULL,
    "plan_id" integer,
    "vendor_code" "text",
    "role" "public"."stack_role" NOT NULL,
    "status" "public"."sub_status" DEFAULT 'active'::"public"."sub_status" NOT NULL,
    "is_hws_offer_override" boolean,
    "activation_date" "date",
    "renewal_date" "date",
    "commitment_months" integer,
    "notice_days" integer,
    "notice_deadline" "date" GENERATED ALWAYS AS (("renewal_date" - COALESCE("notice_days", 0))) STORED,
    "termination_date" "date",
    "churn_reason_code" "text",
    "replaced_by_subscription_id" "uuid",
    "sale_price" numeric,
    "sale_currency" character(3),
    "vendor_cost" numeric,
    "vendor_currency" character(3),
    "billing_frequency" "text",
    "billing_unit" "text",
    "pricing_cohort" "text",
    "funded_by" "text",
    "subsidy_end_date" "date",
    "onboarding_status" "text",
    "vendor_account_ref" "text",
    "reconciliation_flag" "text" DEFAULT 'ok'::"text",
    "source_note" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."subscription" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription_billing_snapshot" (
    "id" bigint NOT NULL,
    "subscription_id" "uuid" NOT NULL,
    "issued_on" "date" NOT NULL,
    "rooms_at_billing" integer,
    "amount" numeric,
    "currency" character(3),
    "plan_id" integer,
    "external_invoice_ref" "text"
);


ALTER TABLE "public"."subscription_billing_snapshot" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."subscription_billing_snapshot_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."subscription_billing_snapshot_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."subscription_billing_snapshot_id_seq" OWNED BY "public"."subscription_billing_snapshot"."id";



CREATE TABLE IF NOT EXISTS "public"."territory" (
    "code" "text" NOT NULL,
    "label_fr" "text",
    "label_en" "text",
    "country" character(2)
);


ALTER TABLE "public"."territory" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_gosiyaha_livrables" WITH ("security_invoker"='true') AS
 SELECT "p"."code" AS "Code HWS",
    ("d"."data" ->> 'Go Siyaha Name'::"text") AS "Go Siyaha Name",
    ("d"."data" ->> 'Go Siyaha Account'::"text") AS "Go Siyaha Account",
    ("d"."data" ->> 'Status Jira'::"text") AS "Status Jira",
    ("d"."data" ->> 'Nº de Marché MarocPME'::"text") AS "Nº de Marché MarocPME",
    ("d"."data" ->> 'Nom Societe RC'::"text") AS "Nom Societe RC",
    ("d"."data" ->> 'Nom Signataire'::"text") AS "Nom Signataire",
    ("d"."data" ->> 'Montant du Devis'::"text") AS "Montant du Devis",
    "d"."data" AS "_raw"
   FROM ("public"."gosiyaha_dossier" "d"
     LEFT JOIN "public"."property" "p" ON (("p"."id" = "d"."property_id")));


ALTER VIEW "public"."v_gosiyaha_livrables" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_gosiyaha_livrables" IS 'Vue de compatibilite : noms de colonnes Zoho, ne jamais renommer. A completer avec les colonnes exactes consommees par les scripts Google Apps.';



CREATE OR REPLACE VIEW "public"."v_gosiyaha_ready" AS
 SELECT "a"."id" AS "action_id",
    "d"."id" AS "dossier_id",
    "a"."action_type",
    "count"(*) FILTER (WHERE (NOT "pr"."satisfied")) AS "missing_count",
    "array_agg"("pr"."label" ORDER BY "pr"."code") FILTER (WHERE (NOT "pr"."satisfied")) AS "missing",
    ("count"(*) FILTER (WHERE (NOT "pr"."satisfied")) = 0) AS "can_generate"
   FROM (("public"."gosiyaha_action" "a"
     JOIN "public"."gosiyaha_dossier" "d" ON (("d"."id" = "a"."dossier_id")))
     LEFT JOIN "public"."gosiyaha_prerequisite" "pr" ON (("pr"."action_id" = "a"."id")))
  GROUP BY "a"."id", "d"."id", "a"."action_type";


ALTER VIEW "public"."v_gosiyaha_ready" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_gosiyaha_record" AS
 SELECT "d"."id",
    "p"."code" AS "property_code",
    "d"."code" AS "dossier_code",
    "public"."gosiyaha_record"("d"."id") AS "record"
   FROM ("public"."gosiyaha_dossier" "d"
     LEFT JOIN "public"."property" "p" ON (("p"."id" = "d"."property_id")));


ALTER VIEW "public"."v_gosiyaha_record" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_gosiyaha_record" IS 'Equivalent de GET /crm/v8/Go_Siyaha/{id} : un objet JSON clef = nom d''API Zoho.';



CREATE OR REPLACE VIEW "public"."v_property_api" WITH ("security_invoker"='true') AS
 SELECT "p"."id",
    "p"."code",
    "p"."name",
    "p"."city",
    "p"."country",
    "p"."property_type",
    "p"."star_rating",
    "p"."rooms_total",
    "p"."website",
    "p"."lifecycle_status",
    "p"."billing_entity_code",
    "le"."legal_name",
    "g"."name" AS "group_name",
    (EXISTS ( SELECT 1
           FROM (("public"."subscription" "s"
             LEFT JOIN "public"."plan" "pl" ON (("pl"."id" = "s"."plan_id")))
             LEFT JOIN "public"."product" "pr" ON (("pr"."id" = "pl"."product_id")))
          WHERE (("s"."property_id" = "p"."id") AND ("s"."status" = 'active'::"public"."sub_status") AND COALESCE("s"."is_hws_offer_override", ("pr"."stance" = 'offer'::"public"."hws_stance"), false)))) AS "is_active_client"
   FROM (("public"."property" "p"
     LEFT JOIN "public"."legal_entity" "le" ON (("le"."id" = "p"."legal_entity_id")))
     LEFT JOIN "public"."hotel_group" "g" ON (("g"."id" = "p"."group_id")))
  WHERE ("p"."merged_into" IS NULL);


ALTER VIEW "public"."v_property_api" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vendor" (
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "is_partner" boolean DEFAULT false,
    "extranet_url_template" "text"
);


ALTER TABLE "public"."vendor" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_property_stack" WITH ("security_invoker"='true') AS
 WITH "roles" AS (
         SELECT "unnest"("enum_range"(NULL::"public"."stack_role")) AS "role"
        )
 SELECT "p"."id" AS "property_id",
    "p"."code",
    "p"."name",
    "r"."role",
    "s"."id" AS "subscription_id",
    "s"."status",
    COALESCE("v"."name", "s"."vendor_code") AS "vendor",
    "pl"."name" AS "plan",
        CASE
            WHEN ("s"."id" IS NOT NULL) THEN 'filled'::"text"
            WHEN ("p"."stack_surveyed_at" IS NOT NULL) THEN 'none'::"text"
            ELSE 'unknown'::"text"
        END AS "role_state"
   FROM ((((("public"."property" "p"
     CROSS JOIN "roles" "r")
     LEFT JOIN "public"."subscription" "s" ON ((("s"."property_id" = "p"."id") AND ("s"."role" = "r"."role") AND ("s"."status" = ANY (ARRAY['active'::"public"."sub_status", 'trial'::"public"."sub_status", 'suspended'::"public"."sub_status"])))))
     LEFT JOIN "public"."plan" "pl" ON (("pl"."id" = "s"."plan_id")))
     LEFT JOIN "public"."product" "pr" ON (("pr"."id" = "pl"."product_id")))
     LEFT JOIN "public"."vendor" "v" ON (("v"."code" = COALESCE("pr"."vendor_code", "s"."vendor_code"))));


ALTER VIEW "public"."v_property_stack" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."zoho_field_map" (
    "api_name" "text" NOT NULL,
    "field_label" "text" NOT NULL,
    "data_type" "text",
    "read_only" boolean DEFAULT false,
    "is_formula" boolean DEFAULT false,
    "used_by_script" boolean DEFAULT false,
    "crm_destination" "text"
);


ALTER TABLE "public"."zoho_field_map" OWNER TO "postgres";


ALTER TABLE ONLY "public"."audit_log" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."audit_log_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."city" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."city_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."external_id" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."external_id_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."field_definition" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."field_definition_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."generation_run" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."generation_run_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."gosiyaha_prerequisite" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."gosiyaha_prerequisite_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."integration" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."integration_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."plan" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."plan_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."product" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."product_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."project" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."project_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."project_membership" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."project_membership_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."subscription_billing_snapshot" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."subscription_billing_snapshot_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."app_user"
    ADD CONSTRAINT "app_user_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_account"
    ADD CONSTRAINT "billing_account_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_entity"
    ADD CONSTRAINT "billing_entity_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."churn_reason"
    ADD CONSTRAINT "churn_reason_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."city"
    ADD CONSTRAINT "city_name_normalized_country_key" UNIQUE ("name_normalized", "country");



ALTER TABLE ONLY "public"."city"
    ADD CONSTRAINT "city_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contact"
    ADD CONSTRAINT "contact_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contact_role"
    ADD CONSTRAINT "contact_role_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."document"
    ADD CONSTRAINT "document_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."document_type"
    ADD CONSTRAINT "document_type_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."external_id"
    ADD CONSTRAINT "external_id_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."external_id"
    ADD CONSTRAINT "external_id_system_value_key" UNIQUE ("system", "value");



ALTER TABLE ONLY "public"."field_definition"
    ADD CONSTRAINT "field_definition_entity_api_name_key" UNIQUE ("entity", "api_name");



ALTER TABLE ONLY "public"."field_definition"
    ADD CONSTRAINT "field_definition_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."generation_run"
    ADD CONSTRAINT "generation_run_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gosiyaha_action"
    ADD CONSTRAINT "gosiyaha_action_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gosiyaha_dossier"
    ADD CONSTRAINT "gosiyaha_dossier_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gosiyaha_prerequisite"
    ADD CONSTRAINT "gosiyaha_prerequisite_action_id_code_key" UNIQUE ("action_id", "code");



ALTER TABLE ONLY "public"."gosiyaha_prerequisite"
    ADD CONSTRAINT "gosiyaha_prerequisite_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."hotel_group"
    ADD CONSTRAINT "hotel_group_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."hotel_group"
    ADD CONSTRAINT "hotel_group_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."integration"
    ADD CONSTRAINT "integration_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."integration"
    ADD CONSTRAINT "integration_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."jira_status_alias"
    ADD CONSTRAINT "jira_status_alias_pkey" PRIMARY KEY ("raw_value");



ALTER TABLE ONLY "public"."jira_status"
    ADD CONSTRAINT "jira_status_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."lead_activity"
    ADD CONSTRAINT "lead_activity_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lead"
    ADD CONSTRAINT "lead_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."lead_loss_reason"
    ADD CONSTRAINT "lead_loss_reason_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."lead"
    ADD CONSTRAINT "lead_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lead_stage"
    ADD CONSTRAINT "lead_stage_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."legal_entity"
    ADD CONSTRAINT "legal_entity_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plan"
    ADD CONSTRAINT "plan_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plan"
    ADD CONSTRAINT "plan_product_id_code_key" UNIQUE ("product_id", "code");



ALTER TABLE ONLY "public"."product"
    ADD CONSTRAINT "product_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product"
    ADD CONSTRAINT "product_vendor_code_code_key" UNIQUE ("vendor_code", "code");



ALTER TABLE ONLY "public"."project"
    ADD CONSTRAINT "project_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."project_membership"
    ADD CONSTRAINT "project_membership_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_membership"
    ADD CONSTRAINT "project_membership_property_id_project_id_key" UNIQUE ("property_id", "project_id");



ALTER TABLE ONLY "public"."project"
    ADD CONSTRAINT "project_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."property"
    ADD CONSTRAINT "property_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."property"
    ADD CONSTRAINT "property_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_billing_snapshot"
    ADD CONSTRAINT "subscription_billing_snapshot_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription"
    ADD CONSTRAINT "subscription_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."territory"
    ADD CONSTRAINT "territory_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."vendor"
    ADD CONSTRAINT "vendor_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."zoho_field_map"
    ADD CONSTRAINT "zoho_field_map_pkey" PRIMARY KEY ("api_name");



CREATE INDEX "audit_log_entity_entity_id_idx" ON "public"."audit_log" USING "btree" ("entity", "entity_id");



CREATE INDEX "contact_lead_idx" ON "public"."contact" USING "btree" ("lead_id");



CREATE INDEX "contact_property_id_idx" ON "public"."contact" USING "btree" ("property_id");



CREATE INDEX "external_id_property_id_idx" ON "public"."external_id" USING "btree" ("property_id");



CREATE INDEX "generation_run_dossier_id_kind_idx" ON "public"."generation_run" USING "btree" ("dossier_id", "kind");



CREATE INDEX "gosiyaha_action_jira_status_code_idx" ON "public"."gosiyaha_action" USING "btree" ("jira_status_code");



CREATE INDEX "gosiyaha_dossier_data_idx" ON "public"."gosiyaha_dossier" USING "gin" ("data");



CREATE INDEX "gosiyaha_dossier_property_id_idx" ON "public"."gosiyaha_dossier" USING "btree" ("property_id");



CREATE INDEX "lead_activity_lead_idx" ON "public"."lead_activity" USING "btree" ("lead_id", "occurred_at" DESC);



CREATE INDEX "lead_followup_idx" ON "public"."lead" USING "btree" ("followup_at") WHERE (("status" = 'lost'::"public"."lead_status") AND ("followup_done" = false));



CREATE INDEX "lead_owner_idx" ON "public"."lead" USING "btree" ("owner") WHERE ("status" = 'open'::"public"."lead_status");



CREATE INDEX "lead_property_idx" ON "public"."lead" USING "btree" ("property_id");



CREATE INDEX "lead_stage_idx" ON "public"."lead" USING "btree" ("stage_code") WHERE ("status" = 'open'::"public"."lead_status");



CREATE UNIQUE INDEX "legal_entity_legal_name_normalized_country_idx" ON "public"."legal_entity" USING "btree" ("legal_name_normalized", "country");



CREATE INDEX "property_custom_fields_idx" ON "public"."property" USING "gin" ("custom_fields");



CREATE INDEX "property_lifecycle_status_idx" ON "public"."property" USING "btree" ("lifecycle_status");



CREATE INDEX "property_name_normalized_idx" ON "public"."property" USING "btree" ("name_normalized");



CREATE INDEX "subscription_property_id_role_idx" ON "public"."subscription" USING "btree" ("property_id", "role");



CREATE INDEX "subscription_renewal_date_idx" ON "public"."subscription" USING "btree" ("renewal_date") WHERE ("status" = 'active'::"public"."sub_status");



CREATE INDEX "zoho_field_map_field_label_idx" ON "public"."zoho_field_map" USING "btree" ("field_label");



CREATE OR REPLACE TRIGGER "lead_before_write" BEFORE INSERT OR UPDATE ON "public"."lead" FOR EACH ROW EXECUTE FUNCTION "public"."lead_set_followup"();



CREATE OR REPLACE TRIGGER "property_name_normalized_trigger" BEFORE INSERT OR UPDATE OF "name" ON "public"."property" FOR EACH ROW EXECUTE FUNCTION "public"."property_set_name_normalized"();



ALTER TABLE ONLY "public"."app_user"
    ADD CONSTRAINT "app_user_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."billing_account"
    ADD CONSTRAINT "billing_account_billing_entity_code_fkey" FOREIGN KEY ("billing_entity_code") REFERENCES "public"."billing_entity"("code");



ALTER TABLE ONLY "public"."billing_account"
    ADD CONSTRAINT "billing_account_legal_entity_id_fkey" FOREIGN KEY ("legal_entity_id") REFERENCES "public"."legal_entity"("id");



ALTER TABLE ONLY "public"."contact"
    ADD CONSTRAINT "contact_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."lead"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contact"
    ADD CONSTRAINT "contact_legal_entity_id_fkey" FOREIGN KEY ("legal_entity_id") REFERENCES "public"."legal_entity"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contact"
    ADD CONSTRAINT "contact_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."property"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."document"
    ADD CONSTRAINT "document_dossier_id_fkey" FOREIGN KEY ("dossier_id") REFERENCES "public"."gosiyaha_dossier"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."document"
    ADD CONSTRAINT "document_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."property"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."document"
    ADD CONSTRAINT "document_type_code_fkey" FOREIGN KEY ("type_code") REFERENCES "public"."document_type"("code");



ALTER TABLE ONLY "public"."external_id"
    ADD CONSTRAINT "external_id_legal_entity_id_fkey" FOREIGN KEY ("legal_entity_id") REFERENCES "public"."legal_entity"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."external_id"
    ADD CONSTRAINT "external_id_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."property"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."generation_run"
    ADD CONSTRAINT "generation_run_action_id_fkey" FOREIGN KEY ("action_id") REFERENCES "public"."gosiyaha_action"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."generation_run"
    ADD CONSTRAINT "generation_run_dossier_id_fkey" FOREIGN KEY ("dossier_id") REFERENCES "public"."gosiyaha_dossier"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gosiyaha_action"
    ADD CONSTRAINT "gosiyaha_action_dossier_id_fkey" FOREIGN KEY ("dossier_id") REFERENCES "public"."gosiyaha_dossier"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gosiyaha_action"
    ADD CONSTRAINT "gosiyaha_action_jira_status_code_fkey" FOREIGN KEY ("jira_status_code") REFERENCES "public"."jira_status"("code");



ALTER TABLE ONLY "public"."gosiyaha_dossier"
    ADD CONSTRAINT "gosiyaha_dossier_legal_entity_id_fkey" FOREIGN KEY ("legal_entity_id") REFERENCES "public"."legal_entity"("id");



ALTER TABLE ONLY "public"."gosiyaha_dossier"
    ADD CONSTRAINT "gosiyaha_dossier_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."property"("id");



ALTER TABLE ONLY "public"."gosiyaha_prerequisite"
    ADD CONSTRAINT "gosiyaha_prerequisite_action_id_fkey" FOREIGN KEY ("action_id") REFERENCES "public"."gosiyaha_action"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."hotel_group"
    ADD CONSTRAINT "hotel_group_legal_entity_id_fkey" FOREIGN KEY ("legal_entity_id") REFERENCES "public"."legal_entity"("id");



ALTER TABLE ONLY "public"."jira_status_alias"
    ADD CONSTRAINT "jira_status_alias_status_code_fkey" FOREIGN KEY ("status_code") REFERENCES "public"."jira_status"("code");



ALTER TABLE ONLY "public"."lead_activity"
    ADD CONSTRAINT "lead_activity_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."app_user"("id");



ALTER TABLE ONLY "public"."lead_activity"
    ADD CONSTRAINT "lead_activity_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."lead"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lead"
    ADD CONSTRAINT "lead_converted_property_id_fkey" FOREIGN KEY ("converted_property_id") REFERENCES "public"."property"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lead"
    ADD CONSTRAINT "lead_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."hotel_group"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lead"
    ADD CONSTRAINT "lead_legal_entity_id_fkey" FOREIGN KEY ("legal_entity_id") REFERENCES "public"."legal_entity"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lead"
    ADD CONSTRAINT "lead_loss_reason_code_fkey" FOREIGN KEY ("loss_reason_code") REFERENCES "public"."lead_loss_reason"("code");



ALTER TABLE ONLY "public"."lead"
    ADD CONSTRAINT "lead_owner_fkey" FOREIGN KEY ("owner") REFERENCES "public"."app_user"("id");



ALTER TABLE ONLY "public"."lead"
    ADD CONSTRAINT "lead_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."property"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lead"
    ADD CONSTRAINT "lead_stage_code_fkey" FOREIGN KEY ("stage_code") REFERENCES "public"."lead_stage"("code");



ALTER TABLE ONLY "public"."lead"
    ADD CONSTRAINT "lead_territory_code_fkey" FOREIGN KEY ("territory_code") REFERENCES "public"."territory"("code");



ALTER TABLE ONLY "public"."plan"
    ADD CONSTRAINT "plan_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id");



ALTER TABLE ONLY "public"."plan"
    ADD CONSTRAINT "plan_superseded_by_fkey" FOREIGN KEY ("superseded_by") REFERENCES "public"."plan"("id");



ALTER TABLE ONLY "public"."product"
    ADD CONSTRAINT "product_vendor_code_fkey" FOREIGN KEY ("vendor_code") REFERENCES "public"."vendor"("code");



ALTER TABLE ONLY "public"."project_membership"
    ADD CONSTRAINT "project_membership_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_membership"
    ADD CONSTRAINT "project_membership_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."property"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property"
    ADD CONSTRAINT "property_billing_account_id_fkey" FOREIGN KEY ("billing_account_id") REFERENCES "public"."billing_account"("id");



ALTER TABLE ONLY "public"."property"
    ADD CONSTRAINT "property_billing_entity_code_fkey" FOREIGN KEY ("billing_entity_code") REFERENCES "public"."billing_entity"("code");



ALTER TABLE ONLY "public"."property"
    ADD CONSTRAINT "property_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."hotel_group"("id");



ALTER TABLE ONLY "public"."property"
    ADD CONSTRAINT "property_legal_entity_id_fkey" FOREIGN KEY ("legal_entity_id") REFERENCES "public"."legal_entity"("id");



ALTER TABLE ONLY "public"."property"
    ADD CONSTRAINT "property_merged_into_fkey" FOREIGN KEY ("merged_into") REFERENCES "public"."property"("id");



ALTER TABLE ONLY "public"."property"
    ADD CONSTRAINT "property_territory_code_fkey" FOREIGN KEY ("territory_code") REFERENCES "public"."territory"("code");



ALTER TABLE ONLY "public"."subscription_billing_snapshot"
    ADD CONSTRAINT "subscription_billing_snapshot_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."plan"("id");



ALTER TABLE ONLY "public"."subscription_billing_snapshot"
    ADD CONSTRAINT "subscription_billing_snapshot_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscription"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscription"
    ADD CONSTRAINT "subscription_churn_reason_code_fkey" FOREIGN KEY ("churn_reason_code") REFERENCES "public"."churn_reason"("code");



ALTER TABLE ONLY "public"."subscription"
    ADD CONSTRAINT "subscription_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."plan"("id");



ALTER TABLE ONLY "public"."subscription"
    ADD CONSTRAINT "subscription_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."property"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscription"
    ADD CONSTRAINT "subscription_replaced_by_subscription_id_fkey" FOREIGN KEY ("replaced_by_subscription_id") REFERENCES "public"."subscription"("id");



ALTER TABLE ONLY "public"."subscription"
    ADD CONSTRAINT "subscription_vendor_code_fkey" FOREIGN KEY ("vendor_code") REFERENCES "public"."vendor"("code");



ALTER TABLE "public"."app_user" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "app_user_admin_write" ON "public"."app_user" TO "authenticated" USING (("public"."current_app_role"() = 'admin'::"public"."app_role")) WITH CHECK (("public"."current_app_role"() = 'admin'::"public"."app_role"));



CREATE POLICY "app_user_select" ON "public"."app_user" FOR SELECT TO "authenticated" USING ((("id" = "auth"."uid"()) OR ("public"."current_app_role"() = 'admin'::"public"."app_role")));



ALTER TABLE "public"."audit_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_log_insert" ON "public"."audit_log" FOR INSERT TO "authenticated" WITH CHECK (("public"."current_app_role"() = ANY (ARRAY['admin'::"public"."app_role", 'sales'::"public"."app_role"])));



CREATE POLICY "audit_log_select_admin" ON "public"."audit_log" FOR SELECT TO "authenticated" USING (("public"."current_app_role"() = 'admin'::"public"."app_role"));



ALTER TABLE "public"."billing_account" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "billing_account_read" ON "public"."billing_account" FOR SELECT TO "authenticated" USING ("public"."is_active_staff"());



CREATE POLICY "billing_account_write" ON "public"."billing_account" TO "authenticated" USING (("public"."current_app_role"() = ANY (ARRAY['admin'::"public"."app_role", 'sales'::"public"."app_role"]))) WITH CHECK (("public"."current_app_role"() = ANY (ARRAY['admin'::"public"."app_role", 'sales'::"public"."app_role"])));



ALTER TABLE "public"."billing_entity" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "billing_entity_admin_write" ON "public"."billing_entity" TO "authenticated" USING (("public"."current_app_role"() = 'admin'::"public"."app_role")) WITH CHECK (("public"."current_app_role"() = 'admin'::"public"."app_role"));



CREATE POLICY "billing_entity_read" ON "public"."billing_entity" FOR SELECT TO "authenticated" USING ("public"."is_active_staff"());



ALTER TABLE "public"."churn_reason" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "churn_reason_admin_write" ON "public"."churn_reason" TO "authenticated" USING (("public"."current_app_role"() = 'admin'::"public"."app_role")) WITH CHECK (("public"."current_app_role"() = 'admin'::"public"."app_role"));



CREATE POLICY "churn_reason_read" ON "public"."churn_reason" FOR SELECT TO "authenticated" USING ("public"."is_active_staff"());



ALTER TABLE "public"."city" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "city_admin_write" ON "public"."city" TO "authenticated" USING (("public"."current_app_role"() = 'admin'::"public"."app_role")) WITH CHECK (("public"."current_app_role"() = 'admin'::"public"."app_role"));



CREATE POLICY "city_read" ON "public"."city" FOR SELECT TO "authenticated" USING ("public"."is_active_staff"());



ALTER TABLE "public"."contact" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "contact_read" ON "public"."contact" FOR SELECT TO "authenticated" USING ("public"."is_active_staff"());



ALTER TABLE "public"."contact_role" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "contact_role_admin_write" ON "public"."contact_role" TO "authenticated" USING (("public"."current_app_role"() = 'admin'::"public"."app_role")) WITH CHECK (("public"."current_app_role"() = 'admin'::"public"."app_role"));



CREATE POLICY "contact_role_read" ON "public"."contact_role" FOR SELECT TO "authenticated" USING ("public"."is_active_staff"());



CREATE POLICY "contact_write" ON "public"."contact" TO "authenticated" USING (("public"."current_app_role"() = ANY (ARRAY['admin'::"public"."app_role", 'sales'::"public"."app_role"]))) WITH CHECK (("public"."current_app_role"() = ANY (ARRAY['admin'::"public"."app_role", 'sales'::"public"."app_role"])));



ALTER TABLE "public"."document" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "document_read" ON "public"."document" FOR SELECT TO "authenticated" USING ("public"."is_active_staff"());



ALTER TABLE "public"."document_type" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "document_type_admin_write" ON "public"."document_type" TO "authenticated" USING (("public"."current_app_role"() = 'admin'::"public"."app_role")) WITH CHECK (("public"."current_app_role"() = 'admin'::"public"."app_role"));



CREATE POLICY "document_type_read" ON "public"."document_type" FOR SELECT TO "authenticated" USING ("public"."is_active_staff"());



CREATE POLICY "document_write" ON "public"."document" TO "authenticated" USING (("public"."current_app_role"() = ANY (ARRAY['admin'::"public"."app_role", 'sales'::"public"."app_role"]))) WITH CHECK (("public"."current_app_role"() = ANY (ARRAY['admin'::"public"."app_role", 'sales'::"public"."app_role"])));



ALTER TABLE "public"."external_id" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "external_id_read" ON "public"."external_id" FOR SELECT TO "authenticated" USING ("public"."is_active_staff"());



CREATE POLICY "external_id_write" ON "public"."external_id" TO "authenticated" USING (("public"."current_app_role"() = ANY (ARRAY['admin'::"public"."app_role", 'sales'::"public"."app_role"]))) WITH CHECK (("public"."current_app_role"() = ANY (ARRAY['admin'::"public"."app_role", 'sales'::"public"."app_role"])));



ALTER TABLE "public"."field_definition" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "field_definition_admin_write" ON "public"."field_definition" TO "authenticated" USING (("public"."current_app_role"() = 'admin'::"public"."app_role")) WITH CHECK (("public"."current_app_role"() = 'admin'::"public"."app_role"));



CREATE POLICY "field_definition_read" ON "public"."field_definition" FOR SELECT TO "authenticated" USING ("public"."is_active_staff"());



ALTER TABLE "public"."generation_run" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "generation_run_read" ON "public"."generation_run" FOR SELECT TO "authenticated" USING ("public"."is_active_staff"());



CREATE POLICY "generation_run_write" ON "public"."generation_run" TO "authenticated" USING (("public"."current_app_role"() = ANY (ARRAY['admin'::"public"."app_role", 'sales'::"public"."app_role"]))) WITH CHECK (("public"."current_app_role"() = ANY (ARRAY['admin'::"public"."app_role", 'sales'::"public"."app_role"])));



ALTER TABLE "public"."gosiyaha_action" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "gosiyaha_action_read" ON "public"."gosiyaha_action" FOR SELECT TO "authenticated" USING ("public"."is_active_staff"());



CREATE POLICY "gosiyaha_action_write" ON "public"."gosiyaha_action" TO "authenticated" USING (("public"."current_app_role"() = ANY (ARRAY['admin'::"public"."app_role", 'sales'::"public"."app_role"]))) WITH CHECK (("public"."current_app_role"() = ANY (ARRAY['admin'::"public"."app_role", 'sales'::"public"."app_role"])));



ALTER TABLE "public"."gosiyaha_dossier" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "gosiyaha_dossier_read" ON "public"."gosiyaha_dossier" FOR SELECT TO "authenticated" USING ("public"."is_active_staff"());



CREATE POLICY "gosiyaha_dossier_write" ON "public"."gosiyaha_dossier" TO "authenticated" USING (("public"."current_app_role"() = ANY (ARRAY['admin'::"public"."app_role", 'sales'::"public"."app_role"]))) WITH CHECK (("public"."current_app_role"() = ANY (ARRAY['admin'::"public"."app_role", 'sales'::"public"."app_role"])));



ALTER TABLE "public"."gosiyaha_prerequisite" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "gosiyaha_prerequisite_read" ON "public"."gosiyaha_prerequisite" FOR SELECT TO "authenticated" USING ("public"."is_active_staff"());



CREATE POLICY "gosiyaha_prerequisite_write" ON "public"."gosiyaha_prerequisite" TO "authenticated" USING (("public"."current_app_role"() = ANY (ARRAY['admin'::"public"."app_role", 'sales'::"public"."app_role"]))) WITH CHECK (("public"."current_app_role"() = ANY (ARRAY['admin'::"public"."app_role", 'sales'::"public"."app_role"])));



ALTER TABLE "public"."hotel_group" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hotel_group_read" ON "public"."hotel_group" FOR SELECT TO "authenticated" USING ("public"."is_active_staff"());



CREATE POLICY "hotel_group_write" ON "public"."hotel_group" TO "authenticated" USING (("public"."current_app_role"() = ANY (ARRAY['admin'::"public"."app_role", 'sales'::"public"."app_role"]))) WITH CHECK (("public"."current_app_role"() = ANY (ARRAY['admin'::"public"."app_role", 'sales'::"public"."app_role"])));



ALTER TABLE "public"."integration" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "integration_admin_write" ON "public"."integration" TO "authenticated" USING (("public"."current_app_role"() = 'admin'::"public"."app_role")) WITH CHECK (("public"."current_app_role"() = 'admin'::"public"."app_role"));



CREATE POLICY "integration_read" ON "public"."integration" FOR SELECT TO "authenticated" USING ("public"."is_active_staff"());



ALTER TABLE "public"."jira_status" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "jira_status_admin_write" ON "public"."jira_status" TO "authenticated" USING (("public"."current_app_role"() = 'admin'::"public"."app_role")) WITH CHECK (("public"."current_app_role"() = 'admin'::"public"."app_role"));



ALTER TABLE "public"."jira_status_alias" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "jira_status_alias_admin_write" ON "public"."jira_status_alias" TO "authenticated" USING (("public"."current_app_role"() = 'admin'::"public"."app_role")) WITH CHECK (("public"."current_app_role"() = 'admin'::"public"."app_role"));



CREATE POLICY "jira_status_alias_read" ON "public"."jira_status_alias" FOR SELECT TO "authenticated" USING ("public"."is_active_staff"());



CREATE POLICY "jira_status_read" ON "public"."jira_status" FOR SELECT TO "authenticated" USING ("public"."is_active_staff"());



ALTER TABLE "public"."lead" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lead_activity" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lead_loss_reason" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lead_stage" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."legal_entity" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "legal_entity_read" ON "public"."legal_entity" FOR SELECT TO "authenticated" USING ("public"."is_active_staff"());



CREATE POLICY "legal_entity_write" ON "public"."legal_entity" TO "authenticated" USING (("public"."current_app_role"() = ANY (ARRAY['admin'::"public"."app_role", 'sales'::"public"."app_role"]))) WITH CHECK (("public"."current_app_role"() = ANY (ARRAY['admin'::"public"."app_role", 'sales'::"public"."app_role"])));



ALTER TABLE "public"."plan" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "plan_admin_write" ON "public"."plan" TO "authenticated" USING (("public"."current_app_role"() = 'admin'::"public"."app_role")) WITH CHECK (("public"."current_app_role"() = 'admin'::"public"."app_role"));



CREATE POLICY "plan_read" ON "public"."plan" FOR SELECT TO "authenticated" USING ("public"."is_active_staff"());



ALTER TABLE "public"."product" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "product_admin_write" ON "public"."product" TO "authenticated" USING (("public"."current_app_role"() = 'admin'::"public"."app_role")) WITH CHECK (("public"."current_app_role"() = 'admin'::"public"."app_role"));



CREATE POLICY "product_read" ON "public"."product" FOR SELECT TO "authenticated" USING ("public"."is_active_staff"());



ALTER TABLE "public"."project" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "project_admin_write" ON "public"."project" TO "authenticated" USING (("public"."current_app_role"() = 'admin'::"public"."app_role")) WITH CHECK (("public"."current_app_role"() = 'admin'::"public"."app_role"));



ALTER TABLE "public"."project_membership" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "project_membership_read" ON "public"."project_membership" FOR SELECT TO "authenticated" USING ("public"."is_active_staff"());



CREATE POLICY "project_membership_write" ON "public"."project_membership" TO "authenticated" USING (("public"."current_app_role"() = ANY (ARRAY['admin'::"public"."app_role", 'sales'::"public"."app_role"]))) WITH CHECK (("public"."current_app_role"() = ANY (ARRAY['admin'::"public"."app_role", 'sales'::"public"."app_role"])));



CREATE POLICY "project_read" ON "public"."project" FOR SELECT TO "authenticated" USING ("public"."is_active_staff"());



ALTER TABLE "public"."property" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "property_read" ON "public"."property" FOR SELECT TO "authenticated" USING ("public"."is_active_staff"());



CREATE POLICY "property_write" ON "public"."property" TO "authenticated" USING (("public"."current_app_role"() = ANY (ARRAY['admin'::"public"."app_role", 'sales'::"public"."app_role"]))) WITH CHECK (("public"."current_app_role"() = ANY (ARRAY['admin'::"public"."app_role", 'sales'::"public"."app_role"])));



ALTER TABLE "public"."subscription" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscription_billing_snapshot" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "subscription_billing_snapshot_read" ON "public"."subscription_billing_snapshot" FOR SELECT TO "authenticated" USING ("public"."is_active_staff"());



CREATE POLICY "subscription_billing_snapshot_write" ON "public"."subscription_billing_snapshot" TO "authenticated" USING (("public"."current_app_role"() = ANY (ARRAY['admin'::"public"."app_role", 'sales'::"public"."app_role"]))) WITH CHECK (("public"."current_app_role"() = ANY (ARRAY['admin'::"public"."app_role", 'sales'::"public"."app_role"])));



CREATE POLICY "subscription_read" ON "public"."subscription" FOR SELECT TO "authenticated" USING ("public"."is_active_staff"());



CREATE POLICY "subscription_write" ON "public"."subscription" TO "authenticated" USING (("public"."current_app_role"() = ANY (ARRAY['admin'::"public"."app_role", 'sales'::"public"."app_role"]))) WITH CHECK (("public"."current_app_role"() = ANY (ARRAY['admin'::"public"."app_role", 'sales'::"public"."app_role"])));



ALTER TABLE "public"."territory" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "territory_admin_write" ON "public"."territory" TO "authenticated" USING (("public"."current_app_role"() = 'admin'::"public"."app_role")) WITH CHECK (("public"."current_app_role"() = 'admin'::"public"."app_role"));



CREATE POLICY "territory_read" ON "public"."territory" FOR SELECT TO "authenticated" USING ("public"."is_active_staff"());



ALTER TABLE "public"."vendor" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "vendor_admin_write" ON "public"."vendor" TO "authenticated" USING (("public"."current_app_role"() = 'admin'::"public"."app_role")) WITH CHECK (("public"."current_app_role"() = 'admin'::"public"."app_role"));



CREATE POLICY "vendor_read" ON "public"."vendor" FOR SELECT TO "authenticated" USING ("public"."is_active_staff"());



ALTER TABLE "public"."zoho_field_map" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "zoho_field_map_admin_write" ON "public"."zoho_field_map" TO "authenticated" USING (("public"."current_app_role"() = 'admin'::"public"."app_role")) WITH CHECK (("public"."current_app_role"() = 'admin'::"public"."app_role"));



CREATE POLICY "zoho_field_map_read" ON "public"."zoho_field_map" FOR SELECT TO "authenticated" USING ("public"."is_active_staff"());





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































REVOKE ALL ON FUNCTION "public"."current_app_role"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_app_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_app_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."gosiyaha_logo_url"("p_dossier_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."gosiyaha_logo_url"("p_dossier_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gosiyaha_logo_url"("p_dossier_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."gosiyaha_record"("p_dossier_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."gosiyaha_record"("p_dossier_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gosiyaha_record"("p_dossier_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."gosiyaha_search_trigger"("p_trigger" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."gosiyaha_search_trigger"("p_trigger" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gosiyaha_search_trigger"("p_trigger" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."gosiyaha_write_back"("p_dossier_id" "uuid", "p_kind" "text", "p_url" "text", "p_status" "text", "p_message" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."gosiyaha_write_back"("p_dossier_id" "uuid", "p_kind" "text", "p_url" "text", "p_status" "text", "p_message" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gosiyaha_write_back"("p_dossier_id" "uuid", "p_kind" "text", "p_url" "text", "p_status" "text", "p_message" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_auth_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."immutable_unaccent"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."immutable_unaccent"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."immutable_unaccent"("text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_active_staff"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_active_staff"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_active_staff"() TO "service_role";



GRANT ALL ON FUNCTION "public"."lead_set_followup"() TO "anon";
GRANT ALL ON FUNCTION "public"."lead_set_followup"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."lead_set_followup"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."next_property_code"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."next_property_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."next_property_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."next_property_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."property_set_name_normalized"() TO "anon";
GRANT ALL ON FUNCTION "public"."property_set_name_normalized"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."property_set_name_normalized"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."unaccent"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."unaccent"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."unaccent"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unaccent"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."unaccent"("regdictionary", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."unaccent"("regdictionary", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."unaccent"("regdictionary", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unaccent"("regdictionary", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."unaccent_init"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."unaccent_init"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."unaccent_init"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unaccent_init"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."unaccent_lexize"("internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."unaccent_lexize"("internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."unaccent_lexize"("internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unaccent_lexize"("internal", "internal", "internal", "internal") TO "service_role";


















GRANT ALL ON TABLE "public"."app_user" TO "anon";
GRANT ALL ON TABLE "public"."app_user" TO "authenticated";
GRANT ALL ON TABLE "public"."app_user" TO "service_role";



GRANT ALL ON TABLE "public"."audit_log" TO "anon";
GRANT ALL ON TABLE "public"."audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_log" TO "service_role";



GRANT ALL ON SEQUENCE "public"."audit_log_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."audit_log_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."audit_log_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."billing_account" TO "anon";
GRANT ALL ON TABLE "public"."billing_account" TO "authenticated";
GRANT ALL ON TABLE "public"."billing_account" TO "service_role";



GRANT ALL ON TABLE "public"."billing_entity" TO "anon";
GRANT ALL ON TABLE "public"."billing_entity" TO "authenticated";
GRANT ALL ON TABLE "public"."billing_entity" TO "service_role";



GRANT ALL ON TABLE "public"."churn_reason" TO "anon";
GRANT ALL ON TABLE "public"."churn_reason" TO "authenticated";
GRANT ALL ON TABLE "public"."churn_reason" TO "service_role";



GRANT ALL ON TABLE "public"."city" TO "anon";
GRANT ALL ON TABLE "public"."city" TO "authenticated";
GRANT ALL ON TABLE "public"."city" TO "service_role";



GRANT ALL ON SEQUENCE "public"."city_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."city_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."city_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."contact" TO "anon";
GRANT ALL ON TABLE "public"."contact" TO "authenticated";
GRANT ALL ON TABLE "public"."contact" TO "service_role";



GRANT ALL ON TABLE "public"."contact_role" TO "anon";
GRANT ALL ON TABLE "public"."contact_role" TO "authenticated";
GRANT ALL ON TABLE "public"."contact_role" TO "service_role";



GRANT ALL ON TABLE "public"."document" TO "anon";
GRANT ALL ON TABLE "public"."document" TO "authenticated";
GRANT ALL ON TABLE "public"."document" TO "service_role";



GRANT ALL ON TABLE "public"."document_type" TO "anon";
GRANT ALL ON TABLE "public"."document_type" TO "authenticated";
GRANT ALL ON TABLE "public"."document_type" TO "service_role";



GRANT ALL ON TABLE "public"."external_id" TO "anon";
GRANT ALL ON TABLE "public"."external_id" TO "authenticated";
GRANT ALL ON TABLE "public"."external_id" TO "service_role";



GRANT ALL ON SEQUENCE "public"."external_id_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."external_id_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."external_id_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."field_definition" TO "anon";
GRANT ALL ON TABLE "public"."field_definition" TO "authenticated";
GRANT ALL ON TABLE "public"."field_definition" TO "service_role";



GRANT ALL ON SEQUENCE "public"."field_definition_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."field_definition_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."field_definition_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."generation_run" TO "anon";
GRANT ALL ON TABLE "public"."generation_run" TO "authenticated";
GRANT ALL ON TABLE "public"."generation_run" TO "service_role";



GRANT ALL ON SEQUENCE "public"."generation_run_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."generation_run_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."generation_run_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."gosiyaha_action" TO "anon";
GRANT ALL ON TABLE "public"."gosiyaha_action" TO "authenticated";
GRANT ALL ON TABLE "public"."gosiyaha_action" TO "service_role";



GRANT ALL ON TABLE "public"."gosiyaha_dossier" TO "anon";
GRANT ALL ON TABLE "public"."gosiyaha_dossier" TO "authenticated";
GRANT ALL ON TABLE "public"."gosiyaha_dossier" TO "service_role";



GRANT ALL ON TABLE "public"."gosiyaha_prerequisite" TO "anon";
GRANT ALL ON TABLE "public"."gosiyaha_prerequisite" TO "authenticated";
GRANT ALL ON TABLE "public"."gosiyaha_prerequisite" TO "service_role";



GRANT ALL ON SEQUENCE "public"."gosiyaha_prerequisite_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."gosiyaha_prerequisite_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."gosiyaha_prerequisite_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."hotel_group" TO "anon";
GRANT ALL ON TABLE "public"."hotel_group" TO "authenticated";
GRANT ALL ON TABLE "public"."hotel_group" TO "service_role";



GRANT ALL ON TABLE "public"."integration" TO "anon";
GRANT ALL ON TABLE "public"."integration" TO "authenticated";
GRANT ALL ON TABLE "public"."integration" TO "service_role";



GRANT ALL ON SEQUENCE "public"."integration_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."integration_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."integration_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."jira_status" TO "anon";
GRANT ALL ON TABLE "public"."jira_status" TO "authenticated";
GRANT ALL ON TABLE "public"."jira_status" TO "service_role";



GRANT ALL ON TABLE "public"."jira_status_alias" TO "anon";
GRANT ALL ON TABLE "public"."jira_status_alias" TO "authenticated";
GRANT ALL ON TABLE "public"."jira_status_alias" TO "service_role";



GRANT ALL ON TABLE "public"."lead" TO "anon";
GRANT ALL ON TABLE "public"."lead" TO "authenticated";
GRANT ALL ON TABLE "public"."lead" TO "service_role";



GRANT ALL ON TABLE "public"."lead_activity" TO "anon";
GRANT ALL ON TABLE "public"."lead_activity" TO "authenticated";
GRANT ALL ON TABLE "public"."lead_activity" TO "service_role";



GRANT ALL ON TABLE "public"."lead_loss_reason" TO "anon";
GRANT ALL ON TABLE "public"."lead_loss_reason" TO "authenticated";
GRANT ALL ON TABLE "public"."lead_loss_reason" TO "service_role";



GRANT ALL ON TABLE "public"."lead_stage" TO "anon";
GRANT ALL ON TABLE "public"."lead_stage" TO "authenticated";
GRANT ALL ON TABLE "public"."lead_stage" TO "service_role";



GRANT ALL ON TABLE "public"."legal_entity" TO "anon";
GRANT ALL ON TABLE "public"."legal_entity" TO "authenticated";
GRANT ALL ON TABLE "public"."legal_entity" TO "service_role";



GRANT ALL ON TABLE "public"."plan" TO "anon";
GRANT ALL ON TABLE "public"."plan" TO "authenticated";
GRANT ALL ON TABLE "public"."plan" TO "service_role";



GRANT ALL ON SEQUENCE "public"."plan_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."plan_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."plan_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."product" TO "anon";
GRANT ALL ON TABLE "public"."product" TO "authenticated";
GRANT ALL ON TABLE "public"."product" TO "service_role";



GRANT ALL ON SEQUENCE "public"."product_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."product_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."product_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."project" TO "anon";
GRANT ALL ON TABLE "public"."project" TO "authenticated";
GRANT ALL ON TABLE "public"."project" TO "service_role";



GRANT ALL ON SEQUENCE "public"."project_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."project_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."project_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."project_membership" TO "anon";
GRANT ALL ON TABLE "public"."project_membership" TO "authenticated";
GRANT ALL ON TABLE "public"."project_membership" TO "service_role";



GRANT ALL ON SEQUENCE "public"."project_membership_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."project_membership_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."project_membership_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."property" TO "anon";
GRANT ALL ON TABLE "public"."property" TO "authenticated";
GRANT ALL ON TABLE "public"."property" TO "service_role";



GRANT ALL ON TABLE "public"."subscription" TO "anon";
GRANT ALL ON TABLE "public"."subscription" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_billing_snapshot" TO "anon";
GRANT ALL ON TABLE "public"."subscription_billing_snapshot" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_billing_snapshot" TO "service_role";



GRANT ALL ON SEQUENCE "public"."subscription_billing_snapshot_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."subscription_billing_snapshot_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."subscription_billing_snapshot_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."territory" TO "anon";
GRANT ALL ON TABLE "public"."territory" TO "authenticated";
GRANT ALL ON TABLE "public"."territory" TO "service_role";



GRANT ALL ON TABLE "public"."v_gosiyaha_livrables" TO "anon";
GRANT ALL ON TABLE "public"."v_gosiyaha_livrables" TO "authenticated";
GRANT ALL ON TABLE "public"."v_gosiyaha_livrables" TO "service_role";



GRANT ALL ON TABLE "public"."v_gosiyaha_ready" TO "service_role";



GRANT ALL ON TABLE "public"."v_gosiyaha_record" TO "service_role";



GRANT ALL ON TABLE "public"."v_property_api" TO "anon";
GRANT ALL ON TABLE "public"."v_property_api" TO "authenticated";
GRANT ALL ON TABLE "public"."v_property_api" TO "service_role";



GRANT ALL ON TABLE "public"."vendor" TO "anon";
GRANT ALL ON TABLE "public"."vendor" TO "authenticated";
GRANT ALL ON TABLE "public"."vendor" TO "service_role";



GRANT ALL ON TABLE "public"."v_property_stack" TO "anon";
GRANT ALL ON TABLE "public"."v_property_stack" TO "authenticated";
GRANT ALL ON TABLE "public"."v_property_stack" TO "service_role";



GRANT ALL ON TABLE "public"."zoho_field_map" TO "anon";
GRANT ALL ON TABLE "public"."zoho_field_map" TO "authenticated";
GRANT ALL ON TABLE "public"."zoho_field_map" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































