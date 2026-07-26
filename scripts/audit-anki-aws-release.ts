import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";
import {
  AWS_STORAGE_PROVIDER,
  signAnkiAwsDownload,
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
  const envFile = arg("env-file") ?? resolve(process.cwd(), ".env.local");
  const fileEnv = loadEnvFile(resolve(envFile));
  const env = { ...fileEnv, ...process.env };
  const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const releaseIdArg = arg("release-id");
  type Release = {
    id: string;
    release_key: string;
    release_version: string;
    status: string;
    published_at: string;
  };
  type Artifact = {
    artifact_type: string;
    artifact_checksum: string;
    byte_size: number;
    object_key: string;
    status: string;
    storage_provider: string;
    storage_bucket: string | null;
    delivery_metadata: Record<string, unknown> | null;
  };
  type Asset = {
    content_sha256: string;
    byte_size: number;
    object_key: string;
    storage_provider: string;
    storage_bucket: string | null;
  };
  let release: Release | undefined;
  let artifacts: Artifact[] = [];
  let assets: Asset[] = [];

  if (url && serviceKey && !serviceKey.includes("placeholder")) {
    const supabase = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    let releaseQuery = supabase
      .from("anki_deck_releases")
      .select("id,release_key,release_version,status,published_at")
      .eq("status", "published");
    releaseQuery = releaseIdArg
      ? releaseQuery.eq("id", releaseIdArg)
      : releaseQuery.order("published_at", { ascending: false }).limit(1);
    const { data: releaseRows, error: releaseError } = await releaseQuery;
    if (!releaseError) {
      release = releaseRows?.[0] as Release | undefined;
      if (release) {
        const artifactResult = await supabase
          .from("anki_deck_release_artifacts")
          .select(
            "artifact_type,artifact_checksum,byte_size,object_key,status,storage_provider,storage_bucket,delivery_metadata",
          )
          .eq("deck_release_id", release.id)
          .eq("status", "published");
        if (artifactResult.error)
          throw new Error(`artifact_lookup:${artifactResult.error.message}`);
        artifacts = (artifactResult.data ?? []) as Artifact[];
        const pageSize = 1000;
        for (let from = 0; ; from += pageSize) {
          const mediaResult = await supabase
            .from("anki_deck_media_assets")
            .select(
              "content_sha256,byte_size,object_key,storage_provider,storage_bucket",
            )
            .eq("deck_release_id", release.id)
            .neq("license_status", "excluded")
            .range(from, from + pageSize - 1);
          if (mediaResult.error)
            throw new Error(`media_lookup:${mediaResult.error.message}`);
          assets.push(...((mediaResult.data ?? []) as Asset[]));
          if (!mediaResult.data || mediaResult.data.length < pageSize) break;
        }
      }
    }
  }

  const hasPostgresParts =
    env.POSTGRES_HOST &&
    env.POSTGRES_USER &&
    env.POSTGRES_PASSWORD &&
    env.POSTGRES_DB;
  if (!release && (env.DATABASE_URL || hasPostgresParts)) {
    const database = new Client({
      ...(env.DATABASE_URL
        ? { connectionString: env.DATABASE_URL }
        : {
            host: env.POSTGRES_HOST,
            port: Number(env.POSTGRES_PORT || 5432),
            user: env.POSTGRES_USER,
            password: env.POSTGRES_PASSWORD,
            database: env.POSTGRES_DB,
          }),
      ssl: { rejectUnauthorized: false },
    });
    await database.connect();
    try {
      const releaseResult = releaseIdArg
        ? await database.query<Release>(
            `select id, release_key, release_version, status, published_at
               from anki_deck_releases
              where id = $1 and status = 'published'
              limit 1`,
            [releaseIdArg],
          )
        : await database.query<Release>(
            `select id, release_key, release_version, status, published_at
               from anki_deck_releases
              where status = 'published'
              order by published_at desc
              limit 1`,
          );
      release = releaseResult.rows[0];
      if (release) {
        artifacts = (
          await database.query<Artifact>(
            `select artifact_type, artifact_checksum, byte_size, object_key,
                    status, storage_provider, storage_bucket, delivery_metadata
               from anki_deck_release_artifacts
              where deck_release_id = $1 and status = 'published'`,
            [release.id],
          )
        ).rows;
        assets = (
          await database.query<Asset>(
            `select content_sha256, byte_size, object_key,
                    storage_provider, storage_bucket
               from anki_deck_media_assets
              where deck_release_id = $1 and license_status <> 'excluded'`,
            [release.id],
          )
        ).rows;
      }
    } finally {
      await database.end();
    }
  }
  if (!release) throw new Error("published_release_not_found");

  const providers = assets.reduce<Record<string, { count: number; bytes: number }>>(
    (summary, asset) => {
      const provider = asset.storage_provider || "missing";
      summary[provider] ??= { count: 0, bytes: 0 };
      summary[provider].count += 1;
      summary[provider].bytes += Number(asset.byte_size || 0);
      return summary;
    },
    {},
  );
  const bootstrap = artifacts.find(
    (artifact) => artifact.artifact_type === "bootstrap_apkg",
  );
  let cloudFrontRangeStatus: number | null = null;
  if (
    bootstrap?.storage_provider === AWS_STORAGE_PROVIDER &&
    bootstrap.object_key
  ) {
    const signedUrl = signAnkiAwsDownload(bootstrap.object_key, 300, env);
    const response = await fetch(signedUrl, {
      headers: { Range: "bytes=0-31" },
    });
    cloudFrontRangeStatus = response.status;
    const prefix = Buffer.from(await response.arrayBuffer());
    if (
      ![200, 206].includes(response.status) ||
      prefix.subarray(0, 4).toString("hex") !== "504b0304"
    ) {
      throw new Error(
        `cloudfront_bootstrap_invalid:status=${response.status}:prefix=${prefix
          .subarray(0, 4)
          .toString("hex")}`,
      );
    }
  }

  const awsAssets = providers[AWS_STORAGE_PROVIDER]?.count ?? 0;
  const complete =
    bootstrap?.storage_provider === AWS_STORAGE_PROVIDER &&
    assets.length > 0 &&
    awsAssets === assets.length &&
    [200, 206].includes(cloudFrontRangeStatus ?? 0);
  console.log(
    JSON.stringify(
      {
        release,
        bootstrap,
        media: {
          total: assets.length,
          providers,
          fullyOnAws: assets.length > 0 && awsAssets === assets.length,
        },
        cloudFrontRangeStatus,
        complete,
      },
      null,
      2,
    ),
  );
  if (process.argv.includes("--require-aws") && !complete) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
