import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const extensionRoot = path.join(repoRoot, 'extensions', 'orthobullets-brobot');
const distDir = path.join(extensionRoot, 'dist');
const manifestTemplatePath = path.join(extensionRoot, 'manifest.template.json');
const sidepanelHtmlPath = path.join(extensionRoot, 'sidepanel.html');
const iconsSourceDir = path.join(extensionRoot, 'icons');
const builtPaths = {
  backgroundServiceWorker: 'background.js',
  contentScript: 'content/content-script.js',
  sidepanelHtml: 'sidepanel.html',
  sidepanelEntry: 'sidepanel/main.js',
  iconsDir: 'icons',
};

const configuredAppOrigin =
  process.env.BROBOT_EXTENSION_APP_ORIGIN ||
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  'http://localhost:3000';

function buildClassicContentScriptBundle() {
  const selectorsPath = path.join(distDir, 'content', 'selectors.js');
  const questionReviewStatePath = path.join(distDir, 'shared', 'question-review-state.js');
  const pageClassificationPath = path.join(distDir, 'shared', 'page-classification.js');
  const extractorPath = path.join(distDir, 'content', 'extractor.js');
  const questionFingerprintPath = path.join(distDir, 'shared', 'question-fingerprint.js');
  const himalayaDebugPath = path.join(distDir, 'providers', 'himalaya', 'himalaya-debug.js');
  const himalayaExtractorPath = path.join(distDir, 'providers', 'himalaya', 'himalaya-extractor.js');
  const himalayaProviderPath = path.join(distDir, 'providers', 'himalaya', 'himalaya-provider.js');
  const questionLifecyclePath = path.join(distDir, 'content', 'question-lifecycle.js');
  const contentScriptPath = path.join(distDir, 'content', 'content-script.js');

  const selectorsSource = readFileSync(selectorsPath, 'utf8')
    .replace(/^export const SELECTOR_SET_VERSION =/m, 'const SELECTOR_SET_VERSION =')
    .replace(/^export const SELECTORS =/m, 'const SELECTORS =');

  const questionReviewStateSource = readFileSync(questionReviewStatePath, 'utf8')
    .replace(/^import\s+type\s+\{[^}]+\}\s+from\s+['"][^'"]+['"];\r?\n?/gm, '')
    .replace(/^export\s+type\s+[^;]+;\r?\n?/gm, '')
    .replace(/^export function /gm, 'function ');

  const pageClassificationSource = readFileSync(pageClassificationPath, 'utf8')
    .replace(/^import\s+type\s+\{[^}]+\}\s+from\s+['"][^'"]+['"];\r?\n?/gm, '')
    .replace(/^import\s+\{[^}]+\}\s+from\s+['"]\.\/question-review-state\.js['"];\r?\n?/gm, '')
    .replace(/^export\s+type\s+\{[^}]+\}\s+from\s+['"]\.\/question-review-state\.js['"];\r?\n?/gm, '')
    .replace(/^export\s+\{[^}]+\}\s+from\s+['"]\.\/question-review-state\.js['"];\r?\n?/gm, '')
    .replace(/^export\s+\{[^}]+\}\s*;\r?\n?/gm, '')
    .replace(/^export const /gm, 'const ')
    .replace(/^export function /gm, 'function ');

  const extractorSource = readFileSync(extractorPath, 'utf8')
    .replace(/^import\s+\{\s*SELECTOR_SET_VERSION,\s*SELECTORS\s*\}\s+from\s+['"]\.\/selectors\.js['"];\r?\n?/m, '')
    .replace(/^import\s+\{\s*classifyPage\s*\}\s+from\s+['"]\.\.\/shared\/page-classification\.js['"];\r?\n?/m, '')
    .replace(/^import\s+\{[^}]+\}\s+from\s+['"]\.\.\/shared\/question-review-state\.js['"];\r?\n?/m, '')
    .replace(/^import\s+\{[^}]+\}\s+from\s+['"]\.\.\/providers\/himalaya\/himalaya-provider\.js['"];\r?\n?/m, '')
    .replace(/^import\s+type\s+\{[^}]+\}\s+from\s+['"]\.\.\/shared\/types\.js['"];\r?\n?/m, '')
    .replace(/^export\s+\{[^}]+\}\s+from\s+['"]\.\.\/providers\/himalaya\/himalaya-extractor\.js['"];\r?\n?/m, '')
    .replace(/^export const EXTRACTOR_VERSION =/m, 'const EXTRACTOR_VERSION =')
    .replace(/^export \{ SELECTOR_SET_VERSION \};\r?\n?/m, '')
    .replace(/^export function detectQuestionProvider\(/m, 'function detectQuestionProvider(')
    .replace(/^export function extractOrthobulletsPageContext\(/m, 'function extractOrthobulletsPageContext(')
    .replace(/^export function extractOrthobulletsTopicPageContext\(/m, 'function extractOrthobulletsTopicPageContext(')
    .replace(/^export function isLikelyOrthobulletsTopicUrl\(/m, 'function isLikelyOrthobulletsTopicUrl(')
    .replace(/^export function extractRockPageContext\(/m, 'function extractRockPageContext(')
    .replace(/^export function extractQuestionContext\(/m, 'function extractQuestionContext(');

  const questionFingerprintSource = readFileSync(questionFingerprintPath, 'utf8')
    .replace(/^import\s+type\s+\{[^}]+\}\s+from\s+['"][^'"]+['"];\r?\n?/gm, '')
    .replace(/^export\s+type\s+\{[^}]+\}[^;]*;\r?\n?/gm, '')
    .replace(/^export\s+type\s+[^;]+;\r?\n?/gm, '')
    .replace(/^export function /gm, 'function ');

  const himalayaDebugSource = readFileSync(himalayaDebugPath, 'utf8')
    .replace(/^import\s+type\s+\{[^}]+\}\s+from\s+['"][^'"]+['"];\r?\n?/gm, '')
    .replace(/^export function /gm, 'function ');

  const himalayaExtractorSource = readFileSync(himalayaExtractorPath, 'utf8')
    .replace(/^import\s+type\s+\{[^}]+\}\s+from\s+['"][^'"]+['"];\r?\n?/gm, '')
    .replace(/^import\s+\{[^}]+\}\s+from\s+['"]\.\.\/\.\.\/shared\/question-fingerprint\.js['"];\r?\n?/gm, '')
    .replace(/^import\s+\{[^}]+\}\s+from\s+['"]\.\/himalaya-debug\.js['"];\r?\n?/gm, '')
    .replace(/^export function /gm, 'function ');

  const himalayaProviderSource = readFileSync(himalayaProviderPath, 'utf8')
    .replace(/^import\s+type\s+\{[^}]+\}\s+from\s+['"][^'"]+['"];\r?\n?/gm, '')
    .replace(/^import\s+\{[^}]+\}\s+from\s+['"]\.\/himalaya-extractor\.js['"];\r?\n?/gm, '')
    .replace(/^export const /gm, 'const ')
    .replace(/^export function /gm, 'function ');

  const questionLifecycleSource = readFileSync(questionLifecyclePath, 'utf8')
    .replace(/^import\s+.*from\s+['"][^'"]+['"];\r?\n?/gm, '')
    .replace(/^export function /gm, 'function ');

  const contentScriptSource = readFileSync(contentScriptPath, 'utf8')
    .replace(/^import\s+.*from\s+['"][^'"]+['"];\r?\n?/gm, '');

  const bundledSource = [
    '(() => {',
    selectorsSource.trim(),
    '',
    questionReviewStateSource.trim(),
    '',
    pageClassificationSource.trim(),
    '',
    questionFingerprintSource.trim(),
    '',
    himalayaDebugSource.trim(),
    '',
    himalayaExtractorSource.trim(),
    '',
    himalayaProviderSource.trim(),
    '',
    extractorSource.trim(),
    '',
    questionLifecycleSource.trim(),
    '',
    contentScriptSource.trim(),
    '})();',
    '',
  ].join('\n');

  if (/^\s*import\s/m.test(bundledSource) || /^\s*export\s/m.test(bundledSource)) {
    throw new Error('Classic content script bundle still contains ESM syntax.');
  }

  writeFileSync(contentScriptPath, bundledSource);
}

rmSync(distDir, { recursive: true, force: true });

const tscResult = spawnSync(
  process.execPath,
  [path.join(repoRoot, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', path.join(extensionRoot, 'tsconfig.json')],
  {
    cwd: repoRoot,
    stdio: 'inherit',
  }
);

if (tscResult.status !== 0) {
  process.exit(tscResult.status ?? 1);
}

mkdirSync(distDir, { recursive: true });
cpSync(iconsSourceDir, path.join(distDir, builtPaths.iconsDir), { recursive: true });
buildClassicContentScriptBundle();

const manifestTemplate = readFileSync(manifestTemplatePath, 'utf8');
const manifest = manifestTemplate
  .replace('__APP_ORIGIN__', configuredAppOrigin.replace(/\/+$/, ''))
  .replace('__BACKGROUND_SERVICE_WORKER__', builtPaths.backgroundServiceWorker)
  .replace('__SIDEPANEL_HTML__', builtPaths.sidepanelHtml)
  .replace('__CONTENT_SCRIPT__', builtPaths.contentScript);

writeFileSync(path.join(distDir, 'manifest.json'), manifest);

const builtSidepanelHtml = readFileSync(sidepanelHtmlPath, 'utf8').replace(
  '__SIDEPANEL_ENTRY__',
  builtPaths.sidepanelEntry
);
writeFileSync(path.join(distDir, 'sidepanel.html'), builtSidepanelHtml);

const requiredBuildArtifacts = [
  builtPaths.backgroundServiceWorker,
  builtPaths.contentScript,
  builtPaths.sidepanelEntry,
  builtPaths.sidepanelHtml,
  path.join(builtPaths.iconsDir, 'brobot-16.png'),
  path.join(builtPaths.iconsDir, 'brobot-32.png'),
  path.join(builtPaths.iconsDir, 'brobot-48.png'),
  path.join(builtPaths.iconsDir, 'brobot-128.png'),
];

for (const relativePath of requiredBuildArtifacts) {
  const absolutePath = path.join(distDir, relativePath);
  try {
    readFileSync(absolutePath, 'utf8');
  } catch (error) {
    console.error(`Missing expected extension build artifact: ${relativePath}`);
    process.exit(1);
  }
}

const generatedManifestPath = path.join(distDir, 'manifest.json');
const generatedManifest = JSON.parse(readFileSync(generatedManifestPath, 'utf8'));
const serviceWorkerPath = generatedManifest?.background?.service_worker;
if (serviceWorkerPath !== builtPaths.backgroundServiceWorker) {
  console.error(`Unexpected background service worker in generated manifest: ${serviceWorkerPath}`);
  process.exit(1);
}

const generatedBackgroundPath = path.join(distDir, serviceWorkerPath);
const generatedBackgroundSource = readFileSync(generatedBackgroundPath, 'utf8');
const generatedRoutingSource = readFileSync(path.join(distDir, 'shared', 'brobot-routing.js'), 'utf8');
const generatedBuildInfoSource = readFileSync(path.join(distDir, 'shared', 'build-info.js'), 'utf8');
const generatedSidepanelSource = [
  readFileSync(path.join(distDir, builtPaths.sidepanelEntry), 'utf8'),
  readFileSync(path.join(distDir, 'sidepanel', 'App.js'), 'utf8'),
  readFileSync(path.join(distDir, 'sidepanel', 'question-tutor-controller.js'), 'utf8'),
].join('\n');

const requiredGeneratedNeedles = [
  ['background service worker', generatedBackgroundSource, '2026-07-19-rock-curriculum-contract-v2'],
  ['background service worker', generatedBackgroundSource, 'brobot:request'],
  ['background service worker', generatedBackgroundSource, 'endpoint_resolution'],
  ['background service worker', generatedBackgroundSource, 'Routing invariant violated'],
  ['routing helper', generatedRoutingSource, 'curriculum_explain'],
  ['routing helper', generatedRoutingSource, '/api/brobot/curriculum/explain'],
  ['build info', generatedBuildInfoSource, '2026-07-19-rock-curriculum-contract-v2'],
  ['build info', generatedBuildInfoSource, 'curriculum-explain-v2'],
  ['sidepanel entry', generatedSidepanelSource, 'brobot:request'],
  ['sidepanel entry', generatedSidepanelSource, '2026-07-19-rock-curriculum-contract-v2'],
];

for (const [label, source, needle] of requiredGeneratedNeedles) {
  if (!source.includes(needle)) {
    console.error(`Generated ${label} is missing required marker: ${needle}`);
    process.exit(1);
  }
}

console.log(
  JSON.stringify(
    {
      extension: 'orthobullets-brobot',
      distDir,
      appOrigin: configuredAppOrigin.replace(/\/+$/, ''),
      builtPaths,
    },
    null,
    2
  )
);
