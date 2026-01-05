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
          console.warn('Facebook Pixel script failed to load. This is usually caused by:', {
            reason: 'ERR_BLOCKED_BY_CLIENT',
            possibleCauses: [
              'Ad blocker extension (uBlock Origin, AdBlock Plus, etc.)',
              'Privacy extension (Privacy Badger, Ghostery, etc.)',
              'Browser privacy settings',
              'Corporate firewall or network restrictions'
            ],
            solutions: [
              'Disable ad blockers for this site',
              'Add site to ad blocker whitelist',
              'Test in incognito/private mode',
              'Try a different browser',
              'Check browser extension settings'
            ]
          });
          console.warn('To test Facebook Pixel, disable ad blockers or use Facebook Events Manager Test Events mode');
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
