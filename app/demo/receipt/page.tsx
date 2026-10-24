import{PageHead}from"@/components/PageHead";
import{SampleReceipt}from"@/components/SampleReceipt";
export const metadata={title:"Sample payment receipt — Molbhav.AI"};
export default function SampleReceiptPage(){return <><PageHead tag="SAMPLE PAYMENT" title="Your demo receipt"><p>All receipt details below are simulated; this view is not evidence of a real payment.</p></PageHead><SampleReceipt/></>}
