import { administration } from '@/lib/release/admin';
import { databaseFailure } from '@/lib/api/errors';
import { fail, ok } from '@/lib/shared/api';

export async function GET() {
  try {
    const db = administration();
    // Public business catalogue only: never owner identity, contacts, or payment data.
    const [products, merchants, suppliers, zones] = await Promise.all([
      db.from('products').select('id,name,unit').eq('active', true).order('name'),
      db.from('merchants').select('id,name,zone_id').eq('active', true).order('name'),
      db.from('suppliers').select('id,name').eq('active', true).order('name'),
      db.from('zones').select('id,name'),
    ]);
    for (const result of [products, merchants, suppliers, zones])
      if (result.error) return databaseFailure(result.error, 'Could not load catalogue');
    const names = new Map(zones.data?.map(z => [z.id, z.name]));
    return ok({
      products: products.data,
      merchants: merchants.data?.map(m => ({ ...m, zone_name: names.get(m.zone_id) ?? '' })),
      suppliers: suppliers.data,
    });
  } catch { return fail('NOT_CONFIGURED', 'Server catalogue access is not configured', 503); }
}
