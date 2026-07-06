/**
 * Cross-repo guardrail: fail CI if new production RDS dependencies are introduced.
 *
 * Usage:
 *   npm run datastore:audit:cross-repo
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const WORKSPACE_ROOT = join(process.cwd(), '..');
const SNAPORTHO_WEB = join(WORKSPACE_ROOT, 'snaportho-web');
const VAPOR_BACKEND = join(WORKSPACE_ROOT, 'Xcode', 'snaporthobackend', 'Sources');

const ALLOWED_VAPOR_FILES = new Set([
  'SnapOrthoBackend/configure.swift',
  'SnapOrthoBackend/LegacyRDSWrites.swift',
  'SnapOrthoBackend/Commands/BackfillNotificationTokensCommand.swift',
  'SnapOrthoBackend/routes.swift',
  'SnapOrthoBackend/Migrations/CreateDevice.swift',
  'SnapOrthoBackend/Migrations/CreateCasePrepLog.swift',
  'SnapOrthoBackend/Models/Device.swift',
  'SnapOrthoBackend/Models/CasePrep.swift',
]);

const FORBIDDEN_VAPOR_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'req.db without .notifications for legacy write', pattern: /req\.db\)(?!\.notifications)/ },
  { label: 'hard-required DATABASE_HOST boot guard', pattern: /Missing Amazon RDS environment variables/ },
];

const FORBIDDEN_WEB_RUNTIME_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'api.snap-ortho.com donations read', pattern: /api\.snap-ortho\.com\/donations/ },
  { label: 'api.snap-ortho.com case-prep-log write', pattern: /api\.snap-ortho\.com\/case-prep-log/ },
  { label: 'RDS hostname in runtime', pattern: /rds\.amazonaws\.com/i },
];

const ALLOWED_WEB_FILES = new Set([
  'src/lib/config/brobot.ts',
  'src/lib/datastore/guard.ts',
  'src/lib/datastore/connection-url.ts',
  'src/app/api/brobot-anki/ortho-context/route.ts',
  'src/app/learn/modules/trauma/learntraumapageclient.tsx',
  'src/lib/caseprep-review/client.test.ts',
  'scripts/validate-device-token-backfill.ts',
  'scripts/audit-rds-dependencies.ts',
  'scripts/audit-datastore-references.ts',
]);

function walk(dir: string, files: string[] = []): string[] {
  if (!existsSync(dir)) return files;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.build') continue;
      walk(fullPath, files);
      continue;
    }

    if (/\.(swift|ts|tsx|js|mjs)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function auditVapor() {
  const violations: string[] = [];
  const files = walk(VAPOR_BACKEND);

  for (const filePath of files) {
    const rel = relative(join(WORKSPACE_ROOT, 'Xcode', 'snaporthobackend', 'Sources'), filePath);
    if (ALLOWED_VAPOR_FILES.has(rel)) continue;

    const content = readFileSync(filePath, 'utf8');
    if (/DATABASE_HOST|DATABASE_USERNAME|DATABASE_PASSWORD|DATABASE_NAME/.test(content)) {
      violations.push(`vapor:${rel}: legacy DATABASE_* reference outside allowlist`);
    }
    if (/as:\s*\.psql/.test(content)) {
      violations.push(`vapor:${rel}: .psql database registration outside allowlist`);
    }
    if (/req\.db\(\.psql\)|req\.db as!/.test(content)) {
      violations.push(`vapor:${rel}: direct legacy RDS query outside allowlist`);
    }
  }

  return violations;
}

function auditSnaporthoWebRuntime() {
  const violations: string[] = [];
  const roots = [join(SNAPORTHO_WEB, 'src')];

  for (const root of roots) {
    for (const filePath of walk(root)) {
      const rel = relative(SNAPORTHO_WEB, filePath);
      if (ALLOWED_WEB_FILES.has(rel)) continue;
      if (rel.includes('.test.')) continue;

      const content = readFileSync(filePath, 'utf8');
      for (const rule of FORBIDDEN_WEB_RUNTIME_PATTERNS) {
        if (rule.pattern.test(content)) {
          violations.push(`web:${rel}: ${rule.label}`);
        }
      }
    }
  }

  return violations;
}

function main() {
  const vaporViolations = auditVapor();
  const webViolations = auditSnaporthoWebRuntime();
  const violations = [...vaporViolations, ...webViolations];

  console.log(
    JSON.stringify(
      {
        workspaceRoot: WORKSPACE_ROOT,
        violationCount: violations.length,
        violations,
        allowedExceptions: {
          vapor: [...ALLOWED_VAPOR_FILES],
          web: [...ALLOWED_WEB_FILES],
        },
      },
      null,
      2
    )
  );

  if (violations.length > 0) {
    process.exitCode = 1;
  }
}

main();