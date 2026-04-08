import WorkspaceHomeClient from "./workspacehomeclient";
import { requireWorkspaceAccess } from "@/lib/workspace/require-workspace-access";

export default async function WorkPage() {
  await requireWorkspaceAccess({ updateLastEnteredAt: true });

  return <WorkspaceHomeClient />;
}