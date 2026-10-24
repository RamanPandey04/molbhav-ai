/**
 * Deliberately separate, immutable DEMO fixture. It never reaches Supabase,
 * the authenticated API client, or real revenue and payment metrics.
 * All monetary amounts and calculations use integer paise.
 */
export const DEMO_SAMPLE = Object.freeze({
  label: "INTERACTIVE DEMO — SAMPLE DATA",
  zone: "Sample Neighbourhood Zone",
  product: { brand: "DEMO BRAND", name: "Dishwash Gel", packSize: "500 ml", sku: "DEMO-SKU-500ML" },
  households: 18,
  kiranas: [
    { id: "demo-kirana-01", buyerUnits: 5, independentRestock: 20 },
    { id: "demo-kirana-02", buyerUnits: 4, independentRestock: 15 },
    { id: "demo-kirana-03", buyerUnits: 6, independentRestock: 12 },
    { id: "demo-kirana-04", buyerUnits: 3, independentRestock: 15 },
  ],
  baselinePurchaseCostPaise: 11500,
  retailPricePaise: 14000,
  consumerPricePaise: 12500,
  platformFeePaise: 200,
  suppliers: [
    { id: "demo-supplier-a", name: "Supplier A (sample)", unitPricePaise: 8800, freightPaise: 300, handlingPaise: 200, minOrderQuantity: 80, availableQuantity: 150, includesPlatformFee: true },
    { id: "demo-supplier-b", name: "Supplier B (sample)", unitPricePaise: 9700, freightPaise: 300, handlingPaise: 0, minOrderQuantity: 50, availableQuantity: 100, includesPlatformFee: true },
    { id: "demo-supplier-c", name: "Supplier C (sample)", unitPricePaise: 8500, freightPaise: 0, handlingPaise: 0, minOrderQuantity: 150, availableQuantity: 200, includesPlatformFee: false },
  ],
} as const);

export type DemoDecision = "PROPOSE" | "NO_DEAL" | "BLOCKED";
export type DemoSupplier = {id:string;name:string;unitPricePaise:number;freightPaise:number;handlingPaise:number;minOrderQuantity:number;availableQuantity:number;includesPlatformFee:boolean};
export interface DemoEvaluation {
  buyerUnits: number;
  independentRestock: number;
  combinedUnits: number;
  eligibleQuotes: readonly DemoSupplier[];
  supplierScores: { supplierId: string; supplier: string; landedUnitPaise: number; qualified: boolean }[];
  selectedSupplier: string | null;
  landedUnitPaise: number | null;
  savingsPerUnitPaise: number | null;
  totalProcurementSavingsPaise: number | null;
  consumerSavingsPaise: number;
  merchantBenefitPaise: number;
  decision: DemoDecision;
  reasons: string[];
}

/** Deterministic pedagogical scenario; these outputs are never real quotes. */
export function evaluateDemo(input: {
  buyerUnits: number; independentRestock: number; freightIncreasePaise: number; kiranaApproved: boolean;
  buyerApproved?: boolean; supplierApproved?: boolean;
  suppliers?: readonly DemoSupplier[];
}): DemoEvaluation {
  const buyerUnits = Math.max(0, Math.floor(input.buyerUnits));
  const independentRestock = Math.max(0, Math.floor(input.independentRestock));
  const combinedUnits = buyerUnits + independentRestock;
  const suppliers=input.suppliers??DEMO_SAMPLE.suppliers;
  const supplierScores = suppliers.map(s => {
    const landedUnitPaise=s.unitPricePaise+s.freightPaise+Math.max(0,input.freightIncreasePaise)+s.handlingPaise+(s.includesPlatformFee?DEMO_SAMPLE.platformFeePaise:0);
    return {supplierId:s.id,supplier:s.name,landedUnitPaise,qualified:combinedUnits>=s.minOrderQuantity&&combinedUnits<=s.availableQuantity};
  });
  const eligibleQuotes=suppliers.filter((s,i)=>supplierScores[i].qualified);
  const best=eligibleQuotes.map(s=>({s,landed:supplierScores.find(c=>c.supplierId===s.id)!.landedUnitPaise})).sort((a,b)=>a.landed-b.landed)[0];
  const savingsPerUnitPaise=best?DEMO_SAMPLE.baselinePurchaseCostPaise-best.landed:null;
  const humansApproved=(input.buyerApproved??true)&&input.kiranaApproved&&(input.supplierApproved??true);
  const decision:DemoDecision=!best||savingsPerUnitPaise!<=0?"NO_DEAL":!humansApproved?"BLOCKED":"PROPOSE";
  const totalProcurementSavingsPaise=best?Math.max(0,savingsPerUnitPaise!)*combinedUnits:0;
  const consumerSavingsPaise=!!best&&savingsPerUnitPaise!>0?(DEMO_SAMPLE.retailPricePaise-DEMO_SAMPLE.consumerPricePaise)*buyerUnits:0;
  const reasons:string[]=[];
  if(!best) reasons.push("Combined quantity does not meet a qualifying supplier MOQ or stock limit.");
  if(best&&savingsPerUnitPaise!<=0) reasons.push("Landed cost is not below the existing procurement baseline.");
  if(best&&savingsPerUnitPaise!>0&&!humansApproved) reasons.push("Buyer, kirana and supplier sample approvals are required; at least one is still pending or rejected.");
  if(best&&savingsPerUnitPaise!>0&&input.kiranaApproved) reasons.push("Illustrative terms are viable; this simulation does not create a real proposal.");
  const projectedBenefit=Math.max(0,totalProcurementSavingsPaise-consumerSavingsPaise);
  return {
    buyerUnits,independentRestock,combinedUnits,eligibleQuotes,supplierScores,
    selectedSupplier:best?.s.name??null,landedUnitPaise:best?.landed??null,
    savingsPerUnitPaise,totalProcurementSavingsPaise,consumerSavingsPaise,
    merchantBenefitPaise:projectedBenefit,decision,reasons,
  };
}
