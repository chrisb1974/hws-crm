export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      app_user: {
        Row: {
          active: boolean
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          active?: boolean
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          after: Json | null
          at: string | null
          before: Json | null
          changed_by: string | null
          entity: string
          entity_id: string | null
          id: number
        }
        Insert: {
          action: string
          after?: Json | null
          at?: string | null
          before?: Json | null
          changed_by?: string | null
          entity: string
          entity_id?: string | null
          id?: number
        }
        Update: {
          action?: string
          after?: Json | null
          at?: string | null
          before?: Json | null
          changed_by?: string | null
          entity?: string
          entity_id?: string | null
          id?: number
        }
        Relationships: []
      }
      billing_account: {
        Row: {
          billing_entity_code: string
          currency: string
          id: string
          legal_entity_id: string | null
          payment_terms: string | null
          zoho_books_id: string | null
        }
        Insert: {
          billing_entity_code: string
          currency: string
          id?: string
          legal_entity_id?: string | null
          payment_terms?: string | null
          zoho_books_id?: string | null
        }
        Update: {
          billing_entity_code?: string
          currency?: string
          id?: string
          legal_entity_id?: string | null
          payment_terms?: string | null
          zoho_books_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_account_billing_entity_code_fkey"
            columns: ["billing_entity_code"]
            isOneToOne: false
            referencedRelation: "billing_entity"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "billing_account_legal_entity_id_fkey"
            columns: ["legal_entity_id"]
            isOneToOne: false
            referencedRelation: "legal_entity"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_entity: {
        Row: {
          code: string
          default_currency: string
          invoice_prefix: string | null
          legal_name: string
          notes: string | null
        }
        Insert: {
          code: string
          default_currency: string
          invoice_prefix?: string | null
          legal_name: string
          notes?: string | null
        }
        Update: {
          code?: string
          default_currency?: string
          invoice_prefix?: string | null
          legal_name?: string
          notes?: string | null
        }
        Relationships: []
      }
      churn_reason: {
        Row: {
          code: string
          counts_as_churn: boolean | null
          label_en: string | null
          label_fr: string | null
        }
        Insert: {
          code: string
          counts_as_churn?: boolean | null
          label_en?: string | null
          label_fr?: string | null
        }
        Update: {
          code?: string
          counts_as_churn?: boolean | null
          label_en?: string | null
          label_fr?: string | null
        }
        Relationships: []
      }
      city: {
        Row: {
          country: string
          id: number
          name: string
          name_normalized: string | null
        }
        Insert: {
          country: string
          id?: number
          name: string
          name_normalized?: string | null
        }
        Update: {
          country?: string
          id?: number
          name?: string
          name_normalized?: string | null
        }
        Relationships: []
      }
      contact: {
        Row: {
          email: string | null
          full_name: string | null
          id: string
          is_primary: boolean | null
          job_title: string | null
          language: string | null
          legal_entity_id: string | null
          phone: string | null
          property_id: string | null
          receives_alerts: boolean | null
          roles: string[] | null
          whatsapp: string | null
        }
        Insert: {
          email?: string | null
          full_name?: string | null
          id?: string
          is_primary?: boolean | null
          job_title?: string | null
          language?: string | null
          legal_entity_id?: string | null
          phone?: string | null
          property_id?: string | null
          receives_alerts?: boolean | null
          roles?: string[] | null
          whatsapp?: string | null
        }
        Update: {
          email?: string | null
          full_name?: string | null
          id?: string
          is_primary?: boolean | null
          job_title?: string | null
          language?: string | null
          legal_entity_id?: string | null
          phone?: string | null
          property_id?: string | null
          receives_alerts?: boolean | null
          roles?: string[] | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_legal_entity_id_fkey"
            columns: ["legal_entity_id"]
            isOneToOne: false
            referencedRelation: "legal_entity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_api"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_stack"
            referencedColumns: ["property_id"]
          },
        ]
      }
      contact_role: {
        Row: {
          code: string
          label_en: string | null
          label_fr: string | null
        }
        Insert: {
          code: string
          label_en?: string | null
          label_fr?: string | null
        }
        Update: {
          code?: string
          label_en?: string | null
          label_fr?: string | null
        }
        Relationships: []
      }
      document: {
        Row: {
          dossier_id: string | null
          drive_url: string | null
          expires_at: string | null
          filename: string | null
          id: string
          property_id: string | null
          type_code: string | null
          uploaded_at: string | null
          validated_by: string | null
        }
        Insert: {
          dossier_id?: string | null
          drive_url?: string | null
          expires_at?: string | null
          filename?: string | null
          id?: string
          property_id?: string | null
          type_code?: string | null
          uploaded_at?: string | null
          validated_by?: string | null
        }
        Update: {
          dossier_id?: string | null
          drive_url?: string | null
          expires_at?: string | null
          filename?: string | null
          id?: string
          property_id?: string | null
          type_code?: string | null
          uploaded_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "gosiyaha_dossier"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "v_gosiyaha_ready"
            referencedColumns: ["dossier_id"]
          },
          {
            foreignKeyName: "document_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "v_gosiyaha_record"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_api"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_stack"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "document_type_code_fkey"
            columns: ["type_code"]
            isOneToOne: false
            referencedRelation: "document_type"
            referencedColumns: ["code"]
          },
        ]
      }
      document_type: {
        Row: {
          blocks_deliverable: boolean | null
          code: string
          label_en: string | null
          label_fr: string | null
        }
        Insert: {
          blocks_deliverable?: boolean | null
          code: string
          label_en?: string | null
          label_fr?: string | null
        }
        Update: {
          blocks_deliverable?: boolean | null
          code?: string
          label_en?: string | null
          label_fr?: string | null
        }
        Relationships: []
      }
      external_id: {
        Row: {
          id: number
          legal_entity_id: string | null
          property_id: string | null
          system: string
          url: string | null
          value: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          id?: number
          legal_entity_id?: string | null
          property_id?: string | null
          system: string
          url?: string | null
          value: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          id?: number
          legal_entity_id?: string | null
          property_id?: string | null
          system?: string
          url?: string | null
          value?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_id_legal_entity_id_fkey"
            columns: ["legal_entity_id"]
            isOneToOne: false
            referencedRelation: "legal_entity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_id_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_id_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_api"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_id_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_stack"
            referencedColumns: ["property_id"]
          },
        ]
      }
      field_definition: {
        Row: {
          api_name: string
          consumed_by_script: boolean | null
          deprecated_at: string | null
          entity: string
          expose_api: boolean | null
          gosiyaha_phase: number | null
          id: number
          label_en: string | null
          label_fr: string | null
          options: Json | null
          ref_entity: string | null
          replaced_by: string | null
          required: boolean | null
          section: string | null
          sort_order: number | null
          storage: Database["public"]["Enums"]["field_storage"]
          type: string
          visible_roles: string[] | null
        }
        Insert: {
          api_name: string
          consumed_by_script?: boolean | null
          deprecated_at?: string | null
          entity: string
          expose_api?: boolean | null
          gosiyaha_phase?: number | null
          id?: number
          label_en?: string | null
          label_fr?: string | null
          options?: Json | null
          ref_entity?: string | null
          replaced_by?: string | null
          required?: boolean | null
          section?: string | null
          sort_order?: number | null
          storage?: Database["public"]["Enums"]["field_storage"]
          type: string
          visible_roles?: string[] | null
        }
        Update: {
          api_name?: string
          consumed_by_script?: boolean | null
          deprecated_at?: string | null
          entity?: string
          expose_api?: boolean | null
          gosiyaha_phase?: number | null
          id?: number
          label_en?: string | null
          label_fr?: string | null
          options?: Json | null
          ref_entity?: string | null
          replaced_by?: string | null
          required?: boolean | null
          section?: string | null
          sort_order?: number | null
          storage?: Database["public"]["Enums"]["field_storage"]
          type?: string
          visible_roles?: string[] | null
        }
        Relationships: []
      }
      generation_run: {
        Row: {
          action_id: string | null
          dossier_id: string | null
          drive_url: string | null
          id: number
          kind: string
          message: string | null
          run_at: string | null
          status: string
        }
        Insert: {
          action_id?: string | null
          dossier_id?: string | null
          drive_url?: string | null
          id?: number
          kind: string
          message?: string | null
          run_at?: string | null
          status?: string
        }
        Update: {
          action_id?: string | null
          dossier_id?: string | null
          drive_url?: string | null
          id?: number
          kind?: string
          message?: string | null
          run_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "generation_run_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "gosiyaha_action"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generation_run_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "v_gosiyaha_ready"
            referencedColumns: ["action_id"]
          },
          {
            foreignKeyName: "generation_run_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "gosiyaha_dossier"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generation_run_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "v_gosiyaha_ready"
            referencedColumns: ["dossier_id"]
          },
          {
            foreignKeyName: "generation_run_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "v_gosiyaha_record"
            referencedColumns: ["id"]
          },
        ]
      }
      gosiyaha_action: {
        Row: {
          action_type: Database["public"]["Enums"]["gs_action_type"]
          amount: number | null
          cancelled: boolean | null
          currency: string | null
          dossier_id: string
          id: string
          invoice_10_amount: number | null
          invoice_10_number: string | null
          invoice_10_paid_on: string | null
          invoice_90_amount: number | null
          invoice_90_number: string | null
          invoice_90_paid_on: string | null
          jira_status_changed_at: string | null
          jira_status_code: string | null
          market_number: string | null
          phase: number | null
        }
        Insert: {
          action_type: Database["public"]["Enums"]["gs_action_type"]
          amount?: number | null
          cancelled?: boolean | null
          currency?: string | null
          dossier_id: string
          id?: string
          invoice_10_amount?: number | null
          invoice_10_number?: string | null
          invoice_10_paid_on?: string | null
          invoice_90_amount?: number | null
          invoice_90_number?: string | null
          invoice_90_paid_on?: string | null
          jira_status_changed_at?: string | null
          jira_status_code?: string | null
          market_number?: string | null
          phase?: number | null
        }
        Update: {
          action_type?: Database["public"]["Enums"]["gs_action_type"]
          amount?: number | null
          cancelled?: boolean | null
          currency?: string | null
          dossier_id?: string
          id?: string
          invoice_10_amount?: number | null
          invoice_10_number?: string | null
          invoice_10_paid_on?: string | null
          invoice_90_amount?: number | null
          invoice_90_number?: string | null
          invoice_90_paid_on?: string | null
          jira_status_changed_at?: string | null
          jira_status_code?: string | null
          market_number?: string | null
          phase?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gosiyaha_action_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "gosiyaha_dossier"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gosiyaha_action_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "v_gosiyaha_ready"
            referencedColumns: ["dossier_id"]
          },
          {
            foreignKeyName: "gosiyaha_action_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "v_gosiyaha_record"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gosiyaha_action_jira_status_code_fkey"
            columns: ["jira_status_code"]
            isOneToOne: false
            referencedRelation: "jira_status"
            referencedColumns: ["code"]
          },
        ]
      }
      gosiyaha_dossier: {
        Row: {
          code: string | null
          created_at: string | null
          data: Json
          id: string
          legal_entity_id: string | null
          owner_user: string | null
          property_id: string | null
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          data?: Json
          id?: string
          legal_entity_id?: string | null
          owner_user?: string | null
          property_id?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          data?: Json
          id?: string
          legal_entity_id?: string | null
          owner_user?: string | null
          property_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gosiyaha_dossier_legal_entity_id_fkey"
            columns: ["legal_entity_id"]
            isOneToOne: false
            referencedRelation: "legal_entity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gosiyaha_dossier_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gosiyaha_dossier_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_api"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gosiyaha_dossier_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_stack"
            referencedColumns: ["property_id"]
          },
        ]
      }
      gosiyaha_prerequisite: {
        Row: {
          action_id: string
          code: string
          id: number
          label: string
          satisfied: boolean
          satisfied_at: string | null
        }
        Insert: {
          action_id: string
          code: string
          id?: number
          label: string
          satisfied?: boolean
          satisfied_at?: string | null
        }
        Update: {
          action_id?: string
          code?: string
          id?: number
          label?: string
          satisfied?: boolean
          satisfied_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gosiyaha_prerequisite_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "gosiyaha_action"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gosiyaha_prerequisite_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "v_gosiyaha_ready"
            referencedColumns: ["action_id"]
          },
        ]
      }
      hotel_group: {
        Row: {
          id: string
          legal_entity_id: string | null
          name: string
          notes: string | null
        }
        Insert: {
          id?: string
          legal_entity_id?: string | null
          name: string
          notes?: string | null
        }
        Update: {
          id?: string
          legal_entity_id?: string | null
          name?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_group_legal_entity_id_fkey"
            columns: ["legal_entity_id"]
            isOneToOne: false
            referencedRelation: "legal_entity"
            referencedColumns: ["id"]
          },
        ]
      }
      integration: {
        Row: {
          active: boolean | null
          allowed_views: string[]
          can_write: boolean | null
          code: string
          db_role: string
          id: number
          last_call_at: string | null
          name: string
        }
        Insert: {
          active?: boolean | null
          allowed_views: string[]
          can_write?: boolean | null
          code: string
          db_role: string
          id?: number
          last_call_at?: string | null
          name: string
        }
        Update: {
          active?: boolean | null
          allowed_views?: string[]
          can_write?: boolean | null
          code?: string
          db_role?: string
          id?: number
          last_call_at?: string | null
          name?: string
        }
        Relationships: []
      }
      jira_status: {
        Row: {
          code: string
          is_terminal: boolean | null
          label: string
          phase: number | null
          responsible: string | null
          stall_alert_days: number | null
        }
        Insert: {
          code: string
          is_terminal?: boolean | null
          label: string
          phase?: number | null
          responsible?: string | null
          stall_alert_days?: number | null
        }
        Update: {
          code?: string
          is_terminal?: boolean | null
          label?: string
          phase?: number | null
          responsible?: string | null
          stall_alert_days?: number | null
        }
        Relationships: []
      }
      jira_status_alias: {
        Row: {
          raw_value: string
          status_code: string
        }
        Insert: {
          raw_value: string
          status_code: string
        }
        Update: {
          raw_value?: string
          status_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "jira_status_alias_status_code_fkey"
            columns: ["status_code"]
            isOneToOne: false
            referencedRelation: "jira_status"
            referencedColumns: ["code"]
          },
        ]
      }
      legal_entity: {
        Row: {
          address: string | null
          capital: number | null
          capital_currency: string | null
          city: string | null
          country: string | null
          created_at: string | null
          director_profile: string | null
          founded_on: string | null
          headcount: number | null
          ice: string | null
          id: string
          legal_name: string
          legal_name_normalized: string | null
          rc_activity: string | null
          rc_date: string | null
          rc_number: string | null
          shareholding: string | null
          tax_id: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          capital?: number | null
          capital_currency?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          director_profile?: string | null
          founded_on?: string | null
          headcount?: number | null
          ice?: string | null
          id?: string
          legal_name: string
          legal_name_normalized?: string | null
          rc_activity?: string | null
          rc_date?: string | null
          rc_number?: string | null
          shareholding?: string | null
          tax_id?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          capital?: number | null
          capital_currency?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          director_profile?: string | null
          founded_on?: string | null
          headcount?: number | null
          ice?: string | null
          id?: string
          legal_name?: string
          legal_name_normalized?: string | null
          rc_activity?: string | null
          rc_date?: string | null
          rc_number?: string | null
          shareholding?: string | null
          tax_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      plan: {
        Row: {
          billing_unit: string
          code: string
          id: number
          name: string
          product_id: number
          roles_covered: Database["public"]["Enums"]["stack_role"][]
          stance_override: Database["public"]["Enums"]["hws_stance"] | null
          superseded_by: number | null
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          billing_unit?: string
          code: string
          id?: number
          name: string
          product_id: number
          roles_covered: Database["public"]["Enums"]["stack_role"][]
          stance_override?: Database["public"]["Enums"]["hws_stance"] | null
          superseded_by?: number | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          billing_unit?: string
          code?: string
          id?: number
          name?: string
          product_id?: number
          roles_covered?: Database["public"]["Enums"]["stack_role"][]
          stance_override?: Database["public"]["Enums"]["hws_stance"] | null
          superseded_by?: number | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "plan"
            referencedColumns: ["id"]
          },
        ]
      }
      product: {
        Row: {
          code: string
          id: number
          name: string
          stance: Database["public"]["Enums"]["hws_stance"]
          vendor_code: string
        }
        Insert: {
          code: string
          id?: number
          name: string
          stance?: Database["public"]["Enums"]["hws_stance"]
          vendor_code: string
        }
        Update: {
          code?: string
          id?: number
          name?: string
          stance?: Database["public"]["Enums"]["hws_stance"]
          vendor_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_vendor_code_fkey"
            columns: ["vendor_code"]
            isOneToOne: false
            referencedRelation: "vendor"
            referencedColumns: ["code"]
          },
        ]
      }
      project: {
        Row: {
          city: string | null
          code: string
          country: string | null
          ends_on: string | null
          id: number
          name: string
          owner_user: string | null
          partner_org: string | null
          starts_on: string | null
          status: string | null
          type: string
        }
        Insert: {
          city?: string | null
          code: string
          country?: string | null
          ends_on?: string | null
          id?: number
          name: string
          owner_user?: string | null
          partner_org?: string | null
          starts_on?: string | null
          status?: string | null
          type: string
        }
        Update: {
          city?: string | null
          code?: string
          country?: string | null
          ends_on?: string | null
          id?: number
          name?: string
          owner_user?: string | null
          partner_org?: string | null
          starts_on?: string | null
          status?: string | null
          type?: string
        }
        Relationships: []
      }
      project_membership: {
        Row: {
          attributes: Json
          id: number
          project_id: number
          property_id: string
          since: string | null
          source: string | null
          status: Database["public"]["Enums"]["membership_status"]
          until: string | null
        }
        Insert: {
          attributes?: Json
          id?: number
          project_id: number
          property_id: string
          since?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["membership_status"]
          until?: string | null
        }
        Update: {
          attributes?: Json
          id?: number
          project_id?: number
          property_id?: string
          since?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["membership_status"]
          until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_membership_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_membership_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_membership_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_api"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_membership_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_stack"
            referencedColumns: ["property_id"]
          },
        ]
      }
      property: {
        Row: {
          address: string | null
          billing_account_id: string | null
          billing_entity_code: string | null
          booking_engine_url: string | null
          city: string | null
          code: string | null
          country: string | null
          created_at: string | null
          csm_owner: string | null
          custom_fields: Json
          data_owner: string | null
          description: string | null
          facilities: string | null
          google_place_id: string | null
          group_id: string | null
          id: string
          latitude: number | null
          legal_entity_id: string | null
          lifecycle_status: Database["public"]["Enums"]["lifecycle_status"]
          logo_url: string | null
          longitude: number | null
          merged_into: string | null
          name: string
          name_normalized: string | null
          official_classification: string | null
          online_presence_date: string | null
          online_presence_score: number | null
          opening_date: string | null
          property_type: string | null
          rooms_online: number | null
          rooms_total: number | null
          sales_owner: string | null
          stack_surveyed_at: string | null
          star_rating: string | null
          support_language: string | null
          support_whatsapp: string | null
          territory_code: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          billing_account_id?: string | null
          billing_entity_code?: string | null
          booking_engine_url?: string | null
          city?: string | null
          code?: string | null
          country?: string | null
          created_at?: string | null
          csm_owner?: string | null
          custom_fields?: Json
          data_owner?: string | null
          description?: string | null
          facilities?: string | null
          google_place_id?: string | null
          group_id?: string | null
          id?: string
          latitude?: number | null
          legal_entity_id?: string | null
          lifecycle_status?: Database["public"]["Enums"]["lifecycle_status"]
          logo_url?: string | null
          longitude?: number | null
          merged_into?: string | null
          name: string
          name_normalized?: string | null
          official_classification?: string | null
          online_presence_date?: string | null
          online_presence_score?: number | null
          opening_date?: string | null
          property_type?: string | null
          rooms_online?: number | null
          rooms_total?: number | null
          sales_owner?: string | null
          stack_surveyed_at?: string | null
          star_rating?: string | null
          support_language?: string | null
          support_whatsapp?: string | null
          territory_code?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          billing_account_id?: string | null
          billing_entity_code?: string | null
          booking_engine_url?: string | null
          city?: string | null
          code?: string | null
          country?: string | null
          created_at?: string | null
          csm_owner?: string | null
          custom_fields?: Json
          data_owner?: string | null
          description?: string | null
          facilities?: string | null
          google_place_id?: string | null
          group_id?: string | null
          id?: string
          latitude?: number | null
          legal_entity_id?: string | null
          lifecycle_status?: Database["public"]["Enums"]["lifecycle_status"]
          logo_url?: string | null
          longitude?: number | null
          merged_into?: string | null
          name?: string
          name_normalized?: string | null
          official_classification?: string | null
          online_presence_date?: string | null
          online_presence_score?: number | null
          opening_date?: string | null
          property_type?: string | null
          rooms_online?: number | null
          rooms_total?: number | null
          sales_owner?: string | null
          stack_surveyed_at?: string | null
          star_rating?: string | null
          support_language?: string | null
          support_whatsapp?: string | null
          territory_code?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_billing_account_id_fkey"
            columns: ["billing_account_id"]
            isOneToOne: false
            referencedRelation: "billing_account"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_billing_entity_code_fkey"
            columns: ["billing_entity_code"]
            isOneToOne: false
            referencedRelation: "billing_entity"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "property_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "hotel_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_legal_entity_id_fkey"
            columns: ["legal_entity_id"]
            isOneToOne: false
            referencedRelation: "legal_entity"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_merged_into_fkey"
            columns: ["merged_into"]
            isOneToOne: false
            referencedRelation: "property"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_merged_into_fkey"
            columns: ["merged_into"]
            isOneToOne: false
            referencedRelation: "v_property_api"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_merged_into_fkey"
            columns: ["merged_into"]
            isOneToOne: false
            referencedRelation: "v_property_stack"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "property_territory_code_fkey"
            columns: ["territory_code"]
            isOneToOne: false
            referencedRelation: "territory"
            referencedColumns: ["code"]
          },
        ]
      }
      subscription: {
        Row: {
          activation_date: string | null
          billing_frequency: string | null
          billing_unit: string | null
          churn_reason_code: string | null
          commitment_months: number | null
          created_at: string | null
          funded_by: string | null
          id: string
          is_hws_offer_override: boolean | null
          notice_days: number | null
          notice_deadline: string | null
          onboarding_status: string | null
          plan_id: number | null
          pricing_cohort: string | null
          property_id: string
          reconciliation_flag: string | null
          renewal_date: string | null
          replaced_by_subscription_id: string | null
          role: Database["public"]["Enums"]["stack_role"]
          sale_currency: string | null
          sale_price: number | null
          source_note: string | null
          status: Database["public"]["Enums"]["sub_status"]
          subsidy_end_date: string | null
          termination_date: string | null
          vendor_account_ref: string | null
          vendor_code: string | null
          vendor_cost: number | null
          vendor_currency: string | null
        }
        Insert: {
          activation_date?: string | null
          billing_frequency?: string | null
          billing_unit?: string | null
          churn_reason_code?: string | null
          commitment_months?: number | null
          created_at?: string | null
          funded_by?: string | null
          id?: string
          is_hws_offer_override?: boolean | null
          notice_days?: number | null
          notice_deadline?: string | null
          onboarding_status?: string | null
          plan_id?: number | null
          pricing_cohort?: string | null
          property_id: string
          reconciliation_flag?: string | null
          renewal_date?: string | null
          replaced_by_subscription_id?: string | null
          role: Database["public"]["Enums"]["stack_role"]
          sale_currency?: string | null
          sale_price?: number | null
          source_note?: string | null
          status?: Database["public"]["Enums"]["sub_status"]
          subsidy_end_date?: string | null
          termination_date?: string | null
          vendor_account_ref?: string | null
          vendor_code?: string | null
          vendor_cost?: number | null
          vendor_currency?: string | null
        }
        Update: {
          activation_date?: string | null
          billing_frequency?: string | null
          billing_unit?: string | null
          churn_reason_code?: string | null
          commitment_months?: number | null
          created_at?: string | null
          funded_by?: string | null
          id?: string
          is_hws_offer_override?: boolean | null
          notice_days?: number | null
          notice_deadline?: string | null
          onboarding_status?: string | null
          plan_id?: number | null
          pricing_cohort?: string | null
          property_id?: string
          reconciliation_flag?: string | null
          renewal_date?: string | null
          replaced_by_subscription_id?: string | null
          role?: Database["public"]["Enums"]["stack_role"]
          sale_currency?: string | null
          sale_price?: number | null
          source_note?: string | null
          status?: Database["public"]["Enums"]["sub_status"]
          subsidy_end_date?: string | null
          termination_date?: string | null
          vendor_account_ref?: string | null
          vendor_code?: string | null
          vendor_cost?: number | null
          vendor_currency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_churn_reason_code_fkey"
            columns: ["churn_reason_code"]
            isOneToOne: false
            referencedRelation: "churn_reason"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "subscription_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plan"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_api"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "v_property_stack"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "subscription_replaced_by_subscription_id_fkey"
            columns: ["replaced_by_subscription_id"]
            isOneToOne: false
            referencedRelation: "subscription"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_replaced_by_subscription_id_fkey"
            columns: ["replaced_by_subscription_id"]
            isOneToOne: false
            referencedRelation: "v_property_stack"
            referencedColumns: ["subscription_id"]
          },
          {
            foreignKeyName: "subscription_vendor_code_fkey"
            columns: ["vendor_code"]
            isOneToOne: false
            referencedRelation: "vendor"
            referencedColumns: ["code"]
          },
        ]
      }
      subscription_billing_snapshot: {
        Row: {
          amount: number | null
          currency: string | null
          external_invoice_ref: string | null
          id: number
          issued_on: string
          plan_id: number | null
          rooms_at_billing: number | null
          subscription_id: string
        }
        Insert: {
          amount?: number | null
          currency?: string | null
          external_invoice_ref?: string | null
          id?: number
          issued_on: string
          plan_id?: number | null
          rooms_at_billing?: number | null
          subscription_id: string
        }
        Update: {
          amount?: number | null
          currency?: string | null
          external_invoice_ref?: string | null
          id?: number
          issued_on?: string
          plan_id?: number | null
          rooms_at_billing?: number | null
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_billing_snapshot_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plan"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_billing_snapshot_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscription"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_billing_snapshot_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "v_property_stack"
            referencedColumns: ["subscription_id"]
          },
        ]
      }
      territory: {
        Row: {
          code: string
          country: string | null
          label_en: string | null
          label_fr: string | null
        }
        Insert: {
          code: string
          country?: string | null
          label_en?: string | null
          label_fr?: string | null
        }
        Update: {
          code?: string
          country?: string | null
          label_en?: string | null
          label_fr?: string | null
        }
        Relationships: []
      }
      vendor: {
        Row: {
          code: string
          extranet_url_template: string | null
          is_partner: boolean | null
          name: string
        }
        Insert: {
          code: string
          extranet_url_template?: string | null
          is_partner?: boolean | null
          name: string
        }
        Update: {
          code?: string
          extranet_url_template?: string | null
          is_partner?: boolean | null
          name?: string
        }
        Relationships: []
      }
      zoho_field_map: {
        Row: {
          api_name: string
          crm_destination: string | null
          data_type: string | null
          field_label: string
          is_formula: boolean | null
          read_only: boolean | null
          used_by_script: boolean | null
        }
        Insert: {
          api_name: string
          crm_destination?: string | null
          data_type?: string | null
          field_label: string
          is_formula?: boolean | null
          read_only?: boolean | null
          used_by_script?: boolean | null
        }
        Update: {
          api_name?: string
          crm_destination?: string | null
          data_type?: string | null
          field_label?: string
          is_formula?: boolean | null
          read_only?: boolean | null
          used_by_script?: boolean | null
        }
        Relationships: []
      }
    }
    Views: {
      v_gosiyaha_livrables: {
        Row: {
          _raw: Json | null
          "Code HWS": string | null
          "Go Siyaha Account": string | null
          "Go Siyaha Name": string | null
          "Montant du Devis": string | null
          "Nº de Marché MarocPME": string | null
          "Nom Signataire": string | null
          "Nom Societe RC": string | null
          "Status Jira": string | null
        }
        Relationships: []
      }
      v_gosiyaha_ready: {
        Row: {
          action_id: string | null
          action_type: Database["public"]["Enums"]["gs_action_type"] | null
          can_generate: boolean | null
          dossier_id: string | null
          missing: string[] | null
          missing_count: number | null
        }
        Relationships: []
      }
      v_gosiyaha_record: {
        Row: {
          dossier_code: string | null
          id: string | null
          property_code: string | null
          record: Json | null
        }
        Relationships: []
      }
      v_property_api: {
        Row: {
          billing_entity_code: string | null
          city: string | null
          code: string | null
          country: string | null
          group_name: string | null
          id: string | null
          is_active_client: boolean | null
          legal_name: string | null
          lifecycle_status:
            | Database["public"]["Enums"]["lifecycle_status"]
            | null
          name: string | null
          property_type: string | null
          rooms_total: number | null
          star_rating: string | null
          website: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_billing_entity_code_fkey"
            columns: ["billing_entity_code"]
            isOneToOne: false
            referencedRelation: "billing_entity"
            referencedColumns: ["code"]
          },
        ]
      }
      v_property_stack: {
        Row: {
          code: string | null
          name: string | null
          plan: string | null
          property_id: string | null
          role: Database["public"]["Enums"]["stack_role"] | null
          role_state: string | null
          status: Database["public"]["Enums"]["sub_status"] | null
          subscription_id: string | null
          vendor: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      current_app_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      gosiyaha_logo_url: { Args: { p_dossier_id: string }; Returns: string }
      gosiyaha_record: { Args: { p_dossier_id: string }; Returns: Json }
      gosiyaha_search_trigger: {
        Args: { p_trigger: string }
        Returns: {
          id: string
          name: string
          record: Json
        }[]
      }
      gosiyaha_write_back: {
        Args: {
          p_dossier_id: string
          p_kind: string
          p_message?: string
          p_status?: string
          p_url: string
        }
        Returns: number
      }
      immutable_unaccent: { Args: { "": string }; Returns: string }
      is_active_staff: { Args: never; Returns: boolean }
      next_property_code: { Args: never; Returns: string }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "sales" | "support"
      field_storage: "column" | "jsonb"
      gs_action_type: "TGS03" | "TGS04" | "EOS01"
      hws_stance: "offer" | "competitor" | "coexist"
      lifecycle_status:
        | "prospect"
        | "onboarding"
        | "active"
        | "suspended"
        | "churned"
        | "program_only"
      membership_status: "member" | "prospect" | "left"
      stack_role: "PMS" | "CM" | "BE" | "SITE" | "PAYMENT" | "ADDON" | "SERVICE"
      sub_status:
        | "prospect"
        | "trial"
        | "active"
        | "suspended"
        | "terminated"
        | "migrated"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "sales", "support"],
      field_storage: ["column", "jsonb"],
      gs_action_type: ["TGS03", "TGS04", "EOS01"],
      hws_stance: ["offer", "competitor", "coexist"],
      lifecycle_status: [
        "prospect",
        "onboarding",
        "active",
        "suspended",
        "churned",
        "program_only",
      ],
      membership_status: ["member", "prospect", "left"],
      stack_role: ["PMS", "CM", "BE", "SITE", "PAYMENT", "ADDON", "SERVICE"],
      sub_status: [
        "prospect",
        "trial",
        "active",
        "suspended",
        "terminated",
        "migrated",
      ],
    },
  },
} as const
