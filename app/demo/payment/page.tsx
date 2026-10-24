import{SamplePayment}from"@/components/SamplePayment";
import{PageHead}from"@/components/PageHead";
export const metadata={title:"Sample payment demonstration"};
export default function SamplePaymentPage(){return <><PageHead tag="SIMULATED ONLY" title="Sample payment screen"><p>Only local demonstration state. No real payment APIs, transactions, orders or revenue records.</p></PageHead><SamplePayment/></>}
