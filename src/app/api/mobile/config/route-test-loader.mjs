import { resolve as pathResolve } from 'node:path';
import { existsSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';

const repoRoot = pathResolve(fileURLToPath(new URL('../../../../../', import.meta.url)));
const srcRoot = pathResolve(repoRoot, 'src');
const shimUrl = pathToFileURL(
  pathResolve(srcRoot, 'app/api/mobile/config/next-server-test-shim.mjs')
).href;

export function resolve(specifier, context, nextResolve) {
  if (specifier === 'next/server') {
    return nextResolve(shimUrl, context);
  }

  if (specifier.startsWith('@/')) {
    const resolvedPath = pathResolve(srcRoot, specifier.slice(2));
    const resolved = pathToFileURL(
      existsSync(resolvedPath) ? resolvedPath : `${resolvedPath}.ts`
    ).href;
    return nextResolve(resolved, context);
  }

  if (
    specifier.startsWith('.') &&
    !specifier.endsWith('.js') &&
    !specifier.endsWith('.mjs') &&
    !specifier.endsWith('.ts') &&
    context.parentURL
  ) {
    const resolved = new URL(`${specifier}.ts`, context.parentURL);
    if (existsSync(fileURLToPath(resolved))) {
      return nextResolve(resolved.href, context);
    }
  }

  return nextResolve(specifier, context);
}
