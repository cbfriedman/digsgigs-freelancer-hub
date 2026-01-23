import { useEffect, useCallback, useState } from 'react';

/**
 * Reddit Pixel hook for tracking custom events.
 * 
 * NOTE: The base Reddit Pixel is initialized in index.html for crawler visibility.
 * This hook detects that initialization and provides event tracking functions.
 */
export const useRedditPixel = () => {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const win = window as any;
    
    // Check if Reddit Pixel was initialized in index.html
    // The pixel script sets up window.rdt as a function
    if (win.rdt) {
      setIsInitialized(true);
      console.log('Reddit Pixel: Detected initialization from index.html');
    } else {
      console.log('Reddit Pixel: Not detected - may be blocked by ad blocker');
    }
  }, []);

  const trackEvent = useCallback((eventName: string, params?: Record<string, unknown>) => {
    const win = window as any;
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
    isConfigured: true, // Always configured since it's in index.html
    isInitialized,
  };
};
