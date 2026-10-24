import Link from "next/link";
import {DemoExperience} from "@/components/DemoExperience";
import {PageHead} from "@/components/PageHead";

export const metadata={title:"Interactive sample demo"};
export default function DemoPage(){
 return <><PageHead tag="Separate sample environment" title="See a neighbourhood deal take shape"><p>This walkthrough is illustrative. All names, quantities, suppliers and prices are demo data—not real buyers, offers, savings, orders, payments or AgenticOrg runs.</p><Link className="btn-yellow mt-3 inline-block" href="/access">Real account sign in — role-provisioned</Link></PageHead><DemoExperience/></>
}
