import {
  getWorkspaceAccessContext,
  WorkspacePermissionError,
} from "@/lib/workspace/access-control";

export function parseRequestedProgramId(
  searchParams: URLSearchParams
): string | null {
  const raw = searchParams.get("programId");
  if (!raw) return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function resolveNotificationProgramScope(params: {
  userId: string;
  requestedProgramId?: string | null;
}) {
  const requested = params.requestedProgramId?.trim() || null;
  const { accessContext } = await getWorkspaceAccessContext({
    userId: params.userId,
    programId: requested,
  });

  if (!accessContext?.programId) {
    throw new WorkspacePermissionError("No active workspace access found.", 403);
  }

  if (requested && accessContext.programId !== requested) {
    throw new WorkspacePermissionError(
      "You do not have access to this workspace program.",
      403
    );
  }

  return {
    programId: accessContext.programId,
  };
}