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
