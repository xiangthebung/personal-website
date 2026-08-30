import { PolicyPage, policyMetadata } from "../../policy-page";

const SLUG = "totem/privacy";

export const metadata = policyMetadata(SLUG);

export default function Page() {
  return <PolicyPage slug={SLUG} />;
}
