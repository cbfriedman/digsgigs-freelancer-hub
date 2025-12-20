import { useEffect, useCallback } from 'react';

export interface UTMParams {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
}

const UTM_STORAGE_KEY = 'utm_params';
const LANDING_PAGE_KEY = 'landing_page';
const REFERRER_KEY = 'referrer';

/**
 * Hook to capture and persist UTM parameters across navigation.
 * Stores in sessionStorage to maintain data during the session.
 */
export const useUTMTracking = () => {
  // Capture UTM params on page load
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    
    const hasUTMParams = searchParams.has('utm_source') || 
                         searchParams.has('utm_medium') || 
                         searchParams.has('utm_campaign') ||
                         searchParams.has('utm_content') ||
                         searchParams.has('utm_term');
    
    // Only store if UTM params are present (don't overwrite with empty data)
    if (hasUTMParams) {
      const utmParams: UTMParams = {
        utm_source: searchParams.get('utm_source'),
        utm_medium: searchParams.get('utm_medium'),
        utm_campaign: searchParams.get('utm_campaign'),
        utm_content: searchParams.get('utm_content'),
        utm_term: searchParams.get('utm_term'),
      };
      
      sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utmParams));
      sessionStorage.setItem(LANDING_PAGE_KEY, window.location.pathname);
      
      // Only store referrer if not already stored (preserve original referrer)
      if (!sessionStorage.getItem(REFERRER_KEY) && document.referrer) {
        sessionStorage.setItem(REFERRER_KEY, document.referrer);
      }
    }
  }, []);

  // Get stored UTM params
  const getUTMParams = useCallback((): UTMParams | null => {
    try {
      const stored = sessionStorage.getItem(UTM_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, []);

  // Get landing page
  const getLandingPage = useCallback((): string | null => {
    return sessionStorage.getItem(LANDING_PAGE_KEY);
  }, []);

  // Get referrer
  const getReferrer = useCallback((): string | null => {
    return sessionStorage.getItem(REFERRER_KEY);
  }, []);

  // Check if this is an email campaign
  const isEmailCampaign = useCallback((): boolean => {
    const params = getUTMParams();
    return params?.utm_medium === 'email';
  }, [getUTMParams]);

  // Get full campaign data for tracking
  const getCampaignData = useCallback(() => {
    const utmParams = getUTMParams();
    const landingPage = getLandingPage();
    const referrer = getReferrer();
    
    // Detect device type
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isTablet = /iPad|Android/i.test(navigator.userAgent) && !/Mobile/i.test(navigator.userAgent);
    const deviceType = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop';
    
    // Get browser
    const userAgent = navigator.userAgent;
    let browser = 'other';
    if (userAgent.includes('Chrome')) browser = 'chrome';
    else if (userAgent.includes('Safari')) browser = 'safari';
    else if (userAgent.includes('Firefox')) browser = 'firefox';
    else if (userAgent.includes('Edge')) browser = 'edge';
    
    return {
      ...utmParams,
      landing_page: landingPage,
      referrer,
      device_type: deviceType,
      browser,
    };
  }, [getUTMParams, getLandingPage, getReferrer]);

  // Clear UTM data (e.g., after conversion is logged)
  const clearUTMData = useCallback(() => {
    sessionStorage.removeItem(UTM_STORAGE_KEY);
    sessionStorage.removeItem(LANDING_PAGE_KEY);
    sessionStorage.removeItem(REFERRER_KEY);
  }, []);

  return {
    getUTMParams,
    getLandingPage,
    getReferrer,
    isEmailCampaign,
    getCampaignData,
    clearUTMData,
  };
};
