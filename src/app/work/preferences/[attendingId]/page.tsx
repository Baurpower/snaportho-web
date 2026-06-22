import { requireWorkspaceAccess } from "@/lib/workspace/access-control";
import { AttendingDetailClient } from "./AttendingDetailClient";

export default async function AttendingDetailPage({
  params,
}: {
  params: Promise<{ attendingId: string }>;
}) {
  await requireWorkspaceAccess();
  const { attendingId } = await params;
  return <AttendingDetailClient attendingId={attendingId} />;
}
