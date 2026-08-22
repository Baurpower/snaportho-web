import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

/**
 * Sign-out tracker encryption.
 *
 * Two independent scopes, each with its own key material:
 *   - "card":       per-patient freeform body and structured diagnostics.
 *   - "identifier": quarantined name / DOB / MRN. Never fed to the LLM path.
 *
 * AES-256-GCM (authenticated, tamper-evident). Each write gets a fresh 12-byte
 * nonce; the 16-byte auth tag is appended to the ciphertext so a single bytea
 * column holds both. Every row records the key_id it was written under, so keys
 * rotate forward (new writes use the current id, old rows decrypt under theirs)
 * with no re-encryption.
 *
 * Keys live in env vars, read through getKey() — the ONLY place that knows where
 * key material comes from. Swapping the source later touches nothing else.
 */

export type SignoutCryptoScope = "card" | "identifier";

const KEY_BYTES = 32; // AES-256
const NONCE_BYTES = 12; // GCM standard
const TAG_BYTES = 16; // GCM auth tag

export type SealedValue = {
  ct: Buffer; // ciphertext || authTag
  nonce: Buffer;
  keyId: string;
};

/**
 * Env var holding the key id to write NEW rows under, e.g. "2026-08".
 * Both scopes share the epoch id but resolve to different key material.
 */
export function currentKeyId(): string {
  const id = process.env.SIGNOUT_KEY_ID;
  if (!id || !id.trim()) {
    throw new Error("SIGNOUT_KEY_ID is not set");
  }
  return id.trim();
}

function envVarName(scope: SignoutCryptoScope, keyId: string): string {
  const normalizedId = keyId.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();
  return `SIGNOUT_KEY_${scope.toUpperCase()}_${normalizedId}`;
}

/**
 * Resolve 32 bytes of key material for a (scope, keyId). The single seam between
 * this module and wherever keys are stored. Env var value is base64 of 32 bytes.
 */
export function getKey(scope: SignoutCryptoScope, keyId: string): Buffer {
  const name = envVarName(scope, keyId);
  const raw = process.env[name];
  if (!raw || !raw.trim()) {
    throw new Error(`Missing sign-out key: ${name}`);
  }
  const key = Buffer.from(raw.trim(), "base64");
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `Sign-out key ${name} must be ${KEY_BYTES} bytes (base64), got ${key.length}`
    );
  }
  return key;
}

/** Encrypt a UTF-8 string under the current key for a scope. */
export function seal(plaintext: string, scope: SignoutCryptoScope): SealedValue {
  const keyId = currentKeyId();
  const key = getKey(scope, keyId);
  const nonce = randomBytes(NONCE_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return { ct: Buffer.concat([encrypted, tag]), nonce, keyId };
}

/** Decrypt a sealed value. Throws on a wrong key, tamper, or truncation. */
export function open(
  ct: Buffer,
  nonce: Buffer,
  keyId: string,
  scope: SignoutCryptoScope
): string {
  if (ct.length < TAG_BYTES) {
    throw new Error("Sign-out ciphertext is too short to contain an auth tag");
  }
  const key = getKey(scope, keyId);
  const encrypted = ct.subarray(0, ct.length - TAG_BYTES);
  const tag = ct.subarray(ct.length - TAG_BYTES);
  const decipher = createDecipheriv("aes-256-gcm", key, nonce);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(), // throws if the tag does not verify
  ]);
  return decrypted.toString("utf8");
}

/**
 * Constant-time compare of two buffers. Used by tests and any future
 * equality check that must not leak timing. Length mismatch is a fast false.
 */
export function buffersEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
