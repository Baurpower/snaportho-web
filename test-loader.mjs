import { resolve as pathResolve } from "path";
import { pathToFileURL, fileURLToPath } from "url";

const srcRoot = pathResolve(fileURLToPath(new URL(".", import.meta.url)), "src");

export function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const resolved = pathToFileURL(
      pathResolve(srcRoot, specifier.slice(2))
    ).href;
    return nextResolve(resolved, context);
  }
  return nextResolve(specifier, context);
}
