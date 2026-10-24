import { authenticated } from '@/lib/api/auth';
import { databaseFailure } from '@/lib/api/errors';
import { administration } from '@/lib/release/admin';
import { ok } from '@/lib/shared/api';

export async function GET() {
  const auth = await authenticated();
  if (auth.error) return auth.error;
  const db = auth.db!;
  const admin = administration();
  const [demands, restocks, quotes, pools, paymentReports, candidates, runs, merchants] = await Promise.all([
    ['BUYER','ADMIN'].includes(auth.role!) ? db.from('buyer_demands').select('*').order('created_at', { ascending: false }).limit(100) : {data:[],error:null},
    ['MERCHANT','ADMIN'].includes(auth.role!) ? db.from('merchant_restock_requests').select('*').order('created_at', { ascending: false }).limit(100) : {data:[],error:null},
    auth.role==='ADMIN' ? db.from('supplier_quotes').select('*').order('created_at', { ascending: false }).limit(100) :
      auth.role==='SUPPLIER' ? db.from('supplier_quotes').select('*').eq('quoted_by',auth.user!.id).order('created_at', {ascending:false}).limit(100) : {data:[],error:null},
    db.from('pools').select('*').order('updated_at', { ascending: false }).limit(30),
    db.from('manual_payments').select('*').order('created_at', { ascending: false }).limit(100),
    admin.from('proposals').select('id').order('created_at', { ascending: false }).limit(100),
    db.from('agent_runs').select('id,pool_id,evaluation_id,status,provider_run_id,provider_status,output,backend_events,provider_events,error_code,data_class,created_at,completed_at').order('created_at', { ascending: false }).limit(50),
    admin.from('merchants').select('id,zone_id,owner_id'),
  ]);
  for (const result of [demands, restocks, quotes, pools, paymentReports, candidates, runs, merchants])
    if (result.error) return databaseFailure(result.error, 'Could not load activity');
  const details = await Promise.all((candidates.data ?? []).map(p => db.rpc('get_proposal_details', { p_id: p.id })));
  for (const result of details) if (result.error) return databaseFailure(result.error);
  const proposals = details.map(r => r.data).filter(Boolean);
  const visibleIds = proposals.map(p => p.id as string);
  const orders = visibleIds.length
    ? await admin.from('orders').select('*').in('proposal_id', visibleIds)
    : { data: [], error: null };
  if (orders.error) return databaseFailure(orders.error);
  const live = await Promise.all((pools.data ?? []).map(p => db.rpc('get_live_pool', { p_id: p.id })));
  for (const result of live) if (result.error) return databaseFailure(result.error);
  const poolRows = live.flatMap(r => r.data ?? []);
  const withPool = (rows: Record<string,unknown>[]) => rows.map(row => ({
    ...row,pool_id:poolRows.find(p => p.product_id===row.product_id &&
      p.zone_id===merchants.data?.find(m => m.id===row.merchant_id)?.zone_id)?.id ?? null,
  }));
  const authorizedOrders = (orders.data??[]).filter(order => {
    if (auth.role==='ADMIN'||auth.role==='SUPPLIER') return true;
    if (auth.role==='MERCHANT') return merchants.data?.some(m => m.id===order.merchant_id&&m.owner_id===auth.user!.id);
    const p = proposals.find(p => p.id===order.proposal_id);
    return Array.isArray(p?.snapshot?.buyerTerms) &&
      p.snapshot.buyerTerms.some((t:Record<string,unknown>)=>t.merchantId===order.merchant_id);
  });
  return ok({
    role: auth.role, dataClass: auth.dataClass,
    demands: withPool(demands.data??[]), restocks: withPool(restocks.data??[]), quotes: quotes.data,
    pools: poolRows, proposals, orders: authorizedOrders,
    manualPayments: paymentReports.data, agentRuns: runs.data,
    recordLimit: 100,
  });
}
