import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Tracks page views for SPA navigation in Google Analytics 4.
 * Add this component inside any route that uses useLocation.
 */
export const PageViewTracker = () => {
  const location = useLocation();

  useEffect(() => {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'page_view', {
        page_path: location.pathname + location.search,
        page_title: document.title
      });
    }
  }, [location]);

  return null;
};

export default PageViewTracker;
