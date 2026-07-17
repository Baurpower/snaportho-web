import { readFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const distDir = path.join(repoRoot, 'extensions', 'orthobullets-brobot', 'dist');
const manifestPath = path.join(distDir, 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const serviceWorker = manifest?.background?.service_worker;

if (serviceWorker !== 'background.js') {
  throw new Error(`Expected background.js service worker, got ${String(serviceWorker)}`);
}

const backgroundPath = path.join(distDir, serviceWorker);
const backgroundSource = readFileSync(backgroundPath, 'utf8');
const routingSource = readFileSync(path.join(distDir, 'shared', 'brobot-routing.js'), 'utf8');
const buildInfoSource = readFileSync(path.join(distDir, 'shared', 'build-info.js'), 'utf8');
const sidepanelSource = [
  readFileSync(path.join(distDir, 'sidepanel', 'main.js'), 'utf8'),
  readFileSync(path.join(distDir, 'sidepanel', 'App.js'), 'utf8'),
  readFileSync(path.join(distDir, 'sidepanel', 'question-tutor-controller.js'), 'utf8'),
].join('\n');

const assertions = [
  ['background service worker', backgroundSource, '2026-07-12-rock-curriculum-routing-v3'],
  ['background service worker', backgroundSource, 'brobot:request'],
  ['background service worker', backgroundSource, 'endpoint_resolution'],
  ['background service worker', backgroundSource, 'Routing invariant violated'],
  ['routing helper', routingSource, 'curriculum_explain'],
  ['routing helper', routingSource, '/api/brobot/curriculum/explain'],
  ['routing helper', routingSource, '/api/brobot/orthobullets/explain'],
  ['build info', buildInfoSource, '2026-07-12-rock-curriculum-routing-v3'],
  ['build info', buildInfoSource, 'curriculum-task-routing-v1'],
  ['sidepanel entry', sidepanelSource, 'brobot:request'],
  ['sidepanel entry', sidepanelSource, 'BroBot curriculum click'],
];

for (const [label, source, needle] of assertions) {
  if (!source.includes(needle)) {
    throw new Error(`${label} is missing ${needle}`);
  }
}

console.log(
  JSON.stringify(
    {
      ok: true,
      manifestPath,
      backgroundPath,
      expectedChromeLoadUnpackedDirectory: distDir,
      extensionBuildId: '2026-07-12-rock-curriculum-routing-v3',
      routingContractVersion: 'curriculum-task-routing-v1',
      forbiddenCurriculumEndpoint: '/api/brobot/orthobullets/explain',
      requiredCurriculumEndpoint: '/api/brobot/curriculum/explain',
    },
    null,
    2
  )
);
