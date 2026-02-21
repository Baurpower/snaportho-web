// app/sitemap.ts
import { MetadataRoute } from "next";
import { globby } from "globby";

export const runtime = "nodejs"; // helps if your deployment defaults to edge

const baseUrl = "https://snap-ortho.com";

function cleanRoute(route: string) {
  // remove route groups: /(group)
  route = route.replace(/\/\([^/]+\)/g, "");

  // remove parallel route segments: /@slot
  route = route.replace(/\/@[^/]+/g, "");

  // normalize multiple slashes
  route = route.replace(/\/+/g, "/");

  // empty => root
  if (route === "") route = "/";

  return route;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pagePaths = await globby([
    "src/app/**/page.tsx",
    "!src/app/**/api/**",
    "!src/app/**/admin/**",
    "!src/app/**/auth/**",
  ]);

  const urls = pagePaths
    .map((path) => {
      let route = path
        .replace(/^src\/app/, "")
        .replace(/\/page\.tsx$/, "");

      route = cleanRoute(route);

      // Exclude dynamic route templates like /foo/[id]
      if (route.includes("[") || route.includes("]")) return null;

      return {
        url: `${baseUrl}${route}`,
        lastModified: new Date("2026-02-19"), // pick a stable value (deploy date)
      };
    })
    .filter(Boolean) as MetadataRoute.Sitemap;

  return urls;
}