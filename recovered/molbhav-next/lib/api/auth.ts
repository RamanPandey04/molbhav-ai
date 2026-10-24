import { createClient, isConfigured } from '@/lib/supabase/server';
import { fail } from '@/lib/shared/api';
import { headers } from 'next/headers';

export async function authenticated() {
  if (!isConfigured()) return { error: fail('DB_NOT_CONFIGURED', 'Supabase is not configured', 503) };
  const authorization = (await headers()).get('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
  const db = await createClient(token);
  const { data, error } = token ? await db.auth.getUser(token) : await db.auth.getUser();
  if (error || !data.user) return { error: fail('UNAUTHENTICATED', 'Sign in required', 401) };
  const profile = await db.from('actor_profiles').select('role').eq('user_id',data.user.id).maybeSingle();
  if (profile.error) return { error: fail('DB_ERROR', 'Could not load actor role', 500) };
  if (!profile.data) return { error: fail('FORBIDDEN', 'Actor role is not provisioned', 403) };
  return { db, user: data.user, role: profile.data.role };
}
