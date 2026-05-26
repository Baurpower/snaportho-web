import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ShiftSwapAuditLog,
  ShiftSwapRequest,
  SwapCallSummary,
  SwapRequestListItem,
  SwapRequestQueryFilters,
  SwapRosterSummary,
} from "./types";

const SWAP_REQUEST_BASE_SELECT = `
  id,
  program_id,
  requester_roster_id,
  recipient_roster_id,
  requester_call_id,
  recipient_call_id,
  request_type,
  status,
  requester_note,
  recipient_note,
  admin_note,
  expires_at,
  created_at,
  updated_at
`;

const SWAP_REQUEST_DETAIL_SELECT = `
  ${SWAP_REQUEST_BASE_SELECT},
  requester_roster:program_roster!shift_swap_requests_requester_roster_id_fkey (
    id,
    full_name,
    first_name,
    last_name,
    role,
    grad_year,
    program_membership_id,
    claimed_by_user_id,
    isAdmin
  ),
  recipient_roster:program_roster!shift_swap_requests_recipient_roster_id_fkey (
    id,
    full_name,
    first_name,
    last_name,
    role,
    grad_year,
    program_membership_id,
    claimed_by_user_id,
    isAdmin
  ),
  requester_call:call_assignments!shift_swap_requests_requester_call_id_fkey (
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
    notes
  ),
  recipient_call:call_assignments!shift_swap_requests_recipient_call_id_fkey (
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
    notes
  )
`;

type RawRosterRow = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  grad_year: number | null;
  program_membership_id: string | null;
  claimed_by_user_id: string | null;
  isAdmin: boolean | null;
};

type RawCallRow = {
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
};

type RawSwapRequestRow = ShiftSwapRequest & {
  requester_roster?: RawRosterRow | RawRosterRow[] | null;
  recipient_roster?: RawRosterRow | RawRosterRow[] | null;
  requester_call?: RawCallRow | RawCallRow[] | null;
  recipient_call?: RawCallRow | RawCallRow[] | null;
};

type RawAuditLogRow = Omit<ShiftSwapAuditLog, "actor"> & {
  actor_roster?: RawRosterRow | RawRosterRow[] | null;
};

function normalizeOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function mapRoster(row: RawRosterRow | RawRosterRow[] | null | undefined): SwapRosterSummary | null {
  const value = normalizeOne(row);
  if (!value) return null;

  const fullName =
    value.full_name?.trim() ||
    [value.first_name, value.last_name].filter(Boolean).join(" ").trim() ||
    "Unknown Resident";

  return {
    id: value.id,
    fullName,
    role: value.role ?? null,
    gradYear: value.grad_year ?? null,
    programMembershipId: value.program_membership_id ?? null,
    claimedByUserId: value.claimed_by_user_id ?? null,
    isAdmin: Boolean(value.isAdmin),
  };
}

function mapCall(row: RawCallRow | RawCallRow[] | null | undefined): SwapCallSummary | null {
  const value = normalizeOne(row);
  if (!value || !value.program_id) return null;

  return {
    id: value.id,
    programId: value.program_id,
    rosterId: value.roster_id ?? null,
    programMembershipId: value.program_membership_id ?? null,
    callType: value.call_type ?? null,
    callDate: value.call_date ?? null,
    startDatetime: value.start_datetime ?? null,
    endDatetime: value.end_datetime ?? null,
    site: value.site ?? null,
    isHomeCall: value.is_home_call ?? null,
    notes: value.notes ?? null,
  };
}

function mapSwapRequestListItem(row: RawSwapRequestRow): SwapRequestListItem {
  return {
    ...row,
    requester: mapRoster(row.requester_roster),
    recipient: mapRoster(row.recipient_roster),
    requesterCall: mapCall(row.requester_call),
    recipientCall: mapCall(row.recipient_call),
  };
}

