const workspaceRoot = new URL('../', import.meta.url);
const srcRoot = new URL('../src/', import.meta.url);

export async function resolve(specifier, context, defaultResolve) {
  if (specifier.startsWith('@/')) {
    const resolvedUrl = new URL(specifier.slice(2), srcRoot);

    try {
      return await defaultResolve(resolvedUrl.href, context, defaultResolve);
    } catch {
      try {
        return await defaultResolve(new URL(`${specifier.slice(2)}.ts`, srcRoot).href, context, defaultResolve);
      } catch {
        return defaultResolve(new URL(`${specifier.slice(2)}/index.ts`, srcRoot).href, context, defaultResolve);
      }
    }
  }

  if (
    (specifier.startsWith('./') || specifier.startsWith('../')) &&
    !/\.[a-z0-9]+$/i.test(specifier)
  ) {
    try {
      return await defaultResolve(`${specifier}.ts`, context, defaultResolve);
    } catch {
      return defaultResolve(specifier, context, defaultResolve);
    }
  }

  if (specifier.startsWith('/')) {
    return defaultResolve(new URL(specifier.slice(1), workspaceRoot).href, context, defaultResolve);
  }

  return defaultResolve(specifier, context, defaultResolve);
}
