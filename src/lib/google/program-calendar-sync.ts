import crypto from "node:crypto";
import { google, type calendar_v3 } from "googleapis";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  decryptProgramCalendarToken,
  encryptProgramCalendarToken,
} from "./program-calendar-crypto";
import {
  validateCalendarEvent,
  type CalendarAlias,
  type ImportIssue,
} from "./program-calendar-source";

type SourceRow = {
  id: string;
  program_id: string;
  connection_id: string;
  provider_calendar_id: string;
  provider_calendar_summary: string | null;
  mode: "preview" | "active" | "paused" | "error" | "disconnected";
  effective_start: string;
  effective_end: string;
  timezone: string;
  sync_token: string | null;
  configuration_version: number;
};

type ConnectionRow = {
  id: string;
  program_id: string;
  encrypted_access_token: string | null;
  encrypted_refresh_token: string | null;
};

type SyncOptions = {
  sourceId: string;
  runType?: "preview" | "full" | "incremental" | "reconcile";
  trigger?: string;
  forceFull?: boolean;
  allowDestructiveFullApply?: boolean;
};

function googleOAuthClient(connection: ConnectionRow) {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_PROGRAM_CALENDAR_REDIRECT_URI ??
      process.env.GOOGLE_REDIRECT_URI!,
  );
  client.setCredentials({
    access_token: decryptProgramCalendarToken(
      connection.encrypted_access_token,
    ),
    refresh_token: decryptProgramCalendarToken(
      connection.encrypted_refresh_token,
    ),
  });
  client.on("tokens", (tokens) => {
    const admin = createAdminClient();
    void admin
      .from("program_calendar_connections")
      .update({
        ...(tokens.access_token
          ? {
              encrypted_access_token: encryptProgramCalendarToken(
                tokens.access_token,
              ),
            }
          : {}),
        ...(tokens.refresh_token
          ? {
              encrypted_refresh_token: encryptProgramCalendarToken(
                tokens.refresh_token,
              ),
            }
          : {}),
        ...(tokens.expiry_date
          ? { token_expiry: new Date(tokens.expiry_date).toISOString() }
          : {}),
        status: "active",
        last_token_error: null,
        last_token_error_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id)
      .eq("program_id", connection.program_id);
  });
  return client;
}

export function createProgramCalendarOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_PROGRAM_CALENDAR_REDIRECT_URI ??
      process.env.GOOGLE_REDIRECT_URI!,
  );
}

export async function listProgramGoogleCalendars(connection: ConnectionRow) {
  const calendar = google.calendar({
    version: "v3",
    auth: googleOAuthClient(connection),
  });
  const response = await calendar.calendarList.list({
    minAccessRole: "reader",
    fields: "items(id,summary,primary,accessRole,timeZone)",
  });
  return (response.data.items ?? [])
    .filter((item) => item.id)
    .map((item) => ({
      id: item.id!,
      summary: item.summary ?? "Untitled Calendar",
      primary: Boolean(item.primary),
      accessRole: item.accessRole ?? null,
      timeZone: item.timeZone ?? null,
    }));
}

function addDays(date: string, count: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + count);
  return value.toISOString().slice(0, 10);
}

function minimalEventPayload(event: calendar_v3.Schema$Event) {
  return {
    id: event.id ?? null,
    etag: event.etag ?? null,
    status: event.status ?? null,
    summary: event.summary ?? null,
    recurringEventId: event.recurringEventId ?? null,
    start: event.start
      ? {
          date: event.start.date ?? null,
          dateTime: event.start.dateTime ?? null,
          timeZone: event.start.timeZone ?? null,
        }
      : null,
    end: event.end
      ? {
          date: event.end.date ?? null,
          dateTime: event.end.dateTime ?? null,
          timeZone: event.end.timeZone ?? null,
        }
      : null,
    updated: event.updated ?? null,
  };
}

