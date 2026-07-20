import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const FIELD_LIMITS = [
  [0, 59],
  [0, 23],
  [1, 31],
  [1, 12],
  [0, 7],
];

function expandField(field, min, max) {
  if (!field || /[^0-9*,\/-]/.test(field)) throw new Error(`Malformed cron field: ${field || '(empty)'}`);
  const values = new Set();
  for (const item of field.split(',')) {
    const [base, stepText] = item.split('/');
    if (item.split('/').length > 2) throw new Error(`Malformed cron field: ${field}`);
    const step = stepText === undefined ? 1 : Number(stepText);
    if (!Number.isInteger(step) || step < 1) throw new Error(`Invalid cron step: ${field}`);
    let start;
    let end;
    if (base === '*') {
      start = min;
      end = max;
    } else if (base.includes('-')) {
      const parts = base.split('-').map(Number);
      if (parts.length !== 2) throw new Error(`Malformed cron range: ${field}`);
      [start, end] = parts;
    } else {
      start = Number(base);
      end = start;
    }
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < min || end > max || start > end) {
      throw new Error(`Cron value outside ${min}-${max}: ${field}`);
    }
    for (let value = start; value <= end; value += step) values.add(value);
  }
  return values;
}

export function runsPerDay(schedule) {
  const fields = schedule.trim().split(/\s+/);
  if (fields.length !== 5) throw new Error(`Cron must contain five fields: ${schedule}`);
  const expanded = fields.map((field, index) => expandField(field, ...FIELD_LIMITS[index]));
  return expanded[0].size * expanded[1].size;
}

export function validateVercelCrons(config) {
  const crons = config.crons ?? [];
  if (!Array.isArray(crons)) throw new Error('vercel.json crons must be an array.');
  const paths = new Set();
  for (const cron of crons) {
    if (!cron || typeof cron.path !== 'string' || !cron.path.startsWith('/')) {
      throw new Error('Every Vercel cron requires an absolute path.');
    }
    if (paths.has(cron.path)) throw new Error(`Duplicate Vercel cron path: ${cron.path}`);
    paths.add(cron.path);
    if (typeof cron.schedule !== 'string') throw new Error(`Missing schedule for ${cron.path}`);
    const dailyRuns = runsPerDay(cron.schedule);
    if (dailyRuns > 1) {
      throw new Error(`${cron.path} runs up to ${dailyRuns} times per day; Vercel Hobby permits at most one.`);
    }
  }
  return crons.length;
}

assert.equal(runsPerDay('0 9 * * *'), 1);
assert.throws(
  () => validateVercelCrons({ crons: [{ path: '/api/cron/frequent', schedule: '* * * * *' }] }),
  /1440 times per day/
);
assert.throws(() => validateVercelCrons({ crons: [
  { path: '/api/cron/a', schedule: '0 9 * * *' },
  { path: '/api/cron/a', schedule: '0 10 * * *' },
] }), /Duplicate/);

const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const count = validateVercelCrons(config);
console.log(`Vercel cron validation passed (${count} configured).`);
