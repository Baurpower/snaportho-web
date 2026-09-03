import assert from "node:assert/strict";
import { AnkiAwsDeliveryError, awsObjectUrl, describeAnkiAwsDeliveryError, loadAnkiAwsStorageConfig, normalizeCloudFrontPrivateKey, signAnkiAwsDownload } from "./anki-aws-storage.ts";

const privateKey = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIIGEKL16ByMmJgrY1YWsk8mT0p43HnYKkU8e8LaSZ7nj
-----END PRIVATE KEY-----`;

const env: NodeJS.ProcessEnv = {
  NODE_ENV: "test",
  AWS_REGION: "us-east-1",
  SNAPORTHO_ANKI_AWS_BUCKET: "snaportho-master-deck",
  SNAPORTHO_ANKI_CLOUDFRONT_DOMAIN: "https://example.cloudfront.net/",
  SNAPORTHO_ANKI_CLOUDFRONT_KEY_PAIR_ID: "KTEST",
  SNAPORTHO_ANKI_CLOUDFRONT_PRIVATE_KEY: privateKey.replace(/\n/g, "\\n"),
};

const config = loadAnkiAwsStorageConfig(env);
assert.equal(config.cloudFrontDomain, "example.cloudfront.net");
assert.equal(config.cloudFrontPrivateKey, privateKey);
assert.equal(
  normalizeCloudFrontPrivateKey(privateKey.replace(/\n/g, " ")),
  privateKey,
);
assert.equal(
  awsObjectUrl(config, "deck releases/a+b/file.apkg"),
  "https://example.cloudfront.net/deck%20releases/a%2Bb/file.apkg",
);

assert.throws(
  () =>
    loadAnkiAwsStorageConfig({
      ...env,
      SNAPORTHO_ANKI_CLOUDFRONT_KEY_PAIR_ID: "",
    }),
  (error) => {
    assert.ok(error instanceof AnkiAwsDeliveryError);
    assert.deepEqual(describeAnkiAwsDeliveryError(error), {
      code: "cloudfront_config_missing",
      environmentVariable: "SNAPORTHO_ANKI_CLOUDFRONT_KEY_PAIR_ID",
    });
    return true;
  },
);

assert.throws(
  () =>
    signAnkiAwsDownload("deck-releases/test.apkg", 60, {
      ...env,
      SNAPORTHO_ANKI_CLOUDFRONT_PRIVATE_KEY: "not-a-private-key",
    }),
  (error) => {
    assert.ok(error instanceof AnkiAwsDeliveryError);
    assert.equal(
      describeAnkiAwsDeliveryError(error).code,
      "cloudfront_private_key_invalid",
    );
    return true;
  },
);

console.log("anki-aws-storage.test.ts: all assertions passed");
