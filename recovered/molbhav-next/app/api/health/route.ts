import { ok } from '@/lib/shared/api';
import { isConfigured } from '@/lib/supabase/server';
import { headers } from 'next/headers';
export async function GET() {
  await headers();
  return ok({ status: isConfigured() ? 'ready' : 'degraded', databaseConfigured: isConfigured() });
}
