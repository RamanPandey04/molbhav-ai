import { z } from 'zod';
import { MAX_QUANTITY } from './constants';

export const uuid = z.uuid();
export const demandInput = z.object({
  merchantId: uuid,
  productId: uuid,
  quantity: z.number().int().positive().max(MAX_QUANTITY),
  expiresAt: z.iso.datetime({ offset: true }),
});
export const restockInput = z.object({
  merchantId: uuid,
  productId: uuid,
  quantity: z.number().int().positive().max(MAX_QUANTITY),
  expiresAt: z.iso.datetime({ offset: true }),
});

export function validFutureExpiry(value: string) {
  const ms = Date.parse(value) - Date.now();
  return ms > 0 && ms <= 30 * 24 * 60 * 60 * 1000;
}
