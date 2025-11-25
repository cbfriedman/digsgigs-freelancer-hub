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
          award_method: string | null
          awarded: boolean | null
          awarded_at: string | null
          awarded_by: string | null
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
          award_method?: string | null
          awarded?: boolean | null
          awarded_at?: string | null
          awarded_by?: string | null
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
          award_method?: string | null
          awarded?: boolean | null
          awarded_at?: string | null
          awarded_by?: string | null
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
      blog_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      blog_generation_history: {
        Row: {
          error_message: string | null
          generated_at: string | null
          id: string
          post_id: string | null
          settings_snapshot: Json | null
          status: string
          topic: string
        }
        Insert: {
          error_message?: string | null
          generated_at?: string | null
          id?: string
          post_id?: string | null
          settings_snapshot?: Json | null
          status?: string
          topic: string
        }
        Update: {
          error_message?: string | null
          generated_at?: string | null
          id?: string
          post_id?: string | null
          settings_snapshot?: Json | null
          status?: string
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_generation_history_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_generation_settings: {
        Row: {
          created_at: string | null
          enabled: boolean
          frequency: string
          id: string
          include_images: boolean | null
          target_categories: string[] | null
          target_tags: string[] | null
          tone: string | null
          topics: string[]
          updated_at: string | null
          user_id: string
          word_count: number | null
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean
          frequency?: string
          id?: string
          include_images?: boolean | null
          target_categories?: string[] | null
          target_tags?: string[] | null
          tone?: string | null
          topics?: string[]
          updated_at?: string | null
          user_id: string
          word_count?: number | null
        }
        Update: {
          created_at?: string | null
          enabled?: boolean
          frequency?: string
          id?: string
          include_images?: boolean | null
          target_categories?: string[] | null
          target_tags?: string[] | null
          tone?: string | null
          topics?: string[]
          updated_at?: string | null
          user_id?: string
          word_count?: number | null
        }
        Relationships: []
      }
      blog_post_tags: {
        Row: {
          created_at: string | null
          id: string
          post_id: string | null
          tag_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          tag_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          tag_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_post_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "blog_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_id: string | null
          category_id: string | null
          content: string
          created_at: string | null
          excerpt: string
          featured_image: string | null
          id: string
          meta_description: string | null
          meta_keywords: string | null
          meta_title: string | null
          published_at: string | null
          slug: string
          status: string | null
          title: string
          updated_at: string | null
          views_count: number | null
        }
        Insert: {
          author_id?: string | null
          category_id?: string | null
          content: string
          created_at?: string | null
          excerpt: string
          featured_image?: string | null
          id?: string
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug: string
          status?: string | null
          title: string
          updated_at?: string | null
          views_count?: number | null
        }
        Update: {
          author_id?: string | null
          category_id?: string | null
          content?: string
          created_at?: string | null
          excerpt?: string
          featured_image?: string | null
          id?: string
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_tags: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
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
      custom_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      digger_lead_balance: {
        Row: {
          balance: number
          created_at: string
          digger_id: string
          id: string
          last_deposit_at: string | null
          last_warning_sent_at: string | null
          total_deposited: number
          total_spent: number
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          digger_id: string
          id?: string
          last_deposit_at?: string | null
          last_warning_sent_at?: string | null
          total_deposited?: number
          total_spent?: number
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          digger_id?: string
          id?: string
          last_deposit_at?: string | null
          last_warning_sent_at?: string | null
          total_deposited?: number
          total_spent?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "digger_lead_balance_digger_id_fkey"
            columns: ["digger_id"]
            isOneToOne: true
            referencedRelation: "digger_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      digger_professions: {
        Row: {
          created_at: string
          digger_profile_id: string
          id: string
          keywords: string[] | null
          profession_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          digger_profile_id: string
          id?: string
          keywords?: string[] | null
          profession_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          digger_profile_id?: string
          id?: string
          keywords?: string[] | null
          profession_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "digger_professions_digger_profile_id_fkey"
            columns: ["digger_profile_id"]
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
          company_name: string | null
          completion_rate: number | null
          country: string | null
          created_at: string
          custom_occupation_title: string | null
          expected_lead_period: string | null
          expected_lead_volume: number | null
          handle: string | null
          hourly_rate: number | null
          hourly_rate_max: number | null
          hourly_rate_min: number | null
          id: string
          is_bonded: boolean | null
          is_insured: boolean | null
          is_licensed: string | null
          is_primary: boolean | null
          keywords: string[] | null
          last_lead_count_reset: string | null
          lead_limit: number | null
          lead_limit_enabled: boolean | null
          lead_limit_period: string | null
          lead_tier_description: string | null
          location: string
          location_lat: number | null
          location_lng: number | null
          monthly_lead_count: number | null
          naics_code: string[] | null
          offers_free_estimates: boolean | null
          phone: string
          portfolio_url: string | null
          portfolio_urls: string[] | null
          pricing_model: string | null
          primary_profession_index: number | null
          profession: string | null
          profile_image_url: string | null
          profile_name: string | null
          profile_number: number | null
          registration_status: string | null
          response_time_hours: number | null
          sic_code: string[] | null
          skills: string[] | null
          stripe_connect_account_id: string | null
          stripe_connect_charges_enabled: boolean | null
          stripe_connect_onboarded: boolean | null
          stripe_customer_id: string | null
          subscription_end_date: string | null
          subscription_status: string | null
          subscription_tier: string | null
          tagline: string | null
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
          company_name?: string | null
          completion_rate?: number | null
          country?: string | null
          created_at?: string
          custom_occupation_title?: string | null
          expected_lead_period?: string | null
          expected_lead_volume?: number | null
          handle?: string | null
          hourly_rate?: number | null
          hourly_rate_max?: number | null
          hourly_rate_min?: number | null
          id?: string
          is_bonded?: boolean | null
          is_insured?: boolean | null
          is_licensed?: string | null
          is_primary?: boolean | null
          keywords?: string[] | null
          last_lead_count_reset?: string | null
          lead_limit?: number | null
          lead_limit_enabled?: boolean | null
          lead_limit_period?: string | null
          lead_tier_description?: string | null
          location: string
          location_lat?: number | null
          location_lng?: number | null
          monthly_lead_count?: number | null
          naics_code?: string[] | null
          offers_free_estimates?: boolean | null
          phone: string
          portfolio_url?: string | null
          portfolio_urls?: string[] | null
          pricing_model?: string | null
          primary_profession_index?: number | null
          profession?: string | null
          profile_image_url?: string | null
          profile_name?: string | null
          profile_number?: number | null
          registration_status?: string | null
          response_time_hours?: number | null
          sic_code?: string[] | null
          skills?: string[] | null
          stripe_connect_account_id?: string | null
          stripe_connect_charges_enabled?: boolean | null
          stripe_connect_onboarded?: boolean | null
          stripe_customer_id?: string | null
          subscription_end_date?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          tagline?: string | null
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
          company_name?: string | null
          completion_rate?: number | null
          country?: string | null
          created_at?: string
          custom_occupation_title?: string | null
          expected_lead_period?: string | null
          expected_lead_volume?: number | null
          handle?: string | null
          hourly_rate?: number | null
          hourly_rate_max?: number | null
          hourly_rate_min?: number | null
          id?: string
          is_bonded?: boolean | null
          is_insured?: boolean | null
          is_licensed?: string | null
          is_primary?: boolean | null
          keywords?: string[] | null
          last_lead_count_reset?: string | null
          lead_limit?: number | null
          lead_limit_enabled?: boolean | null
          lead_limit_period?: string | null
          lead_tier_description?: string | null
          location?: string
          location_lat?: number | null
          location_lng?: number | null
          monthly_lead_count?: number | null
          naics_code?: string[] | null
          offers_free_estimates?: boolean | null
          phone?: string
          portfolio_url?: string | null
          portfolio_urls?: string[] | null
          pricing_model?: string | null
          primary_profession_index?: number | null
          profession?: string | null
          profile_image_url?: string | null
          profile_name?: string | null
          profile_number?: number | null
          registration_status?: string | null
          response_time_hours?: number | null
          sic_code?: string[] | null
          skills?: string[] | null
          stripe_connect_account_id?: string | null
          stripe_connect_charges_enabled?: boolean | null
          stripe_connect_onboarded?: boolean | null
          stripe_customer_id?: string | null
          subscription_end_date?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          tagline?: string | null
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
      digger_specialties: {
        Row: {
          created_at: string
          id: string
          keywords: string[] | null
          profession_id: string
          specialty_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          keywords?: string[] | null
          profession_id: string
          specialty_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          keywords?: string[] | null
          profession_id?: string
          specialty_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "digger_specialties_profession_id_fkey"
            columns: ["profession_id"]
            isOneToOne: false
            referencedRelation: "digger_professions"
            referencedColumns: ["id"]
          },
        ]
      }
      email_preferences: {
        Row: {
          bid_notifications_enabled: boolean
          created_at: string
          digest_enabled: boolean | null
          digest_frequency: string | null
          enabled: boolean
          id: string
          keyword_requests_enabled: boolean
          lead_issues_enabled: boolean
          profile_reminders_enabled: boolean
          report_frequency: string
          system_alerts_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          bid_notifications_enabled?: boolean
          created_at?: string
          digest_enabled?: boolean | null
          digest_frequency?: string | null
          enabled?: boolean
          id?: string
          keyword_requests_enabled?: boolean
          lead_issues_enabled?: boolean
          profile_reminders_enabled?: boolean
          report_frequency?: string
          system_alerts_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          bid_notifications_enabled?: boolean
          created_at?: string
          digest_enabled?: boolean | null
          digest_frequency?: string | null
          enabled?: boolean
          id?: string
          keyword_requests_enabled?: boolean
          lead_issues_enabled?: boolean
          profile_reminders_enabled?: boolean
          report_frequency?: string
          system_alerts_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      escrow_contracts: {
        Row: {
          actual_hours: number | null
          completed_at: string | null
          consumer_id: string
          contract_type: string
          created_at: string
          digger_id: string
          estimated_hours: number | null
          funded_at: string | null
          gig_id: string
          hourly_rate: number | null
          id: string
          platform_fee_amount: number
          platform_fee_percentage: number | null
          status: string
          stripe_payment_intent_id: string | null
          total_amount: number
        }
        Insert: {
          actual_hours?: number | null
          completed_at?: string | null
          consumer_id: string
          contract_type?: string
          created_at?: string
          digger_id: string
          estimated_hours?: number | null
          funded_at?: string | null
          gig_id: string
          hourly_rate?: number | null
          id?: string
          platform_fee_amount: number
          platform_fee_percentage?: number | null
          status?: string
          stripe_payment_intent_id?: string | null
          total_amount: number
        }
        Update: {
          actual_hours?: number | null
          completed_at?: string | null
          consumer_id?: string
          contract_type?: string
          created_at?: string
          digger_id?: string
          estimated_hours?: number | null
          funded_at?: string | null
          gig_id?: string
          hourly_rate?: number | null
          id?: string
          platform_fee_amount?: number
          platform_fee_percentage?: number | null
          status?: string
          stripe_payment_intent_id?: string | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "escrow_contracts_consumer_id_fkey"
            columns: ["consumer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escrow_contracts_digger_id_fkey"
            columns: ["digger_id"]
            isOneToOne: false
            referencedRelation: "digger_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escrow_contracts_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
        ]
      }
      gigs: {
        Row: {
          ai_matched_codes: boolean | null
          awarded_at: string | null
          awarded_bid_id: string | null
          awarded_digger_id: string | null
          budget_max: number | null
          budget_min: number | null
          category_id: string | null
          confirmation_method_preference: string | null
          confirmation_sent_at: string | null
          confirmation_status: string | null
          confirmed_at: string | null
          consumer_id: string
          consumer_phone: string | null
          contact_preferences: string | null
          created_at: string
          deadline: string | null
          description: string
          escrow_requested_by_consumer: boolean | null
          id: string
          images: string[] | null
          is_confirmed_lead: boolean | null
          lead_source: string | null
          location: string
          location_lat: number | null
          location_lng: number | null
          naics_codes: string[] | null
          purchase_count: number | null
          sic_codes: string[] | null
          status: string | null
          telemarketer_id: string | null
          timeline: string | null
          title: string
          updated_at: string
          uploaded_by_telemarketer: boolean | null
        }
        Insert: {
          ai_matched_codes?: boolean | null
          awarded_at?: string | null
          awarded_bid_id?: string | null
          awarded_digger_id?: string | null
          budget_max?: number | null
          budget_min?: number | null
          category_id?: string | null
          confirmation_method_preference?: string | null
          confirmation_sent_at?: string | null
          confirmation_status?: string | null
          confirmed_at?: string | null
          consumer_id: string
          consumer_phone?: string | null
          contact_preferences?: string | null
          created_at?: string
          deadline?: string | null
          description: string
          escrow_requested_by_consumer?: boolean | null
          id?: string
          images?: string[] | null
          is_confirmed_lead?: boolean | null
          lead_source?: string | null
          location: string
          location_lat?: number | null
          location_lng?: number | null
          naics_codes?: string[] | null
          purchase_count?: number | null
          sic_codes?: string[] | null
          status?: string | null
          telemarketer_id?: string | null
          timeline?: string | null
          title: string
          updated_at?: string
          uploaded_by_telemarketer?: boolean | null
        }
        Update: {
          ai_matched_codes?: boolean | null
          awarded_at?: string | null
          awarded_bid_id?: string | null
          awarded_digger_id?: string | null
          budget_max?: number | null
          budget_min?: number | null
          category_id?: string | null
          confirmation_method_preference?: string | null
          confirmation_sent_at?: string | null
          confirmation_status?: string | null
          confirmed_at?: string | null
          consumer_id?: string
          consumer_phone?: string | null
          contact_preferences?: string | null
          created_at?: string
          deadline?: string | null
          description?: string
          escrow_requested_by_consumer?: boolean | null
          id?: string
          images?: string[] | null
          is_confirmed_lead?: boolean | null
          lead_source?: string | null
          location?: string
          location_lat?: number | null
          location_lng?: number | null
          naics_codes?: string[] | null
          purchase_count?: number | null
          sic_codes?: string[] | null
          status?: string | null
          telemarketer_id?: string | null
          timeline?: string | null
          title?: string
          updated_at?: string
          uploaded_by_telemarketer?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "gigs_awarded_bid_id_fkey"
            columns: ["awarded_bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gigs_awarded_digger_id_fkey"
            columns: ["awarded_digger_id"]
            isOneToOne: false
            referencedRelation: "digger_profiles"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "gigs_telemarketer_id_fkey"
            columns: ["telemarketer_id"]
            isOneToOne: false
            referencedRelation: "telemarketer_profiles"
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
      keyword_analytics: {
        Row: {
          category_name: string | null
          created_at: string
          id: string
          keyword: string
          last_used_at: string
          profession: string | null
          times_used: number
        }
        Insert: {
          category_name?: string | null
          created_at?: string
          id?: string
          keyword: string
          last_used_at?: string
          profession?: string | null
          times_used?: number
        }
        Update: {
          category_name?: string | null
          created_at?: string
          id?: string
          keyword?: string
          last_used_at?: string
          profession?: string | null
          times_used?: number
        }
        Relationships: []
      }
      keyword_suggestion_requests: {
        Row: {
          created_at: string
          id: string
          processed_at: string | null
          profession: string
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          processed_at?: string | null
          profession: string
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          processed_at?: string | null
          profession?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      lead_balance_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          description: string | null
          digger_id: string
          id: string
          lead_purchase_id: string | null
          stripe_payment_id: string | null
          transaction_type: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          description?: string | null
          digger_id: string
          id?: string
          lead_purchase_id?: string | null
          stripe_payment_id?: string | null
          transaction_type: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          description?: string | null
          digger_id?: string
          id?: string
          lead_purchase_id?: string | null
          stripe_payment_id?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_balance_transactions_digger_id_fkey"
            columns: ["digger_id"]
            isOneToOne: false
            referencedRelation: "digger_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_balance_transactions_lead_purchase_id_fkey"
            columns: ["lead_purchase_id"]
            isOneToOne: false
            referencedRelation: "lead_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_exclusivity_extensions: {
        Row: {
          created_at: string | null
          expires_at: string
          extension_cost: number
          extension_hours: number
          extension_number: number
          extension_premium_percentage: number
          id: string
          payment_status: string
          queue_entry_id: string
          stripe_payment_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          extension_cost: number
          extension_hours?: number
          extension_number: number
          extension_premium_percentage?: number
          id?: string
          payment_status?: string
          queue_entry_id: string
          stripe_payment_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          extension_cost?: number
          extension_hours?: number
          extension_number?: number
          extension_premium_percentage?: number
          id?: string
          payment_status?: string
          queue_entry_id?: string
          stripe_payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_exclusivity_extensions_queue_entry_id_fkey"
            columns: ["queue_entry_id"]
            isOneToOne: false
            referencedRelation: "lead_exclusivity_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_exclusivity_queue: {
        Row: {
          awarded_at: string | null
          base_price: number
          converted_to_nonexclusive_at: string | null
          created_at: string | null
          digger_id: string
          exclusivity_ends_at: string | null
          exclusivity_starts_at: string | null
          gig_id: string
          id: string
          lead_source: string
          queue_position: number
          status: string
          updated_at: string | null
        }
        Insert: {
          awarded_at?: string | null
          base_price: number
          converted_to_nonexclusive_at?: string | null
          created_at?: string | null
          digger_id: string
          exclusivity_ends_at?: string | null
          exclusivity_starts_at?: string | null
          gig_id: string
          id?: string
          lead_source: string
          queue_position: number
          status?: string
          updated_at?: string | null
        }
        Update: {
          awarded_at?: string | null
          base_price?: number
          converted_to_nonexclusive_at?: string | null
          created_at?: string | null
          digger_id?: string
          exclusivity_ends_at?: string | null
          exclusivity_starts_at?: string | null
          gig_id?: string
          id?: string
          lead_source?: string
          queue_position?: number
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_exclusivity_queue_digger_id_fkey"
            columns: ["digger_id"]
            isOneToOne: false
            referencedRelation: "digger_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_exclusivity_queue_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
        ]
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
          award_expires_at: string | null
          award_extended: boolean | null
          awarded_at: string | null
          base_price: number
          consumer_id: string
          converted_from_exclusive: boolean | null
          digger_id: string
          exclusivity_queue_position: number | null
          gig_id: string
          id: string
          is_exclusive: boolean | null
          lead_source: string | null
          purchase_price: number
          purchased_at: string
          status: string | null
          stripe_payment_id: string | null
          telemarketer_id: string | null
        }
        Insert: {
          amount_paid: number
          award_expires_at?: string | null
          award_extended?: boolean | null
          awarded_at?: string | null
          base_price?: number
          consumer_id: string
          converted_from_exclusive?: boolean | null
          digger_id: string
          exclusivity_queue_position?: number | null
          gig_id: string
          id?: string
          is_exclusive?: boolean | null
          lead_source?: string | null
          purchase_price: number
          purchased_at?: string
          status?: string | null
          stripe_payment_id?: string | null
          telemarketer_id?: string | null
        }
        Update: {
          amount_paid?: number
          award_expires_at?: string | null
          award_extended?: boolean | null
          awarded_at?: string | null
          base_price?: number
          consumer_id?: string
          converted_from_exclusive?: boolean | null
          digger_id?: string
          exclusivity_queue_position?: number | null
          gig_id?: string
          id?: string
          is_exclusive?: boolean | null
          lead_source?: string | null
          purchase_price?: number
          purchased_at?: string
          status?: string | null
          stripe_payment_id?: string | null
          telemarketer_id?: string | null
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
          {
            foreignKeyName: "lead_purchases_telemarketer_id_fkey"
            columns: ["telemarketer_id"]
            isOneToOne: false
            referencedRelation: "telemarketer_profiles"
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
      milestone_payments: {
        Row: {
          amount: number
          created_at: string
          description: string
          digger_payout: number
          escrow_contract_id: string
          hourly_rate: number | null
          hours_worked: number | null
          id: string
          milestone_number: number
          platform_fee: number
          released_at: string | null
          status: string
          stripe_transfer_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          digger_payout: number
          escrow_contract_id: string
          hourly_rate?: number | null
          hours_worked?: number | null
          id?: string
          milestone_number: number
          platform_fee: number
          released_at?: string | null
          status?: string
          stripe_transfer_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          digger_payout?: number
          escrow_contract_id?: string
          hourly_rate?: number | null
          hours_worked?: number | null
          id?: string
          milestone_number?: number
          platform_fee?: number
          released_at?: string | null
          status?: string
          stripe_transfer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "milestone_payments_escrow_contract_id_fkey"
            columns: ["escrow_contract_id"]
            isOneToOne: false
            referencedRelation: "escrow_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_digest_queue: {
        Row: {
          created_at: string | null
          id: string
          notification_id: string
          sent_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notification_id: string
          sent_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notification_id?: string
          sent_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_digest_queue_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: true
            referencedRelation: "notifications"
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
      profile_views: {
        Row: {
          amount_charged: number
          consumer_id: string
          digger_id: string
          id: string
          viewed_at: string
        }
        Insert: {
          amount_charged?: number
          consumer_id: string
          digger_id: string
          id?: string
          viewed_at?: string
        }
        Update: {
          amount_charged?: number
          consumer_id?: string
          digger_id?: string
          id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_views_digger_id_fkey"
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
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_type: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
          user_type?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_type?: string | null
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
      telemarketer_commissions: {
        Row: {
          awarded_at: string
          commission_amount: number
          commission_percentage: number | null
          commission_type: string
          created_at: string
          gig_id: string
          id: string
          lead_price: number
          lead_purchase_id: string
          notes: string | null
          paid_at: string | null
          payment_status: string
          stripe_transfer_id: string | null
          telemarketer_id: string
        }
        Insert: {
          awarded_at: string
          commission_amount: number
          commission_percentage?: number | null
          commission_type: string
          created_at?: string
          gig_id: string
          id?: string
          lead_price: number
          lead_purchase_id: string
          notes?: string | null
          paid_at?: string | null
          payment_status?: string
          stripe_transfer_id?: string | null
          telemarketer_id: string
        }
        Update: {
          awarded_at?: string
          commission_amount?: number
          commission_percentage?: number | null
          commission_type?: string
          created_at?: string
          gig_id?: string
          id?: string
          lead_price?: number
          lead_purchase_id?: string
          notes?: string | null
          paid_at?: string | null
          payment_status?: string
          stripe_transfer_id?: string | null
          telemarketer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "telemarketer_commissions_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telemarketer_commissions_lead_purchase_id_fkey"
            columns: ["lead_purchase_id"]
            isOneToOne: false
            referencedRelation: "lead_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telemarketer_commissions_telemarketer_id_fkey"
            columns: ["telemarketer_id"]
            isOneToOne: false
            referencedRelation: "telemarketer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      telemarketer_profiles: {
        Row: {
          business_name: string
          commission_percentage: number | null
          compensation_type: string
          created_at: string | null
          email: string
          flat_fee_amount: number | null
          id: string
          paid_commissions: number | null
          pending_commissions: number | null
          phone: string
          stripe_connect_account_id: string | null
          total_commissions_earned: number | null
          total_leads_uploaded: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          business_name: string
          commission_percentage?: number | null
          compensation_type?: string
          created_at?: string | null
          email: string
          flat_fee_amount?: number | null
          id?: string
          paid_commissions?: number | null
          pending_commissions?: number | null
          phone: string
          stripe_connect_account_id?: string | null
          total_commissions_earned?: number | null
          total_leads_uploaded?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          business_name?: string
          commission_percentage?: number | null
          compensation_type?: string
          created_at?: string | null
          email?: string
          flat_fee_amount?: number | null
          id?: string
          paid_commissions?: number | null
          pending_commissions?: number | null
          phone?: string
          stripe_connect_account_id?: string | null
          total_commissions_earned?: number | null
          total_leads_uploaded?: number | null
          updated_at?: string | null
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
          escrow_contract_id: string | null
          gig_id: string
          id: string
          is_escrow: boolean | null
          milestone_payment_id: string | null
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
          escrow_contract_id?: string | null
          gig_id: string
          id?: string
          is_escrow?: boolean | null
          milestone_payment_id?: string | null
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
          escrow_contract_id?: string | null
          gig_id?: string
          id?: string
          is_escrow?: boolean | null
          milestone_payment_id?: string | null
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
            foreignKeyName: "transactions_escrow_contract_id_fkey"
            columns: ["escrow_contract_id"]
            isOneToOne: false
            referencedRelation: "escrow_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_milestone_payment_id_fkey"
            columns: ["milestone_payment_id"]
            isOneToOne: false
            referencedRelation: "milestone_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_app_roles: {
        Row: {
          app_role: Database["public"]["Enums"]["user_app_role"]
          created_at: string
          id: string
          is_active: boolean
          last_used_at: string | null
          user_id: string
        }
        Insert: {
          app_role: Database["public"]["Enums"]["user_app_role"]
          created_at?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          user_id: string
        }
        Update: {
          app_role?: Database["public"]["Enums"]["user_app_role"]
          created_at?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      get_tier_for_lead_count: { Args: { lead_count: number }; Returns: string }
      get_user_app_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["user_app_role"][]
      }
      has_app_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_blog_post_views: {
        Args: { post_slug: string }
        Returns: undefined
      }
      is_digger: { Args: { _user_id: string }; Returns: boolean }
      is_gig_owner: {
        Args: { _gig_id: string; _user_id: string }
        Returns: boolean
      }
      reset_monthly_lead_counts: { Args: never; Returns: undefined }
      track_keyword_usage: {
        Args: {
          p_category_name?: string
          p_keyword: string
          p_profession?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "telemarketer"
      user_app_role: "digger" | "gigger" | "telemarketer" | "admin"
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
      app_role: ["admin", "moderator", "user", "telemarketer"],
      user_app_role: ["digger", "gigger", "telemarketer", "admin"],
    },
  },
} as const
