import { getSignedUrl } from "@aws-sdk/cloudfront-signer";
import {
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

export const AWS_STORAGE_PROVIDER = "aws_s3";

export type AnkiAwsStorageConfig = {
  region: string;
  bucket: string;
  cloudFrontDomain: string;
  cloudFrontKeyPairId: string;
  cloudFrontPrivateKey: string;
};

function required(name: string, env: NodeJS.ProcessEnv): string {
  const value = env[name]?.trim();
  if (!value) throw new Error(`missing_environment:${name}`);
  return value;
}

export function loadAnkiAwsStorageConfig(
  env: NodeJS.ProcessEnv = process.env,
): AnkiAwsStorageConfig {
  return {
    region: env.AWS_REGION?.trim() || "us-east-1",
    bucket: required("SNAPORTHO_ANKI_AWS_BUCKET", env),
    cloudFrontDomain: required("SNAPORTHO_ANKI_CLOUDFRONT_DOMAIN", env)
      .replace(/^https?:\/\//, "")
      .replace(/\/+$/, ""),
    cloudFrontKeyPairId: required("SNAPORTHO_ANKI_CLOUDFRONT_KEY_PAIR_ID", env),
    cloudFrontPrivateKey: required(
      "SNAPORTHO_ANKI_CLOUDFRONT_PRIVATE_KEY",
      env,
    ).replace(/\\n/g, "\n"),
  };
}

export function awsObjectUrl(
  config: AnkiAwsStorageConfig,
  objectKey: string,
): string {
  const encoded = objectKey
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `https://${config.cloudFrontDomain}/${encoded}`;
}

export function signAnkiAwsDownload(
  objectKey: string,
  expiresInSeconds: number,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const config = loadAnkiAwsStorageConfig(env);
  return getSignedUrl({
    url: awsObjectUrl(config, objectKey),
    keyPairId: config.cloudFrontKeyPairId,
    privateKey: config.cloudFrontPrivateKey,
    dateLessThan: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
  });
}

export async function uploadAnkiAwsObject(params: {
  objectKey: string;
  body: Buffer | Uint8Array;
  contentType: string;
  checksumSha256: string;
  metadata?: Record<string, string>;
  onProgress?: (uploaded: number, total?: number) => void;
  env?: NodeJS.ProcessEnv;
}): Promise<{ bucket: string; objectKey: string; byteSize: number }> {
  const env = params.env ?? process.env;
  const config = loadAnkiAwsStorageConfig(env);
  const client = new S3Client({ region: config.region });
  const upload = new Upload({
    client,
    params: {
      Bucket: config.bucket,
      Key: params.objectKey,
      Body: params.body,
      ContentType: params.contentType,
      CacheControl: "public, max-age=31536000, immutable",
      Metadata: {
        sha256: params.checksumSha256,
        ...params.metadata,
      },
    },
    queueSize: 4,
    partSize: 16 * 1024 * 1024,
    leavePartsOnError: false,
  });
  upload.on("httpUploadProgress", (progress) => {
    params.onProgress?.(progress.loaded ?? 0, progress.total);
  });
  await upload.done();

  const head = await client.send(
    new HeadObjectCommand({ Bucket: config.bucket, Key: params.objectKey }),
  );
  const expected = params.body.byteLength;
  if (head.ContentLength !== expected) {
    throw new Error(
      `aws_object_size_mismatch:expected=${expected}:got=${head.ContentLength ?? "missing"}`,
    );
  }
  if (head.Metadata?.sha256 !== params.checksumSha256) {
    throw new Error("aws_object_checksum_metadata_mismatch");
  }
  return {
    bucket: config.bucket,
    objectKey: params.objectKey,
    byteSize: expected,
  };
}

export async function downloadAnkiAwsObject(
  objectKey: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<Buffer> {
  const config = loadAnkiAwsStorageConfig(env);
  const response = await new S3Client({ region: config.region }).send(
    new GetObjectCommand({ Bucket: config.bucket, Key: objectKey }),
  );
  if (!response.Body) throw new Error(`aws_object_empty:${objectKey}`);
  return Buffer.from(await response.Body.transformToByteArray());
}
