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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      bids: {
        Row: {
          amount: number
          created_at: string
          digger_id: string
          gig_id: string
          id: string
          proposal: string
          status: string
          timeline: string
          updated_at: string
          withdrawal_penalty: number | null
          withdrawn_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          digger_id: string
          gig_id: string
          id?: string
          proposal: string
          status?: string
          timeline: string
          updated_at?: string
          withdrawal_penalty?: number | null
          withdrawn_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          digger_id?: string
          gig_id?: string
          id?: string
          proposal?: string
          status?: string
          timeline?: string
          updated_at?: string
          withdrawal_penalty?: number | null
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bids_digger_id_fkey"
            columns: ["digger_id"]
            isOneToOne: false
            referencedRelation: "digger_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          parent_category_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          parent_category_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          parent_category_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          consumer_id: string
          created_at: string
          digger_id: string | null
          gig_id: string | null
          id: string
          updated_at: string
        }
        Insert: {
          consumer_id: string
          created_at?: string
          digger_id?: string | null
          gig_id?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          consumer_id?: string
          created_at?: string
          digger_id?: string | null
          gig_id?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_digger_id_fkey"
            columns: ["digger_id"]
            isOneToOne: false
            referencedRelation: "digger_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
        ]
      }
      digger_categories: {
        Row: {
          category_id: string
          created_at: string
          digger_id: string
          id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          digger_id: string
          id?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          digger_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "digger_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digger_categories_digger_id_fkey"
            columns: ["digger_id"]
            isOneToOne: false
            referencedRelation: "digger_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      digger_profiles: {
        Row: {
          availability: string | null
          average_rating: number | null
          bio: string | null
          business_name: string
          certifications: string[] | null
          completion_rate: number | null
          created_at: string
          custom_occupation_title: string | null
          handle: string | null
          hourly_rate: number | null
          hourly_rate_max: number | null
          hourly_rate_min: number | null
          id: string
          is_bonded: boolean | null
          is_insured: boolean | null
          is_licensed: string | null
          lead_limit: number | null
          lead_limit_enabled: boolean | null
          lead_limit_period: string | null
          location: string
          location_lat: number | null
          location_lng: number | null
          naics_code: string | null
          offers_free_estimates: boolean | null
          phone: string
          portfolio_url: string | null
          portfolio_urls: string[] | null
          pricing_model: string | null
          profession: string
          profile_image_url: string | null
          response_time_hours: number | null
          sic_code: string | null
          skills: string[] | null
          stripe_customer_id: string | null
          subscription_end_date: string | null
          subscription_status: string | null
          subscription_tier: string | null
          total_ratings: number | null
          updated_at: string
          user_id: string
          verified: boolean | null
          work_photos: string[] | null
          years_experience: number | null
        }
        Insert: {
          availability?: string | null
          average_rating?: number | null
          bio?: string | null
          business_name: string
          certifications?: string[] | null
          completion_rate?: number | null
          created_at?: string
          custom_occupation_title?: string | null
          handle?: string | null
          hourly_rate?: number | null
          hourly_rate_max?: number | null
          hourly_rate_min?: number | null
          id?: string
          is_bonded?: boolean | null
          is_insured?: boolean | null
          is_licensed?: string | null
          lead_limit?: number | null
          lead_limit_enabled?: boolean | null
          lead_limit_period?: string | null
          location: string
          location_lat?: number | null
          location_lng?: number | null
          naics_code?: string | null
          offers_free_estimates?: boolean | null
          phone: string
          portfolio_url?: string | null
          portfolio_urls?: string[] | null
          pricing_model?: string | null
          profession: string
          profile_image_url?: string | null
          response_time_hours?: number | null
          sic_code?: string | null
          skills?: string[] | null
          stripe_customer_id?: string | null
          subscription_end_date?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          total_ratings?: number | null
          updated_at?: string
          user_id: string
          verified?: boolean | null
          work_photos?: string[] | null
          years_experience?: number | null
        }
        Update: {
          availability?: string | null
          average_rating?: number | null
          bio?: string | null
          business_name?: string
          certifications?: string[] | null
          completion_rate?: number | null
          created_at?: string
          custom_occupation_title?: string | null
          handle?: string | null
          hourly_rate?: number | null
          hourly_rate_max?: number | null
          hourly_rate_min?: number | null
          id?: string
          is_bonded?: boolean | null
          is_insured?: boolean | null
          is_licensed?: string | null
          lead_limit?: number | null
          lead_limit_enabled?: boolean | null
          lead_limit_period?: string | null
          location?: string
          location_lat?: number | null
          location_lng?: number | null
          naics_code?: string | null
          offers_free_estimates?: boolean | null
          phone?: string
          portfolio_url?: string | null
          portfolio_urls?: string[] | null
          pricing_model?: string | null
          profession?: string
          profile_image_url?: string | null
          response_time_hours?: number | null
          sic_code?: string | null
          skills?: string[] | null
          stripe_customer_id?: string | null
          subscription_end_date?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          total_ratings?: number | null
          updated_at?: string
          user_id?: string
          verified?: boolean | null
          work_photos?: string[] | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "digger_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_preferences: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          report_frequency: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          report_frequency?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          report_frequency?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gigs: {
        Row: {
          ai_matched_codes: boolean | null
          budget_max: number | null
          budget_min: number | null
          category_id: string | null
          consumer_id: string
          contact_preferences: string | null
          created_at: string
          deadline: string | null
          description: string
          id: string
          images: string[] | null
          location: string
          location_lat: number | null
          location_lng: number | null
          naics_codes: string[] | null
          purchase_count: number | null
          sic_codes: string[] | null
          status: string | null
          timeline: string | null
          title: string
          updated_at: string
        }
        Insert: {
          ai_matched_codes?: boolean | null
          budget_max?: number | null
          budget_min?: number | null
          category_id?: string | null
          consumer_id: string
          contact_preferences?: string | null
          created_at?: string
          deadline?: string | null
          description: string
          id?: string
          images?: string[] | null
          location: string
          location_lat?: number | null
          location_lng?: number | null
          naics_codes?: string[] | null
          purchase_count?: number | null
          sic_codes?: string[] | null
          status?: string | null
          timeline?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          ai_matched_codes?: boolean | null
          budget_max?: number | null
          budget_min?: number | null
          category_id?: string | null
          consumer_id?: string
          contact_preferences?: string | null
          created_at?: string
          deadline?: string | null
          description?: string
          id?: string
          images?: string[] | null
          location?: string
          location_lat?: number | null
          location_lng?: number | null
          naics_codes?: string[] | null
          purchase_count?: number | null
          sic_codes?: string[] | null
          status?: string | null
          timeline?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gigs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gigs_consumer_id_fkey"
            columns: ["consumer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      industry_codes: {
        Row: {
          code: string
          code_type: string
          created_at: string | null
          description: string | null
          id: string
          title: string
        }
        Insert: {
          code: string
          code_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          title: string
        }
        Update: {
          code?: string
          code_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          title?: string
        }
        Relationships: []
      }
      lead_issues: {
        Row: {
          created_at: string
          description: string
          digger_id: string
          id: string
          issue_type: string
          lead_purchase_id: string
          refund_percentage: number | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          description: string
          digger_id: string
          id?: string
          issue_type: string
          lead_purchase_id: string
          refund_percentage?: number | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          description?: string
          digger_id?: string
          id?: string
          issue_type?: string
          lead_purchase_id?: string
          refund_percentage?: number | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_issues_digger_id_fkey"
            columns: ["digger_id"]
            isOneToOne: false
            referencedRelation: "digger_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_issues_lead_purchase_id_fkey"
            columns: ["lead_purchase_id"]
            isOneToOne: false
            referencedRelation: "lead_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_purchases: {
        Row: {
          amount_paid: number
          consumer_id: string
          digger_id: string
          gig_id: string
          id: string
          purchase_price: number
          purchased_at: string
          status: string | null
          stripe_payment_id: string | null
        }
        Insert: {
          amount_paid: number
          consumer_id: string
          digger_id: string
          gig_id: string
          id?: string
          purchase_price: number
          purchased_at?: string
          status?: string | null
          stripe_payment_id?: string | null
        }
        Update: {
          amount_paid?: number
          consumer_id?: string
          digger_id?: string
          gig_id?: string
          id?: string
          purchase_price?: number
          purchased_at?: string
          status?: string | null
          stripe_payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_purchases_digger_id_fkey"
            columns: ["digger_id"]
            isOneToOne: false
            referencedRelation: "digger_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_purchases_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          attempt_type: string
          attempted_at: string
          id: string
          identifier: string
          success: boolean | null
        }
        Insert: {
          attempt_type: string
          attempted_at?: string
          id?: string
          identifier: string
          success?: boolean | null
        }
        Update: {
          attempt_type?: string
          attempted_at?: string
          id?: string
          identifier?: string
          success?: boolean | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          metadata: Json | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          metadata?: Json | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          metadata?: Json | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_completion_reminders: {
        Row: {
          created_at: string
          digger_id: string
          id: string
          profile_completion_at_send: number
          reminder_type: string
          sent_at: string
        }
        Insert: {
          created_at?: string
          digger_id: string
          id?: string
          profile_completion_at_send: number
          reminder_type: string
          sent_at?: string
        }
        Update: {
          created_at?: string
          digger_id?: string
          id?: string
          profile_completion_at_send?: number
          reminder_type?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_completion_reminders_digger_id_fkey"
            columns: ["digger_id"]
            isOneToOne: false
            referencedRelation: "digger_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
          user_type: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
          user_type: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_type?: string
        }
        Relationships: []
      }
      ratings: {
        Row: {
          consumer_id: string
          created_at: string
          digger_id: string
          digger_response: string | null
          gig_id: string | null
          id: string
          rating: number
          responded_at: string | null
          review_text: string | null
        }
        Insert: {
          consumer_id: string
          created_at?: string
          digger_id: string
          digger_response?: string | null
          gig_id?: string | null
          id?: string
          rating: number
          responded_at?: string | null
          review_text?: string | null
        }
        Update: {
          consumer_id?: string
          created_at?: string
          digger_id?: string
          digger_response?: string | null
          gig_id?: string | null
          id?: string
          rating?: number
          responded_at?: string | null
          review_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ratings_consumer_id_fkey"
            columns: ["consumer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_digger_id_fkey"
            columns: ["digger_id"]
            isOneToOne: false
            referencedRelation: "digger_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
        ]
      }
      reference_contact_requests: {
        Row: {
          consumer_id: string
          digger_id: string
          id: string
          reference_id: string
          requested_at: string
          responded_at: string | null
          status: string
        }
        Insert: {
          consumer_id: string
          digger_id: string
          id?: string
          reference_id: string
          requested_at?: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          consumer_id?: string
          digger_id?: string
          id?: string
          reference_id?: string
          requested_at?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reference_contact_requests_reference_id_fkey"
            columns: ["reference_id"]
            isOneToOne: false
            referencedRelation: "references"
            referencedColumns: ["id"]
          },
        ]
      }
      references: {
        Row: {
          created_at: string
          digger_id: string
          id: string
          is_verified: boolean | null
          notes: string | null
          project_description: string | null
          reference_email: string
          reference_name: string
          reference_phone: string | null
          relationship: string | null
        }
        Insert: {
          created_at?: string
          digger_id: string
          id?: string
          is_verified?: boolean | null
          notes?: string | null
          project_description?: string | null
          reference_email: string
          reference_name: string
          reference_phone?: string | null
          relationship?: string | null
        }
        Update: {
          created_at?: string
          digger_id?: string
          id?: string
          is_verified?: boolean | null
          notes?: string | null
          project_description?: string | null
          reference_email?: string
          reference_name?: string
          reference_phone?: string | null
          relationship?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "references_digger_id_fkey"
            columns: ["digger_id"]
            isOneToOne: false
            referencedRelation: "digger_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_search_alerts: {
        Row: {
          created_at: string
          id: string
          matches_found: number
          saved_search_id: string
          search_type: string
          sent_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          matches_found?: number
          saved_search_id: string
          search_type: string
          sent_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          matches_found?: number
          saved_search_id?: string
          search_type?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_search_alerts_saved_search_id_fkey"
            columns: ["saved_search_id"]
            isOneToOne: false
            referencedRelation: "saved_searches"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          created_at: string
          email_alerts_enabled: boolean
          filters: Json
          id: string
          name: string
          search_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_alerts_enabled?: boolean
          filters: Json
          id?: string
          name: string
          search_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_alerts_enabled?: boolean
          filters?: Json
          id?: string
          name?: string
          search_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          bid_id: string
          commission_amount: number
          commission_rate: number
          completed_at: string | null
          consumer_id: string
          created_at: string
          digger_id: string
          digger_payout: number
          gig_id: string
          id: string
          status: string
          stripe_payment_intent_id: string | null
          total_amount: number
        }
        Insert: {
          bid_id: string
          commission_amount: number
          commission_rate: number
          completed_at?: string | null
          consumer_id: string
          created_at?: string
          digger_id: string
          digger_payout: number
          gig_id: string
          id?: string
          status?: string
          stripe_payment_intent_id?: string | null
          total_amount: number
        }
        Update: {
          bid_id?: string
          commission_amount?: number
          commission_rate?: number
          completed_at?: string | null
          consumer_id?: string
          created_at?: string
          digger_id?: string
          digger_payout?: number
          gig_id?: string
          id?: string
          status?: string
          stripe_payment_intent_id?: string | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "transactions_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_consumer_id_fkey"
            columns: ["consumer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_digger_id_fkey"
            columns: ["digger_id"]
            isOneToOne: false
            referencedRelation: "digger_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_penalties: {
        Row: {
          bid_id: string
          created_at: string
          digger_id: string
          id: string
          paid_at: string | null
          penalty_amount: number
          status: string
          stripe_payment_intent_id: string | null
        }
        Insert: {
          bid_id: string
          created_at?: string
          digger_id: string
          id?: string
          paid_at?: string | null
          penalty_amount: number
          status?: string
          stripe_payment_intent_id?: string | null
        }
        Update: {
          bid_id?: string
          created_at?: string
          digger_id?: string
          id?: string
          paid_at?: string | null
          penalty_amount?: number
          status?: string
          stripe_payment_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_penalties_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_penalties_digger_id_fkey"
            columns: ["digger_id"]
            isOneToOne: false
            referencedRelation: "digger_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_lead_price: {
        Args: { gig_budget_max: number; gig_budget_min: number }
        Returns: number
      }
      check_rate_limit: {
        Args: {
          p_attempt_type: string
          p_identifier: string
          p_max_attempts?: number
          p_window_minutes?: number
        }
        Returns: boolean
      }
      cleanup_old_login_attempts: { Args: never; Returns: undefined }
      create_notification: {
        Args: {
          p_link?: string
          p_message: string
          p_metadata?: Json
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
