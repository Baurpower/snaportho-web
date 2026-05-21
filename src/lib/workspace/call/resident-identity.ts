export type CanonicalResidentIdentityLike = {
  residentId?: string | null;
  rosterId?: string | null;
  membershipId?: string | null;
  programMembershipId?: string | null;
};

function normalizeString(value: unknown) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeScheduleResidentId(value: unknown) {
  return normalizeString(value);
}

export function getCanonicalResidentId(
  value: CanonicalResidentIdentityLike | null | undefined
) {
  if (!value) return null;

  return (
    normalizeScheduleResidentId(value.residentId) ??
    normalizeScheduleResidentId(value.rosterId) ??
    normalizeScheduleResidentId(value.membershipId) ??
    null
  );
}

export function getProgramMembershipId(
  value: CanonicalResidentIdentityLike | null | undefined
) {
  if (!value) return null;

  return normalizeString(value.programMembershipId) ?? null;
}

export function buildResidentIdentityMaps<T extends CanonicalResidentIdentityLike>(
  residents: T[]
) {
  const residentById = new Map<string, T>();
  const residentIdByProgramMembershipId = new Map<string, string>();

  for (const resident of residents) {
    const residentId = getCanonicalResidentId(resident);
    const programMembershipId = getProgramMembershipId(resident);

    if (residentId && !residentById.has(residentId)) {
      residentById.set(residentId, resident);
    }

    if (residentId && programMembershipId) {
      residentIdByProgramMembershipId.set(programMembershipId, residentId);
    }
  }

  return {
    residentById,
    residentIdByProgramMembershipId,
  };
}
