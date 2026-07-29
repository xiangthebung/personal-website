import { PolicyPage, policyMetadata } from "../../policy-page";

const SLUG = "grt-next-bus/privacy";

export const metadata = policyMetadata(SLUG);

export default function Page() {
  return <PolicyPage slug={SLUG} />;
}
