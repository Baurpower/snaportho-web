// app/sitemap.ts
import type { MetadataRoute } from "next";
import { globby } from "globby";

export const runtime = "nodejs";

const baseUrl = "https://snap-ortho.com";
const LAST_MOD = new Date(process.env.SITEMAP_LASTMOD ?? "2026-02-19");

const EXCLUDED_GROUPS = ["(auth)", "(admin)", "(dashboard)", "(private)", "(internal)"];

// Helpers
function normalizeSlashes(route: string) {
  return route.replace(/\/+/g, "/");
}
function stripRouteGroups(route: string) {
  return route.replace(/\/\([^/]+\)/g, "");
}
function stripParallelRoutes(route: string) {
  return route.replace(/\/@[^/]+/g, "");
}
function stripIndex(route: string) {
  if (route === "/index") return "/";
  return route.replace(/\/index$/g, "");
}
function ensureLeadingSlash(route: string) {
  return route.startsWith("/") ? route : `/${route}`;
}
function cleanRoute(route: string) {
  route = route.trim();
  route = stripRouteGroups(route);
  route = stripParallelRoutes(route);
  route = normalizeSlashes(route);
  route = stripIndex(route);
  route = ensureLeadingSlash(route);
  if (route === "") route = "/";
  return route;
}
function isDynamic(route: string) {
  return route.includes("[") || route.includes("]");
}
function isProbablyPrivate(route: string) {
  const BLOCKED_PREFIXES = ["/onboarding", "/learn/settings", "/fundraising/thankyou", "/account"];
  return BLOCKED_PREFIXES.some((p) => route === p || route.startsWith(`${p}/`));
}

// Escape parentheses for glob safety
const esc = (s: string) => s.replace(/\(/g, "\\(").replace(/\)/g, "\\)");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Exclude route groups in BOTH layouts
  const excludedGroupGlobs = EXCLUDED_GROUPS.flatMap((g) => {
    const gg = esc(g);
    return [
      `!app/${gg}/**`,
      `!app/**/${gg}/**`,
      `!src/app/${gg}/**`,
      `!src/app/**/${gg}/**`,
    ];
  });

  // App Router pages (BOTH layouts)
  const appPagePaths = await globby([
    "app/**/page.{ts,tsx,js,jsx,md,mdx}",
    "src/app/**/page.{ts,tsx,js,jsx,md,mdx}",
    "!**/api/**",
    ...excludedGroupGlobs,
  ]);

  // Pages Router pages (BOTH layouts)
  const pagesPagePaths = await globby([
    "pages/**/*.{ts,tsx,js,jsx,md,mdx}",
    "src/pages/**/*.{ts,tsx,js,jsx,md,mdx}",
    "!**/api/**",
    "!**/_app.*",
    "!**/_document.*",
    "!**/_error.*",
    "!**/404.*",
    "!**/500.*",
  ]);

  const routes = new Set<string>();

  for (const filePath of appPagePaths) {
    let route = filePath
      .replace(/^src\/app/, "")
      .replace(/^app/, "")
      .replace(/\/page\.(ts|tsx|js|jsx|md|mdx)$/, "");

    route = cleanRoute(route);

    if (isDynamic(route)) continue;
    if (isProbablyPrivate(route)) continue;

    routes.add(route);
  }

  for (const filePath of pagesPagePaths) {
    let route = filePath
      .replace(/^src\/pages/, "")
      .replace(/^pages/, "")
      .replace(/\.(ts|tsx|js|jsx|md|mdx)$/, "");

    route = cleanRoute(route);

    if (isDynamic(route)) continue;
    if (isProbablyPrivate(route)) continue;

    routes.add(route);
  }

  return Array.from(routes)
    .sort((a, b) => a.localeCompare(b))
    .map((route) => ({
      url: new URL(route.replace(/\s+/g, ""), baseUrl).toString(),
      lastModified: LAST_MOD,
    }));
}