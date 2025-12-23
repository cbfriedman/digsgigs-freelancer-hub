/**
 * React Hook for Click & Call Pricing
 * 
 * Provides easy access to pricing calculations for:
 * - Lead contact reveals
 * - Profile clicks (giggers clicking on digger profiles)
 * - Profile calls (giggers calling diggers)
 */

import { useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
  calculateLeadRevealPrice,
  calculateProfileClickPrice,
  calculateProfileCallPrice,
  getPricingSummary,
  LeadPricingResult,
  ProfileClickPricingResult,
  ProfileCallPricingResult,
  FREE_CLICKS_PER_MONTH,
  GRACE_PERIOD_DAYS,
} from '@/config/clickPricing';

interface DiggerPricingInfo {
  isSubscriber: boolean;
  accumulatedFreeClicks: number;
  subscriptionTier: string | null;
  subscriptionStatus: string | null;
  subscriptionLapsedAt: string | null;
  isInGracePeriod: boolean;
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
        .select('subscription_status, subscription_tier, accumulated_free_clicks, subscription_lapsed_at')
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
      };
    },
    enabled: !!user?.id,
    staleTime: 30000, // 30 seconds
  });

  // Calculate lead reveal price
  const getLeadRevealPrice = useCallback((keyword: string): LeadPricingResult => {
    const isSubscriber = pricingInfo?.isSubscriber || pricingInfo?.isInGracePeriod || false;
    const freeClicks = pricingInfo?.accumulatedFreeClicks || 0;
    
    return calculateLeadRevealPrice(keyword, isSubscriber, freeClicks);
  }, [pricingInfo]);

  // Calculate profile click price
  const getProfileClickPrice = useCallback((professionOrKeyword: string): ProfileClickPricingResult => {
    return calculateProfileClickPrice(professionOrKeyword);
  }, []);

  // Calculate profile call price
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
    getProfileClickPrice,
    getProfileCallPrice,

    // Constants
    freeClicksPerMonth: FREE_CLICKS_PER_MONTH,
    gracePeriodDays: GRACE_PERIOD_DAYS,
    pricingSummary,
  };
};

/**
 * Hook specifically for profile click/call pricing (for gigger-side use)
 */
export const useProfilePricing = () => {
  // Calculate profile click price
  const getClickPrice = useCallback((professionOrKeyword: string): ProfileClickPricingResult => {
    return calculateProfileClickPrice(professionOrKeyword);
  }, []);

  // Calculate profile call price
  const getCallPrice = useCallback((professionOrKeyword: string): ProfileCallPricingResult => {
    return calculateProfileCallPrice(professionOrKeyword);
  }, []);

  return {
    getClickPrice,
    getCallPrice,
  };
};

export default useClickPricing;
