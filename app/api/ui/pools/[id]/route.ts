import { authenticated } from '@/lib/api/auth';
import { databaseFailure } from '@/lib/api/errors';
import { administration } from '@/lib/release/admin';
import { fail, ok } from '@/lib/shared/api';
import { uuid } from '@/lib/shared/validation';

/** Presentation adapter for Juhi's original UI. No identities or quotes are made public. */
export async function GET(request: Request, {params}: {params: Promise<{id:string}>}) {
  const {id} = await params;
  if (!uuid.safeParse(id).success) return fail('INVALID_ID','Invalid pool ID',400);
  const db = administration();
  const live = await db.rpc('get_live_pool',{p_id:id});
  if (live.error) return databaseFailure(live.error);
  const pool = live.data?.[0];
  if (!pool) return fail('NOT_FOUND','Pool not found',404);
  const now = new Date().toISOString();
  const [product, businesses, zone] = await Promise.all([
    db.from('products').select('id,name,unit').eq('id',pool.product_id).single(),
    db.from('merchants').select('id,name,zone_id,owner_id').eq('zone_id',pool.zone_id).eq('active',true).order('created_at'),
    db.from('zones').select('name').eq('id',pool.zone_id).single(),
  ]);
  for (const r of [product,businesses,zone]) if (r.error) return databaseFailure(r.error);
  const ids = (businesses.data??[]).map(m=>m.id);
  if (!ids.length) return fail('NOT_FOUND','No active kirana is registered for this pool',404);
  const requestedMerchant = new URL(request.url).searchParams.get('merchantId');
  const merchant = requestedMerchant ? businesses.data!.find(m=>m.id===requestedMerchant) : businesses.data![0];
  if (!merchant) return fail('INVALID_REFERENCE','Kirana is not in this pool zone',400);
  const [demands,restocks,terms,minimum,profiles,evaluation] = await Promise.all([
    db.from('buyer_demands').select('quantity,allocated_existing_stock,buyer_id,merchant_id').in('merchant_id',ids).eq('product_id',pool.product_id).eq('status','ACTIVE').gt('expires_at',now),
    db.from('merchant_restock_requests').select('quantity,merchant_id').in('merchant_id',ids).eq('product_id',pool.product_id).eq('status','ACTIVE').gt('expires_at',now),
    db.from('merchant_product_terms').select('baseline_unit_paise,consumer_unit_paise').eq('merchant_id',merchant.id).eq('product_id',pool.product_id).maybeSingle(),
    db.from('supplier_quotes').select('id,min_order_quantity').eq('pool_id',id).in('status',['SUBMITTED','ACCEPTED']).gt('expires_at',now).order('min_order_quantity'),
    db.from('actor_profiles').select('user_id,data_class'),
    db.from('pool_evaluations').select('decision,snapshot').eq('pool_id',id).eq('pool_version',pool.version).order('created_at',{ascending:false}).limit(1).maybeSingle(),
  ]);
  for (const r of [demands,restocks,terms,minimum,profiles,evaluation]) if (r.error) return databaseFailure(r.error);
  const classification = new Map(profiles.data?.map(p=>[p.user_id,p.data_class]));
  const actorIds = new Set([...(demands.data??[]).map(d=>d.buyer_id),...businesses.data!.map(m=>m.owner_id)]);
  const classes = new Set([...actorIds].map(actor=>classification.get(actor)??'UNVERIFIED'));
  const dataClass = classes.size===1 ? [...classes][0] : 'MIXED';

  // Optional session: public visitors receive aggregates, never another actor's details.
  const auth = await authenticated();
  let quotes: Record<string,unknown>[] = [];
  let proposal: Record<string,unknown> | null = null;
  let latestAgentRunId: string | null = null;
  if (!auth.error) {
    if (auth.role==='ADMIN'||auth.role==='SUPPLIER') {
      let query = auth.db!.from('supplier_quotes').select('*').eq('pool_id',id).order('created_at',{ascending:false});
      if (auth.role==='SUPPLIER') query = query.eq('quoted_by',auth.user!.id);
      const result = await query;
      if (result.error) return databaseFailure(result.error);
      quotes = result.data??[];
    }
    const candidates = await db.from('proposals').select('id').eq('pool_id',id).eq('pool_version',pool.version).order('created_at',{ascending:false}).limit(20);
    if (candidates.error) return databaseFailure(candidates.error);
    for (const candidate of candidates.data??[]) {
      const detail = await auth.db!.rpc('get_proposal_details',{p_id:candidate.id});
      if (detail.error) return databaseFailure(detail.error);
      if (detail.data) { proposal=detail.data; break; }
    }
    if (auth.role==='ADMIN') {
      const run = await auth.db!.from('agent_runs').select('id').eq('pool_id',id).order('created_at',{ascending:false}).limit(1).maybeSingle();
      if (run.error) return databaseFailure(run.error);
      latestAgentRunId=run.data?.id??null;
    }
  }
  const buyerDemandQty=(demands.data??[]).reduce((sum,d)=>sum+d.quantity,0);
  const inventoryAllocatedQty=(demands.data??[]).reduce((sum,d)=>sum+Math.min(d.quantity,d.allocated_existing_stock),0);
  const independentRestockQty=(restocks.data??[]).reduce((sum,r)=>sum+r.quantity,0);
  const selectedMinimum=evaluation.data?.snapshot?.minOrderQuantity;
  const minimumOrderQty=typeof selectedMinimum==='number'?selectedMinimum:minimum.data?.[0]?.min_order_quantity??null;
  return ok({
    poolId:pool.id,zoneId:pool.zone_id,skuId:pool.product_id,
    buyerDemandQty,inventoryAllocatedQty,independentRestockQty,eligibleProcurementQty:pool.quantity,
    minimumOrderQty,expiresAt:pool.expires_at,version:pool.version,
    status:pool.status==='EXPIRED'?'EXPIRED':proposal?.status==='APPROVED'?'APPROVED':proposal?'PROPOSED':minimum.data?.length?'QUOTED':pool.status,
    product:{id:product.data!.id,name:product.data!.name,brand:'',sku:product.data!.id,packSize:product.data!.unit,unit:product.data!.unit,retailBaselineMinor:terms.data?.baseline_unit_paise??null},
    merchant:{id:merchant.id,name:merchant.name,zoneName:zone.data!.name,verified:classification.get(merchant.owner_id)==='REAL',pickupWindowEnd:''},
    restock:{independentQty:(restocks.data??[]).filter(r=>r.merchant_id===merchant.id).reduce((sum,r)=>sum+r.quantity,0),allocatedStockToBuyers:(demands.data??[]).filter(d=>d.merchant_id===merchant.id).reduce((sum,d)=>sum+d.allocated_existing_stock,0),confirmedBy:null,confirmedAt:null},
    quotes,proposal,latestAgentRunId,
    estimatedUnitPriceMinor:evaluation.data?.decision==='PROPOSE'?terms.data?.consumer_unit_paise??null:null,
    isSample:false,dataClass,generatedAt:now,
  });
}
