import { useEffect } from 'react';

export const useFavicon = () => {
  useEffect(() => {
    const updateFavicon = () => {
      const now = new Date();
      const hour = now.getHours();
      
      // Day: 6 AM - 6 PM (6:00 - 19:00)
      const isDay = hour >= 6 && hour < 19;
      
      const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (isDay) {
        if (favicon) {
          favicon.href = '/favicon.ico';
        }
      } else {
        // Night favicon - dark colors
        if (favicon) {
          favicon.href = '/favicon_night.ico';
        }
      }
    };

    // Update immediately
    updateFavicon();
    
    // Update every minute to handle day/night transitions
    const interval = setInterval(updateFavicon, 60000);
    
    return () => clearInterval(interval);
  }, []);
}; 