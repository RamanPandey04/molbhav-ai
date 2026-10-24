"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Minus, Plus } from "lucide-react";
import type { PoolDetail } from "@/lib/shared/types";
import { api, errorMessage } from "@/lib/api/client";
import { focusFirstError, formatMoney, rupeesToMinor } from "@/lib/format";
import { Field, Notice } from "@/components/ui";

const PHONE = /^(\+?91[\s-]?)?[6-9]\d{9}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function JoinForm({ pool }: { pool: PoolDetail }) {
  const router = useRouter();
  const [qty, setQty] = useState(2);
  const [price, setPrice] = useState("");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
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
    name: name.trim().length < 2 ? "Enter your name." : null,
    contact: PHONE.test(contact.replace(/\s/g, "")) || EMAIL.test(contact.trim()) ? null : "Enter a 10-digit mobile or an email.",
    consent: consent ? null : "Tick this to join.",
  };
  const invalid = Object.values(errors).some(Boolean);
  const show = (k: keyof typeof errors) => (touched ? errors[k] : null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setServerErr(null);
    if (invalid || priceMinor == null) {
      focusFirstError([{ id: "qty", error: errors.qty }, { id: "price", error: errors.price }, { id: "name", error: errors.name }, { id: "contact", error: errors.contact }]);
      return;
    }
    setBusy(true);
    try {
      const d = await api.createDemand({
        productId: pool.product.id,
        merchantId: pool.merchant.id,
        qty,
        maxPriceMinor: priceMinor,
        buyerContactOrSession: contact.trim(),
        displayName: name.trim(),
        consent: true,
        idempotencyKey: key,
      });
      router.push(`/reservation/${d.demandId}`);
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

      <Field id="name" label="Name" error={show("name")}>
        <input id="name" autoComplete="name" className="field" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!show("name")} />
      </Field>

      <Field id="contact" label="Mobile or email" error={show("contact")}>
        <input id="contact" autoComplete="tel" className="field" value={contact} onChange={(e) => setContact(e.target.value)} aria-invalid={!!show("contact")} />
      </Field>

      <div>
        <label className="flex min-h-[48px] cursor-pointer items-start gap-3 rounded-xl border border-ink/15 bg-white p-4">
          <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-[#1B3FD1]" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span className="text-sm leading-snug">
            This isn't a purchase or a price promise. Share my name and quantity with the kirana for pickup.
          </span>
        </label>
        {show("consent") && <p className="field-error">{show("consent")}</p>}
      </div>

      {serverErr && <Notice tone="bad" title="Couldn't join">{serverErr}</Notice>}

      <button type="submit" className="btn-primary w-full text-lg" disabled={busy}>
        {busy && <Loader2 size={18} className="animate-spin motion-reduce:animate-none" aria-hidden />} {busy ? "Saving…" : "Join the pool"}
      </button>
    </form>
  );
}
