"use client";

import { useEffect, useMemo, useState } from "react";
import { type Session, type SupabaseClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";

type ApiErr = { code: string; message: string; details?: unknown };
type ApiRes = { data: unknown; error: ApiErr | null };
type Product = { id: string; name: string; unit: string };
type Merchant = { id: string; name: string; owner_id: string };
type Log = { label: string; status: number | null; body: ApiRes | null; err?: string };

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const iso = (hours: number) => new Date(Date.now() + hours * 3600_000).toISOString();
const toIso = (local: string) => (local ? new Date(local + "Z").toISOString() : "");
const localUtc = (hours: number) => iso(hours).slice(0, 16);
const int = (s: string) => (/^\d+$/.test(s.trim()) ? Number(s) : NaN);
const pick = (v: unknown, k: string): string => {
  if (v && typeof v === "object") {
    const o = Array.isArray(v) ? v[0] : v;
    const x = (o as Record<string, unknown>)?.[k];
    if (typeof x === "string") return x;
  }
  return "";
};
const newKey = () => crypto.randomUUID();

function Field({ label, value, set, type = "text", hint }: { label: string; value: string; set: (v: string) => void; type?: string; hint?: string }) {
  return (
    <label className="fld">
      <span>{label}{hint && <em> {hint}</em>}</span>
      <input type={type} value={value} onChange={(e) => set(e.target.value)} />
    </label>
  );
}

export default function Home() {
  const supabase = useMemo<SupabaseClient | null>(() => (URL_ && KEY ? createBrowserClient(URL_, KEY) : null), []);
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMsg, setAuthMsg] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [log, setLog] = useState<Log[]>([]);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [prodErr, setProdErr] = useState("");
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [role, setRole] = useState("");

  const [productId, setProductId] = useState("");
  const [merchantId, setMerchantId] = useState("");
  const [qty, setQty] = useState("10");
  const [maxPrice, setMaxPrice] = useState("5000");
  const [demandDeadline, setDemandDeadline] = useState("");
  const [demandExpiry, setDemandExpiry] = useState("");
  const [terms, setTerms] = useState("Deliver to merchant counter, TEST demo order");
  const [rQty, setRQty] = useState("20");
  const [neededBy, setNeededBy] = useState("");
  const [rExpiry, setRExpiry] = useState("");
  const [poolId, setPoolId] = useState("");
  const [pool, setPool] = useState<unknown>(null);
  const [supplierId, setSupplierId] = useState("");
  const [skuId, setSkuId] = useState("");
  const [moq, setMoq] = useState("10");
  const [maxAvail, setMaxAvail] = useState("100");
  const [unitPrice, setUnitPrice] = useState("4200");
  const [freight, setFreight] = useState("15000");
  const [handling, setHandling] = useState("2500");
  const [qDeadline, setQDeadline] = useState("");
  const [qExpiry, setQExpiry] = useState("");
  const [evaluationId, setEvaluationId] = useState("");
  const [proposalId, setProposalId] = useState("");
  const [proposal, setProposal] = useState<unknown>(null);
  const [ids, setIds] = useState<Record<string, string>>({});

  useEffect(() => {
    setDemandDeadline(localUtc(72));
    setDemandExpiry(localUtc(48));
    setNeededBy(localUtc(96));
    setRExpiry(localUtc(48));
    setQDeadline(localUtc(72));
    setQExpiry(localUtc(24));
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !session?.user.id) {
      setMerchants([]);
      setRole("");
      return;
    }
    let cancelled = false;
    const userId = session.user.id;
    void Promise.all([
      supabase.from("merchants").select("id,name,owner_id").eq("active", true).order("name"),
      supabase.from("actor_profiles").select("role").eq("user_id", userId).maybeSingle(),
      supabase.from("suppliers").select("id").eq("owner_id", userId).eq("active", true).limit(1),
    ]).then(([stores, profile, suppliers]) => {
      if (cancelled) return;
      const rows = (stores.data ?? []) as Merchant[];
      setMerchants(rows);
      setRole(profile.data?.role ?? "");
      const own = rows.find(m => m.owner_id === userId);
      if (own) setMerchantId(own.id);
      else if (rows.length === 1) setMerchantId(rows[0].id);
      if (suppliers.data?.[0]) setSupplierId(suppliers.data[0].id);
    });
    return () => { cancelled = true; };
  }, [supabase, session?.user.id]);

  async function loadProducts() {
    setProdErr("");
    setProducts(null);
    try {
      const r = await fetch("/api/products");
      const j = (await r.json()) as ApiRes;
      if (!r.ok || j.error) setProdErr(j.error ? `${j.error.code}: ${j.error.message}` : `HTTP ${r.status}`);
      else setProducts((j.data as Product[]) ?? []);
    } catch (e) {
      setProdErr(String(e));
    }
  }
  useEffect(() => { void loadProducts(); }, []);

  async function call(label: string, path: string, method: "GET" | "POST", body?: unknown, idem = false): Promise<ApiRes | null> {
    setBusy(label);
    try {
      const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (data.session) headers.Authorization = `Bearer ${data.session.access_token}`;
      if (idem) headers["Idempotency-Key"] = newKey();
      const r = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
      const j = (await r.json().catch(() => null)) as ApiRes | null;
      setLog((l) => [{ label, status: r.status, body: j }, ...l].slice(0, 20));
      return r.ok && j && !j.error ? j : null;
    } catch (e) {
      setLog((l) => [{ label, status: null, body: null, err: String(e) }, ...l].slice(0, 20));
      return null;
    } finally {
      setBusy(null);
    }
  }
  const remember = (k: string, v: string) => v && setIds((m) => ({ ...m, [k]: v }));

  async function signIn() {
    if (!supabase) return;
    setBusy("Sign in");
    setAuthMsg("");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setAuthMsg(error ? error.message : "Signed in.");
      if (!error) setPassword("");
    } catch { setAuthMsg("Could not sign in. Please try again."); }
    finally { setBusy(null); }
  }
  async function signUp() {
    if (!supabase) return;
    setBusy("Create buyer account");
    setAuthMsg("");
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      setAuthMsg(error ? error.message : data.session ? "Buyer account created." : "Check your email to confirm your account, then sign in.");
      if (!error) setPassword("");
    } catch { setAuthMsg("Could not create an account. Please try again."); }
    finally { setBusy(null); }
  }
  async function signOut() {
    const result = await supabase?.auth.signOut();
    if (result?.error) { setAuthMsg(result.error.message); return; }
    setLog([]); setIds({}); setProposal(null); setPool(null);
    setProposalId(""); setEvaluationId(""); setSupplierId(""); setMerchantId("");
    setSession(null);
    setAuthMsg("Signed out.");
  }

  function badNums(...vals: number[]) { return vals.some((n) => !Number.isSafeInteger(n)); }

  async function submitDemand() {
    const q = int(qty), p = int(maxPrice);
    if (badNums(q, p)) return alert("Quantity and paise must be whole numbers.");
    const r = await call("Buyer demand", "/api/demands", "POST", {
      merchantId, productId, quantity: q, maxUnitPricePaise: p,
      expiresAt: toIso(demandExpiry), deliveryDeadline: toIso(demandDeadline), fulfillmentTerms: terms,
    }, true);
    if (r) { remember("demandId", pick(r.data, "id")); const pid = pick(r.data, "pool_id"); if (pid) setPoolId(pid); }
  }
  async function submitRestock() {
    const q = int(rQty);
    if (badNums(q)) return alert("Quantity must be a whole number.");
    const r = await call("Merchant restock", "/api/merchant/restock", "POST", {
      merchantId, productId, quantity: q, expiresAt: toIso(rExpiry), neededBy: toIso(neededBy),
    }, true);
    if (r) { remember("restockId", pick(r.data, "id")); const pid = pick(r.data, "pool_id"); if (pid) setPoolId(pid); }
  }
  async function readRestock() {
    await call("Merchant restock (read)", `/api/merchant/restock?merchantId=${encodeURIComponent(merchantId)}`, "GET");
  }
  async function readPool() {
    const r = await call("Pool read", `/api/pools/${encodeURIComponent(poolId)}`, "GET");
    setPool(r ? r.data : null);
  }
  async function findPool() {
    if (!supabase || !session) { setAuthMsg("Sign in to find your merchant's pool."); return; }
    setBusy("Find pool");
    try {
      const merchant = await supabase.from("merchants").select("zone_id").eq("id", merchantId).single();
      if (merchant.error) throw merchant.error;
      const result = await supabase.from("pools").select("id").eq("zone_id", merchant.data.zone_id).eq("product_id", productId).maybeSingle();
      if (result.error) throw result.error;
      if (!result.data) throw new Error("No pool exists for this merchant and SKU yet. Submit demand or restock first.");
      setPoolId(result.data.id);
      setSkuId(productId);
      remember("poolId", result.data.id);
      const r = await call("Pool read", `/api/pools/${encodeURIComponent(result.data.id)}`, "GET");
      setPool(r ? r.data : null);
    } catch (e) {
      setLog(l => [{ label: "Find pool", status: null, body: null, err: e instanceof Error ? e.message : String(e) }, ...l].slice(0, 20));
    } finally { setBusy(null); }
  }
  async function submitQuote() {
    const n = [int(moq), int(maxAvail), int(unitPrice), int(freight), int(handling)];
    if (badNums(...n)) return alert("All quantities and paise must be whole numbers.");
    const r = await call("Supplier quote", "/api/supplier/quotes", "POST", {
      poolId, supplierId, exactSkuId: skuId, minOrderQuantity: n[0], maxAvailableQuantity: n[1],
      quotedUnitPricePaise: n[2], freightPaise: n[3], handlingPaise: n[4],
      deliveryDeadline: toIso(qDeadline), expiresAt: toIso(qExpiry),
    }, true);
    if (r) remember("quoteId", pick(r.data, "id"));
  }
  async function evaluate() {
    const r = await call("Admin evaluate", `/api/pools/${encodeURIComponent(poolId)}/evaluate`, "POST", undefined, true);
    if (r) setEvaluationId(pick(r.data, "id"));
  }
  async function readEvaluation() {
    const r = await call("Read evaluation", `/api/pools/${encodeURIComponent(poolId)}/evaluation`, "GET");
    if (r) { const id = pick(r.data, "id"); if (id) setEvaluationId(id); }
  }
  async function createProposal() {
    const r = await call("Create proposal", "/api/proposals", "POST", { evaluationId });
    if (r) { setProposal(r.data); const id = pick(r.data, "id"); if (id) setProposalId(id); }
  }
  async function readProposal() {
    const r = await call("Read proposal", `/api/proposals/${encodeURIComponent(proposalId)}`, "GET");
    setProposal(r ? r.data : null);
  }
  const termsHash = pick(proposal, "id") === proposalId ? (pick(proposal, "terms_hash") || pick(proposal, "termsHash")) : "";
  async function decide(kind: "approve" | "reject") {
    if (!termsHash) return;
    if (!confirm(`${kind.toUpperCase()} this TEST proposal against terms hash ${termsHash.slice(0, 12)}…?`)) return;
    const r = await call(`Proposal ${kind}`, `/api/proposals/${encodeURIComponent(proposalId)}/${kind}`, "POST", { termsHash });
    if (r) setProposal(r.data);
  }

  const B = (label: string, fn: () => void, disabled = false) => (
    <button className="btn" disabled={!!busy || disabled} onClick={fn}>{busy === label ? "Working…" : label}</button>
  );

  return (
    <main className="wrap">
      <header className="top">
        <div>
          <p className="tag">TEST / DEMO ENVIRONMENT</p>
          <h1>Molbhav<span>.AI</span></h1>
          <p className="sub">Neighbourhood procurement pool — P0 operator console. Integrations are unverified; no payments are made and no automated agent acts on your behalf.</p>
        </div>
        <section className="card auth">
          {!supabase ? (
            <p className="err">Supabase disconnected: NEXT_PUBLIC_SUPABASE_URL / PUBLISHABLE_KEY not set. Protected actions will fail.</p>
          ) : session ? (
            <>
              <p>Signed in as <b>{session.user.email}</b>{role && <> · {role}</>}</p>
              <button className="btn ghost" onClick={signOut}>Sign out</button>
            </>
          ) : (
            <>
              <Field label="Email" value={email} set={setEmail} type="email" />
              <Field label="Password" value={password} set={setPassword} type="password" />
              <div className="btns">
                <button className="btn" onClick={signIn} disabled={!!busy || !email || !password}>{busy === "Sign in" ? "Signing in…" : "Sign in"}</button>
                <button className="btn ghost" onClick={signUp} disabled={!!busy || !email || password.length < 8}>Create buyer account</button>
              </div>
            </>
          )}
          {authMsg && <p className="note">{authMsg}</p>}
          <p className="note">Role is provisioned server-side; the API rejects actions outside it.</p>
        </section>
      </header>

      <div className="grid">
        <section className="card">
          <h2><i>01</i> Products</h2>
          {products === null && !prodErr && <div className="skel" />}
          {prodErr && <p className="err">{prodErr} <button className="link" onClick={loadProducts}>Retry</button></p>}
          {products && products.length === 0 && <p className="note">No active products in database.</p>}
          {products && products.length > 0 && (
            <label className="fld"><span>Product</span>
              <select value={productId} onChange={(e) => setProductId(e.target.value)}>
                <option value="">Select…</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
              </select>
            </label>
          )}
          <Field label="Product ID" value={productId} set={setProductId} />
          {merchants.length > 0 && <label className="fld"><span>Merchant</span>
            <select value={merchantId} onChange={e => setMerchantId(e.target.value)}>
              <option value="">Select…</option>
              {merchants.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>}
          <Field label="Merchant ID" value={merchantId} set={setMerchantId} hint="(uuid)" />
        </section>

        <section className="card">
          <h2><i>02</i> Buyer demand <small>BUYER</small></h2>
          <div className="row">
            <Field label="Quantity" value={qty} set={setQty} />
            <Field label="Max unit price" value={maxPrice} set={setMaxPrice} hint="paise" />
          </div>
          <div className="row">
            <Field label="Delivery deadline" value={demandDeadline} set={setDemandDeadline} type="datetime-local" hint="UTC" />
            <Field label="Expires" value={demandExpiry} set={setDemandExpiry} type="datetime-local" hint="UTC" />
          </div>
          <Field label="Fulfilment terms" value={terms} set={setTerms} />
          {B("Buyer demand", submitDemand, !merchantId || !productId)}
        </section>

        <section className="card">
          <h2><i>03</i> Merchant restock <small>MERCHANT</small></h2>
          <Field label="Quantity" value={rQty} set={setRQty} />
          <div className="row">
            <Field label="Needed by" value={neededBy} set={setNeededBy} type="datetime-local" hint="UTC" />
            <Field label="Expires" value={rExpiry} set={setRExpiry} type="datetime-local" hint="UTC" />
          </div>
          <div className="btns">
            {B("Merchant restock", submitRestock, !merchantId || !productId)}
            {B("Merchant restock (read)", readRestock, !merchantId)}
          </div>
        </section>

        <section className="card">
          <h2><i>04</i> Pool</h2>
          <Field label="Pool ID" value={poolId} set={setPoolId} />
          {B("Find pool", findPool, !merchantId || !productId || !session)}
          {B("Pool read", readPool, !poolId)}
          {pool !== null && <pre>{JSON.stringify(pool, null, 2)}</pre>}
        </section>

        <section className="card">
          <h2><i>05</i> Supplier quote <small>SUPPLIER</small></h2>
          <div className="row">
            <Field label="Supplier ID" value={supplierId} set={setSupplierId} />
            <Field label="Exact SKU ID" value={skuId} set={setSkuId} />
          </div>
          <div className="row">
            <Field label="MOQ" value={moq} set={setMoq} />
            <Field label="Max available" value={maxAvail} set={setMaxAvail} />
          </div>
          <div className="row three">
            <Field label="Unit price" value={unitPrice} set={setUnitPrice} hint="paise" />
            <Field label="Freight" value={freight} set={setFreight} hint="paise" />
            <Field label="Handling" value={handling} set={setHandling} hint="paise" />
          </div>
          <div className="row">
            <Field label="Delivery deadline" value={qDeadline} set={setQDeadline} type="datetime-local" hint="UTC" />
            <Field label="Expires" value={qExpiry} set={setQExpiry} type="datetime-local" hint="UTC" />
          </div>
          {B("Supplier quote", submitQuote, !poolId || !supplierId || !skuId)}
        </section>

        <section className="card">
          <h2><i>06</i> Evaluate &amp; propose <small>ADMIN</small></h2>
          <div className="btns">
            {B("Admin evaluate", evaluate, !poolId)}
            {B("Read evaluation", readEvaluation, !poolId)}
          </div>
          <Field label="Evaluation ID" value={evaluationId} set={setEvaluationId} />
          {B("Create proposal", createProposal, !evaluationId)}
        </section>

        <section className="card wide">
          <h2><i>07</i> Proposal decision</h2>
          <Field label="Proposal ID" value={proposalId} set={setProposalId} />
          <div className="btns">
            {B("Read proposal", readProposal, !proposalId)}
            {B("Proposal approve", () => decide("approve"), !termsHash)}
            {B("Proposal reject", () => decide("reject"), !termsHash)}
          </div>
          <p className="note">Terms hash: <code>{termsHash || "— read a proposal first"}</code></p>
          {proposal !== null && <pre>{JSON.stringify(proposal, null, 2)}</pre>}
        </section>
      </div>

      <section className="card wide">
        <h2>IDs from this session</h2>
        <p className="note mono">
          {Object.entries({ ...ids, poolId, evaluationId, proposalId }).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("  ·  ") || "None yet."}
        </p>
        <h2>Response log</h2>
        {log.length === 0 && <p className="note">No requests yet. Every action shows its real HTTP status and body here.</p>}
        {log.map((l, i) => (
          <details key={i} open={i === 0} className={l.body?.error || l.err ? "bad" : "good"}>
            <summary>{l.label} — {l.status ?? "network error"} {l.body?.error ? `${l.body.error.code}: ${l.body.error.message}` : l.err ?? "OK"}</summary>
            <pre>{JSON.stringify(l.body, null, 2)}</pre>
          </details>
        ))}
      </section>
    </main>
  );
}
