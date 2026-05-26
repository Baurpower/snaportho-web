import { requireWorkspaceAccess } from "@/lib/workspace/require-workspace-access";
import CallSwapsDashboardClient from "./swapsdashboardclient";

export default async function CallSwapsPage() {
  await requireWorkspaceAccess();

  return <CallSwapsDashboardClient />;
}
