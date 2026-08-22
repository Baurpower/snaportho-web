export type OutboundSyncRow = {
  call_assignment_id?: string | null;
  sync_window_start?: string | null;
  sync_window_end?: string | null;
};

/** Only rows explicitly created for this same window are eligible for stale cleanup. */
export function findStaleOutboundRows<T extends OutboundSyncRow>(params: {
  rows: T[];
  currentCallIds: Set<string>;
  windowStart: string;
  windowEnd: string;
}) {
  return params.rows.filter((row) => {
    if (!row.call_assignment_id) return false;
    if (row.sync_window_start !== params.windowStart) return false;
    if (row.sync_window_end !== params.windowEnd) return false;
    return !params.currentCallIds.has(row.call_assignment_id);
  });
}
