import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const dist = path.join(root, 'extensions', 'orthobullets-brobot', 'dist');
const outputDir = path.join(root, 'public', 'downloads');
const manifest = JSON.parse(readFileSync(path.join(dist, 'manifest.json'), 'utf8'));
const version = manifest.version;

if (!/^\d+\.\d+\.\d+(?:\.\d+)?$/.test(version)) {
  throw new Error(`Invalid Chrome extension version: ${version}`);
}

const expectedOrigin = 'https://snap-ortho.com/*';
if (!manifest.host_permissions?.includes(expectedOrigin) ||
    manifest.host_permissions.some((permission) => permission.includes('localhost') || permission.includes('127.0.0.1')) ||
    JSON.stringify(manifest).includes('__')) {
  throw new Error('Release manifest does not contain a clean production origin.');
}

const requiredFiles = [
  manifest.background?.service_worker,
  manifest.side_panel?.default_path,
  ...manifest.content_scripts.flatMap((script) => script.js),
  ...Object.values(manifest.icons),
];
for (const file of requiredFiles) {
  if (typeof file !== 'string' || !statSync(path.join(dist, file)).isFile()) {
    throw new Error(`Release manifest references a missing file: ${String(file)}`);
  }
}

function listFiles(directory, prefix = '') {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const relative = path.posix.join(prefix, entry.name);
      return entry.isDirectory()
        ? listFiles(path.join(directory, entry.name), relative)
        : [relative];
    })
    .sort();
}

mkdirSync(outputDir, { recursive: true });
const filename = `snaportho-brobot-${version}.zip`;
const output = path.join(outputDir, filename);
const files = listFiles(dist);
rmSync(output, { force: true });
const result = spawnSync('zip', ['-X', '-q', output, ...files], { cwd: dist, stdio: 'inherit' });
if (result.status !== 0) {
  throw new Error(`Unable to create extension ZIP (zip exit ${result.status ?? 'unknown'}).`);
}
const integrity = spawnSync('unzip', ['-tq', output], { stdio: 'inherit' });
if (integrity.status !== 0) {
  throw new Error('Extension ZIP failed its integrity check.');
}

const archive = readFileSync(output);
const checksum = createHash('sha256').update(archive).digest('hex');
writeFileSync(path.join(outputDir, 'snaportho-brobot-release.json'),
  `${JSON.stringify({ version, filename, sha256: checksum, sizeBytes: archive.length }, null, 2)}\n`);
console.log(JSON.stringify({ output, version, sha256: checksum, sizeBytes: archive.length }, null, 2));
