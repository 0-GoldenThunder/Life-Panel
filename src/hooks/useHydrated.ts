import { useState, useEffect } from 'react';

/**
 * Returns true once the component has successfully hydrated on the client.
 * Use this to delay rendering client-specific data (like exact dates or 
 * IndexedDB data) until after the initial server-rendered HTML has mounted.
 */
export function useHydrated() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return isHydrated;
}
