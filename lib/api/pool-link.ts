import type { SupabaseClient } from '@supabase/supabase-js';

export async function attachPool(db: SupabaseClient, row: Record<string,unknown>) {
  const merchant = await db.from('merchants').select('zone_id').eq('id',row.merchant_id).maybeSingle();
  if (merchant.error || !merchant.data) return {...row,pool_id:null};
  const pool = await db.from('pools').select('id').eq('zone_id',merchant.data.zone_id).eq('product_id',row.product_id).maybeSingle();
  return {...row,pool_id:pool.data?.id??null};
}
