import { google, calendar_v3 } from "googleapis";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceAccessContext } from "@/lib/workspace/access-control";
import { getAuthorizedGoogleOAuthClient } from "@/lib/google/calendar";
import {
  classifyGoogleCalendarError,
  getGoogleErrorStatus,
  type GoogleCalendarErrorClass,
} from "@/lib/google/errors";
import {
  googleConnectionAuditDetails,
  logGoogleAudit,
} from "@/lib/google/audit";

type CalendarScope = "mine" | "program";

type SyncedEventRow = {
  id: string;
  call_assignment_id: string | null;
  provider_event_id: string | null;
  provider_calendar_id: string | null;
};

type CallRow = {
  id: string;
  program_id: string | null;
  roster_id: string | null;
  program_membership_id: string | null;
  call_type: string | null;
  call_date: string | null;
  start_datetime: string | null;
  end_datetime: string | null;
  site: string | null;
  is_home_call: boolean | null;
  notes: string | null;
  program_memberships:
    | { display_name: string | null }
    | { display_name: string | null }[]
    | null;
};

type ReconciliationIssue = {
  callAssignmentId?: string | null;
  eventId?: string | null;
  errorClass: GoogleCalendarErrorClass;
  message: string;
  status: number | null;
};

type ReconciliationSummary = {
  skipped: boolean;
  reason?: string;
  scope?: CalendarScope;
  created: number;
  updated: number;
  deleted: number;
  errors: ReconciliationIssue[];
};

function isDev() {
  return process.env.NODE_ENV !== "production";
}

function logSync(label: string, details?: Record<string, unknown>) {
  if (!isDev()) return;
  const payload = details ? ` ${JSON.stringify(details)}` : "";
  console.info(`[google-calendar-sync] ${label}${payload}`);
}

function addOneDay(dateString: string) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function normalizeMembership(membership: CallRow["program_memberships"]) {
  if (!membership) return null;
  if (Array.isArray(membership)) return membership[0] ?? null;
  return membership;
}

function toSummary(
  scope: CalendarScope,
  call: CallRow
) {
  const membership = normalizeMembership(call.program_memberships);
  const residentName = membership?.display_name ?? "Unknown Resident";

  return scope === "mine"
    ? `${call.call_type ?? "Call"} Call`
    : `${residentName} — ${call.call_type ?? "Call"} Call`;
}

function buildEventPayload(scope: CalendarScope, call: CallRow): calendar_v3.Schema$Event | null {
  const eventPayload: calendar_v3.Schema$Event = {
    summary: toSummary(scope, call),
    description: [
      "Created by SnapOrtho Workspace.",
      call.site ? `Site: ${call.site}` : null,
      call.is_home_call ? "Home Call" : null,
      call.notes ? `Notes: ${call.notes}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
    location: call.site ?? undefined,
    extendedProperties: {
      private: {
        snaportho_call_assignment_id: call.id,
        snaportho_sync_scope: scope,
      },
    },
  };

  if (call.call_date) {
    eventPayload.start = { date: call.call_date };
    eventPayload.end = { date: addOneDay(call.call_date) };
    return eventPayload;
  }

  if (call.start_datetime && call.end_datetime) {
    eventPayload.start = { dateTime: call.start_datetime };
    eventPayload.end = { dateTime: call.end_datetime };
    return eventPayload;
  }

  return null;
}

async function deleteGoogleEventSafely(params: {
  calendar: ReturnType<typeof google.calendar>;
  calendarId: string;
  eventId: string;
}) {
  try {
    await params.calendar.events.delete({
      calendarId: params.calendarId,
      eventId: params.eventId,
    });

    return true;
  } catch (error) {
    const errorClass = classifyGoogleCalendarError(error);
    if (errorClass === "event_missing") {
      return true;
    }

    throw error;
  }
}

function classifyScope(value: string | null | undefined): CalendarScope | null {
  return value === "program" || value === "mine" ? value : null;
}

async function inferScopeFromExistingRows(params: {
  userId: string;
  programId: string;
  connectionId: string;
  programMembershipId: string | null;
}) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("synced_call_events")
    .select(
      `
        call_assignment_id,
        call_assignments (
          program_membership_id
        )
      `
    )
    .eq("user_id", params.userId)
    .eq("program_id", params.programId)
    .eq("connection_id", params.connectionId)
    .eq("provider", "google")
    .eq("sync_target", "user");

  if (error) {
    throw new Error(`Failed inferring Google sync scope: ${error.message}`);
  }

  const rows = (data ?? []) as Array<{
    call_assignment_id: string | null;
    call_assignments:
      | { program_membership_id: string | null }
      | { program_membership_id: string | null }[]
      | null;
  }>;

  const hasProgramWideRow = rows.some((row) => {
    const call = Array.isArray(row.call_assignments)
      ? row.call_assignments[0]
      : row.call_assignments;

    return Boolean(
      call?.program_membership_id &&
        params.programMembershipId &&
        call.program_membership_id !== params.programMembershipId
    );
  });

  return hasProgramWideRow ? "program" : "mine";
}

async function loadCallsForReconciliation(params: {
  programId: string;
  scope: CalendarScope;
  programMembershipId: string | null;
  rosterId?: string | null;
  relevantCallAssignmentIds: string[];
}) {
  if (params.relevantCallAssignmentIds.length === 0) {
    return [] as CallRow[];
  }

  const supabase = createAdminClient();
  let query = supabase
    .from("call_assignments")
    .select(
      `
        id,
        program_id,
        roster_id,
        program_membership_id,
        call_type,
        call_date,
        start_datetime,
        end_datetime,
        site,
        is_home_call,
        notes,
        program_memberships (
          display_name
        )
      `
    )
    .eq("program_id", params.programId)
    .in("id", params.relevantCallAssignmentIds);

  if (params.scope === "mine") {
    const rosterId = params.rosterId ?? null;
    if (rosterId) {
      query = query.eq("roster_id", rosterId);
    } else if (params.programMembershipId) {
      query = query.eq("program_membership_id", params.programMembershipId);
    }
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed loading calls for Google reconciliation: ${error.message}`);
  }

  return (data ?? []) as CallRow[];
}

