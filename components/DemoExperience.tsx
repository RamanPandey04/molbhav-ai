"use client";
import {useState} from "react";
import {evaluateDemo,DEMO_SAMPLE} from "@/lib/juhi/demo";
import type {Role} from "@/lib/juhi/types";
import {DataClassChip} from "@/components/ui";

const P=(n:number)=>`₹${(n/100).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const routes:[Role,string,string,string][]=[
  ["BUYER","I'm a Buyer","Choose a normal household quantity; the pool combines it with separate kirana restocking.","Shopping bag"],
  ["KIRANA","I Run a Kirana","Change independent restocking, review the deal and approve or reject the sample terms.","Store"],
  ["SUPPLIER","I'm a Wholesaler","Edit a sample offer, its MOQ, freight and stock; see which quote qualifies.","Boxes"],
  ["ADMIN","Explore AI Deal Room","Run the transparent, deterministic sample comparison; no real agent is called.","Analysis"],
];
export function DemoExperience(){
  const [role,setRole]=useState<Role>("BUYER");
  const [buyer,setBuyer]=useState(18);
  const [restock,setRestock]=useState(62);
  const [freight,setFreight]=useState(0);
  const [kiranaOk,setKiranaOk]=useState(true);
  const [buyerOk,setBuyerOk]=useState(false);
  const [supplierOk,setSupplierOk]=useState(false);
  const [analysisShown,setAnalysisShown]=useState(false);
  const [sampleQuoteSaved,setSampleQuoteSaved]=useState(false);
  const [sampleReserved,setSampleReserved]=useState(false);
  const [price,setPrice]=useState(8800);
  const [moq,setMoq]=useState(80);
  const [stock,setStock]=useState(150);
  const [decision,setDecision]=useState("AWAITING SAMPLE APPROVAL");
  const quotes=DEMO_SAMPLE.suppliers.map(s=>s.id==="demo-supplier-a"?{...s,unitPricePaise:price,minOrderQuantity:moq,availableQuantity:stock}:s);
  const demo=evaluateDemo({buyerUnits:buyer,independentRestock:restock,freightIncreasePaise:freight,kiranaApproved:kiranaOk,buyerApproved:buyerOk,supplierApproved:supplierOk,suppliers:quotes});
  function scenario(which:"45"|"freight"|"reject"|"reset"){
    setDecision("AWAITING SAMPLE APPROVAL");setAnalysisShown(false);setSampleReserved(false);
    if(which==="45"){setBuyer(18);setRestock(27);setFreight(0);setKiranaOk(true);setBuyerOk(true);setSupplierOk(true)}
    if(which==="freight"){setBuyer(18);setRestock(62);setFreight(2300);setKiranaOk(true);setBuyerOk(true);setSupplierOk(true)}
    if(which==="reject"){setBuyer(18);setRestock(62);setFreight(0);setKiranaOk(false);setBuyerOk(true);setSupplierOk(true);setDecision("SAMPLE KIRANA: REJECTED")}
    if(which==="reset"){setBuyer(18);setRestock(62);setFreight(0);setKiranaOk(true);setBuyerOk(false);setSupplierOk(false);setPrice(8800);setMoq(80);setStock(150);setSampleQuoteSaved(false)}
  }
  return <div className="space-y-5 py-5">
    <div className="rounded-xl border-2 border-stamp bg-stamp-wash p-4 text-ink">
      <b>INTERACTIVE DEMO — SAMPLE DATA</b><p>No login, Supabase write, supplier request, real approval, payment or AgenticOrg call. Sample-only changes reset on reload.</p>
    </div>
    <header className="space-y-2"><p className="font-mono text-sm font-bold uppercase tracking-widest text-turmeric-deep">An interactive neighbourhood purchase</p>
      <h1 className="text-4xl leading-tight sm:text-6xl">Small orders. <span className="text-leaf">One stronger deal.</span></h1>
      <p className="text-lg text-ink-soft">{DEMO_SAMPLE.zone} · {DEMO_SAMPLE.product.name} · {DEMO_SAMPLE.product.packSize}</p></header>
    <nav aria-label="Demo role" className="grid grid-cols-2 gap-2 sm:grid-cols-4">{routes.map(([r,title,,icon])=><button key={r} aria-pressed={role===r} onClick={()=>setRole(r)} className={`card px-3 py-3 text-left font-semibold ${role===r?"ring-2 ring-turmeric":""}`}><span aria-hidden>{icon} · </span>{title}</button>)}</nav>
    <section className="card space-y-4 p-4 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-2xl">{routes.find(x=>x[0]===role)?.[1]}</h2><DataClassChip value="DEMO — SAMPLE DATA"/></div><p className="text-ink-soft">{routes.find(x=>x[0]===role)?.[2]}</p>
      {role==="BUYER"&&<button className="btn-yellow" onClick={()=>setSampleReserved(true)}>Join the SAMPLE pool (demo only)</button>}
      {sampleReserved&&<p aria-live="polite" className="rounded-lg bg-turmeric-wash p-3 font-semibold">SAMPLE RESERVATION ONLY. No account, demand, order, payment or database record was created.</p>}
      {role==="BUYER"&&<><label className="block font-semibold">Neighbourhood household demand (units)<input className="field mt-1" type="number" min={0} max={500} value={buyer} onChange={e=>setBuyer(Math.max(0,Number(e.target.value)||0))}/><span className="block font-normal text-ink-soft">For illustration only. Joining a pool is a reservation, not a confirmed purchase.</span></label><div className="flex gap-2"><button className="btn-yellow" onClick={()=>{setBuyerOk(true);setDecision("SAMPLE BUYER: APPROVED")}}>Approve sample terms</button><button className="btn-yellow" onClick={()=>{setBuyerOk(false);setDecision("SAMPLE BUYER: REJECTED")}}>Reject sample terms</button></div><p aria-live="polite">{decision}</p></>}
      {role==="KIRANA"&&<><label className="block font-semibold">Independent kirana restocking (units)<input className="field mt-1" type="number" min={0} max={1000} value={restock} onChange={e=>setRestock(Math.max(0,Number(e.target.value)||0))}/></label><div className="grid grid-cols-2 gap-2">{DEMO_SAMPLE.kiranas.map(k=><div key={k.id} className="rounded-lg border p-3">Kirana {k.id.slice(-2)}<br/>Buyer units {k.buyerUnits} · Restock {k.independentRestock}</div>)}</div><div className="flex flex-wrap gap-2"><button className="btn-yellow" onClick={()=>{setKiranaOk(true);setDecision("SAMPLE KIRANA: APPROVED")}}>Approve sample terms</button><button className="btn-yellow" onClick={()=>{setKiranaOk(false);setDecision("SAMPLE KIRANA: REJECTED")}}>Reject sample terms</button></div><p aria-live="polite">{decision}. This stays inside the demo.</p></>}
      {role==="SUPPLIER"&&<div className="grid gap-3 sm:grid-cols-2"><label>Supplier A unit price (₹)<input className="field mt-1" inputMode="decimal" type="number" step=".01" min="0" value={price/100} onChange={e=>setPrice(Math.max(0,Math.round(Number(e.target.value)*100)||0))}/></label><label>Minimum order quantity<input className="field mt-1" type="number" min="1" value={moq} onChange={e=>setMoq(Math.max(1,Number(e.target.value)||1))}/></label><label>Available stock<input className="field mt-1" type="number" min="1" value={stock} onChange={e=>setStock(Math.max(1,Number(e.target.value)||1))}/></label><label>Additional freight across sample offers (₹/unit)<input className="field mt-1" type="number" min="0" step=".01" value={freight/100} onChange={e=>setFreight(Math.max(0,Math.round(Number(e.target.value)*100)||0))}/></label><div className="flex flex-wrap gap-2 sm:col-span-2"><button className="btn-yellow" onClick={()=>setSampleQuoteSaved(true)}>Submit sample quote</button><button className="btn-yellow" onClick={()=>{setSupplierOk(true);setDecision("SAMPLE SUPPLIER: ACCEPTED")}}>Accept sample proposal</button><button className="btn-yellow" onClick={()=>{setSupplierOk(false);setDecision("SAMPLE SUPPLIER: REJECTED")}}>Reject / counteroffer in the demo</button></div><p aria-live="polite" className="text-ink-soft sm:col-span-2">{sampleQuoteSaved?"Sample quote saved in demo-only memory; nothing was sent to the live API.":"Illustrative quote only; nothing is sent to a real supplier."}</p></div>}
      {role==="ADMIN"&&<><p>Deterministic sample analysis—not an AgenticOrg run. Its events, recommendation and amounts are simulated.</p><label className="block font-semibold">Illustrative freight increase across suppliers (₹/unit)<input className="field mt-1" type="number" min="0" step=".01" value={freight/100} onChange={e=>setFreight(Math.max(0,Math.round(Number(e.target.value)*100)||0))}/></label><button className="btn-yellow" onClick={()=>setAnalysisShown(true)}>Run Demo Deal Analysis</button></>}
      <div className="rounded-xl bg-ink p-4 text-white"><p className="text-sm text-white/75">DEMO POOL QUANTITY · SAMPLE ONLY</p><p className="text-5xl font-bold text-turmeric" aria-live="polite">{demo.combinedUnits}<span className="text-base text-white"> units</span></p><p>{demo.buyerUnits} household units + {demo.independentRestock} independent kirana units = {demo.combinedUnits} combined. Buyer demand is counted once.</p><div className="mt-3 h-3 rounded-full bg-white/20"><div className="h-3 rounded-full bg-[#3DD6A0]" style={{width:`${Math.min(100,demo.combinedUnits/80*100)}%`}}/></div><p>{demo.combinedUnits} / 80 sample units; MOQ progress is illustrative.</p></div>
      <div className="overflow-x-auto"><table className="w-full text-left"><caption className="pb-2 text-left font-semibold">HYPOTHETICAL DEAL ECONOMICS · SAMPLE QUOTES ONLY</caption><thead><tr><th>Sample supplier</th><th>MOQ</th><th>Qty available</th><th>Landed/unit</th><th>Eligibility</th></tr></thead><tbody>{quotes.map(q=>{const e=demo.supplierScores.find(x=>x.supplierId===q.id)!;return <tr key={q.id} className="border-t"><td className="py-2">{q.name}</td><td>{q.minOrderQuantity}</td><td>{q.availableQuantity}</td><td>{P(e.landedUnitPaise)}</td><td>{e.qualified?"Meets MOQ and stock":"Does not qualify"}</td></tr>})}</tbody></table></div>
      <div className="rounded-xl border p-4"><p className="font-bold">Deterministic recommendation: {demo.decision}</p><p>{demo.selectedSupplier?`Best qualifying sample supplier: ${demo.selectedSupplier}`:"No supplier qualifies at this quantity."}</p>{demo.reasons.map(r=><p key={r} className="text-ink-soft">{r}</p>)}<div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4"><p>Current cost {P(DEMO_SAMPLE.baselinePurchaseCostPaise)}/unit</p><p>Potential retail {P(DEMO_SAMPLE.retailPricePaise)}/unit</p><p>Sample consumer price {P(DEMO_SAMPLE.consumerPricePaise)}/unit</p><p>Potential consumer savings {P(demo.consumerSavingsPaise)}*</p></div><p>*Hypothetical only; not a quote, revenue, saving, transaction or product order. Consumer saving shown only while a supplier qualifies and the modeled landed cost beats the procurement baseline.</p><p>Platform fee {P(DEMO_SAMPLE.platformFeePaise)}/unit is already included in Suppliers A and B&apos;s illustrated landed costs. Suppliers C&apos;s MOQ is 150 units, so 80 units do not qualify.</p></div>
      {role==="ADMIN"&&analysisShown&&<ol className="space-y-2 rounded-xl bg-leaf-wash p-4"><b>SIMULATED DEMO ANALYSIS · not an AgenticOrg trace</b>{["Parsed sample demand","Matched the illustrated identical SKU","Combined sample household + separate kirana quantities","Checked each supplier MOQ and stock limit","Compared landed costs using deterministic arithmetic","Recommended the lowest viable illustrative landed cost","Awaited separate buyer, kirana and supplier decisions"].map((e,i)=><li key={e}>{i+1}. {e}</li>)}</ol>}
      <div className="flex flex-wrap gap-2"><button className="btn-yellow" onClick={()=>scenario("45")}>Case A: test 45 pooled units</button><button className="btn-yellow" onClick={()=>scenario("freight")}>Case B: freight eliminates savings</button><button className="btn-yellow" onClick={()=>scenario("reject")}>Case C: kirana rejects sample deal</button><button className="btn-yellow" onClick={()=>scenario("reset")}>Reset illustrative example</button></div>
      <p className="rounded-lg bg-turmeric-wash p-3 font-medium">Final price, supplier acceptance and each human approval must all be real and authorized. Sample terms never complete a purchase.</p>
    </section>
    <section className="grid gap-3 sm:grid-cols-3">{[["CUSTOMERS","Better prices. Familiar local stores."],["KIRANAS","More customers. Stronger purchasing power."],["WHOLESALERS","Consolidated demand. Predictable orders."]].map(([h,t])=><article key={h} className="card p-4"><h3>{h}</h3><p>{t}</p></article>)}</section>
    <div className="flex flex-wrap gap-3"><a className="btn-yellow" href="/access">Real account sign-in</a><a className="btn-yellow" href="/console">Existing authenticated console</a><a className="btn-yellow" href="/payments/phonepe-juhi.png">Exact PhonePe QR (manual, verified by a human)</a></div>
    <p className="text-sm text-ink-soft">This demo is separate from real Supabase data, approvals, orders, agent-run metrics and payments. Never use this sample QR to pay for a fictional sample order.</p>
  </div>
}
