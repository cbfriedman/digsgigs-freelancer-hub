export interface Reference {
  id: string;
  reference_name: string;
  reference_email: string;
  reference_phone: string | null;
  project_description: string | null;
  is_verified: boolean;
}

export interface ReferenceRequest {
  id: string;
  status: string;
}

export interface DiggerProfile {
  id: string;
  user_id: string;
  handle: string | null;
  business_name: string;
  profession: string;
  profile_name?: string | null;
  tagline: string | null;
  availability: string | null;
  bio: string | null;
  location: string;
  city?: string | null;
  phone: string;
  hourly_rate: number | null;
  hourly_rate_min: number | null;
  hourly_rate_max: number | null;
  years_experience: number | null;
  average_rating: number;
  total_ratings: number;
  profile_image_url: string | null;
  cover_photo_url?: string | null;
  portfolio_url: string | null;
  portfolio_urls?: string[] | null;
  work_photos: string[] | null;
  skills: string[] | null;
  certifications?: string[] | null;
  keywords?: string[] | null;
  completion_rate: number | null;
  response_time_hours: number | null;
  is_insured: boolean;
  is_bonded: boolean;
  is_licensed: string;
  sic_code: string[] | null;
  naics_code: string[] | null;
  custom_occupation_title: string | null;
  primary_profession_index: number | null;
  location_lat: number | null;
  location_lng: number | null;
  pricing_model: string | null;
  subscription_tier: string | null;
  offers_free_estimates: boolean | null;
  country: string | null;
  website_url?: string | null;
  service_countries?: string[] | null;
  monthly_salary?: number | null;
  social_links?: unknown;
  state?: string | null;
  verified?: boolean | null;
  stripe_connect_onboarded?: boolean | null;
  stripe_connect_charges_enabled?: boolean | null;
  profiles: {
    full_name: string | null;
    email?: string | null;
    avatar_url?: string | null;
    country?: string | null;
    timezone?: string | null;
    handle?: string | null;
    email_verified?: boolean | null;
    phone_verified?: boolean | null;
    payment_verified?: boolean | null;
    id_verified?: boolean | null;
  } | null;
  created_at?: string | null;
  digger_categories: {
    categories: {
      name: string;
      description: string | null;
    };
  }[];
}

export type Digger = DiggerProfile;
