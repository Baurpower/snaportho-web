import { createHash } from "node:crypto";

export function sanitizeBroBotKgQuery(value: string): string {
  return value
    .replace(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}\b/g, "[redacted-name]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted-email]")
    .replace(/\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g, "[redacted-phone]")
    .replace(/\b(?:mrn|medical record|accession|acct|account|room)\s*[:#-]?\s*[a-z0-9-]{3,}\b/gi, "[redacted-identifier]")
    .replace(/\b(?:dob|date of birth)\s*[:#-]?\s*[0-9/-]{4,10}\b/gi, "[redacted-dob]")
    .replace(/\b\d{7,}\b/g, "[redacted-identifier]")
    .replace(/\b\d{1,5}\s+[A-Za-z0-9.' -]+\s(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr)\b/gi, "[redacted-address]")
    .slice(0, 500);
}

export function hashBroBotKgQuery(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export function shouldStoreSanitizedKgQuery(): boolean {
  return process.env.BROBOT_KG_STORE_SANITIZED_QUERY === "true";
}
