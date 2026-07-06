/**
 * Back-compat wrapper — delegates to apply-pilot-approved.ts.
 *
 * Usage:
 *   KG_TARGET_ENV=staging npm run kg:pilot:ankle:apply-approved
 */

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const extra = process.argv.slice(2);
const args = [
  "--experimental-strip-types",
  path.join(__dirname, "apply-pilot-approved.ts"),
  "--topic",
  "ankle-fracture",
  ...extra,
];
const result = spawnSync("node", args, { stdio: "inherit", env: process.env });
process.exitCode = result.status ?? 1;