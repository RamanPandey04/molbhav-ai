import { describe, expect, it } from 'vitest';
import { sameInstant } from './time';

describe('idempotent timestamp comparisons', () => {
  it('matches PostgreSQL and JavaScript representations', () => {
    expect(sameInstant('2026-10-24T12:00:00.000Z', '2026-10-24T12:00:00+00:00')).toBe(true);
  });
  it('matches equivalent offsets', () => {
    expect(sameInstant('2026-10-24T17:30:00+05:30', '2026-10-24T12:00:00Z')).toBe(true);
  });
  it('rejects changed instants and invalid input', () => {
    expect(sameInstant('2026-10-24T12:00:00Z', '2026-10-24T12:00:01Z')).toBe(false);
    expect(sameInstant('invalid', 'invalid')).toBe(false);
  });
});
