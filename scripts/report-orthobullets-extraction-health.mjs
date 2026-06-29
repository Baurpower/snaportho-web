import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseHTML } from 'linkedom';

const repoRoot = process.cwd();
const extensionRoot = path.join(repoRoot, 'extensions', 'orthobullets-brobot');
const fixturesDir = path.join(extensionRoot, 'fixtures');
const testDistDir = path.join(extensionRoot, '.test-dist');
const reportsDir = path.join(repoRoot, 'reports');

const tscResult = spawnSync(
  process.execPath,
  [path.join(repoRoot, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', path.join(extensionRoot, 'tsconfig.test.json')],
  { cwd: repoRoot, stdio: 'inherit' }
);
if (tscResult.status !== 0) {
  process.exit(tscResult.status ?? 1);
}

const { extractOrthobulletsPageContext, EXTRACTOR_VERSION, SELECTOR_SET_VERSION } = await import(
  path.join(testDistDir, 'content', 'extractor.js')
);

// Fixtures named `ob-review-*.html` are real, manually-captured Orthobullets
// pages and are what this report is meant to track over time. The
// synthetic fixture is excluded — it exists only for unit-test sanity
// checks and isn't representative of real-world layout drift.
const fixtureFiles = readdirSync(fixturesDir)
  .filter((name) => name.endsWith('.html') && name.startsWith('ob-review-'))
  .sort();

if (fixtureFiles.length === 0) {
  console.log(
    'No real fixtures found in extensions/orthobullets-brobot/fixtures/ (they are gitignored and manually captured — see README). Nothing to report.'
  );
  process.exit(0);
}

const REQUIRED_FIELDS = [
  'questionId',
  'breadcrumbs',
  'stem',
  'answerChoices',
  'selectedAnswerKey',
  'correctAnswerKey',
  'explanationText',
  'percentDistribution',
  'linkedConcepts',
  'images',
];

function fieldPresent(context, field) {
  const value = context[field];
  if (Array.isArray(value)) return value.length > 0;
  return value != null && value !== '';
}

const fixtureReports = fixtureFiles.map((file) => {
  const html = readFileSync(path.join(fixturesDir, file), 'utf8');
  const { document } = parseHTML(html);
  const questionIdMatch = file.match(/ob-review-q(\d+)\.html/);
  const pageUrl = questionIdMatch
    ? questionIdMatch[1] === '3794'
      ? `https://www.orthobullets.com/testview?qid=${questionIdMatch[1]}&ans=2`
      : `https://www.orthobullets.com/question/${questionIdMatch[1]}`
    : '';

  const context = extractOrthobulletsPageContext({ document, pageUrl });

  const fieldsFound = REQUIRED_FIELDS.filter((field) => fieldPresent(context, field));
  const fieldsMissing = REQUIRED_FIELDS.filter((field) => !fieldPresent(context, field));
  const successPercent = Math.round((fieldsFound.length / REQUIRED_FIELDS.length) * 100);

  return {
    fixture: file,
    extractorVersion: context.debug?.extractorVersion ?? EXTRACTOR_VERSION,
    fieldsFound,
    fieldsMissing,
    warnings: context.extractionWarnings,
    matchedSelectors: context.debug?.matchedSelectors ?? {},
    successPercent,
  };
});

mkdirSync(reportsDir, { recursive: true });

const generatedAt = new Date().toISOString();
const jsonReport = {
  generatedAt,
  selectorSetVersion: SELECTOR_SET_VERSION,
  extractorVersion: EXTRACTOR_VERSION,
  fixtures: fixtureReports,
};

const jsonPath = path.join(reportsDir, 'orthobullets-extraction-health.json');
writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2) + '\n', 'utf8');

const overallSuccess = Math.round(
  fixtureReports.reduce((sum, report) => sum + report.successPercent, 0) / Math.max(fixtureReports.length, 1)
);

const mdLines = [
  '# Orthobullets Extraction Health Report',
  '',
  `Generated: ${generatedAt}`,
  `Extractor version: \`${EXTRACTOR_VERSION}\``,
  `Selector set version: \`${SELECTOR_SET_VERSION}\``,
  `Fixtures evaluated: ${fixtureReports.length}`,
  `Overall success rate: ${overallSuccess}%`,
  '',
  '| Fixture | Success % | Fields Missing | Warnings |',
  '|---|---|---|---|',
  ...fixtureReports.map(
    (r) =>
      `| ${r.fixture} | ${r.successPercent}% | ${r.fieldsMissing.join(', ') || '—'} | ${
        r.warnings.length ? r.warnings.join('; ') : '—'
      } |`
  ),
  '',
  '## Detail',
  '',
];

for (const r of fixtureReports) {
  mdLines.push(`### ${r.fixture}`, '');
  mdLines.push(`- Success: ${r.successPercent}%`);
  mdLines.push(`- Fields found: ${r.fieldsFound.join(', ') || 'none'}`);
  mdLines.push(`- Fields missing: ${r.fieldsMissing.join(', ') || 'none'}`);
  mdLines.push(`- Warnings: ${r.warnings.join('; ') || 'none'}`);
  mdLines.push('- Matched selectors:');
  const selectorKeys = Object.keys(r.matchedSelectors);
  if (selectorKeys.length === 0) {
    mdLines.push('  - none');
  } else {
    for (const key of selectorKeys) {
      mdLines.push(`  - \`${key}\`: ${r.matchedSelectors[key].join(', ')}`);
    }
  }
  mdLines.push('');
}

const mdPath = path.join(reportsDir, 'orthobullets-extraction-health.md');
writeFileSync(mdPath, mdLines.join('\n'), 'utf8');

console.log(`Orthobullets extraction health report written:\n  ${jsonPath}\n  ${mdPath}`);
console.log(`Overall success rate: ${overallSuccess}% across ${fixtureReports.length} fixtures.`);

const failing = fixtureReports.filter((r) => r.successPercent < 100 && r.fieldsMissing.some((f) => f !== 'percentDistribution' && f !== 'images' && f !== 'linkedConcepts'));
if (failing.length > 0) {
  console.warn(`\nWarning: ${failing.length} fixture(s) missing core fields (not just optional ones). See report for details.`);
}
