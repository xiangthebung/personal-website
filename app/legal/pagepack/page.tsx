import { ProjectPolicyIndex, projectPolicyMetadata } from "../project-page";

const PROJECT = "pagepack";

export const metadata = projectPolicyMetadata(PROJECT);

export default function Page() {
  return <ProjectPolicyIndex projectId={PROJECT} />;
}