function applySwapRequestFilters<T extends {
  in: (column: string, values: string[]) => T;
  neq: (column: string, value: string) => T;
  limit: (value: number) => T;
}>(query: T, filters?: SwapRequestQueryFilters | null) {
  let nextQuery = query;

  if (filters?.statuses?.length) {
    nextQuery = nextQuery.in("status", filters.statuses);
  }

  if (!filters?.includeExpired) {
    nextQuery = nextQuery.neq("status", "expired");
  }

  if (typeof filters?.limit === "number" && filters.limit > 0) {
    nextQuery = nextQuery.limit(filters.limit);
  }

  return nextQuery;
}

export async function getSwapRequestById(
  supabase: SupabaseClient,
  requestId: string
) {
  const { data, error } = await supabase
    .from("shift_swap_requests")
    .select(SWAP_REQUEST_BASE_SELECT)
    .eq("id", requestId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load swap request: ${error.message}`);
  }

  return (data as ShiftSwapRequest | null) ?? null;
}

export async function getSwapRequestWithDetailsById(
  supabase: SupabaseClient,
  requestId: string
) {
  const { data, error } = await supabase
    .from("shift_swap_requests")
    .select(SWAP_REQUEST_DETAIL_SELECT)
    .eq("id", requestId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load swap request details: ${error.message}`);
  }

  if (!data) return null;
  return mapSwapRequestListItem(data as RawSwapRequestRow);
}

export async function getSwapRequestsForProgram(
  supabase: SupabaseClient,
  programId: string,
  filters?: SwapRequestQueryFilters | null
) {
  let query = supabase
    .from("shift_swap_requests")
    .select(SWAP_REQUEST_DETAIL_SELECT)
    .eq("program_id", programId)
    .order("created_at", { ascending: false });

  if (filters?.requestType) {
    query = query.eq("request_type", filters.requestType);
  }

  query = applySwapRequestFilters(query, filters);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to load program swap requests: ${error.message}`);
  }

  return ((data ?? []) as RawSwapRequestRow[]).map(mapSwapRequestListItem);
}

export async function getIncomingSwapRequestsForUser(
  supabase: SupabaseClient,
  recipientRosterId: string,
  filters?: SwapRequestQueryFilters | null
) {
  let query = supabase
    .from("shift_swap_requests")
    .select(SWAP_REQUEST_DETAIL_SELECT)
    .eq("recipient_roster_id", recipientRosterId)
    .order("created_at", { ascending: false });

  if (filters?.requestType) {
    query = query.eq("request_type", filters.requestType);
  }

  query = applySwapRequestFilters(query, filters);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to load incoming swap requests: ${error.message}`);
  }

  return ((data ?? []) as RawSwapRequestRow[]).map(mapSwapRequestListItem);
}

export async function getOutgoingSwapRequestsForUser(
  supabase: SupabaseClient,
  requesterRosterId: string,
  filters?: SwapRequestQueryFilters | null
) {
  let query = supabase
    .from("shift_swap_requests")
    .select(SWAP_REQUEST_DETAIL_SELECT)
    .eq("requester_roster_id", requesterRosterId)
    .order("created_at", { ascending: false });

  if (filters?.requestType) {
    query = query.eq("request_type", filters.requestType);
  }

  query = applySwapRequestFilters(query, filters);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to load outgoing swap requests: ${error.message}`);
  }

  return ((data ?? []) as RawSwapRequestRow[]).map(mapSwapRequestListItem);
}

export async function getAdminPendingSwapRequests(
  supabase: SupabaseClient,
  programId: string
) {
  const { data, error } = await supabase
    .from("shift_swap_requests")
    .select(SWAP_REQUEST_DETAIL_SELECT)
    .eq("program_id", programId)
    .eq("status", "accepted_pending_admin")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load pending admin swap requests: ${error.message}`);
  }

  return ((data ?? []) as RawSwapRequestRow[]).map(mapSwapRequestListItem);
}

