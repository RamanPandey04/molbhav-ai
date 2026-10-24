import { z } from 'zod';
import { MAX_QUANTITY } from './constants';

export const uuid = z.uuid();
export const demandInput = z.object({
  merchantId: uuid,
  productId: uuid,
  quantity: z.number().int().positive().max(MAX_QUANTITY),
  expiresAt: z.iso.datetime({ offset: true }),
  maxUnitPricePaise: z.number().int().positive().max(1_000_000_000),
  deliveryDeadline: z.iso.datetime({ offset: true }),
  fulfillmentTerms: z.string().trim().min(1).max(500),
  consentConfirmed: z.boolean().optional(),
});
export const restockInput = z.object({
  merchantId: uuid,
  productId: uuid,
  quantity: z.number().int().positive().max(MAX_QUANTITY),
  expiresAt: z.iso.datetime({ offset: true }),
  neededBy: z.iso.datetime({ offset: true }),
});

export const quoteInput = z.object({
  poolId: uuid, supplierId: uuid, exactSkuId: uuid,
  minOrderQuantity: z.number().int().positive().max(MAX_QUANTITY),
  maxAvailableQuantity: z.number().int().positive().max(MAX_QUANTITY),
  quotedUnitPricePaise: z.number().int().nonnegative().max(1_000_000_000),
  freightPaise: z.number().int().nonnegative().max(1_000_000_000_000),
  handlingPaise: z.number().int().nonnegative().max(1_000_000_000_000),
  deliveryDeadline: z.iso.datetime({ offset: true }),
  expiresAt: z.iso.datetime({ offset: true }),
}).refine(v => v.maxAvailableQuantity >= v.minOrderQuantity,{ message:'Available quantity is below MOQ' });

export const counterofferInput = z.discriminatedUnion('action',[
  z.object({ action:z.literal('PROPOSE'), quotedUnitPricePaise:z.number().int().nonnegative().max(1_000_000_000), freightPaise:z.number().int().nonnegative().max(1_000_000_000_000), handlingPaise:z.number().int().nonnegative().max(1_000_000_000_000) }),
  z.object({ action:z.enum(['ACCEPT','REJECT']), counterofferId:uuid }),
]);

export function validFutureExpiry(value: string) {
  const ms = Date.parse(value) - Date.now();
  return ms > 0 && ms <= 30 * 24 * 60 * 60 * 1000;
}
