/** PostgreSQL and clients may serialize the same timestamp with different offsets. */
export function sameInstant(left: string | null, right: string | null): boolean {
  if (left === null || right === null) return left === right;
  const a = Date.parse(left);
  const b = Date.parse(right);
  return Number.isFinite(a) && Number.isFinite(b) && a === b;
}
