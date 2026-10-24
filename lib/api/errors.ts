import { fail } from '@/lib/shared/api';
export function databaseFailure(error: { code?: string; message?: string }, fallback = 'Database operation failed') {
  if (error.code === '23505') return fail('CONFLICT','Duplicate action or idempotency key',409);
  if (error.code === '42501') return fail('FORBIDDEN','Access denied',403);
  if (error.code === 'P0002') return fail('NOT_FOUND','Record not found',404);
  if (error.code === '22023') return fail('STALE_OR_INVALID_STATE',error.message ?? 'State conflict',409);
  if (error.code === '23503') return fail('INVALID_REFERENCE','Invalid related record',400);
  return fail('DB_ERROR',fallback,500);
}
