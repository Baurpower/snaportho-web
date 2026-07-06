/**
 * Static audit: fail if runtime code references AWS RDS or dead POSTGRES_* env reads.
 *
 * Usage:
 *   node --experimental-strip-types scripts/audit-datastore-references.ts
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

const RUNTIME_GLOBS = ['src', 'middleware.ts'] as const;

const FORBIDDEN_RUNTIME_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'RDS hostname', pattern: /rds\.amazonaws\.com/i },
  { label: 'snaportho-db host', pattern: /snaportho-db\./i },
  { label: 'POSTGRES_HOST env read', pattern: /process\.env\.POSTGRES_HOST/ },
  { label: 'POSTGRES_USER env read', pattern: /process\.env\.POSTGRES_USER/ },
  { label: 'POSTGRES_PASSWORD env read', pattern: /process\.env\.POSTGRES_PASSWORD/ },
  { label: 'POSTGRES_DB env read', pattern: /process\.env\.POSTGRES_DB/ },
  { label: 'Sequelize client', pattern: /from ['"]sequelize['"]|require\(['"]sequelize['"]\)/ },
  { label: 'Prisma client', pattern: /from ['"]@prisma\/client['"]|new PrismaClient/ },
];

const ALLOWED_PG_FILES = new Set([
  'scripts/apply-ankle-kg-migration.ts',
  'scripts/apply-stripe-resubscribe-migration.ts',
  'scripts/validate-device-token-backfill.ts',
  'scripts/verify-production-rollout.ts',
  'scripts/apply-rds-cutover-migrations.ts',
  'scripts/verify-device-token-write.ts',
]);

const EXCLUDED_FILES = new Set([
  'src/lib/datastore/connection-url.ts',
  'src/lib/datastore/guard.ts',
  'scripts/audit-datastore-references.ts',
]);

function walk(dir: string, files: string[] = []): string[] {
  if (!existsSync(dir)) return files;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      walk(fullPath, files);
      continue;
    }

    if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function relativeFromRoot(filePath: string) {
  return filePath.startsWith(ROOT + '/') ? filePath.slice(ROOT.length + 1) : filePath;
}

function auditRuntimeFiles() {
  const files: string[] = [];
  for (const segment of RUNTIME_GLOBS) {
    const target = join(ROOT, segment);
    if (!existsSync(target)) continue;
    if (target.endsWith('.ts')) {
      files.push(target);
      continue;
    }
    walk(target, files);
  }

  const violations: string[] = [];

  for (const filePath of files) {
    const rel = relativeFromRoot(filePath);
    if (EXCLUDED_FILES.has(rel)) continue;

    const content = readFileSync(filePath, 'utf8');

    for (const rule of FORBIDDEN_RUNTIME_PATTERNS) {
      if (rule.pattern.test(content)) {
        violations.push(`${rel}: ${rule.label}`);
      }
    }

    if (/from ['"]pg['"]|require\(['"]pg['"]\)/.test(content) && !ALLOWED_PG_FILES.has(rel)) {
      violations.push(`${rel}: direct pg import (operator scripts only)`);
    }
  }

  return violations;
}

function auditEnvExample() {
  const envPath = join(ROOT, '.env.local');
  if (!existsSync(envPath)) {
    return { deadRdsEnvPresent: false, databaseUrlProvider: 'missing_env_local' as const };
  }

  const content = readFileSync(envPath, 'utf8');
  const deadRdsEnvPresent = /^POSTGRES_HOST=.*rds\.amazonaws\.com/m.test(content);

  const databaseUrlMatch = content.match(/^DATABASE_URL=(.+)$/m);
  let databaseUrlProvider: 'supabase' | 'rds' | 'unknown' | 'missing' = 'missing';
  if (databaseUrlMatch) {
    const value = databaseUrlMatch[1];
    if (value.includes('supabase.com')) databaseUrlProvider = 'supabase';
    else if (value.includes('rds.amazonaws.com')) databaseUrlProvider = 'rds';
    else databaseUrlProvider = 'unknown';
  }

  return { deadRdsEnvPresent, databaseUrlProvider };
}

function main() {
  const runtimeViolations = auditRuntimeFiles();
  const envAudit = auditEnvExample();

  console.log(
    JSON.stringify(
      {
        runtimeViolationCount: runtimeViolations.length,
        runtimeViolations,
        envAudit,
        guidance: {
          runtime: 'Application code must use createAdminClient() only',
          operatorScripts: 'Direct pg allowed only in apply-*-migration.ts with Supabase DATABASE_URL',
          deadEnv: 'Remove POSTGRES_* from .env.local and Vercel when ready',
        },
      },
      null,
      2
    )
  );

  if (runtimeViolations.length > 0) {
    process.exitCode = 1;
  }
}

main();