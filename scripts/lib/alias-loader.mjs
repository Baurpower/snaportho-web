import { existsSync } from "node:fs";
import { dirname, resolve as pathResolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = pathResolve(dirname(fileURLToPath(import.meta.url)), "../..");
const srcRoot = pathResolve(repoRoot, "src");

function resolveCandidate(base) {
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.mjs`,
    pathResolve(base, "index.ts"),
    pathResolve(base, "index.js"),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const hit = resolveCandidate(pathResolve(srcRoot, specifier.slice(2)));
    if (hit) return nextResolve(pathToFileURL(hit).href, context);
  }

  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    !specifier.endsWith(".js") &&
    !specifier.endsWith(".ts") &&
    !specifier.endsWith(".tsx") &&
    !specifier.endsWith(".mjs") &&
    !specifier.endsWith(".json")
  ) {
    const parentPath = context.parentURL
      ? fileURLToPath(context.parentURL)
      : pathResolve(repoRoot, "index.js");
    const hit = resolveCandidate(pathResolve(dirname(parentPath), specifier));
    if (hit) return nextResolve(pathToFileURL(hit).href, context);
  }

  return nextResolve(specifier, context);
}
