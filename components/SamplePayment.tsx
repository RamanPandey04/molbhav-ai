"use client";
import Image from "next/image";
import Link from "next/link";
import{CheckCircle2}from"lucide-react";
import{DEMO_PROPOSAL_EXPIRES_AT,simulateDemoPayment,useDemoPaymentState}from"@/lib/juhi/demo-payments";
import{useNow}from"@/lib/juhi/hooks";

export function SamplePayment(){
 const{state:s,ready,setState:setS}=useDemoPaymentState(),now=useNow();
 const allApprovals=s.buyer==="ACCEPTED"&&s.kirana==="ACCEPTED"&&s.supplier==="ACCEPTED";
 const expired=now>=Date.parse(DEMO_PROPOSAL_EXPIRES_AT),eligible=ready&&allApprovals&&!expired;
 function simulate(){if(!eligible)return;const next=simulateDemoPayment(s,Date.now());if(next!==s){setS(next);return}}
 return <main className="space-y-5 py-6">
  <div className="rounded-xl border-2 border-stamp bg-stamp-wash p-4 font-bold"><strong>SAMPLE PAYMENT — NOT A REAL TRANSACTION</strong><p>No actual payment was processed for this demonstration. Never scan this sample QR to pay for a demo order.</p></div>
  <section className="card space-y-4">
   <h1 className="text-3xl">Demo payment</h1>
   {eligible?<><div className="flex flex-wrap justify-between gap-3"><div><p className="text-ink-soft">Sample order only · no order created</p><p className="font-bold">Dishwash Gel · sample terms approved</p></div><strong className="text-2xl">₹1.00</strong></div><dl className="grid gap-2 border-t border-paper-rule pt-3 sm:grid-cols-2"><div><dt className="text-ink-soft">Payment method</dt><dd>Manual PhonePe · simulated sample only</dd></div><div><dt className="text-ink-soft">Purpose</dt><dd>Illustrative ₹1 participation amount; not the product purchase amount</dd></div></dl>
    <p className="rounded-lg bg-turmeric-wash p-3">The real PhonePe QR image is shown only as an example. Do not scan it for this demo. The simulator below does not contact PhonePe or any payment provider.</p>
    <Image src="/payments/phonepe-juhi.png" width={602} height={1280} unoptimized priority className="mx-auto h-auto w-[180px] max-w-full rounded-xl border border-paper-rule" alt="Original PhonePe QR artwork, displayed for the demo only; do not scan or pay"/>
    {s.payment==="SIMULATED_PAYMENT_CONFIRMED"?<><p role="status" aria-live="polite" className="flex items-center gap-2 rounded-xl bg-leaf-wash p-4 font-bold text-leaf"><CheckCircle2 aria-hidden/> SIMULATED PAYMENT CONFIRMED — SAMPLE ONLY</p><Link className="btn-yellow" href="/demo/receipt">View and download the sample receipt</Link></>:<button className="btn-yellow" disabled={!eligible} onClick={simulate}>Simulate Payment</button>}</>
    :<><p className="text-ink-soft">This page requires an unexpired sample proposal and separate sample approval by the buyer, kirana and wholesaler. An actual purchase or payment has not been created.</p><ul><li>Buyer: {s.buyer}</li><li>Kirana: {s.kirana}</li><li>Wholesaler: {s.supplier}</li><li>Proposal: {expired?"EXPIRED":"sample approval pending"}</li></ul></>}
   <Link className="btn-ghost" href="/demo">Back to demo order</Link>
  </section>
 </main>
}
