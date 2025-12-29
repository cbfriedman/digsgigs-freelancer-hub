/**
 * Google Ads Conversion Tracking Hook
 * 
 * Tracks conversions for Google Ads campaigns.
 * Requires VITE_GOOGLE_ADS_CONVERSION_ID and VITE_GOOGLE_ADS_CONVERSION_LABEL
 * to be set in environment variables.
 */

import { useEffect, useCallback } from 'react';

const GOOGLE_ADS_CONVERSION_ID = import.meta.env.VITE_GOOGLE_ADS_CONVERSION_ID;
const GOOGLE_ADS_CONVERSION_LABEL = import.meta.env.VITE_GOOGLE_ADS_CONVERSION_LABEL;

export const useGoogleAdsConversion = () => {
  // Initialize Google Ads gtag.js on mount
  useEffect(() => {
    if (!GOOGLE_ADS_CONVERSION_ID) {
      console.log('Google Ads not configured - skipping initialization');
      return;
    }

    const win = window as any;

    // Check if gtag is already loaded
    if (win.gtag) {
      return;
    }

    // Initialize dataLayer
    win.dataLayer = win.dataLayer || [];
    win.gtag = function gtag(...args: unknown[]) {
      win.dataLayer.push(args);
    };
    win.gtag('js', new Date());
    win.gtag('config', GOOGLE_ADS_CONVERSION_ID);

    // Load gtag.js script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_CONVERSION_ID}`;
    document.head.appendChild(script);

    console.log('Google Ads tracking initialized');
  }, []);

  // Track a conversion event
  const trackConversion = useCallback((value?: number, currency: string = 'USD') => {
    if (!GOOGLE_ADS_CONVERSION_ID || !GOOGLE_ADS_CONVERSION_LABEL) {
      console.log('Google Ads conversion not configured - skipping tracking');
      return;
    }

    const win = window as any;
    if (!win.gtag) {
      console.warn('gtag not available');
      return;
    }

    win.gtag('event', 'conversion', {
      send_to: `${GOOGLE_ADS_CONVERSION_ID}/${GOOGLE_ADS_CONVERSION_LABEL}`,
      value: value,
      currency: currency,
    });

    console.log('Google Ads conversion tracked', { value, currency });
  }, []);

  // Track page view
  const trackPageView = useCallback((pagePath?: string) => {
    const win = window as any;
    if (!GOOGLE_ADS_CONVERSION_ID || !win.gtag) return;

    win.gtag('event', 'page_view', {
      page_path: pagePath || window.location.pathname,
    });
  }, []);

  return {
    trackConversion,
    trackPageView,
    isConfigured: !!GOOGLE_ADS_CONVERSION_ID && !!GOOGLE_ADS_CONVERSION_LABEL,
  };
};
