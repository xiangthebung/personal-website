import { PolicyPage, policyMetadata } from "../../policy-page";

const SLUG = "pagepack/privacy";

export const metadata = policyMetadata(SLUG);

export default function Page() {
  return <PolicyPage slug={SLUG} />;
}
