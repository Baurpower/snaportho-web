import { requireWorkspaceAccess } from "@/lib/workspace/require-workspace-access";
import SettingsClient from "./settingsclient";

export default async function SettingsPage() {
  await requireWorkspaceAccess();
 
  return <SettingsClient />;
}