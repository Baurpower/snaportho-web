import assert from "node:assert/strict";
import { findStaleOutboundRows } from "./outbound-range.ts";

const rows = [
  {
    call_assignment_id: "before",
    sync_window_start: "2025-07-01",
    sync_window_end: "2026-06-30",
  },
  {
    call_assignment_id: "stale",
    sync_window_start: "2026-07-01",
    sync_window_end: "2027-06-30",
  },
  {
    call_assignment_id: "current",
    sync_window_start: "2026-07-01",
    sync_window_end: "2027-06-30",
  },
  {
    call_assignment_id: "legacy",
    sync_window_start: null,
    sync_window_end: null,
  },
];

const stale = findStaleOutboundRows({
  rows,
  currentCallIds: new Set(["current"]),
  windowStart: "2026-07-01",
  windowEnd: "2027-06-30",
});

assert.deepEqual(
  stale.map((row) => row.call_assignment_id),
  ["stale"],
);
console.log("outbound range tests passed");
