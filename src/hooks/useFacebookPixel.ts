import { useEffect, useCallback } from 'react';

const FB_PIXEL_ID = import.meta.env.VITE_FB_PIXEL_ID;

export const useFacebookPixel = () => {
  useEffect(() => {
    try {
      if (!FB_PIXEL_ID) {
        return;
      }

      const win = window as any;
      
      // Initialize Facebook Pixel
      if (!win.fbq) {
        const n = (win.fbq = function (...args: unknown[]) {
          if (n.callMethod) {
            n.callMethod.apply(n, args);
          } else {
            n.queue.push(args);
          }
        } as any);
        
        if (!win._fbq) win._fbq = n;
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
        win.fbq('init', FB_PIXEL_ID);
        win.fbq('track', 'PageView');
      }
    } catch (error) {
      console.error('Facebook Pixel initialization error:', error);
    }
  }, []);

  const trackEvent = useCallback((eventName: string, params?: Record<string, unknown>) => {
    const win = window as any;
    if (!FB_PIXEL_ID || !win.fbq) {
      return;
    }
    win.fbq('track', eventName, params);
  }, []);

  const trackCustomEvent = useCallback((eventName: string, params?: Record<string, unknown>) => {
    const win = window as any;
    if (!FB_PIXEL_ID || !win.fbq) {
      return;
    }
    win.fbq('trackCustom', eventName, params);
  }, []);

  return {
    trackEvent,
    trackCustomEvent,
    isConfigured: !!FB_PIXEL_ID,
  };
};
