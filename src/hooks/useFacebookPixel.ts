import { useEffect, useCallback } from 'react';

declare global {
  interface Window {
    fbq: (...args: any[]) => void;
    _fbq: any;
  }
}

const FB_PIXEL_ID = import.meta.env.VITE_FB_PIXEL_ID;

export const useFacebookPixel = () => {
  useEffect(() => {
    try {
      if (!FB_PIXEL_ID) {
        // Silently skip - no warning needed in production
        return;
      }

      // Initialize Facebook Pixel
      if (!window.fbq) {
        const n = (window.fbq = function (...args: any[]) {
          if (n.callMethod) {
            n.callMethod.apply(n, args);
          } else {
            n.queue.push(args);
          }
        } as any);
        
        if (!window._fbq) window._fbq = n;
        n.push = n;
        n.loaded = true;
        n.version = '2.0';
        n.queue = [];

        // Load the FB Pixel script
        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://connect.facebook.net/en_US/fbevents.js';
        document.head.appendChild(script);

        // Initialize with pixel ID
        window.fbq('init', FB_PIXEL_ID);
        window.fbq('track', 'PageView');
      }
    } catch (error) {
      console.error('Facebook Pixel initialization error:', error);
    }
  }, []);

  const trackEvent = useCallback((eventName: string, params?: Record<string, any>) => {
    if (!FB_PIXEL_ID || !window.fbq) {
      console.warn('Facebook Pixel not available');
      return;
    }
    window.fbq('track', eventName, params);
  }, []);

  const trackCustomEvent = useCallback((eventName: string, params?: Record<string, any>) => {
    if (!FB_PIXEL_ID || !window.fbq) {
      console.warn('Facebook Pixel not available');
      return;
    }
    window.fbq('trackCustom', eventName, params);
  }, []);

  return {
    trackEvent,
    trackCustomEvent,
    isConfigured: !!FB_PIXEL_ID,
  };
};

// Standard FB events for reference:
// - PageView (auto-tracked on init)
// - ViewContent - viewing a key page
// - Lead - form submission/signup
// - CompleteRegistration - completed signup flow
// - InitiateCheckout - starting checkout
// - Purchase - completed purchase
