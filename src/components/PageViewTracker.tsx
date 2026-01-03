import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Tracks page views for SPA navigation in Google Analytics 4 and Facebook Pixel.
 * Add this component inside any route that uses useLocation.
 */
export const PageViewTracker = () => {
  const location = useLocation();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Track in Google Analytics 4
      if (window.gtag) {
        window.gtag('event', 'page_view', {
          page_path: location.pathname + location.search,
          page_title: document.title
        });
      }

      // Track in Facebook Pixel (if initialized)
      const win = window as any;
      if (win.fbq) {
        win.fbq('track', 'PageView');
      }
    }
  }, [location]);

  return null;
};

export default PageViewTracker;
