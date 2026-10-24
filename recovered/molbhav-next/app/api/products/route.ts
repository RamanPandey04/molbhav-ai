import { createClient, isConfigured } from '@/lib/supabase/server';
import { fail, ok } from '@/lib/shared/api';
export async function GET() {
  if (!isConfigured()) return fail('DB_NOT_CONFIGURED','Supabase is not configured',503);
  const db = await createClient();
  const { data, error } = await db.from('products').select('id,name,unit,active').eq('active',true).order('name');
  if (error) return fail('DB_ERROR','Could not load products',500);
  return ok(data);
}
