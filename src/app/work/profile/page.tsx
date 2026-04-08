import { requireWorkspaceAccess } from "@/lib/workspace/require-workspace-access";
import ProfileClient from "./profileclient";

export default async function ProfilePage() {
  await requireWorkspaceAccess();
 
  return <ProfileClient />;
}