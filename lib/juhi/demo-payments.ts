import {useSyncExternalStore} from "react";
/** Isolated state for the public demonstration. Never sent to the backend. */
export const DEMO_STORAGE_KEY="molbhav:demo:payments:v1";
export const DEMO_PROPOSAL_EXPIRES_AT="2026-11-01T00:00:00.000Z";
export const DEMO_RECEIPT={
  merchant:"Molbhav.AI Demo",
  paymentMethod:"Manual PhonePe",
  amountPaise:100,
  recipient:"Juhi Dugar",
  reference:"DEMO-MB-0001",
  sampleLabel:"SAMPLE PAYMENT — NOT A REAL TRANSACTION",
  disclaimer:"No actual payment was processed for this demonstration.",
} as const;
export function formatDemoTimestamp(iso:string){
  return new Intl.DateTimeFormat("en-IN",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Kolkata"}).format(new Date(iso));
}
export type DemoHumanStatus="PENDING"|"ACCEPTED"|"REJECTED"|"EXPIRED";
export type DemoPaymentState={
  buyer:DemoHumanStatus;
  kirana:DemoHumanStatus;
  supplier:DemoHumanStatus;
  supplierAcceptedAt:string|null;
  payment:"NOT_STARTED"|"SIMULATED_PAYMENT_CONFIRMED";
  paymentSimulatedAt:string|null;
};
export const EMPTY_DEMO_PAYMENT:DemoPaymentState={
  buyer:"PENDING",kirana:"PENDING",supplier:"PENDING",supplierAcceptedAt:null,
  payment:"NOT_STARTED",paymentSimulatedAt:null,
};
export function isDemoProposalExpired(now:number,expiresAt=DEMO_PROPOSAL_EXPIRES_AT){
  const expiry=Date.parse(expiresAt);
  return !Number.isFinite(expiry)||now>=expiry;
}
export function acceptDemoSupplier(s:DemoPaymentState,now:number){
  if(isDemoProposalExpired(now))return {...s,supplier:"EXPIRED" as const};
  if(s.supplier!=="PENDING")return s;
  return {...s,supplier:"ACCEPTED" as const,supplierAcceptedAt:new Date(now).toISOString()};
}
export function rejectDemoSupplier(s:DemoPaymentState,now:number){
  if(isDemoProposalExpired(now))return {...s,supplier:"EXPIRED" as const};
  if(s.supplier!=="PENDING")return s;
  return {...s,supplier:"REJECTED" as const,supplierAcceptedAt:null};
}
export function simulateDemoPayment(s:DemoPaymentState,now:number){
  if(isDemoProposalExpired(now)||s.buyer!=="ACCEPTED"||s.kirana!=="ACCEPTED"||s.supplier!=="ACCEPTED"||s.payment!=="NOT_STARTED")return s;
  return {...s,payment:"SIMULATED_PAYMENT_CONFIRMED" as const,paymentSimulatedAt:new Date(now).toISOString()};
}
export function loadDemoPaymentState():DemoPaymentState{
  try{
    const raw=localStorage.getItem(DEMO_STORAGE_KEY);
    if(!raw)return EMPTY_DEMO_PAYMENT;
    const s=JSON.parse(raw) as DemoPaymentState;
    const allowed:DemoHumanStatus[]=["PENDING","ACCEPTED","REJECTED","EXPIRED"];
    if(!allowed.includes(s.buyer)||!allowed.includes(s.kirana)||!allowed.includes(s.supplier))return EMPTY_DEMO_PAYMENT;
    if(s.payment!=="NOT_STARTED"&&s.payment!=="SIMULATED_PAYMENT_CONFIRMED")return EMPTY_DEMO_PAYMENT;
    if(typeof s.supplierAcceptedAt!=="string"&&s.supplierAcceptedAt!==null)return EMPTY_DEMO_PAYMENT;
    if(typeof s.paymentSimulatedAt!=="string"&&s.paymentSimulatedAt!==null)return EMPTY_DEMO_PAYMENT;
    return s;
  }catch{return EMPTY_DEMO_PAYMENT}
}

type Snapshot={state:DemoPaymentState;ready:boolean};
const EMPTY_SNAPSHOT:Snapshot={state:EMPTY_DEMO_PAYMENT,ready:false};
let snapshot=EMPTY_SNAPSHOT;
let initialized=false;
const listeners=new Set<()=>void>();
function notify(){for(const listener of listeners)listener()}
function initialize(){
 if(initialized||typeof window==="undefined")return;
 snapshot={state:loadDemoPaymentState(),ready:true};
 initialized=true;
}
function subscribe(listener:()=>void){
 listeners.add(listener);
 initialize();
 const onStorage=(event:StorageEvent)=>{if(event.key===DEMO_STORAGE_KEY){snapshot={state:loadDemoPaymentState(),ready:true};initialized=true;notify()}};
 window.addEventListener("storage",onStorage);
 notify();
 return()=>{listeners.delete(listener);window.removeEventListener("storage",onStorage)};
}
function getSnapshot(){return snapshot}
function getServerSnapshot(){return EMPTY_SNAPSHOT}
export function useDemoPaymentState(){
 const current=useSyncExternalStore(subscribe,getSnapshot,getServerSnapshot);
 function update(next:DemoPaymentState|((s:DemoPaymentState)=>DemoPaymentState)){
  initialize();
  const state=typeof next==="function"?next(snapshot.state):next;
  localStorage.setItem(DEMO_STORAGE_KEY,JSON.stringify(state));
  snapshot={state,ready:true};initialized=true;notify();
 }
 return {...current,setState:update};
}
