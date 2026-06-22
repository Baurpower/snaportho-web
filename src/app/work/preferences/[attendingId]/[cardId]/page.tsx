import { requireWorkspaceAccess } from "@/lib/workspace/access-control";
import { PreferenceCardClient } from "./PreferenceCardClient";

export default async function PreferenceCardPage({
  params,
}: {
  params: Promise<{ attendingId: string; cardId: string }>;
}) {
  await requireWorkspaceAccess();
  const { attendingId, cardId } = await params;
  return <PreferenceCardClient attendingId={attendingId} cardId={cardId} />;
}
