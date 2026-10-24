import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export function isConfigured() { return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY); }

export async function createClient(accessToken?: string) {
  if (!isConfigured()) throw new Error('Supabase is not configured');
  if (accessToken) return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } }, auth: { persistSession:false,autoRefreshToken:false },
  });
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(values) { values.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); },
    },
  });
}
