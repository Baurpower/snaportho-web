import { redirect } from "next/navigation";
import { requireWorkspaceAccess } from "@/lib/workspace/require-workspace-access";
import SettingsClient from "./settingsclient";

export default async function SettingsPage() {
  const access = await requireWorkspaceAccess({
    allowUnlinkedRoster: true,
  });

  if (!access.permissions.canManageProgramSettings) {
    redirect("/work");
  }

  return <SettingsClient />;
}
