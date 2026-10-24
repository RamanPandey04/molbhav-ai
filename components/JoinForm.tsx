"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Minus, Plus } from "lucide-react";
import type { PoolDetail } from "@/lib/juhi/types";
import { useNow } from "@/lib/juhi/hooks";
import { api, errorMessage } from "@/lib/juhi/client";
import { focusFirstError, formatMoney, rupeesToMinor } from "@/lib/juhi/format";
import { useSession } from "@/lib/juhi/session";
import { Field, Notice } from "@/components/ui";

const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

export function JoinForm({ pool }: { pool: PoolDetail }) {
  const now = useNow();
  const router = useRouter();
  const [qty, setQty] = useState(2);
  const [price, setPrice] = useState("");
  const { session, role } = useSession();
  const [deliverBy, setDeliverBy] = useState("");
  const [until, setUntil] = useState(() => toLocalInput(new Date(Math.min(Date.now() + 48 * 3600_000, new Date(pool.expiresAt).getTime()))));
  const [pickup, setPickup] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverErr, setServerErr] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  // One key per form mount: a double-tap or a retry after a timeout can't create two reservations.
  const [key] = useState(() => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now())));

  const priceMinor = rupeesToMinor(price);
  const errors = {
    qty: !Number.isInteger(qty) || qty < 1 ? "Choose at least 1 unit." : qty > 50 ? "Maximum 50 units." : null,
    price: priceMinor == null ? "Enter an amount, like 28." : null,
    deliverBy: !deliverBy || isNaN(new Date(deliverBy).getTime()) ? "Choose a date." : new Date(deliverBy).getTime() <= now ? "Must be in the future." : null,
    until: !until || isNaN(new Date(until).getTime()) ? "Choose a date." : new Date(until).getTime() <= now ? "Must be in the future." : null,
    pickup: pickup.trim().length < 3 ? "Say how you'll collect, e.g. pickup at the counter." : null,
    consent: consent ? null : "Tick this to join.",
  };
  const invalid = Object.values(errors).some(Boolean);
  const show = (k: keyof typeof errors) => (touched ? errors[k] : null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setServerErr(null);
    if (invalid || priceMinor == null) {
      focusFirstError([{ id: "qty", error: errors.qty }, { id: "price", error: errors.price }, { id: "deliverBy", error: errors.deliverBy }, { id: "until", error: errors.until }, { id: "pickup", error: errors.pickup }]);
      return;
    }
    setBusy(true);
    try {
      const d = await api.createDemand({
        productId: pool.product.id,
        merchantId: pool.merchant.id,
        quantity: qty,
        maxUnitPricePaise: priceMinor,
        deliveryDeadline: new Date(deliverBy).toISOString(),
        expiresAt: new Date(until).toISOString(),
        fulfillmentTerms: pickup.trim(),
        consentConfirmed: true,
        idempotencyKey: key,
      });
      router.push(`/reservation/${String(d.id)}`);
    } catch (err) {
      setServerErr(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5" aria-label="Join the pool">
      <Field id="qty" label="Quantity" error={show("qty")}>
        <div className="flex items-stretch gap-2">
          <button type="button" className="btn-ghost w-14 px-0" aria-label="One fewer" onClick={() => setQty((q) => Math.max(1, q - 1))}>
            <Minus size={18} />
          </button>
          <input
            id="qty" inputMode="numeric" className="field text-center text-xl font-bold"
            value={qty || ""} aria-invalid={!!show("qty")}
            onChange={(e) => setQty(parseInt(e.target.value.replace(/\D/g, ""), 10) || 0)}
          />
          <button type="button" className="btn-ghost w-14 px-0" aria-label="One more" onClick={() => setQty((q) => Math.min(50, q + 1))}>
            <Plus size={18} />
          </button>
        </div>
      </Field>

      <Field
        id="price" label="Your top price per unit (₹)" error={show("price")}
        hint={pool.product.retailBaselineMinor != null ? `Usual price ${formatMoney(pool.product.retailBaselineMinor)}` : undefined}
      >
        <input id="price" inputMode="decimal" className="field" placeholder="28" value={price} onChange={(e) => setPrice(e.target.value)} aria-invalid={!!show("price")} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="deliverBy" label="Need it by" error={show("deliverBy")}>
          <input id="deliverBy" type="datetime-local" className="field" value={deliverBy} onChange={(e) => setDeliverBy(e.target.value)} aria-invalid={!!show("deliverBy")} />
        </Field>
        <Field id="until" label="Keep my request open until" error={show("until")}>
          <input id="until" type="datetime-local" className="field" value={until} onChange={(e) => setUntil(e.target.value)} aria-invalid={!!show("until")} />
        </Field>
      </div>

      <Field id="pickup" label="How you'll collect" error={show("pickup")} hint={`Pickup at ${pool.merchant.name}`}>
        <input id="pickup" className="field" placeholder="Pickup at the counter after 6 pm" value={pickup} onChange={(e) => setPickup(e.target.value)} aria-invalid={!!show("pickup")} />
      </Field>

      <div>
        <label className="flex min-h-[48px] cursor-pointer items-start gap-3 rounded-xl border border-ink/15 bg-white p-4">
          <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-[#1B3FD1]" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span className="text-sm leading-snug">
            This isn&apos;t a purchase or a price promise. Share my quantity and pickup note with the kirana for pickup.
          </span>
        </label>
        {show("consent") && <p className="field-error">{show("consent")}</p>}
      </div>

      {serverErr && <Notice tone="bad" title="Couldn't join">{serverErr}</Notice>}

      {!session ? (
        <Notice tone="info" title="Sign in to join">
          <Link href="/access" className="font-semibold text-sign underline">Sign in or create a buyer account</Link>. Your request is saved to your account.
        </Notice>
      ) : role !== "BUYER" ? (
        <Notice tone="warn" title="Only buyer accounts can join">You&apos;re signed in with a different role.</Notice>
      ) : null}

      <button type="submit" className="btn-primary w-full text-lg" disabled={busy || !session || role !== "BUYER"}>
        {busy && <Loader2 size={18} className="animate-spin motion-reduce:animate-none" aria-hidden />} {busy ? "Saving…" : "Join the pool"}
      </button>
    </form>
  );
}
