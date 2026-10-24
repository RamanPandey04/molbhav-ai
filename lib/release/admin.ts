import { createClient } from '@supabase/supabase-js';

// Only import from server route handlers. This client must never reach the browser.
export function administration() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Server administration is not configured');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
