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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ads_insights_cache: {
        Row: {
          clicks: number
          date_start: string | null
          date_stop: string | null
          entity_id: string
          entity_name: string | null
          fetched_at: string
          id: string
          impressions: number
          level: string
          meta_ad_account_id: string
          parent_id: string | null
          spend: number
        }
        Insert: {
          clicks?: number
          date_start?: string | null
          date_stop?: string | null
          entity_id: string
          entity_name?: string | null
          fetched_at?: string
          id?: string
          impressions?: number
          level: string
          meta_ad_account_id: string
          parent_id?: string | null
          spend?: number
        }
        Update: {
          clicks?: number
          date_start?: string | null
          date_stop?: string | null
          entity_id?: string
          entity_name?: string | null
          fetched_at?: string
          id?: string
          impressions?: number
          level?: string
          meta_ad_account_id?: string
          parent_id?: string | null
          spend?: number
        }
        Relationships: [
          {
            foreignKeyName: "ads_insights_cache_meta_ad_account_id_fkey"
            columns: ["meta_ad_account_id"]
            isOneToOne: false
            referencedRelation: "meta_ad_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      events_log: {
        Row: {
          content_ids: string[] | null
          content_name: string | null
          content_type: string | null
          created_at: string
          currency: string | null
          event_id: string
          event_name: string
          event_source_url: string | null
          geo_city: string | null
          geo_country: string | null
          geo_region: string | null
          id: string
          ip: string | null
          payload_ga4: Json
          payload_meta: Json
          response_ga4: Json
          response_meta: Json
          status: string
          trck_user_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          value: number | null
          visitor_id: string | null
        }
        Insert: {
          content_ids?: string[] | null
          content_name?: string | null
          content_type?: string | null
          created_at?: string
          currency?: string | null
          event_id: string
          event_name: string
          event_source_url?: string | null
          geo_city?: string | null
          geo_country?: string | null
          geo_region?: string | null
          id?: string
          ip?: string | null
          payload_ga4?: Json
          payload_meta?: Json
          response_ga4?: Json
          response_meta?: Json
          status?: string
          trck_user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          value?: number | null
          visitor_id?: string | null
        }
        Update: {
          content_ids?: string[] | null
          content_name?: string | null
          content_type?: string | null
          created_at?: string
          currency?: string | null
          event_id?: string
          event_name?: string
          event_source_url?: string | null
          geo_city?: string | null
          geo_country?: string | null
          geo_region?: string | null
          id?: string
          ip?: string | null
          payload_ga4?: Json
          payload_meta?: Json
          response_ga4?: Json
          response_meta?: Json
          status?: string
          trck_user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          value?: number | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_log_visitor_id_fkey"
            columns: ["visitor_id"]
            isOneToOne: false
            referencedRelation: "visitors"
            referencedColumns: ["id"]
          },
        ]
      }
      ga4_accounts: {
        Row: {
          api_secret_id: string
          created_at: string
          id: string
          is_active: boolean
          label: string
          last_test_message: string | null
          last_test_status: string | null
          last_tested_at: string | null
          measurement_id: string
          updated_at: string
        }
        Insert: {
          api_secret_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          last_test_message?: string | null
          last_test_status?: string | null
          last_tested_at?: string | null
          measurement_id: string
          updated_at?: string
        }
        Update: {
          api_secret_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          last_test_message?: string | null
          last_test_status?: string | null
          last_tested_at?: string | null
          measurement_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      meta_ad_accounts: {
        Row: {
          access_token_id: string
          ad_account_id: string
          created_at: string
          id: string
          is_active: boolean
          label: string
          last_synced_at: string | null
          last_test_message: string | null
          last_test_status: string | null
          updated_at: string
        }
        Insert: {
          access_token_id: string
          ad_account_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          last_synced_at?: string | null
          last_test_message?: string | null
          last_test_status?: string | null
          updated_at?: string
        }
        Update: {
          access_token_id?: string
          ad_account_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          last_synced_at?: string | null
          last_test_message?: string | null
          last_test_status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      meta_pixels: {
        Row: {
          capi_token_id: string
          created_at: string
          id: string
          is_active: boolean
          label: string
          last_test_message: string | null
          last_test_status: string | null
          last_tested_at: string | null
          pixel_id: string
          updated_at: string
        }
        Insert: {
          capi_token_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          last_test_message?: string | null
          last_test_status?: string | null
          last_tested_at?: string | null
          pixel_id: string
          updated_at?: string
        }
        Update: {
          capi_token_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          last_test_message?: string | null
          last_test_status?: string | null
          last_tested_at?: string | null
          pixel_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          canceled_at: string | null
          confirmed_at: string | null
          contact_email: string | null
          contact_email_hash: string | null
          contact_name: string | null
          contact_phone: string | null
          contact_phone_hash: string | null
          created_at: string
          currency: string | null
          fbc: string | null
          fbp: string | null
          ga_client_id: string | null
          ga_session_id: string | null
          geo_country: string | null
          gross_value: number | null
          id: string
          match_method: string
          net_value: number | null
          ordered_at: string | null
          payment_method: string | null
          product_id: string | null
          product_name: string | null
          purchase_event_id: string | null
          raw_payload: Json
          status: string
          transaction_id: string
          trck_user_id: string | null
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          visitor_id: string | null
        }
        Insert: {
          canceled_at?: string | null
          confirmed_at?: string | null
          contact_email?: string | null
          contact_email_hash?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_phone_hash?: string | null
          created_at?: string
          currency?: string | null
          fbc?: string | null
          fbp?: string | null
          ga_client_id?: string | null
          ga_session_id?: string | null
          geo_country?: string | null
          gross_value?: number | null
          id?: string
          match_method?: string
          net_value?: number | null
          ordered_at?: string | null
          payment_method?: string | null
          product_id?: string | null
          product_name?: string | null
          purchase_event_id?: string | null
          raw_payload: Json
          status: string
          transaction_id: string
          trck_user_id?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id?: string | null
        }
        Update: {
          canceled_at?: string | null
          confirmed_at?: string | null
          contact_email?: string | null
          contact_email_hash?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_phone_hash?: string | null
          created_at?: string
          currency?: string | null
          fbc?: string | null
          fbp?: string | null
          ga_client_id?: string | null
          ga_session_id?: string | null
          geo_country?: string | null
          gross_value?: number | null
          id?: string
          match_method?: string
          net_value?: number | null
          ordered_at?: string | null
          payment_method?: string | null
          product_id?: string | null
          product_name?: string | null
          purchase_event_id?: string | null
          raw_payload?: Json
          status?: string
          transaction_id?: string
          trck_user_id?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_purchase_event_id_fkey"
            columns: ["purchase_event_id"]
            isOneToOne: false
            referencedRelation: "events_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_visitor_id_fkey"
            columns: ["visitor_id"]
            isOneToOne: false
            referencedRelation: "visitors"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          count: number
          key: string
          window_start: string
        }
        Insert: {
          count?: number
          key: string
          window_start?: string
        }
        Update: {
          count?: number
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          currency: string
          ghl_lead_webhook_token_id: string | null
          ghl_schedule_webhook_token_id: string | null
          id: boolean
          meta_test_event_code: string | null
          retention_days: number
          timezone: string
          updated_at: string
          webhook_token_id: string | null
        }
        Insert: {
          currency?: string
          ghl_lead_webhook_token_id?: string | null
          ghl_schedule_webhook_token_id?: string | null
          id?: boolean
          meta_test_event_code?: string | null
          retention_days?: number
          timezone?: string
          updated_at?: string
          webhook_token_id?: string | null
        }
        Update: {
          currency?: string
          ghl_lead_webhook_token_id?: string | null
          ghl_schedule_webhook_token_id?: string | null
          id?: boolean
          meta_test_event_code?: string | null
          retention_days?: number
          timezone?: string
          updated_at?: string
          webhook_token_id?: string | null
        }
        Relationships: []
      }
      visitors: {
        Row: {
          created_at: string
          email: string | null
          email_hash: string | null
          fbc: string | null
          fbp: string | null
          first_seen_at: string
          ga_client_id: string | null
          ga_session_id: string | null
          geo_city: string | null
          geo_country: string | null
          geo_postal_code: string | null
          geo_region: string | null
          id: string
          ip: string | null
          landing_url: string | null
          last_seen_at: string
          name: string | null
          phone: string | null
          phone_hash: string | null
          pixel_id: string | null
          referrer: string | null
          trck_user_id: string
          updated_at: string
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          email_hash?: string | null
          fbc?: string | null
          fbp?: string | null
          first_seen_at?: string
          ga_client_id?: string | null
          ga_session_id?: string | null
          geo_city?: string | null
          geo_country?: string | null
          geo_postal_code?: string | null
          geo_region?: string | null
          id?: string
          ip?: string | null
          landing_url?: string | null
          last_seen_at?: string
          name?: string | null
          phone?: string | null
          phone_hash?: string | null
          pixel_id?: string | null
          referrer?: string | null
          trck_user_id: string
          updated_at?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          email_hash?: string | null
          fbc?: string | null
          fbp?: string | null
          first_seen_at?: string
          ga_client_id?: string | null
          ga_session_id?: string | null
          geo_city?: string | null
          geo_country?: string | null
          geo_postal_code?: string | null
          geo_region?: string | null
          id?: string
          ip?: string | null
          landing_url?: string | null
          last_seen_at?: string
          name?: string | null
          phone?: string | null
          phone_hash?: string | null
          pixel_id?: string | null
          referrer?: string | null
          trck_user_id?: string
          updated_at?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      billing_summary: {
        Args: { date_from?: string; date_to?: string }
        Returns: {
          avg_ticket: number
          refund_count: number
          total_count: number
          total_revenue: number
        }[]
      }
      check_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number }
        Returns: boolean
      }
      count_events_by_name: {
        Args: { date_from?: string; date_to?: string }
        Returns: {
          event_count: number
          event_name: string
        }[]
      }
      create_secret: {
        Args: { secret_name?: string; secret_value: string }
        Returns: string
      }
      funnel_counts: {
        Args: { date_from?: string; date_to?: string }
        Returns: {
          stage: string
          visitor_count: number
        }[]
      }
      page_funnel: {
        Args: { date_from?: string; date_to?: string }
        Returns: {
          checkouts: number
          leads: number
          page_url: string
          pageviews: number
          purchases: number
          unique_visitors: number
        }[]
      }
      purge_old_event_payloads: { Args: never; Returns: number }
      purge_old_rate_limits: { Args: never; Returns: number }
      read_secret: { Args: { secret_id: string }; Returns: string }
      revenue_by_ad: {
        Args: never
        Returns: {
          ad_id: string
          conversions: number
          revenue: number
        }[]
      }
      revenue_by_campaign: {
        Args: never
        Returns: {
          campaign_id: string
          conversions: number
          revenue: number
        }[]
      }
      revenue_by_day: {
        Args: { date_from?: string; date_to?: string }
        Returns: {
          day: string
          revenue: number
        }[]
      }
      update_secret: {
        Args: { secret_id: string; secret_value: string }
        Returns: undefined
      }
      visitors_by_city: {
        Args: { date_from?: string; date_to?: string }
        Returns: {
          city: string
          region: string
          visitor_count: number
        }[]
      }
      visitors_by_country: {
        Args: { date_from?: string; date_to?: string }
        Returns: {
          country: string
          visitor_count: number
        }[]
      }
      visitors_by_region: {
        Args: { date_from?: string; date_to?: string }
        Returns: {
          region: string
          visitor_count: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
