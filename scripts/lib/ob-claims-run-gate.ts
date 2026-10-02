export type ObRunGateInput = { status: string; expected_count: number | string; completed_count: number | string };
export type ObRunStatusCount = { status: string; count: number | string };

const TERMINAL_ITEMS = new Set(['accepted', 'ai_review_unresolved', 'identity_unresolved', 'identity_conflict', 'failed_permanent']);

export function terminalRunPreconditions(run: ObRunGateInput, statuses: ObRunStatusCount[]): string[] {
  const issues: string[] = [];
  const expected = Number(run.expected_count);
  const completed = Number(run.completed_count);
  const total = statuses.reduce((sum, row) => sum + Number(row.count), 0);
  if (run.status !== 'completed' && run.status !== 'completed_with_gaps') issues.push(`run_status:${run.status}`);
  if (completed !== expected) issues.push(`completed_count:${completed}/${expected}`);
  if (total !== expected) issues.push(`item_count:${total}/${expected}`);
  for (const row of statuses) if (!TERMINAL_ITEMS.has(row.status) && Number(row.count) > 0) issues.push(`nonterminal:${row.status}:${row.count}`);
  return issues;
}
