type GoogleAuditDetails = Record<string, unknown>;

export function logGoogleAudit(
  event: string,
  details: GoogleAuditDetails = {}
) {
  console.info(`[google-calendar-audit] ${event}`, details);
}

export function googleConnectionAuditDetails(connection: {
  id?: string | null;
  user_id?: string | null;
  provider_account_email?: string | null;
}) {
  return {
    connectionId: connection.id ?? null,
    googleAccountEmail: connection.provider_account_email ?? null,
    ownerUserId: connection.user_id ?? null,
  };
}
