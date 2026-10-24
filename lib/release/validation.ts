import { z } from 'zod';
import { uuid } from '../shared/validation';

export const manualReport = z.object({
  demandId: uuid.optional(),
  orderId: uuid.optional(),
  transactionReference: z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9 /_-]{3,99}$/).optional(),
  claimedPaidAt: z.iso.datetime({ offset: true }).optional(),
}).refine(v => v.demandId || v.orderId, 'An owned demand or order is required');

export const manualAmendment = z.object({
  transactionReference: z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9 /_-]{3,99}$/),
  claimedPaidAt: z.iso.datetime({ offset: true }),
});

export const manualReview = z.object({
  decision: z.enum(['PENDING_VERIFICATION', 'MANUALLY_CONFIRMED', 'REJECTED']),
  evidenceNotes: z.string().trim().min(10).max(2000),
  evidenceReference: z.string().trim().min(5).max(1000),
  matchedAmountPaise: z.literal(100).optional(),
  matchedRecipient: z.literal('Juhi Dugar').optional(),
  matchedTransactionReference: z.string().trim().min(4).max(100).optional(),
}).refine(v => v.decision !== 'MANUALLY_CONFIRMED' ||
  (v.matchedAmountPaise === 100 && !!v.matchedRecipient && !!v.matchedTransactionReference),
  'Confirmation requires an actual matching receipt, amount, recipient, and transaction reference');

export const buyerLink = z.object({
  buyerId: uuid,
  identityEvidence: z.string().trim().min(10).max(2000),
  contactConsentConfirmed: z.literal(true),
  externalUserConfirmed: z.literal(true),
});

export function csvCell(value: unknown) {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
