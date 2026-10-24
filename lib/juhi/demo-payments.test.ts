import{describe,expect,it}from"vitest";
import{acceptDemoSupplier,DEMO_PROPOSAL_EXPIRES_AT,DEMO_RECEIPT,EMPTY_DEMO_PAYMENT,formatDemoTimestamp,isDemoProposalExpired,rejectDemoSupplier,simulateDemoPayment}from"./demo-payments";

const now=Date.parse("2026-10-24T12:00:00.000Z");
describe("isolated demo approvals and payment",()=>{
 it("keeps proposal viability separate from sample human approval and stores an approval timestamp",()=>{
  const accepted=acceptDemoSupplier(EMPTY_DEMO_PAYMENT,now);
  expect(accepted.supplier).toBe("ACCEPTED");
  expect(accepted.supplierAcceptedAt).toBe(new Date(now).toISOString());
  expect(acceptDemoSupplier(accepted,now+1000)).toEqual(accepted);
 });
 it("preserves rejected status and never marks rejection as acceptance",()=>{
  expect(rejectDemoSupplier(EMPTY_DEMO_PAYMENT,now)).toMatchObject({supplier:"REJECTED",supplierAcceptedAt:null});
 });
 it("fails closed for expired or invalid proposals",()=>{
  expect(isDemoProposalExpired(Date.parse(DEMO_PROPOSAL_EXPIRES_AT))).toBe(true);
  expect(isDemoProposalExpired(now,"not-a-date")).toBe(true);
  expect(acceptDemoSupplier(EMPTY_DEMO_PAYMENT,Date.parse(DEMO_PROPOSAL_EXPIRES_AT))).toMatchObject({supplier:"EXPIRED",supplierAcceptedAt:null});
 });
 it("only simulates payment after all human sample approvals and only once",()=>{
  expect(simulateDemoPayment(EMPTY_DEMO_PAYMENT,now)).toEqual(EMPTY_DEMO_PAYMENT);
  const all={...EMPTY_DEMO_PAYMENT,buyer:"ACCEPTED" as const,kirana:"ACCEPTED" as const,supplier:"ACCEPTED" as const};
  const receipt=simulateDemoPayment(all,now);
  expect(receipt).toMatchObject({payment:"SIMULATED_PAYMENT_CONFIRMED",paymentSimulatedAt:new Date(now).toISOString()});
  expect(simulateDemoPayment(receipt,now+1000)).toEqual(receipt);
 });
 it("labels the ₹1 receipt as sample data without any payment-provider transaction reference",()=>{
  expect(DEMO_RECEIPT).toMatchObject({amountPaise:100,recipient:"Juhi Dugar",reference:"DEMO-MB-0001",sampleLabel:"SAMPLE PAYMENT — NOT A REAL TRANSACTION"});
  expect(JSON.stringify(DEMO_RECEIPT)).not.toMatch(/UTR|providerTransactionId|genuine/i);
  expect(DEMO_RECEIPT.disclaimer).toBe("No actual payment was processed for this demonstration.");
 });
 it("formats timestamps in a fixed India timezone for identical server and browser hydration",()=>{
  expect(formatDemoTimestamp("2026-10-24T00:00:00.000Z")).toContain("24 Oct 2026");
  expect(formatDemoTimestamp("2026-10-24T00:00:00.000Z")).toContain("5:30 am");
 });
});