async function loadSource(sourceId: string) {
  const admin = createAdminClient();
  const { data: source, error } = await admin
    .from("program_calendar_sources")
    .select(
      "id, program_id, connection_id, provider_calendar_id, provider_calendar_summary, mode, effective_start, effective_end, timezone, sync_token, configuration_version",
    )
    .eq("id", sourceId)
    .single();
  if (error || !source)
    throw new Error(error?.message ?? "Calendar source not found");
  const { data: connection, error: connectionError } = await admin
    .from("program_calendar_connections")
    .select("id, program_id, encrypted_access_token, encrypted_refresh_token")
    .eq("id", source.connection_id)
    .eq("program_id", source.program_id)
    .single();
  if (connectionError || !connection)
    throw new Error(
      connectionError?.message ?? "Calendar connection not found",
    );
  return {
    source: source as SourceRow,
    connection: connection as ConnectionRow,
  };
}

async function loadAliases(programId: string): Promise<CalendarAlias[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("program_calendar_person_aliases")
    .select(
      "normalized_alias, roster_id, program_membership_id, active_from, active_to",
    )
    .eq("program_id", programId);
  if (error) throw new Error(error.message);
  return (data ?? []) as CalendarAlias[];
}

export async function syncProgramCalendarSource(options: SyncOptions) {
  const admin = createAdminClient();
  const { source, connection } = await loadSource(options.sourceId);
  if (source.mode === "disconnected")
    throw new Error("Calendar source is disconnected");
  const aliases = await loadAliases(source.program_id);
  const lockToken = crypto.randomUUID();
  const { data: claimed, error: claimError } = await admin.rpc(
    "claim_program_calendar_source_sync",
    { p_source_id: source.id, p_lock_token: lockToken, p_lease_seconds: 900 }
  );
  if (claimError) throw new Error(`Failed claiming calendar sync lease: ${claimError.message}`);
  if (!claimed) {
    return {
      status: "skipped",
      reason: "A calendar sync is already running",
      pageCount: 0,
      eventCount: 0,
      createdCount: 0,
      updatedCount: 0,
      deletedCount: 0,
      unchangedCount: 0,
      warningCount: 0,
      blockedCount: 0,
    };
  }
  const runType =
    options.runType ??
    (source.sync_token && !options.forceFull ? "incremental" : "full");
  const { data: run, error: runError } = await admin
    .from("program_calendar_sync_runs")
    .insert({
      source_id: source.id,
      run_type: runType,
      trigger: options.trigger ?? "manual",
      status: "running",
      configuration_version: source.configuration_version,
    })
    .select("id")
    .single();
  if (runError || !run) {
    await admin.rpc("release_program_calendar_source_sync", {
      p_source_id: source.id,
      p_lock_token: lockToken,
    });
    throw new Error(runError?.message ?? "Failed starting calendar sync run");
  }
  const startedAt = new Date().toISOString();
  await admin
    .from("program_calendar_sources")
    .update({ last_sync_started_at: startedAt })
    .eq("id", source.id);

  let pageCount = 0;
  let eventCount = 0;
  let blockedCount = 0;
  let warningCount = 0;
  let createdCount = 0;
  let updatedCount = 0;
  let deletedCount = 0;
  let unchangedCount = 0;
  let nextSyncToken: string | null = null;
  try {
    const calendar = google.calendar({
      version: "v3",
      auth: googleOAuthClient(connection),
    });
    let pageToken: string | undefined;
    do {
      const incremental = Boolean(
        source.sync_token &&
        !options.forceFull &&
        runType !== "preview" &&
        runType !== "full",
      );
      let response;
      try {
        response = await calendar.events.list({
          calendarId: source.provider_calendar_id,
          ...(incremental
            ? { syncToken: source.sync_token! }
            : {
                timeMin: `${source.effective_start}T00:00:00.000Z`,
                timeMax: `${addDays(source.effective_end, 1)}T00:00:00.000Z`,
              }),
          pageToken,
          singleEvents: true,
          showDeleted: true,
          maxResults: 2500,
        });
      } catch (error: unknown) {
        const status =
          (error as { code?: number; response?: { status?: number } }).code ??
          (error as { response?: { status?: number } }).response?.status;
        if (status === 410 && incremental) {
          await admin
            .from("program_calendar_sync_runs")
            .update({
              status: "failed",
              error_class: "sync_token_invalid",
              error_message: "Google invalidated the incremental sync token; starting a full reconciliation.",
              completed_at: new Date().toISOString(),
            })
            .eq("id", run.id);
          await admin
            .from("program_calendar_sources")
            .update({ sync_token: null })
            .eq("id", source.id);
          await admin.rpc("release_program_calendar_source_sync", {
            p_source_id: source.id,
            p_lock_token: lockToken,
          });
          return syncProgramCalendarSource({
            ...options,
            runType: "reconcile",
            forceFull: true,
          });
        }
        throw error;
      }
      pageCount += 1;
      const events = response.data.items ?? [];
      eventCount += events.length;
      for (const event of events) {
        if (!event.id) continue;
        const deleted = event.status === "cancelled";
        const validation = validateCalendarEvent({
          title: event.summary ?? "",
          startDate: event.start?.date ?? null,
          endDateExclusive: event.end?.date ?? null,
          startDateTime: event.start?.dateTime ?? null,
          endDateTime: event.end?.dateTime ?? null,
          aliases,
        });
        let issues: ImportIssue[] = deleted ? [] : validation.issues;
        const datesInWindow = validation.dates.filter(
          (date) =>
            date >= source.effective_start && date <= source.effective_end,
        );
        if (!deleted && datesInWindow.length === 0) {
          issues = [
            ...issues,
            {
              code: "outside_effective_window",
              severity: "blocked",
              message: "Event is outside the configured authority window.",
            },
          ];
        }
        if (!deleted && datesInWindow.length > 0) {
          const { data: slotRows, error: slotError } = await admin
            .from("call_assignments")
            .select("call_date, source_kind, source_calendar_source_id")
            .eq("program_id", source.program_id)
            .eq("call_type", "Primary")
            .in("call_date", datesInWindow);
          if (slotError) throw new Error(slotError.message);
          const conflictingDates = Array.from(
            new Set(
              (slotRows ?? [])
                .filter(
                  (row) =>
                    row.source_kind !== "google" ||
                    row.source_calendar_source_id !== source.id,
                )
                .map((row) => row.call_date)
                .filter(Boolean),
            ),
          );
          if (conflictingDates.length > 0) {
            issues = [
              ...issues,
              {
                code: "native_schedule_conflict",
                severity: "blocked",
                message: `Existing SnapOrtho assignments conflict on ${conflictingDates.join(", ")}.`,
              },
            ];
          }
        }
        const validationStatus = deleted
          ? "valid"
          : issues.some((issue) => issue.severity === "blocked")
            ? "blocked"
            : issues.length
              ? "warning"
              : "valid";
        if (validationStatus === "blocked") blockedCount += 1;
        if (validationStatus === "warning") warningCount += 1;
        const now = new Date().toISOString();
        const { data: prior } = await admin
          .from("program_calendar_import_events")
          .select("id, etag")
          .eq("source_id", source.id)
          .eq("provider_event_id", event.id)
          .maybeSingle();
        const { data: imported, error: importError } = await admin
          .from("program_calendar_import_events")
          .upsert(
            {
              source_id: source.id,
              provider_event_id: event.id,
              provider_recurring_event_id: event.recurringEventId ?? null,
              etag: event.etag ?? null,
              provider_status: event.status ?? null,
              raw_payload: minimalEventPayload(event),
              original_title: validation.parsed.original,
              normalized_title: validation.parsed.normalizedPerson,
              start_date: event.start?.date ?? datesInWindow[0] ?? null,
              end_date_exclusive: event.end?.date ?? null,
              start_datetime: event.start?.dateTime ?? null,
              end_datetime: event.end?.dateTime ?? null,
              matched_roster_id: deleted
                ? null
                : (validation.alias?.roster_id ?? null),
              matched_membership_id: deleted
                ? null
                : (validation.alias?.program_membership_id ?? null),
              validation_status: validationStatus,
              validation_issues: issues,
              last_seen_at: now,
              source_deleted_at: deleted ? now : null,
              last_sync_run_id: run.id,
              updated_at: now,
            },
            { onConflict: "source_id,provider_event_id" },
          )
          .select("id")
          .single();
        if (importError || !imported)
          throw new Error(
            importError?.message ?? "Failed staging calendar event",
          );
        if (!prior) createdCount += 1;
        else if (prior.etag !== event.etag) updatedCount += 1;
        else unchangedCount += 1;
      }
      pageToken = response.data.nextPageToken ?? undefined;
      nextSyncToken = response.data.nextSyncToken ?? nextSyncToken;
    } while (pageToken);

    const fullSnapshot =
      options.forceFull ||
      runType === "full" ||
      runType === "preview" ||
      runType === "reconcile";
    if (fullSnapshot) {
      const { data: missingEvents, error: missingError } = await admin
        .from("program_calendar_import_events")
        .select("id")
        .eq("source_id", source.id)
        .gte("start_date", source.effective_start)
        .lte("start_date", source.effective_end)
        .is("source_deleted_at", null)
        .or(`last_sync_run_id.is.null,last_sync_run_id.neq.${run.id}`);
      if (missingError) throw new Error(missingError.message);
      for (const missing of missingEvents ?? []) {
        const deletedAt = new Date().toISOString();
        await admin
          .from("program_calendar_import_events")
          .update({
            provider_status: "cancelled",
            source_deleted_at: deletedAt,
            last_sync_run_id: run.id,
            updated_at: deletedAt,
          })
          .eq("id", missing.id);
        deletedCount += 1;
      }
    }

    if (source.mode === "active") {
      if (fullSnapshot && deletedCount > 10 && !options.allowDestructiveFullApply) {
        throw new Error(
          `Destructive reconciliation guard blocked ${deletedCount} removals. Run a preview and reactivate explicitly.`
        );
      }
      const { data: applied, error: applyError } = await admin.rpc(
        "apply_program_calendar_source_run",
        { p_source_id: source.id, p_sync_run_id: run.id },
      );
      if (applyError)
        throw new Error(`Atomic calendar apply failed: ${applyError.message}`);
      const appliedCounts = (applied ?? {}) as {
        created?: number;
        updated?: number;
        deleted?: number;
      };
      createdCount = appliedCounts.created ?? createdCount;
      updatedCount = appliedCounts.updated ?? updatedCount;
      deletedCount = appliedCounts.deleted ?? deletedCount;
    }

    const completedAt = new Date().toISOString();
    await admin
      .from("program_calendar_sync_runs")
      .update({
        status: blockedCount > 0 ? "blocked" : "succeeded",
        provider_page_count: pageCount,
        provider_event_count: eventCount,
        created_count: createdCount,
        updated_count: updatedCount,
        deleted_count: deletedCount,
        unchanged_count: unchangedCount,
        warning_count: warningCount,
        blocked_count: blockedCount,
        completed_at: completedAt,
      })
      .eq("id", run.id);
    await admin
      .from("program_calendar_sources")
      .update({
        ...(nextSyncToken ? { sync_token: nextSyncToken } : {}),
        initial_sync_completed_at: source.sync_token ? undefined : completedAt,
        last_success_at: completedAt,
        last_error_class: null,
        last_error_message: null,
        last_error_at: null,
        consecutive_failure_count: 0,
        updated_at: completedAt,
      })
      .eq("id", source.id)
      .eq("configuration_version", source.configuration_version);
    await admin.rpc("release_program_calendar_source_sync", {
      p_source_id: source.id,
      p_lock_token: lockToken,
    });
    return {
      runId: run.id,
      status: blockedCount ? "blocked" : "succeeded",
      pageCount,
      eventCount,
      createdCount,
      updatedCount,
      deletedCount,
      unchangedCount,
      warningCount,
      blockedCount,
    };
  } catch (error) {
    const completedAt = new Date().toISOString();
    const message =
      error instanceof Error ? error.message : "Calendar sync failed";
    await admin
      .from("program_calendar_sync_runs")
      .update({
        status: "failed",
        error_class: "sync_error",
        error_message: message,
        completed_at: completedAt,
      })
      .eq("id", run.id);
    const { data: latest } = await admin
      .from("program_calendar_sources")
      .select("consecutive_failure_count")
      .eq("id", source.id)
      .maybeSingle();
    await admin
      .from("program_calendar_sources")
      .update({
        mode: source.mode === "active" ? "error" : source.mode,
        last_error_class: "sync_error",
        last_error_message: message,
        last_error_at: completedAt,
        consecutive_failure_count: (latest?.consecutive_failure_count ?? 0) + 1,
        updated_at: completedAt,
      })
      .eq("id", source.id);
    await admin.rpc("release_program_calendar_source_sync", {
      p_source_id: source.id,
      p_lock_token: lockToken,
    });
    throw error;
  }
}

