import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createProgramCalendarWatch,
  syncProgramCalendarSource,
} from "@/lib/google/program-calendar-sync";

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return Boolean(
    secret && request.headers.get("authorization") === `Bearer ${secret}`,
  );
}

export async function GET(request: NextRequest) {
  if (!authorized(request))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const now = new Date();
  const nowIso = now.toISOString();
  const workerId = crypto.randomUUID();
  const { data: activeSources } = await admin
    .from("program_calendar_sources")
    .select("id, configuration_version, last_success_at")
    .eq("mode", "active");
  for (const source of activeSources ?? []) {
    if (
      !source.last_success_at ||
      Date.now() - new Date(source.last_success_at).getTime() > 45 * 60 * 1000
    ) {
      const { error } = await admin
        .from("program_calendar_jobs")
        .insert({
          source_id: source.id,
          configuration_version: source.configuration_version,
          job_type: "incremental_sync",
          status: "pending",
          trigger: "periodic_reconcile",
          available_at: nowIso,
        });
      if (error && error.code !== "23505")
        console.error("[program-calendar/cron] enqueue", error.message);
    }
    const renewBefore = new Date(
      Date.now() + 24 * 60 * 60 * 1000,
    ).toISOString();
    const { count } = await admin
      .from("program_calendar_channels")
      .select("id", { count: "exact", head: true })
      .eq("source_id", source.id)
      .eq("status", "active")
      .gt("expires_at", renewBefore);
    if ((count ?? 0) === 0 && process.env.GOOGLE_PROGRAM_CALENDAR_WEBHOOK_URL) {
      const { error } = await admin
        .from("program_calendar_jobs")
        .insert({
          source_id: source.id,
          configuration_version: source.configuration_version,
          job_type: "renew_watch",
          status: "pending",
          trigger: "channel_renewal",
          available_at: nowIso,
        });
      if (error && error.code !== "23505")
        console.error("[program-calendar/cron] renew enqueue", error.message);
    }
  }
  const { data: jobs, error: jobsError } = await admin
    .from("program_calendar_jobs")
    .select("id, source_id, configuration_version, job_type, attempts")
    .eq("status", "pending")
    .lte("available_at", nowIso)
    .order("created_at")
    .limit(10);
  if (jobsError)
    return NextResponse.json({ error: jobsError.message }, { status: 500 });
  const results = [];
  for (const job of jobs ?? []) {
    const { data: claimed } = await admin
      .from("program_calendar_jobs")
      .update({
        status: "processing",
        locked_at: nowIso,
        locked_by: workerId,
        attempts: job.attempts + 1,
        updated_at: nowIso,
      })
      .eq("id", job.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (!claimed) continue;
    const { data: source } = await admin
      .from("program_calendar_sources")
      .select("configuration_version, mode")
      .eq("id", job.source_id)
      .maybeSingle();
    if (
      !source ||
      source.configuration_version !== job.configuration_version ||
      source.mode === "disconnected"
    ) {
      await admin
        .from("program_calendar_jobs")
        .update({
          status: "succeeded",
          last_error: "stale configuration",
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      continue;
    }
    try {
      const result =
        job.job_type === "renew_watch"
          ? await createProgramCalendarWatch(job.source_id)
          : await syncProgramCalendarSource({
              sourceId: job.source_id,
              runType: job.job_type === "full_sync" ? "full" : "incremental",
              trigger: job.job_type,
              forceFull: job.job_type === "full_sync",
            });
      await admin
        .from("program_calendar_jobs")
        .update({
          status: "succeeded",
          locked_at: null,
          locked_by: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      results.push({ id: job.id, success: true, result });
    } catch (error) {
      const attempts = job.attempts + 1;
      const terminal = attempts >= 5;
      await admin
        .from("program_calendar_jobs")
        .update({
          status: terminal ? "dead" : "pending",
          locked_at: null,
          locked_by: null,
          last_error: error instanceof Error ? error.message : "Job failed",
          available_at: new Date(
            Date.now() + Math.min(60, 2 ** attempts) * 60_000,
          ).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      results.push({ id: job.id, success: false });
    }
  }
  return NextResponse.json({ processed: results.length, results });
}
