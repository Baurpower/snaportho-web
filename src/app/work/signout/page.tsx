import { createAdminClient } from "@/lib/supabase/admin";
import {
  getWorkspaceAccessContext,
  requireWorkspaceAccess,
} from "@/lib/workspace/access-control";
import { listServices } from "@/lib/workspace/signout/repository";
import { SignoutBoard } from "@/components/workspace/signout/SignoutBoard";
import {
  PREVIEW_CARDS,
  PREVIEW_SERVICES,
} from "@/components/workspace/signout/fixtures";

export default async function SignoutPage({
  searchParams,
}: {
  searchParams?: Promise<{ preview?: string }>;
}) {
  const preview =
    process.env.NODE_ENV !== "production" && (await searchParams)?.preview === "1";
  if (preview) {
    return (
      <SignoutBoard
        initialServices={PREVIEW_SERVICES}
        programId="prog-demo"
        currentUserId="demo-user"
        currentUserName="You"
        preview
        previewCards={PREVIEW_CARDS}
      />
    );
  }

  const { user } = await requireWorkspaceAccess();
  const { membership } = await getWorkspaceAccessContext({ userId: user.id });
  const programId = membership?.program_id ?? null;

  const services = programId
    ? await listServices(createAdminClient(), programId)
    : [];

  return (
    <SignoutBoard
      initialServices={services}
      programId={programId}
      currentUserId={user.id}
      currentUserName={membership?.display_name ?? "You"}
    />
  );
}
