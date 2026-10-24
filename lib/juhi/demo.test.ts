import {describe,expect,it} from "vitest";
import {DEMO_SAMPLE,evaluateDemo} from "./demo";

describe("isolated synthetic demo economics (paise)",()=>{
  it("reproduces the explicitly labelled 18+62 sample scenario without double counting",()=>{
    const buyer=DEMO_SAMPLE.kiranas.reduce((n,k)=>n+k.buyerUnits,0);
    const restock=DEMO_SAMPLE.kiranas.reduce((n,k)=>n+k.independentRestock,0);
    const r=evaluateDemo({buyerUnits:buyer,independentRestock:restock,freightIncreasePaise:0,kiranaApproved:true});
    expect([buyer,restock,r.combinedUnits]).toEqual([18,62,80]);
    expect(r).toMatchObject({decision:"PROPOSE",selectedSupplier:"Supplier A (sample)",landedUnitPaise:9500,savingsPerUnitPaise:2000,totalProcurementSavingsPaise:160000,consumerSavingsPaise:27000,merchantBenefitPaise:133000});
  });
  it("rejects Supplier A below MOQ; neither higher-MOQ quote qualifies at 45",()=>{
    expect(evaluateDemo({buyerUnits:18,independentRestock:27,freightIncreasePaise:0,kiranaApproved:true}))
      .toMatchObject({combinedUnits:45,selectedSupplier:null,decision:"NO_DEAL",consumerSavingsPaise:0});
  });
  it("returns NO_DEAL when added illustrative freight erases savings",()=>{
    expect(evaluateDemo({buyerUnits:18,independentRestock:62,freightIncreasePaise:2300,kiranaApproved:true}))
      .toMatchObject({selectedSupplier:"Supplier A (sample)",decision:"NO_DEAL",landedUnitPaise:11800});
    expect(evaluateDemo({buyerUnits:18,independentRestock:62,freightIncreasePaise:3300,kiranaApproved:true}))
      .toMatchObject({decision:"NO_DEAL"});
    expect(evaluateDemo({buyerUnits:18,independentRestock:62,freightIncreasePaise:0,kiranaApproved:false})
      .decision).toBe("BLOCKED");
    expect(evaluateDemo({buyerUnits:0,independentRestock:45,freightIncreasePaise:9000,kiranaApproved:true}))
      .toMatchObject({decision:"NO_DEAL",selectedSupplier:null});
  });
  it("blocks progressing the sample deal until a kirana accepts",()=>{
    expect(evaluateDemo({buyerUnits:18,independentRestock:62,freightIncreasePaise:0,kiranaApproved:false}).decision).toBe("BLOCKED");
  });
  it("calculates the intended no-MOQ case when the independent-restock pool is small",()=>{
    expect(evaluateDemo({buyerUnits:18,independentRestock:27,freightIncreasePaise:10000,kiranaApproved:true}).decision).toBe("NO_DEAL");
  });
});
