const sensitive = /password|authorization|api.?key|access.?token|refresh.?token|secret|email|phone/i;

export function redactProvider(value: unknown, depth = 0): unknown {
  if (depth > 8) return '[depth-limited]';
  if (Array.isArray(value)) return value.slice(0, 100).map(v => redactProvider(v, depth + 1));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).filter(([k]) => !sensitive.test(k))
      .map(([k, v]) => [k, redactProvider(v, depth + 1)]));
  }
  if (typeof value === 'string') return value.slice(0, 12000);
  return value;
}

export function providerEvents(raw: Record<string, unknown>) {
  // Only events actually supplied by the provider. Never synthesize tool execution.
  const events = raw.tool_events ?? raw.tool_calls ?? raw.events;
  return Array.isArray(events) ? redactProvider(events) : [];
}

export function financialSnapshot(snapshot: Record<string, unknown>) {
  const allowed = ['poolId','poolVersion','productId','quantity','quoteId','quoteVersion',
    'supplierId','exactSkuId','minOrderQuantity','maxAvailableQuantity','quotedUnitPricePaise','freightPaise','handlingPaise',
    'landedTotalPaise','baselineTotalPaise','savingsPaise','deliveryDeadline','quoteExpiresAt'];
  return Object.fromEntries(allowed.filter(k => k in snapshot).map(k => [k, snapshot[k]]));
}
