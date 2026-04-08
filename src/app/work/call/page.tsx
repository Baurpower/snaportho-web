import { requireWorkspaceAccess } from "@/lib/workspace/require-workspace-access";
import CallHubClient from "./callhubclient";

export default async function CallPage() {
  await requireWorkspaceAccess();

  return <CallHubClient />;
}