import { useEffect, useCallback, useState } from 'react';

/**
 * Generates a unique conversion ID for deduplication.
 * Combines timestamp with random string to ensure uniqueness.
 */
const generateConversionId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `${timestamp}-${random}`;
};

/**
 * Reddit Pixel hook for tracking custom events.
 * 
 * NOTE: The base Reddit Pixel is initialized in index.html for crawler visibility.
 * This hook detects that initialization and provides event tracking functions.
 * 
 * All events automatically include a unique conversionId for deduplication.
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
      // Auto-generate conversionId for deduplication if not provided
      const conversionId = (params?.conversionId as string) || generateConversionId();
      const eventParams = {
        ...params,
        conversionId,
      };
      win.rdt('track', eventName, eventParams);
      console.log('Reddit Pixel: Tracked event', eventName, eventParams);
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
