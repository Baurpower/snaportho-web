import { requireWorkspaceAccess } from "@/lib/workspace/require-workspace-access";
import TimeOffHubClient from "./timeoffclient";

export default async function TimeOffPage() {
  await requireWorkspaceAccess();

  return <TimeOffHubClient />;
}