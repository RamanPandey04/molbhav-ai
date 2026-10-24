import { createClient, isConfigured } from '@/lib/supabase/server';
import { fail, ok } from '@/lib/shared/api';
import { uuid } from '@/lib/shared/validation';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) return fail('INVALID_ID','Invalid pool ID',400);
  if (!isConfigured()) return fail('DB_NOT_CONFIGURED','Supabase is not configured',503);
  const db = await createClient();
  const { data, error } = await db.rpc('get_live_pool', { p_id: id });
  if (error) return fail('DB_ERROR','Could not load pool',500);
  if (!data?.length) return fail('NOT_FOUND','Pool not found',404);
  return ok(data[0]);
}
