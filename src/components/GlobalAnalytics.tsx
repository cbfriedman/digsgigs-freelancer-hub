/**
 * Global Analytics Component
 * Initializes Facebook Pixel and Reddit Pixel globally for all pages
 * Adds scroll depth tracking for GA4
 */

import { useEffect } from 'react';
import { useFacebookPixel } from '@/hooks/useFacebookPixel';
import { useRedditPixel } from '@/hooks/useRedditPixel';

export const GlobalAnalytics = () => {
  // Initialize Facebook Pixel globally
  // This hook will set up the pixel if VITE_FB_PIXEL_ID is configured
  useFacebookPixel();
  
  // Initialize Reddit Pixel globally
  // This hook will set up the pixel if VITE_REDDIT_PIXEL_ID is configured
  useRedditPixel();

  // Track scroll depth for GA4
  useEffect(() => {
    if (typeof window === 'undefined' || !window.gtag) return;

    const scrollPercentages = [25, 50, 75, 90];
    const tracked: Record<number, boolean> = {};

    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;

      scrollPercentages.forEach((percentage) => {
        if (scrolled >= percentage && !tracked[percentage]) {
          tracked[percentage] = true;
          window.gtag('event', 'scroll', {
            scroll_depth: percentage,
            page_path: window.location.pathname,
          });
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return null;
};

