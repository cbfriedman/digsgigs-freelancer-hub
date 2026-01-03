import { useEffect, useCallback, useState } from 'react';

const FB_PIXEL_ID = import.meta.env.VITE_FB_PIXEL_ID;

export const useFacebookPixel = () => {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      if (!FB_PIXEL_ID) {
        console.log('Facebook Pixel: VITE_FB_PIXEL_ID not configured');
        return;
      }

      const win = window as any;
      
      // Initialize Facebook Pixel (only once globally)
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
        n.loaded = false; // Will be set to true when script loads
        n.version = '2.0';
        n.queue = [];

        // Load the FB Pixel script
        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://connect.facebook.net/en_US/fbevents.js';
        
        // Wait for script to load before initializing
        script.onload = () => {
          try {
            win.fbq.loaded = true;
            // Initialize with pixel ID
            win.fbq('init', FB_PIXEL_ID);
            win.fbq('track', 'PageView');
            setIsInitialized(true);
            console.log('Facebook Pixel initialized successfully');
          } catch (error) {
            console.error('Facebook Pixel initialization error:', error);
          }
        };

        script.onerror = () => {
          console.error('Facebook Pixel script failed to load');
        };

        document.head.appendChild(script);
      } else {
        // Pixel already initialized by another component
        setIsInitialized(true);
      }
    } catch (error) {
      console.error('Facebook Pixel setup error:', error);
    }
  }, []);

  const trackEvent = useCallback((eventName: string, params?: Record<string, unknown>) => {
    const win = window as any;
    if (!FB_PIXEL_ID) {
      console.warn('Facebook Pixel: Cannot track event - Pixel ID not configured');
      return;
    }
    if (!win.fbq) {
      console.warn('Facebook Pixel: Cannot track event - Pixel not initialized');
      return;
    }
    try {
      win.fbq('track', eventName, params);
      console.log('Facebook Pixel: Tracked event', eventName, params);
    } catch (error) {
      console.error('Facebook Pixel: Error tracking event', eventName, error);
    }
  }, []);

  const trackCustomEvent = useCallback((eventName: string, params?: Record<string, unknown>) => {
    const win = window as any;
    if (!FB_PIXEL_ID) {
      console.warn('Facebook Pixel: Cannot track custom event - Pixel ID not configured');
      return;
    }
    if (!win.fbq) {
      console.warn('Facebook Pixel: Cannot track custom event - Pixel not initialized');
      return;
    }
    try {
      win.fbq('trackCustom', eventName, params);
      console.log('Facebook Pixel: Tracked custom event', eventName, params);
    } catch (error) {
      console.error('Facebook Pixel: Error tracking custom event', eventName, error);
    }
  }, []);

  return {
    trackEvent,
    trackCustomEvent,
    isConfigured: !!FB_PIXEL_ID,
    isInitialized,
  };
};
