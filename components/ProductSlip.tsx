import type { MerchantInfo, Product } from "@/lib/juhi/types";
import { formatMoney } from "@/lib/juhi/format";

/** The exact product. Exact brand and pack size matter: pooling only works for identical items. */
export function ProductSlip({ product, merchant }: { product: Product; merchant: MerchantInfo }) {
  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[15px] font-medium text-ink-soft">{product.brand}</p>
          <p className="font-display text-[24px] leading-tight">{product.name}, {product.packSize.replace(/ /g, "\u00A0")}</p>
        </div>
        {product.retailBaselineMinor != null && (
          <div className="shrink-0 rounded-xl bg-turmeric-wash px-3 py-1.5 text-right">
            <p className="text-[12px] font-semibold text-slate-warn">Usual price</p>
            <p className="text-xl font-bold tabular-nums leading-tight">{formatMoney(product.retailBaselineMinor)}</p>
          </div>
        )}
      </div>
      <p className="mt-3 border-t border-paper-rule pt-3 text-[16px]">
        <span className="text-ink-soft">Pickup</span> <strong>{merchant.name}</strong>
        {!merchant.verified && <span className="font-medium text-stamp"> (not verified)</span>}
      </p>
    </div>
  );
}
