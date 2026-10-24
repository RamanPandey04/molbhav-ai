import { createClient, isConfigured } from '@/lib/supabase/server';
import { fail } from '@/lib/shared/api';

export async function authenticated() {
  if (!isConfigured()) return { error: fail('DB_NOT_CONFIGURED', 'Supabase is not configured', 503) };
  const db = await createClient();
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) return { error: fail('UNAUTHENTICATED', 'Sign in required', 401) };
  const profile = await db.from('actor_profiles').select('role').eq('user_id',data.user.id).maybeSingle();
  if (profile.error) return { error: fail('DB_ERROR', 'Could not load actor role', 500) };
  if (!profile.data) return { error: fail('FORBIDDEN', 'Actor role is not provisioned', 403) };
  return { db, user: data.user, role: profile.data.role };
}
