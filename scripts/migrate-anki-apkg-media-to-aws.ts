import {
  createHash,
} from "node:crypto";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import {
  AWS_STORAGE_PROVIDER,
  uploadAnkiAwsObject,
} from "../src/lib/education/anki-aws-storage.ts";

function loadEnvFile(path: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

function arg(name: string): string | null {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? null;
}

async function main() {
  const releaseId = arg("release-id");
  const apkgPath = arg("apkg");
  const baseUrl = (arg("base-url") || "https://snap-ortho.com").replace(/\/+$/, "");
  const token = process.env.SNAPORTHO_ANKI_DEVICE_TOKEN;
  if (!releaseId || !apkgPath || !token) {
    throw new Error("release-id, apkg, and SNAPORTHO_ANKI_DEVICE_TOKEN are required");
  }
  const fileEnv = loadEnvFile(resolve(process.cwd(), ".env.local"));
  const env = { ...fileEnv, ...process.env };
  const headers = {
    "Content-Type": "application/json",
    "X-SnapOrtho-Anki-Token": token,
    "X-SnapOrtho-Contract": "snaportho-anki-reviewer.v1",
    "X-SnapOrtho-Client": "reviewer-addon/0.9.3",
  };
  const manifestResponse = await fetch(
    `${baseUrl}/api/anki/deck/releases/${releaseId}/manifest`,
    { headers },
  );
  if (!manifestResponse.ok) {
    throw new Error(`manifest_request_failed:${manifestResponse.status}`);
  }
  const manifest = await manifestResponse.json();
  const assets = manifest.media ?? [];
  if (!assets.length) throw new Error("manifest_media_empty");

  const extractDir = mkdtempSync(join(tmpdir(), "snaportho-apkg-media-"));
  try {
    execFileSync("unzip", ["-q", resolve(apkgPath), "-d", extractDir]);
    const mediaMap = JSON.parse(readFileSync(join(extractDir, "media"), "utf8"));
    const archiveNameByLogical = new Map(
      Object.entries(mediaMap).map(([archiveName, logicalName]) => [
        String(logicalName),
        archiveName,
      ]),
    );
    let completed = 0;
    for (let offset = 0; offset < assets.length; offset += 50) {
      const batch = assets.slice(offset, offset + 50);
      const migrationItems = [];
      for (const asset of batch) {
        const logicalFilename = asset.logicalFilename ?? asset.logical_filename;
        const sha256 = asset.contentSha256 ?? asset.content_sha256;
        const byteSize = Number(asset.byteSize ?? asset.byte_size);
        const archiveName = archiveNameByLogical.get(logicalFilename);
        if (!archiveName) throw new Error(`apkg_media_missing:${logicalFilename}`);
        const bytes = readFileSync(join(extractDir, archiveName));
        const actualSha = createHash("sha256").update(bytes).digest("hex");
        if (actualSha !== sha256 || bytes.length !== byteSize) {
          throw new Error(`apkg_media_mismatch:${logicalFilename}`);
        }
        const objectKey = `deck-releases/${releaseId}/media/${sha256}`;
        await uploadAnkiAwsObject({
          objectKey,
          body: bytes,
          contentType: asset.mimeType ?? asset.mime_type,
          checksumSha256: sha256,
          metadata: { logicalFilename: basename(logicalFilename), releaseId },
          env,
        });
        migrationItems.push({ sha256, objectKey, byteSize });
      }
      const registerResponse = await fetch(
        `${baseUrl}/api/anki/deck/releases/${releaseId}/media/migrate-aws`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ items: migrationItems }),
        },
      );
      if (!registerResponse.ok) {
        throw new Error(
          `migration_register_failed:${registerResponse.status}:${await registerResponse.text()}`,
        );
      }
      completed += batch.length;
      console.error(JSON.stringify({ progress: "media_migration", completed, total: assets.length }));
    }
    console.log(
      JSON.stringify({
        ok: true,
        releaseId,
        migrated: completed,
        storageProvider: AWS_STORAGE_PROVIDER,
      }),
    );
  } finally {
    rmSync(extractDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
