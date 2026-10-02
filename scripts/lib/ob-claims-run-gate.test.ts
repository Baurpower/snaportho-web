import assert from 'node:assert/strict';
import { terminalRunPreconditions } from './ob-claims-run-gate';

assert.deepEqual(terminalRunPreconditions({ status: 'completed', expected_count: 2, completed_count: 2 }, [{ status: 'accepted', count: 2 }]), []);
assert.deepEqual(terminalRunPreconditions(
  { status: 'running', expected_count: 2, completed_count: 1 },
  [{ status: 'accepted', count: 1 }, { status: 'pending', count: 1 }],
), ['run_status:running', 'completed_count:1/2', 'nonterminal:pending:1']);
console.log('ob-claims-run-gate.test.ts: all assertions passed');
