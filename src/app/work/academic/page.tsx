import { requireWorkspaceAccess } from "@/lib/workspace/require-workspace-access";
import AcademicHomeClient from "./academichomeclient";

export default async function AcademicPage() {
  await requireWorkspaceAccess();

  return <AcademicHomeClient />;
}