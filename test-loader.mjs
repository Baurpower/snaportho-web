import { resolve as pathResolve } from "path";
import { existsSync } from "fs";
import { pathToFileURL, fileURLToPath } from "url";

const srcRoot = pathResolve(fileURLToPath(new URL(".", import.meta.url)), "src");

export function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const resolvedPath = pathResolve(srcRoot, specifier.slice(2));
    const resolved = pathToFileURL(
      existsSync(resolvedPath) ? resolvedPath : `${resolvedPath}.ts`
    ).href;
    return nextResolve(resolved, context);
  }
  if (
    specifier.startsWith(".") &&
    !specifier.endsWith(".js") &&
    !specifier.endsWith(".mjs") &&
    !specifier.endsWith(".ts") &&
    context.parentURL
  ) {
    const resolved = new URL(`${specifier}.ts`, context.parentURL);
    if (existsSync(fileURLToPath(resolved))) {
      return nextResolve(resolved.href, context);
    }
  }
  return nextResolve(specifier, context);
}
