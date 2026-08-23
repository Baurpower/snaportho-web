"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarSync,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Settings2,
} from "lucide-react";

type Status = {
  connected: boolean;
  connection?: { provider_account_email?: string | null } | null;
  source?: {
    id: string;
    provider_calendar_id: string;
    provider_calendar_summary: string | null;
    mode: string;
    effective_start: string;
    effective_end: string;
    last_success_at: string | null;
  } | null;
  counts?: { blocked: number; warning: number; valid: number; ignored: number };
};
type CalendarOption = { id: string; summary: string; timeZone: string | null };
type AliasPayload = {
  aliases: Array<{ id: string; normalized_alias: string; roster_id: string }>;
  roster: Array<{ id: string; full_name: string | null }>;
};
type ReviewEvent = {
  id: string;
  original_title: string | null;
  start_date: string | null;
  validation_issues: Array<{ code?: string; message?: string }>;
};

function academicYearDefaults() {
  const now = new Date();
  const year = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return { start: `${year}-07-01`, end: `${year + 1}-06-30` };
}

export default function ProgramCalendarSourceManager() {
  const defaults = useMemo(academicYearDefaults, []);
  const [status, setStatus] = useState<Status | null>(null);
  const [calendars, setCalendars] = useState<CalendarOption[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState("");
  const [effectiveStart, setEffectiveStart] = useState(defaults.start);
  const [effectiveEnd, setEffectiveEnd] = useState(defaults.end);
  const [aliases, setAliases] = useState<AliasPayload>({
    aliases: [],
    roster: [],
  });
  const [blockedEvents, setBlockedEvents] = useState<ReviewEvent[]>([]);
  const [aliasName, setAliasName] = useState("");
  const [aliasRosterId, setAliasRosterId] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<boolean | null>(null);

  const request = useCallback(async (url: string, init?: RequestInit) => {
    const response = await fetch(url, {
      cache: "no-store",
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(payload.error ?? "Calendar source request failed");
    return payload;
  }, []);

  const refresh = useCallback(async () => {
    const next = await request("/api/program/calendar-source/status");
    setStatus(next);
    if (next.source) {
      setEffectiveStart(next.source.effective_start);
      setEffectiveEnd(next.source.effective_end);
      setSelectedCalendar(next.source.provider_calendar_id);
    }
    if (next.connected) {
      const [calendarPayload, aliasPayload, reviewPayload] = await Promise.all([
        request("/api/program/calendar-source/calendars"),
        request("/api/program/calendar-source/aliases"),
        request("/api/program/calendar-source/review?status=blocked"),
      ]);
      setCalendars(calendarPayload.calendars ?? []);
      setAliases(aliasPayload);
      setBlockedEvents(reviewPayload.events ?? []);
    }
  }, [request]);

  useEffect(() => {
    void refresh().catch((error) => setMessage(error.message));
  }, [refresh]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const result = url.searchParams.get("calendarSource");
    if (!result) return;

    const messages: Record<string, string> = {
      connected:
        "Google Calendar connected. Choose the authoritative source calendar below.",
      failed:
        "Google authorization succeeded, but SnapOrtho could not save the connection. Check the production calendar configuration and try again.",
      configuration_error:
        "Google authorization succeeded, but production token encryption is not configured. Add PROGRAM_CALENDAR_TOKEN_ENCRYPTION_KEY to the deployment and try again.",
      invalid_state:
        "The Google connection expired or could not be verified. Please try connecting again.",
      auth_failed:
        "The Google connection returned to a different SnapOrtho user. Please sign in again and retry.",
    };
    setMessage(messages[result] ?? "Google Calendar connection did not complete.");
    url.searchParams.delete("calendarSource");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  async function act(name: string, action: () => Promise<unknown>) {
    setBusy(name);
    setMessage(null);
    try {
      await action();
      await refresh();
      setMessage("Calendar source updated.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Calendar source action failed",
      );
    } finally {
      setBusy(null);
    }
  }

  async function connect() {
    setBusy("connect");
    try {
      const payload = await request("/api/program/calendar-source/connect", {
        method: "POST",
      });
      window.location.assign(payload.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Connection failed");
      setBusy(null);
    }
  }

  const button =
    "inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15 disabled:opacity-50";

  const blockedCount = status?.counts?.blocked ?? 0;
  const warningCount = status?.counts?.warning ?? 0;
  const isHealthy = Boolean(
    status?.connected &&
      status.source?.mode === "active" &&
      status.source.last_success_at &&
      blockedCount === 0,
  );
  const showDetails = expanded ?? !isHealthy;
  const lastRefresh = status?.source?.last_success_at
    ? new Date(status.source.last_success_at).toLocaleString()
    : "Not yet refreshed";

  return (
    <div className="space-y-5">
      <button
        type="button"
        aria-expanded={showDetails}
        onClick={() => setExpanded(!showDetails)}
        className="group flex w-full flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-white/20 hover:bg-white/[0.05] sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex min-w-0 items-start gap-3 sm:items-center">
          <div
            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:mt-0 ${
              isHealthy
                ? "bg-emerald-400/10 text-emerald-200"
                : "bg-sky-400/10 text-sky-200"
            }`}
          >
            {isHealthy ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <CalendarSync className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-white">
                Google source of truth
              </span>
              {status ? (
                <span
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                    isHealthy
                      ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100"
                      : status.connected
                        ? "border-amber-300/20 bg-amber-400/10 text-amber-100"
                        : "border-white/10 bg-white/5 text-slate-300"
                  }`}
                >
                  {isHealthy
                    ? "Active"
                    : status.source?.mode
                      ? status.source.mode
                      : status.connected
                        ? "Setup needed"
                        : "Not connected"}
                </span>
              ) : null}
            </div>
            <p className="mt-1 truncate text-sm text-slate-300">
              {!status
                ? "Checking calendar status…"
                : status.source
                  ? `${status.source.provider_calendar_summary ?? "Selected calendar"} · Last refresh ${lastRefresh}`
                  : status.connected
                    ? "Connected · Choose a calendar to finish setup"
                    : "Connect the authoritative program call calendar"}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 self-end sm:self-auto">
          {status?.source && (blockedCount > 0 || warningCount > 0) ? (
            <span className="text-xs font-semibold text-amber-200">
              {blockedCount} blocked · {warningCount} warnings
            </span>
          ) : null}
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-sky-200">
            <Settings2 className="h-4 w-4" />
            {showDetails ? "Hide details" : "Edit details"}
            <ChevronDown
              className={`h-4 w-4 transition-transform ${showDetails ? "rotate-180" : ""}`}
            />
          </span>
        </div>
      </button>

      {showDetails ? (
        <div className="space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <p className="max-w-3xl text-sm leading-6 text-slate-300">
              Import one exact Google calendar into the program call schedule.
              Setup remains in preview until aliases are resolved and an
              administrator explicitly activates it.
            </p>
            {status?.connected ? (
              <div className="rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-100">
                Connected as{" "}
                {status.connection?.provider_account_email ?? "Google account"}
              </div>
            ) : null}
          </div>
          {message ? (
            <div className="rounded-xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
              {message}
            </div>
          ) : null}
      {!status ? (
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading calendar source…
        </div>
      ) : !status.connected ? (
        <button className={button} disabled={busy !== null} onClick={connect}>
          {busy === "connect" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CalendarSync className="h-4 w-4" />
          )}
          Connect program Google Calendar
        </button>
      ) : (
        <>
          <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-xs font-semibold text-slate-300">
              Source calendar
              <select
                value={selectedCalendar}
                onChange={(event) => setSelectedCalendar(event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white"
              >
                <option value="">Select a calendar</option>
                {calendars.map((calendar) => (
                  <option key={calendar.id} value={calendar.id}>
                    {calendar.summary}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-300">
              Effective start
              <input
                type="date"
                value={effectiveStart}
                onChange={(event) => setEffectiveStart(event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white"
              />
            </label>
            <label className="text-xs font-semibold text-slate-300">
              Effective end
              <input
                type="date"
                value={effectiveEnd}
                onChange={(event) => setEffectiveEnd(event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white"
              />
            </label>
            <div className="flex items-end">
              <button
                className={`${button} w-full`}
                disabled={!selectedCalendar || busy !== null}
                onClick={() =>
                  act("configure", () =>
                    request("/api/program/calendar-source/configure", {
                      method: "POST",
                      body: JSON.stringify({
                        calendarId: selectedCalendar,
                        effectiveStart,
                        effectiveEnd,
                      }),
                    }),
                  )
                }
              >
                Save source
              </button>
            </div>
          </div>
          {status?.source ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-xs text-slate-400">Mode</p>
                <p className="mt-1 font-bold capitalize">
                  {status.source.mode}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-xs text-slate-400">Calendar</p>
                <p className="mt-1 font-bold">
                  {status.source.provider_calendar_summary}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-xs text-slate-400">Needs review</p>
                <p className="mt-1 font-bold text-amber-200">
                  {status.counts?.blocked ?? 0} blocked ·{" "}
                  {status.counts?.warning ?? 0} warnings
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-xs text-slate-400">Last success</p>
                <p className="mt-1 font-bold">
                  {status.source.last_success_at
                    ? new Date(status.source.last_success_at).toLocaleString()
                    : "Not yet"}
                </p>
              </div>
            </div>
          ) : null}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <h4 className="text-sm font-bold">Resident aliases</h4>
            <p className="mt-1 text-xs text-slate-400">
              Map exact calendar titles such as Baur or McNair to roster members
              before previewing.
            </p>
            <div className="mt-3 flex flex-col gap-2 md:flex-row">
              <input
                value={aliasName}
                onChange={(event) => setAliasName(event.target.value)}
                placeholder="Calendar name"
                className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white"
              />
              <select
                value={aliasRosterId}
                onChange={(event) => setAliasRosterId(event.target.value)}
                className="min-w-56 rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white"
              >
                <option value="">Roster member</option>
                {aliases.roster.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.full_name ?? "Unnamed member"}
                  </option>
                ))}
              </select>
              <button
                className={button}
                disabled={!aliasName || !aliasRosterId || busy !== null}
                onClick={() =>
                  act("alias", async () => {
                    await request("/api/program/calendar-source/aliases", {
                      method: "POST",
                      body: JSON.stringify({
                        alias: aliasName,
                        rosterId: aliasRosterId,
                      }),
                    });
                    setAliasName("");
                    setAliasRosterId("");
                  })
                }
              >
                Add alias
              </button>
            </div>

            {blockedEvents.length > 0 ? (
              <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4">
                <h4 className="text-sm font-bold text-amber-100">
                  Events requiring review
                </h4>
                <div className="mt-3 space-y-2">
                  {blockedEvents.slice(0, 12).map((event) => (
                    <div
                      key={event.id}
                      className="rounded-xl border border-amber-200/10 bg-black/10 px-3 py-2 text-sm"
                    >
                      <span className="font-semibold text-white">
                        {event.original_title ?? "Untitled event"}
                      </span>
                      <span className="ml-2 text-xs text-amber-100/70">
                        {event.start_date ?? "No date"}
                      </span>
                      <p className="mt-1 text-xs text-amber-100">
                        {event.validation_issues
                          .map((issue) => issue.message ?? issue.code)
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {aliases.aliases.map((alias) => (
                <span
                  key={alias.id}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs"
                >
                  {alias.normalized_alias} →{" "}
                  {aliases.roster.find((row) => row.id === alias.roster_id)
                    ?.full_name ?? "Unknown"}
                </span>
              ))}
            </div>
          </div>
          {status?.source ? (
            <div className="flex flex-wrap gap-2">
              <button
                className={button}
                disabled={busy !== null}
                onClick={() =>
                  act("preview", () =>
                    request("/api/program/calendar-source/preview", {
                      method: "POST",
                    }),
                  )
                }
              >
                {busy === "preview" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Run preview
              </button>
              {status.source.mode === "active" ? (
                <button
                  className={button}
                  disabled={busy !== null}
                  onClick={() =>
                    act("pause", () =>
                      request("/api/program/calendar-source/pause", {
                        method: "POST",
                      }),
                    )
                  }
                >
                  <Pause className="h-4 w-4" />
                  Pause imports
                </button>
              ) : (
                <button
                  className={button}
                  disabled={busy !== null || (status.counts?.blocked ?? 0) > 0}
                  onClick={() =>
                    act("activate", () =>
                      request("/api/program/calendar-source/activate", {
                        method: "POST",
                      }),
                    )
                  }
                >
                  <Play className="h-4 w-4" />
                  Activate source
                </button>
              )}
              <button
                className={button}
                disabled={busy !== null}
                onClick={() =>
                  act("reconcile", () =>
                    request("/api/program/calendar-source/reconcile", {
                      method: "POST",
                    }),
                  )
                }
              >
                <RefreshCw className="h-4 w-4" />
                Queue reconciliation
              </button>
              <button
                className={`${button} border-rose-300/20 text-rose-100`}
                disabled={busy !== null}
                onClick={() => {
                  if (
                    !window.confirm(
                      "Disconnect the program Google Calendar? Imported assignments will be retained, but synchronization credentials and watch channels will be disabled.",
                    )
                  )
                    return;
                  void act("disconnect", () =>
                    request("/api/program/calendar-source/disconnect", {
                      method: "POST",
                    }),
                  );
                }}
              >
                Disconnect
              </button>
            </div>
          ) : null}
          {(status?.counts?.blocked ?? 0) > 0 ? (
            <div className="flex items-start gap-2 rounded-xl border border-amber-300/20 bg-amber-400/10 p-3 text-sm text-amber-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              Resolve blocked titles by adding aliases, then rerun preview.
              Activation is disabled until no blockers remain.
            </div>
          ) : status?.source ? (
            <div className="flex items-center gap-2 text-sm text-emerald-200">
              <CheckCircle2 className="h-4 w-4" />
              No blocking import issues.
            </div>
          ) : null}
        </>
      )}
        </div>
      ) : message ? (
        <div className="rounded-xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          {message}
        </div>
      ) : null}
    </div>
  );
}
