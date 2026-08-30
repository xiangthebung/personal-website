import { PolicyPage, policyMetadata } from "../../policy-page";

const SLUG = "byte-budget/terms";

export const metadata = policyMetadata(SLUG);

export default function Page() {
  return <PolicyPage slug={SLUG} />;
}
