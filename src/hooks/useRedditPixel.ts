import { useEffect, useCallback, useState } from 'react';

const REDDIT_PIXEL_ID = import.meta.env.VITE_REDDIT_PIXEL_ID;

// Global flag to ensure pixel is only initialized once
let pixelInitialized = false;
let pixelInitPromise: Promise<void> | null = null;

export const useRedditPixel = () => {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      if (!REDDIT_PIXEL_ID) {
        console.log('Reddit Pixel: VITE_REDDIT_PIXEL_ID not configured');
        return;
      }

      const win = window as any;
      
      // If pixel is already initialized, just mark as ready
      if (win.rdt && win.rdt.loaded) {
        setIsInitialized(true);
        return;
      }

      // If initialization is in progress, wait for it
      if (pixelInitPromise) {
        pixelInitPromise
          .then(() => setIsInitialized(true))
          .catch(() => {
            // Pixel initialization failed (e.g., blocked by ad blocker)
            setIsInitialized(false);
          });
        return;
      }

      // Initialize Reddit Pixel (only once globally)
      if (!win.rdt && !pixelInitialized) {
        pixelInitialized = true;
        
        // Reddit Pixel initialization snippet
        win.rdt = function (...args: unknown[]) {
          (win.rdt.q = win.rdt.q || []).push(args);
        };
        win.rdt.loaded = false;

        // Create promise for initialization
        pixelInitPromise = new Promise((resolve) => {
          // Load the Reddit Pixel script
          const script = document.createElement('script');
          script.async = true;
          script.src = 'https://www.redditstatic.com/ads/pixel.js';
          
          script.onload = () => {
            try {
              win.rdt.loaded = true;
              // Initialize with pixel ID
              win.rdt('init', REDDIT_PIXEL_ID);
              // Track initial page visit
              win.rdt('track', 'PageVisit');
              setIsInitialized(true);
              console.log('Reddit Pixel initialized successfully');
              resolve();
            } catch (error) {
              console.error('Reddit Pixel initialization error:', error);
              resolve();
            }
          };

          script.onerror = () => {
            console.warn('Reddit Pixel script failed to load. This is usually caused by:', {
              reason: 'ERR_BLOCKED_BY_CLIENT',
              possibleCauses: [
                'Ad blocker extension (uBlock Origin, AdBlock Plus, etc.)',
                'Privacy extension (Privacy Badger, Ghostery, etc.)',
                'Browser privacy settings',
                'Corporate firewall or network restrictions'
              ]
            });
            win.rdt.loaded = false;
            pixelInitPromise = null;
            resolve();
          };

          document.head.appendChild(script);
        });
      } else if (win.rdt && win.rdt.loaded) {
        setIsInitialized(true);
      }
    } catch (error) {
      console.error('Reddit Pixel setup error:', error);
    }
  }, []);

  const trackEvent = useCallback((eventName: string, params?: Record<string, unknown>) => {
    const win = window as any;
    if (!REDDIT_PIXEL_ID) {
      return;
    }
    if (!win.rdt) {
      console.warn('Reddit Pixel: Cannot track event - Pixel not initialized');
      return;
    }
    try {
      win.rdt('track', eventName, params);
      console.log('Reddit Pixel: Tracked event', eventName, params);
    } catch (error) {
      console.error('Reddit Pixel: Error tracking event', eventName, error);
    }
  }, []);

  return {
    trackEvent,
    isConfigured: !!REDDIT_PIXEL_ID,
    isInitialized,
  };
};
