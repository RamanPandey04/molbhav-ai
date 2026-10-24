import { createClient, isConfigured } from '@/lib/supabase/server';
import { fail } from '@/lib/shared/api';

export async function authenticated() {
  if (!isConfigured()) return { error: fail('DB_NOT_CONFIGURED', 'Supabase is not configured', 503) };
  const db = await createClient();
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) return { error: fail('UNAUTHENTICATED', 'Sign in required', 401) };
  return { db, user: data.user };
}
