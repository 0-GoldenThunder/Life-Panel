import { supabase } from './supabase';

const REFRESH_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
const LAST_REFRESH_KEY = 'life_manager_last_token_refresh';

export const safeRefreshSession = async () => {
  const lastRefresh = parseInt(localStorage.getItem(LAST_REFRESH_KEY) ?? '0', 10);
  const now = Date.now();
  
  const { data: { session } } = await supabase.auth.getSession();

  const isTokenExpired = session && session.expires_at
    ? session.expires_at * 1000 < now
    : false;

  // Skip if within cooldown AND token is not specifically expired
  if (!isTokenExpired && now - lastRefresh < REFRESH_COOLDOWN_MS) return;

  await supabase.auth.refreshSession();
  localStorage.setItem(LAST_REFRESH_KEY, String(now));
};

// Only run in the browser
if (typeof window !== 'undefined') {
  window.addEventListener('online', safeRefreshSession);
}
