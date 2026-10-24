import { describe, expect, it } from 'vitest';
import { csvCell, manualReport, manualReview, buyerLink } from './validation';
import { financialSnapshot, providerEvents, redactProvider } from './agent-log';

describe('release evidence boundaries (unit-only synthetic inputs)', () => {
  it('does not accept a report without an associated owned-record identifier', () => {
    expect(manualReport.safeParse({}).success).toBe(false);
  });
  it('does not permit confirmation without actual matching evidence fields', () => {
    expect(manualReview.safeParse({
      decision: 'MANUALLY_CONFIRMED',
      evidenceNotes: 'Unit test only, no real receipt',
      evidenceReference: 'UNIT_TEST_ONLY',
    }).success).toBe(false);
  });
  it('does not accept fictional buyer linking without consent and identity evidence', () => {
    expect(buyerLink.safeParse({ buyerId: '00000000-0000-4000-8000-000000000001' }).success).toBe(false);
  });
  it('prevents spreadsheet formula injection in exported values', () => {
    expect(csvCell('=1+1')).toBe('"\'=1+1"');
    expect(csvCell('a"b')).toBe('"a""b"');
  });
  it('never invents a provider tool trace and strips sensitive log fields', () => {
    expect(providerEvents({ status: 'completed' })).toEqual([]);
    expect(redactProvider({ api_key: 'unit-only-secret', result: { authorization: 'unit-only', safe: 3 } }))
      .toEqual({ result: { safe: 3 } });
  });
  it('sends monetary facts but not buyer identities to the advisory provider', () => {
    expect(financialSnapshot({ quantity: 4, savingsPaise: 100, buyerIds: ['unit-only'], buyerTerms: [] }))
      .toEqual({ quantity: 4, savingsPaise: 100 });
  });
});