export async function reconcileGoogleCalendarForUser(
  userId: string,
  options?: {
    programId?: string | null;
    affectedCallAssignmentIds?: string[];
    scope?: CalendarScope;
    source?: string;
  }
): Promise<ReconciliationSummary> {
  const startedAt = Date.now();
  const userIdPrefix = userId.slice(0, 8);
  const affectedIds = Array.from(new Set((options?.affectedCallAssignmentIds ?? []).filter(Boolean)));

  logSync("reconcile.start", {
    userIdPrefix,
    source: options?.source ?? null,
    affectedCallCount: affectedIds.length,
  });

  const supabase = createAdminClient();

  const { accessContext, membership, roster } = await getWorkspaceAccessContext({
    userId,
    programId: options?.programId ?? undefined,
  });

  if (!accessContext?.programId || !membership?.id) {
    return {
      skipped: true,
      reason: "No active workspace context",
      created: 0,
      updated: 0,
      deleted: 0,
      errors: [],
    };
  }

  const { data: syncSettings, error: syncSettingsError } = await supabase
    .from("user_calendar_sync_settings")
    .select("id, user_id, program_id, connection_id, enabled, scope")
    .eq("user_id", userId)
    .eq("program_id", accessContext.programId)
    .eq("provider", "google")
    .maybeSingle();

  if (syncSettingsError) {
    throw new Error(`Failed loading Google sync settings: ${syncSettingsError.message}`);
  }

  if (!syncSettings?.enabled) {
    return {
      skipped: true,
      reason: "Google sync is not enabled",
      created: 0,
      updated: 0,
      deleted: 0,
      errors: [],
    };
  }

  const { data: connection, error: connectionError } = await supabase
    .from("user_calendar_connections")
    .select("id, user_id, provider_account_email, access_token, refresh_token, calendar_id")
    .eq("user_id", userId)
    .eq("provider", "google")
    .maybeSingle();

  if (connectionError) {
    throw new Error(`Failed loading Google connection: ${connectionError.message}`);
  }

  if (!connection?.calendar_id) {
    return {
      skipped: true,
      reason: "Google calendar is not connected",
      created: 0,
      updated: 0,
      deleted: 0,
      errors: [],
    };
  }

  if (syncSettings.connection_id !== connection.id) {
    return {
      skipped: true,
      reason: "Google sync settings belong to a different connection",
      created: 0,
      updated: 0,
      deleted: 0,
      errors: [],
    };
  }

  logGoogleAudit(
    "reconcile.connection",
    googleConnectionAuditDetails(connection)
  );
  logGoogleAudit("reconcile.settings", {
    settingsId: syncSettings.id,
    selectedCalendarId: connection.calendar_id,
    userId,
    programId: accessContext.programId,
  });

  const scope =
    options?.scope ??
    classifyScope(syncSettings?.scope) ??
    (await inferScopeFromExistingRows({
      userId,
      programId: accessContext.programId,
      connectionId: connection.id,
      programMembershipId: membership.id,
    }));

  const { data: existingRows, error: existingRowsError } = await supabase
    .from("synced_call_events")
    .select("id, call_assignment_id, provider_event_id, provider_calendar_id")
    .eq("user_id", userId)
    .eq("program_id", accessContext.programId)
    .eq("connection_id", connection.id)
    .eq("provider", "google")
    .eq("sync_target", "user");

  if (existingRowsError) {
    throw new Error(`Failed loading synced call events: ${existingRowsError.message}`);
  }

  const syncedRows = (existingRows ?? []) as SyncedEventRow[];
  const relevantCallAssignmentIds = Array.from(
    new Set([
      ...syncedRows.map((row) => row.call_assignment_id).filter(Boolean),
      ...affectedIds,
    ])
  ) as string[];

  const currentCalls = await loadCallsForReconciliation({
    programId: accessContext.programId,
    scope,
    programMembershipId: membership.id,
    rosterId: roster?.id ?? null,
    relevantCallAssignmentIds,
  });

  const callsById = new Map(currentCalls.map((call) => [call.id, call]));
  const rowsByCallId = new Map(
    syncedRows
      .filter((row) => row.call_assignment_id)
      .map((row) => [row.call_assignment_id as string, row])
  );

  const oauth2Client = getAuthorizedGoogleOAuthClient(connection);

  const calendar = google.calendar({
    version: "v3",
    auth: oauth2Client,
  });

  let created = 0;
  let updated = 0;
  let deleted = 0;
  const errors: ReconciliationIssue[] = [];
  const nowIso = new Date().toISOString();
  const staleRowIdsToDelete = new Set<string>();

  for (const row of syncedRows) {
    const callId = row.call_assignment_id ?? null;
    const call = callId ? callsById.get(callId) ?? null : null;

    if (!row.provider_event_id) {
      if (row.id) staleRowIdsToDelete.add(row.id);
      continue;
    }

    const calendarId =
      row.provider_calendar_id || connection.calendar_id || "primary";

    if (!call) {
      try {
        await deleteGoogleEventSafely({
          calendar,
          calendarId,
          eventId: row.provider_event_id,
        });
        deleted += 1;
      } catch (error) {
        errors.push({
          callAssignmentId: callId,
          eventId: row.provider_event_id,
          errorClass: classifyGoogleCalendarError(error),
          message: error instanceof Error ? error.message : "Failed deleting stale event",
          status: getGoogleErrorStatus(error),
        });
      }

      if (row.id) staleRowIdsToDelete.add(row.id);
      continue;
    }

    const payload = buildEventPayload(scope, call);
    if (!payload) continue;

    try {
      const result = await calendar.events.update({
        calendarId,
        eventId: row.provider_event_id,
        requestBody: payload,
      });

      updated += 1;

      await supabase
        .from("synced_call_events")
        .update({
          provider_event_id: result.data.id ?? row.provider_event_id,
          provider_calendar_id: connection.calendar_id,
          synced_at: nowIso,
          sync_enabled: true,
        })
        .eq("id", row.id)
        .eq("user_id", userId)
        .eq("program_id", accessContext.programId)
        .eq("connection_id", connection.id);
    } catch (error) {
      const errorClass = classifyGoogleCalendarError(error);

      if (errorClass === "event_missing") {
        try {
          const createdEvent = await calendar.events.insert({
            calendarId: connection.calendar_id,
            requestBody: payload,
          });

          created += 1;

          await supabase
            .from("synced_call_events")
            .upsert(
              {
                id: row.id,
                call_assignment_id: call.id,
                user_id: userId,
                connection_id: connection.id,
                provider: "google",
                provider_event_id: createdEvent.data.id ?? null,
                provider_calendar_id: connection.calendar_id,
                sync_target: "user",
                synced_at: nowIso,
                program_id: accessContext.programId,
                sync_enabled: true,
              },
              {
                onConflict:
                  "user_id,connection_id,program_id,call_assignment_id,provider,sync_target",
              }
            );
          continue;
        } catch (createError) {
          errors.push({
            callAssignmentId: call.id,
            eventId: row.provider_event_id,
            errorClass: classifyGoogleCalendarError(createError),
            message:
              createError instanceof Error
                ? createError.message
                : "Failed recreating missing event",
            status: getGoogleErrorStatus(createError),
          });
          continue;
        }
      }

      errors.push({
        callAssignmentId: call.id,
        eventId: row.provider_event_id,
        errorClass,
        message: error instanceof Error ? error.message : "Failed updating Google event",
        status: getGoogleErrorStatus(error),
      });
    }
  }

  for (const call of currentCalls) {
    if (rowsByCallId.has(call.id)) continue;

    const payload = buildEventPayload(scope, call);
    if (!payload) continue;

    try {
      const createdEvent = await calendar.events.insert({
        calendarId: connection.calendar_id,
        requestBody: payload,
      });

      await supabase
        .from("synced_call_events")
        .upsert(
          {
            call_assignment_id: call.id,
            user_id: userId,
            connection_id: connection.id,
            provider: "google",
            provider_event_id: createdEvent.data.id ?? null,
            provider_calendar_id: connection.calendar_id,
            sync_target: "user",
            synced_at: nowIso,
            program_id: accessContext.programId,
            sync_enabled: true,
          },
          {
            onConflict:
              "user_id,connection_id,program_id,call_assignment_id,provider,sync_target",
          }
        );

      created += 1;
    } catch (error) {
      errors.push({
        callAssignmentId: call.id,
        errorClass: classifyGoogleCalendarError(error),
        message: error instanceof Error ? error.message : "Failed creating Google event",
        status: getGoogleErrorStatus(error),
      });
    }
  }

  if (staleRowIdsToDelete.size > 0) {
    await supabase
      .from("synced_call_events")
      .delete()
      .in("id", Array.from(staleRowIdsToDelete))
      .eq("user_id", userId)
      .eq("program_id", accessContext.programId)
      .eq("connection_id", connection.id);
  }

  const hasErrors = errors.length > 0;
  await supabase
    .from("user_calendar_sync_settings")
    .update({
      scope,
      last_error: hasErrors ? errors[0]?.message ?? null : null,
      last_error_at: hasErrors ? nowIso : null,
      last_success_at: hasErrors ? null : nowIso,
      updated_at: nowIso,
    })
    .eq("user_id", userId)
    .eq("program_id", accessContext.programId)
    .eq("connection_id", connection.id)
    .eq("provider", "google");

  logSync("reconcile.finish", {
    userIdPrefix,
    scope,
    calendarIdPrefix: connection.calendar_id?.slice(0, 12) ?? null,
    created,
    updated,
    deleted,
    errorCount: errors.length,
    durationMs: Date.now() - startedAt,
  });

  return {
    skipped: false,
    scope,
    created,
    updated,
    deleted,
    errors,
  };
}

export function triggerGoogleCalendarReconciliation(params: {
  userIds: Array<string | null | undefined>;
  programId?: string | null;
  affectedCallAssignmentIds?: string[];
  source?: string;
}) {
  const userIds = Array.from(new Set(params.userIds.filter(Boolean))) as string[];
  const affectedCallAssignmentIds = Array.from(
    new Set((params.affectedCallAssignmentIds ?? []).filter(Boolean))
  );

  for (const userId of userIds) {
    void reconcileGoogleCalendarForUser(userId, {
      programId: params.programId ?? null,
      affectedCallAssignmentIds,
      source: params.source,
    }).catch((error) => {
      logSync("reconcile.error", {
        userIdPrefix: userId.slice(0, 8),
        programId: params.programId ?? null,
        source: params.source ?? null,
        errorClass: classifyGoogleCalendarError(error),
        message: error instanceof Error ? error.message : "Unknown reconciliation error",
      });
    });
  }
}

// Legacy alias for older imports. New code should use reconcileGoogleCalendarForUser.
export const syncGoogleCalendarAfterCallChange = reconcileGoogleCalendarForUser;
