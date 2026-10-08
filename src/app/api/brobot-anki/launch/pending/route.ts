import { NextResponse } from "next/server";

import { authenticateBroBotAnkiRequest } from "../../_lib";
import { createAdminClient } from "@/lib/supabase/admin";
import { CLAIM_OVERLAP_LEARNER_CONTRACT } from "@/lib/education/contracts/claim-overlap-learner-v1";
import { toLaunchRequest } from "@/lib/education/anki-launch-commands";

// Long-polling for the Anki add-on launch poller. Holding the request open
// lets an idle client make ~1 request/minute instead of ~1/4s, while launch
// latency improves: the server returns the instant a command lands instead
// of waiting for the next poll tick.
//
// Version gate: only add-on versions whose HTTP client tolerates a long hold
// (1.0.9+, 70s timeout on the poll call) get the hold. Older clients keep the
// previous instant-response behavior, so they never hit timeout storms.
export const maxDuration = 60;

const LONG_POLL_MIN_ADDON_VERSION = "1.0.9";
const LONG_POLL_HOLD_MS = 50_000;
const LONG_POLL_RECHECK_MS = 2_000;

type AdminClient = ReturnType<typeof createAdminClient>;

async function fetchPendingCommands(admin: AdminClient, userId: string) {
  const { data, error } = await admin
    .from("educational_anki_launch_commands")
    .select("id,canonical_card_id,canonical_card_version_id,note_guid,card_ordinal,requested_at,expires_at")
    .eq("user_id", userId)
    .eq("contract_version", CLAIM_OVERLAP_LEARNER_CONTRACT)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .order("requested_at", { ascending: true })
    .limit(3);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => toLaunchRequest(row));
}

async function hasPendingCommands(admin: AdminClient, userId: string) {
  const { data, error } = await admin
    .from("educational_anki_launch_commands")
    .select("id")
    .eq("user_id", userId)
    .eq("contract_version", CLAIM_OVERLAP_LEARNER_CONTRACT)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .limit(1);
  if (error) throw new Error(error.message);
  return (data ?? []).length > 0;
}

function addonVersion(request: Request): string | null {
  const header = request.headers.get("x-snaportho-client") ?? "";
  const match = header.match(/reviewer-addon\/([\d.]+)/i);
  return match && match[1] ? match[1] : null;
}

function versionAtLeast(version: string | null, minimum: string): boolean {
  if (!version) return false;
  const parts = (v: string) => v.split(".").map((p) => parseInt(p, 10) || 0);
  const left = parts(version);
  const right = parts(minimum);
  const size = Math.max(left.length, right.length);
  for (let i = 0; i < size; i++) {
    const l = left[i] ?? 0;
    const r = right[i] ?? 0;
    if (l !== r) return l > r;
  }
  return true;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function GET(request: Request) {
  const auth = await authenticateBroBotAnkiRequest(request);
  if ("response" in auth) return auth.response;
  const admin = createAdminClient();

  try {
    if (versionAtLeast(addonVersion(request), LONG_POLL_MIN_ADDON_VERSION)) {
      // Small jitter so a fleet of clients does not synchronize.
      const holdMs = LONG_POLL_HOLD_MS - 5_000 + Math.floor(Math.random() * 10_000);
      const deadline = Date.now() + holdMs;
      for (;;) {
        if (await hasPendingCommands(admin, auth.userId)) {
          return NextResponse.json({ commands: await fetchPendingCommands(admin, auth.userId) });
        }
        if (Date.now() >= deadline) break;
        await sleep(Math.min(LONG_POLL_RECHECK_MS, Math.max(0, deadline - Date.now())));
      }
      return NextResponse.json({ commands: [] });
    }
    return NextResponse.json({ commands: await fetchPendingCommands(admin, auth.userId) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "pending_lookup_failed" },
      { status: 500 },
    );
  }
}
