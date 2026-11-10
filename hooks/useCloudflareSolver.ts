import { getCloudflareCookie, setCloudflareCookie } from '@/services/cookieService';
import { useState } from 'react';

export function useCloudflareSolver() {
  const [solverVisible, setSolverVisible] = useState(false);
  const [solverUrl, setSolverUrl] = useState('');
  const [solving, setSolving] = useState(false);

  const solveCloudflare = async (url: string, domain: string): Promise<string | null> => {
    // Check if we already have a valid cookie
    const existingCookie = await getCloudflareCookie(domain);
    if (existingCookie) {
      return existingCookie;
    }

    // If not, open the solver
    return new Promise((resolve) => {
      setSolverUrl(url);
      setSolverVisible(true);
      setSolving(true);

      const handleComplete = async (cookie: string | null) => {
        setSolverVisible(false);
        setSolving(false);

        if (cookie) {
          await setCloudflareCookie(domain, cookie);
          // Also send to backend
          try {
            await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/cloudflare/cookie`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ domain, cookie }),
            });
          } catch (error) {
            console.error('Failed to send cookie to backend:', error);
          }
        }

        resolve(cookie);
      };

      // For now, resolve with null - this will be connected to the actual CloudflareSolver component
      handleComplete(null);
    });
  };

  return {
    solveCloudflare,
    solverVisible,
    setSolverVisible,
    solverUrl,
    solving,
  };
}