export async function getActiveDuplicateSwapRequest(
  supabase: SupabaseClient,
  params: {
    requesterCallId: string;
    recipientRosterId: string;
  }
) {
  const { data, error } = await supabase
    .from("shift_swap_requests")
    .select(SWAP_REQUEST_BASE_SELECT)
    .eq("requester_call_id", params.requesterCallId)
    .eq("recipient_roster_id", params.recipientRosterId)
    .in("status", ["pending_recipient", "accepted_pending_admin"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to check for duplicate swap requests: ${error.message}`);
  }

  return (data as ShiftSwapRequest | null) ?? null;
}

export async function getActiveRequestsTouchingCallIds(
  supabase: SupabaseClient,
  callIds: string[]
) {
  const uniqueCallIds = Array.from(new Set(callIds.filter(Boolean)));
  if (uniqueCallIds.length === 0) return [] as ShiftSwapRequest[];

  const joinedIds = uniqueCallIds.join(",");
  const { data, error } = await supabase
    .from("shift_swap_requests")
    .select(SWAP_REQUEST_BASE_SELECT)
    .in("status", ["pending_recipient", "accepted_pending_admin"])
    .or(
      `requester_call_id.in.(${joinedIds}),recipient_call_id.in.(${joinedIds})`
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load active swap requests for calls: ${error.message}`);
  }

  return (data ?? []) as ShiftSwapRequest[];
}

export async function createSwapRequestRecord(
  supabase: SupabaseClient,
  values: Omit<ShiftSwapRequest, "id" | "created_at" | "updated_at">
) {
  const { data, error } = await supabase
    .from("shift_swap_requests")
    .insert({
      ...values,
      updated_at: new Date().toISOString(),
    })
    .select(SWAP_REQUEST_BASE_SELECT)
    .single();

  if (error) {
    throw new Error(`Failed to create swap request: ${error.message}`);
  }

  return data as ShiftSwapRequest;
}

export async function updateSwapRequestStatus(
  supabase: SupabaseClient,
  params: {
    requestId: string;
    status: ShiftSwapRequest["status"];
    recipientNote?: string | null;
    adminNote?: string | null;
  }
) {
  const payload: {
    status: ShiftSwapRequest["status"];
    updated_at: string;
    recipient_note?: string | null;
    admin_note?: string | null;
  } = {
    status: params.status,
    updated_at: new Date().toISOString(),
  };

  if (params.recipientNote !== undefined) {
    payload.recipient_note = params.recipientNote;
  }

  if (params.adminNote !== undefined) {
    payload.admin_note = params.adminNote;
  }

  const { data, error } = await supabase
    .from("shift_swap_requests")
    .update(payload)
    .eq("id", params.requestId)
    .select(SWAP_REQUEST_BASE_SELECT)
    .single();

  if (error) {
    throw new Error(`Failed to update swap request status: ${error.message}`);
  }

  return data as ShiftSwapRequest;
}

export async function insertSwapAuditLog(
  supabase: SupabaseClient,
  values: Omit<ShiftSwapAuditLog, "id" | "created_at">
) {
  const { data, error } = await supabase
    .from("shift_swap_audit_log")
    .insert(values)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to write swap audit log: ${error.message}`);
  }

  return data as ShiftSwapAuditLog;
}

export async function getSwapAuditLogForRequest(
  supabase: SupabaseClient,
  requestId: string
) {
  const { data, error } = await supabase
    .from("shift_swap_audit_log")
    .select(`
      id,
      request_id,
      program_id,
      actor_roster_id,
      action,
      previous_status,
      new_status,
      metadata,
      created_at,
      actor_roster:program_roster!shift_swap_audit_log_actor_roster_id_fkey (
        id,
        full_name,
        first_name,
        last_name,
        role,
        grad_year,
        program_membership_id,
        claimed_by_user_id,
        isAdmin
      )
    `)
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load swap audit log: ${error.message}`);
  }

  return ((data ?? []) as RawAuditLogRow[]).map((row) => ({
    id: row.id,
    request_id: row.request_id,
    program_id: row.program_id,
    actor_roster_id: row.actor_roster_id,
    action: row.action,
    previous_status: row.previous_status,
    new_status: row.new_status,
    metadata: row.metadata,
    created_at: row.created_at,
    actor: mapRoster(row.actor_roster),
  }));
}
