import { requireWorkspaceAccess } from "@/lib/workspace/access-control";
import { PreferencesLandingClient } from "./PreferencesLandingClient";

export default async function PreferencesPage() {
  await requireWorkspaceAccess();
  return <PreferencesLandingClient />;
}
