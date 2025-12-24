/**
 * React Hook for Click & Call Pricing
 * 
 * Provides easy access to pricing calculations for:
 * - Lead reveals (Digger → Gigger)
 * - Profile discovery (Gigger → Digger)
 */

import { useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
  calculateLeadRevealPrice,
  calculateProfileDiscoveryPrice,
  calculateProfileClickPrice,
  calculateProfileCallPrice,
  getPricingSummary,
  LeadRevealPricingResult,
  ProfileDiscoveryPricingResult,
  ProfileClickPricingResult,
  ProfileCallPricingResult,
  FREE_LEADS_PER_MONTH,
  GRACE_PERIOD_DAYS,
  GeographicCoverage,
  isHighValueIndustry,
  LEAD_REVEAL_PRICING,
  PROFILE_DISCOVERY_PRICING,
} from '@/config/clickPricing';

interface DiggerPricingInfo {
  isSubscriber: boolean;
  accumulatedFreeClicks: number;
  subscriptionTier: string | null;
  subscriptionStatus: string | null;
  subscriptionLapsedAt: string | null;
  isInGracePeriod: boolean;
  geographicTier: GeographicCoverage;
  allowGiggerContact: boolean;
}

/**
 * Hook to get current user's pricing status and calculate prices
 */
export const useClickPricing = () => {
  const { user } = useAuth();

  // Fetch digger profile pricing info
  const { data: pricingInfo, isLoading, refetch } = useQuery({
    queryKey: ['digger-pricing-info', user?.id],
    queryFn: async (): Promise<DiggerPricingInfo | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('digger_profiles')
        .select('subscription_status, subscription_tier, accumulated_free_clicks, subscription_lapsed_at, geographic_tier, allow_gigger_contact')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .maybeSingle();

      if (error) {
        console.error('Error fetching pricing info:', error);
        return null;
      }

      if (!data) return null;

      const isSubscriber = data.subscription_status === 'active';
      const lapsedAt = data.subscription_lapsed_at ? new Date(data.subscription_lapsed_at) : null;
      const now = new Date();
      const gracePeriodEnd = lapsedAt 
        ? new Date(lapsedAt.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000)
        : null;
      const isInGracePeriod = gracePeriodEnd ? now < gracePeriodEnd : false;

      return {
        isSubscriber,
        accumulatedFreeClicks: data.accumulated_free_clicks || 0,
        subscriptionTier: data.subscription_tier,
        subscriptionStatus: data.subscription_status,
        subscriptionLapsedAt: data.subscription_lapsed_at,
        isInGracePeriod,
        geographicTier: (data.geographic_tier as GeographicCoverage) || 'local',
        allowGiggerContact: data.allow_gigger_contact || false,
      };
    },
    enabled: !!user?.id,
    staleTime: 30000, // 30 seconds
  });

  // Calculate lead reveal price (Digger → Gigger)
  const getLeadRevealPrice = useCallback((
    keyword: string,
    geographicCoverage?: GeographicCoverage,
    isConfirmed: boolean = false
  ): LeadRevealPricingResult => {
    const isSubscriber = pricingInfo?.isSubscriber || pricingInfo?.isInGracePeriod || false;
    const freeClicks = pricingInfo?.accumulatedFreeClicks || 0;
    const coverage = geographicCoverage || pricingInfo?.geographicTier || 'local';
    
    return calculateLeadRevealPrice(keyword, coverage, isConfirmed, freeClicks, isSubscriber);
  }, [pricingInfo]);

  // Calculate profile discovery price (Gigger → Digger)
  const getProfileDiscoveryPrice = useCallback((
    keyword: string,
    geographicCoverage?: GeographicCoverage
  ): ProfileDiscoveryPricingResult => {
    const coverage = geographicCoverage || pricingInfo?.geographicTier || 'local';
    return calculateProfileDiscoveryPrice(keyword, coverage);
  }, [pricingInfo]);

  // Legacy: Calculate profile click price
  const getProfileClickPrice = useCallback((professionOrKeyword: string): ProfileClickPricingResult => {
    return calculateProfileClickPrice(professionOrKeyword);
  }, []);

  // Legacy: Calculate profile call price
  const getProfileCallPrice = useCallback((professionOrKeyword: string): ProfileCallPricingResult => {
    return calculateProfileCallPrice(professionOrKeyword);
  }, []);

  // Get pricing summary
  const pricingSummary = useMemo(() => getPricingSummary(), []);

  return {
    // Status
    isLoading,
    pricingInfo,
    refetchPricingInfo: refetch,

    // Price calculators
    getLeadRevealPrice,
    getProfileDiscoveryPrice,
    getProfileClickPrice,
    getProfileCallPrice,

    // Constants
    freeLeadsPerMonth: FREE_LEADS_PER_MONTH,
    gracePeriodDays: GRACE_PERIOD_DAYS,
    pricingSummary,
    
    // Pricing matrices for display
    leadRevealPricing: LEAD_REVEAL_PRICING,
    profileDiscoveryPricing: PROFILE_DISCOVERY_PRICING,
  };
};

/**
 * Hook specifically for profile discovery pricing (for gigger-side use)
 */
export const useProfilePricing = () => {
  // Calculate profile discovery price
  const getDiscoveryPrice = useCallback((
    professionOrKeyword: string,
    geographicCoverage: GeographicCoverage = 'local'
  ): ProfileDiscoveryPricingResult => {
    return calculateProfileDiscoveryPrice(professionOrKeyword, geographicCoverage);
  }, []);

  // Legacy: Calculate profile click price
  const getClickPrice = useCallback((professionOrKeyword: string): ProfileClickPricingResult => {
    return calculateProfileClickPrice(professionOrKeyword);
  }, []);

  // Legacy: Calculate profile call price
  const getCallPrice = useCallback((professionOrKeyword: string): ProfileCallPricingResult => {
    return calculateProfileCallPrice(professionOrKeyword);
  }, []);

  // Check if industry is high value
  const checkHighValue = useCallback((keyword: string): boolean => {
    return isHighValueIndustry(keyword);
  }, []);

  return {
    getDiscoveryPrice,
    getClickPrice,
    getCallPrice,
    checkHighValue,
    profileDiscoveryPricing: PROFILE_DISCOVERY_PRICING,
  };
};

export default useClickPricing;
