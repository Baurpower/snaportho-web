import crypto from "node:crypto";

function encryptionKey() {
  const encoded = process.env.PROGRAM_CALENDAR_TOKEN_ENCRYPTION_KEY?.trim();
  if (!encoded)
    throw new Error("PROGRAM_CALENDAR_TOKEN_ENCRYPTION_KEY is not configured");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32)
    throw new Error(
      "PROGRAM_CALENDAR_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key",
    );
  return key;
}

export function assertProgramCalendarTokenEncryptionConfigured() {
  encryptionKey();
}

export function encryptProgramCalendarToken(value: string | null | undefined) {
  if (!value) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${ciphertext.toString("base64url")}`;
}

export function decryptProgramCalendarToken(value: string | null | undefined) {
  if (!value) return null;
  const [version, ivRaw, tagRaw, ciphertextRaw] = value.split(".");
  if (version !== "v1" || !ivRaw || !tagRaw || !ciphertextRaw)
    throw new Error("Unsupported encrypted calendar token");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivRaw, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextRaw, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
