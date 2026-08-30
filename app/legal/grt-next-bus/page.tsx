import { ProjectPolicyIndex, projectPolicyMetadata } from "../project-page";

const PROJECT = "grt-next-bus";

export const metadata = projectPolicyMetadata(PROJECT);

export default function Page() {
  return <ProjectPolicyIndex projectId={PROJECT} />;
}
