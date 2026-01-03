/**
 * GA4 Button Click Tracking Hook
 * Provides button click tracking utility
 */

import { useCallback } from 'react';

export const useGA4Tracking = () => {
  // Track button clicks
  const trackButtonClick = useCallback((buttonName: string, location?: string) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'button_click', {
        button_name: buttonName,
        button_location: location || window.location.pathname,
      });
    }
  }, []);

  return {
    trackButtonClick,
  };
};

