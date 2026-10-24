"use client";
import { useParams } from "next/navigation";
import { api, PILOT_POOL_ID } from "@/lib/api/client";
import { useApi } from "@/lib/hooks";
import { formatDateTime, formatMoney } from "@/lib/format";
import { ErrorState, Loading, Rows, Section } from "@/components/ui";
import { PageHead } from "@/components/PageHead";
import { PoolSnapshot } from "@/components/PoolSnapshot";
import { PoolLedger } from "@/components/PoolLedger";

export default function PoolPage() {
  const params = useParams<{ id: string }>();
  const id = params.id === "pilot" ? PILOT_POOL_ID : params.id;
  const { data: pool, error, loading, reload } = useApi(() => api.getPool(id), [id]);

  if (loading) return <Loading label="Loading the pool…" />;
  if (error || !pool) return <div><ErrorState message={error?.message ?? "Not found."} onRetry={reload} title="Couldn't load the pool" /></div>;

  return (
    <div>
      <PageHead title="Pool status" />

      <div className="mt-5"><PoolSnapshot pool={pool} /></div>

      <Section title="How it adds up">
        <PoolLedger pool={pool} />
      </Section>

      <Section title="Price">
        {pool.estimatedUnitPriceMinor != null ? (
          <Rows rows={[{ label: "Estimated per unit", value: formatMoney(pool.estimatedUnitPriceMinor), strong: true }, { label: "Usual price", value: pool.product.retailBaselineMinor != null ? formatMoney(pool.product.retailBaselineMinor) : "Not verified" }]} />
        ) : (
          <p className="text-ink-soft">No quote yet.</p>
        )}
      </Section>

      {pool.quotes.length > 0 && (
        <Section title="Supplier quote">
          <Rows
            rows={[
              { label: "From", value: pool.quotes[0].supplierName },
              { label: "Valid until", value: formatDateTime(pool.quotes[0].expiresAt) },
            ]}
          />
        </Section>
      )}
    </div>
  );
}
