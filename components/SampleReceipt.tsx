"use client";
import Image from "next/image";
import Link from "next/link";
import {useRef,useState}from"react";
import{Download,Printer,ReceiptText}from"lucide-react";
import{DEMO_RECEIPT,formatDemoTimestamp,useDemoPaymentState}from"@/lib/juhi/demo-payments";

const formatTime=formatDemoTimestamp;
export function SampleReceipt(){
 const{state:s,ready}=useDemoPaymentState(),[downloading,setDownloading]=useState(false),[downloadError,setDownloadError]=useState("");
 const qr=useRef<HTMLImageElement>(null);
 const valid=ready&&s.payment==="SIMULATED_PAYMENT_CONFIRMED"&&!!s.paymentSimulatedAt;
 async function downloadPng(){
  if(!valid||!s.paymentSimulatedAt)return;
  setDownloading(true);setDownloadError("");
  try{
   const canvas=document.createElement("canvas");canvas.width=1200;canvas.height=2150;
   const c=canvas.getContext("2d");if(!c)throw new Error("Image export is unavailable.");
   c.fillStyle="#FFF8EC";c.fillRect(0,0,1200,1600);
   c.strokeStyle="#1F6B4A";c.lineWidth=8;c.strokeRect(30,30,1140,1540);
   c.fillStyle="#1F6B4A";c.font="bold 54px sans-serif";c.fillText("Molbhav.AI",80,120);
   c.fillStyle="#24271F";c.font="bold 48px sans-serif";c.fillText("Payment Receipt",80,210);
   c.fillStyle="#9D241F";c.fillRect(75,250,1050,116);
   c.fillStyle="#FFFFFF";c.font="bold 33px sans-serif";c.fillText("SAMPLE PAYMENT — NOT A REAL TRANSACTION",96,320);
   const rows=[
    ["Merchant / product context",DEMO_RECEIPT.merchant],
    ["Payment method",DEMO_RECEIPT.paymentMethod+" (simulated display)"],
    ["Amount","₹1.00 (sample participation amount; not product cost)"],
    ["Recipient",DEMO_RECEIPT.recipient],
    ["Demo order reference",DEMO_RECEIPT.reference],
    ["Status","SIMULATED PAYMENT CONFIRMED"],
    ["Simulated event time",formatTime(s.paymentSimulatedAt)],
   ];
   let y=455;
   for(const [label,value]of rows){c.fillStyle="#5E6157";c.font="24px sans-serif";c.fillText(label,85,y);y+=38;c.fillStyle=label==="Status"?"#1F6B4A":"#24271F";c.font="bold 30px sans-serif";c.fillText(value,85,y);y+=78}
   c.fillStyle="#E8871E";c.fillRect(75,y,1050,4);y+=45;
   c.fillStyle="#1F6B4A";c.font="bold 24px sans-serif";c.fillText("SAMPLE QR IMAGE — DO NOT SCAN OR PAY",85,y);
   if(qr.current){await qr.current.decode();c.drawImage(qr.current,790,y+20,225,Math.round(225*qr.current.naturalHeight/qr.current.naturalWidth))}
   y+=65;c.fillStyle="#24271F";c.font="23px sans-serif";
   c.fillText("No actual payment was processed for this demonstration.",85,y,1000);y+=44;
   c.fillText("This on-device sample is not a payment confirmation or revenue record.",85,y,1000);
   const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("PNG export failed.")),"image/png"));
   const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="molbhav-sample-payment-receipt.png";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch(e){setDownloadError(e instanceof Error?e.message:"Could not download the sample receipt.");}
  finally{setDownloading(false)}
 }
 return <main className="space-y-4 py-6">
  {!valid?<div className="card"><p role="status">{ready?"No simulated sample payment is recorded in this browser.":"Loading the sample receipt…"}</p><Link className="btn-ghost mt-3 inline-flex" href="/demo">Back to demo order</Link></div>:<>
   <aside className="rounded-xl border-2 border-stamp bg-stamp-wash p-4 text-ink"><strong className="text-lg">{DEMO_RECEIPT.sampleLabel}</strong><p>{DEMO_RECEIPT.disclaimer}</p></aside>
   <article id="molbhav-demo-receipt" className="mx-auto max-w-3xl space-y-5 rounded-2xl border border-paper-rule bg-paper-raised p-5 shadow-card sm:p-9">
    <header className="flex items-start justify-between gap-3 border-b border-paper-rule pb-5"><div><p className="font-mono text-sm font-bold uppercase tracking-wider text-leaf">Molbhav.AI · DEMONSTRATION</p><h1 className="mt-2 text-4xl">Payment Receipt</h1></div><ReceiptText className="text-leaf" size={34} aria-hidden/></header>
    <div className="rounded-lg border-2 border-stamp bg-stamp-wash p-3 text-center font-extrabold text-stamp">{DEMO_RECEIPT.sampleLabel}</div>
    <p className="text-2xl font-bold text-leaf">SIMULATED PAYMENT CONFIRMED</p>
    <p role="note" className="rounded-lg bg-turmeric-wash p-3 font-semibold">No actual payment was processed for this demonstration. This is a local sample receipt—not a PhonePe confirmation, provider transaction, genuine order, or revenue entry.</p>
    <dl className="grid gap-x-6 sm:grid-cols-2">
     {[
      ["Merchant / product context",DEMO_RECEIPT.merchant],
      ["Payment method",DEMO_RECEIPT.paymentMethod+" · simulation only"],
      ["Amount","₹1.00"],
      ["Amount purpose","Illustrative participation amount only—not the product purchase price"],
      ["Recipient",DEMO_RECEIPT.recipient],
      ["Demo order reference",DEMO_RECEIPT.reference],
      ["Simulated event timestamp",s.paymentSimulatedAt?formatTime(s.paymentSimulatedAt):""],
      ["Status","SIMULATED PAYMENT CONFIRMED"],
     ].map(([label,value])=><div key={label} className="border-b border-paper-rule py-3"><dt className="text-sm text-ink-soft">{label}</dt><dd className="font-semibold">{value}</dd></div>)}
    </dl>
    <div className="flex flex-col items-center gap-3 rounded-xl border border-paper-rule p-4 text-center"><p className="font-bold text-stamp">SAMPLE QR IMAGE — NOT A PAYMENT REQUEST — DO NOT SCAN OR PAY</p><Image ref={qr} src="/payments/phonepe-juhi.png" width={602} height={1280} unoptimized className="h-auto w-[150px]" alt="Original PhonePe QR artwork, included as an illustrative sample only; do not scan or pay"/><p className="max-w-prose text-sm text-ink-soft">The original authorized QR is shown only because this sample receipt identifies the manual PhonePe method. It does not set an amount and no payment was made.</p></div>
    <p className="border-t border-paper-rule pt-4 text-center text-sm text-ink-soft">This sample is stored only in your browser for this demo. No UPI reference, transaction identifier, provider confirmation, payment ledger entry or revenue event was generated.</p>
    <div className="demo-print-hide flex flex-wrap gap-3">
     <button className="btn-yellow" disabled={downloading} onClick={downloadPng}><Download size={17}/> {downloading?"Preparing sample receipt…":"Download sample receipt (PNG)"}</button>
     <button className="btn-ghost" onClick={()=>window.print()}><Printer size={17}/> Print receipt / Save PDF</button>
     <Link className="btn-ghost" href="/demo">Back to demo order</Link>
    </div>
    {downloadError&&<p role="alert" className="demo-print-hide font-semibold text-stamp">{downloadError}</p>}
   </article>
   <style>{`@media print{@page{size:auto;margin:12mm}body *{visibility:hidden!important}#molbhav-demo-receipt,#molbhav-demo-receipt *{visibility:visible!important}#molbhav-demo-receipt{position:absolute!important;left:0!important;top:0!important;width:100%!important;max-width:none!important;box-shadow:none!important;border:0!important}.demo-print-hide{display:none!important}}`}</style>
  </>}
 </main>
}