export function createChannelToken() {
  const raw = crypto.randomBytes(32).toString("base64url");
  return { raw, hash: crypto.createHash("sha256").update(raw).digest("hex") };
}

export function hashChannelToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export async function createProgramCalendarWatch(sourceId: string) {
  const admin = createAdminClient();
  const { source, connection } = await loadSource(sourceId);
  const webhookUrl = process.env.GOOGLE_PROGRAM_CALENDAR_WEBHOOK_URL;
  if (!webhookUrl?.startsWith("https://"))
    throw new Error(
      "GOOGLE_PROGRAM_CALENDAR_WEBHOOK_URL must be configured with HTTPS",
    );
  const channelId = crypto.randomUUID();
  const token = createChannelToken();
  const expiration = Date.now() + 6 * 24 * 60 * 60 * 1000;
  await admin.from("program_calendar_channels").insert({
    source_id: source.id,
    channel_id: channelId,
    channel_token_hash: token.hash,
    expires_at: new Date(expiration).toISOString(),
    status: "creating",
  });
  const calendar = google.calendar({
    version: "v3",
    auth: googleOAuthClient(connection),
  });
  const response = await calendar.events.watch({
    calendarId: source.provider_calendar_id,
    requestBody: {
      id: channelId,
      type: "web_hook",
      address: webhookUrl,
      token: token.raw,
      expiration: String(expiration),
    },
  });
  await admin
    .from("program_calendar_channels")
    .update({
      resource_id: response.data.resourceId ?? null,
      resource_uri: response.data.resourceUri ?? null,
      expires_at: response.data.expiration
        ? new Date(Number(response.data.expiration)).toISOString()
        : new Date(expiration).toISOString(),
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("channel_id", channelId);
  return {
    channelId,
    expiresAt: response.data.expiration ?? String(expiration),
  };
}

export async function getProgramCalendarConnection(programId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("program_calendar_connections")
    .select("id, program_id, encrypted_access_token, encrypted_refresh_token")
    .eq("program_id", programId)
    .eq("provider", "google")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as ConnectionRow | null;
}

export async function disconnectProgramCalendarSource(sourceId: string) {
  const admin = createAdminClient();
  const { source, connection } = await loadSource(sourceId);
  const calendar = google.calendar({
    version: "v3",
    auth: googleOAuthClient(connection),
  });
  const { data: channels } = await admin
    .from("program_calendar_channels")
    .select("id, channel_id, resource_id")
    .eq("source_id", source.id)
    .eq("status", "active");
  for (const channel of channels ?? []) {
    if (channel.resource_id) {
      try {
        await calendar.channels.stop({
          requestBody: {
            id: channel.channel_id,
            resourceId: channel.resource_id,
          },
        });
      } catch (error) {
        console.warn("[program-calendar/disconnect] failed stopping channel", {
          channelId: channel.channel_id,
          message: error instanceof Error ? error.message : "unknown error",
        });
      }
    }
    await admin
      .from("program_calendar_channels")
      .update({ status: "stopped", updated_at: new Date().toISOString() })
      .eq("id", channel.id);
  }
  const now = new Date().toISOString();
  await admin
    .from("program_calendar_sources")
    .update({ mode: "disconnected", sync_token: null, updated_at: now })
    .eq("id", source.id);
  await admin
    .from("program_calendar_connections")
    .update({
      status: "disabled",
      encrypted_access_token: null,
      encrypted_refresh_token: null,
      token_expiry: null,
      updated_at: now,
    })
    .eq("id", connection.id);
  return { success: true, importedAssignmentsRetained: true };
}
