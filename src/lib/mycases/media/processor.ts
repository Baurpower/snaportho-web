import { createHash } from "node:crypto";
import sharp from "sharp";
import { MYCASES_MEDIA_CAPTION_MAX, MYCASES_MEDIA_MAX_DIMENSION, MYCASES_MEDIA_MAX_PIXELS, MYCASES_MEDIA_MAX_UPLOAD_BYTES, MyCasesMediaError } from "./types";

export type SanitizedEducationalImage = { image: Buffer; thumbnail: Buffer; width: number; height: number; checksum: string; mediaType: "image/webp" };
const allowedDeclaredTypes = new Set(["image/jpeg", "image/png", "image/heic", "image/heif"]);

export function validateEducationalCaption(value: unknown) {
  if (value == null || value === "") return null;
  if (typeof value !== "string") throw new MyCasesMediaError("invalid_caption", "Caption must be text.");
  const caption = value.trim();
  if (!caption) return null;
  if (caption.length > MYCASES_MEDIA_CAPTION_MAX) throw new MyCasesMediaError("caption_too_long", `Caption must be ${MYCASES_MEDIA_CAPTION_MAX} characters or fewer.`);
  return caption;
}

function detectedFormat(input: Buffer): "jpeg" | "png" | "heif" | null {
  if (input.length >= 3 && input[0] === 0xff && input[1] === 0xd8 && input[2] === 0xff) return "jpeg";
  if (input.length >= 8 && input.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))) return "png";
  if (input.length >= 12 && input.toString("ascii", 4, 8) === "ftyp" && ["heic","heix","hevc","hevx","mif1","msf1"].includes(input.toString("ascii", 8, 12))) return "heif";
  return null;
}

function rejectKnownUnsafeContainers(input: Buffer) {
  const head = input.subarray(0, Math.min(input.length, 4096));
  const ascii = input.toString("latin1").toLowerCase();
  if (input.indexOf(Buffer.from("%PDF")) !== -1 || ascii.includes("<svg") || ascii.startsWith("gif8") || ["II*\u0000","MM\u0000*"].includes(head.subarray(0, 4).toString("latin1")) || (input.length >= 132 && input.subarray(128,132).toString("ascii") === "DICM") || head.subarray(0,2).toString("ascii") === "MZ") {
    throw new MyCasesMediaError("unsupported_format", "Only JPEG, PNG, or supported HEIC educational images are accepted.");
  }
}

function rejectTrailingPayload(input: Buffer, format: "jpeg" | "png" | "heif") {
  if (format === "jpeg" && !(input[input.length - 2] === 0xff && input[input.length - 1] === 0xd9)) throw new MyCasesMediaError("polyglot_rejected", "The image contains unsupported trailing data.");
  if (format === "png") {
    const validEnd = input.length >= 12 && input.readUInt32BE(input.length - 12) === 0 && input.toString("ascii", input.length - 8, input.length - 4) === "IEND";
    if (!validEnd) throw new MyCasesMediaError("polyglot_rejected", "The image contains unsupported trailing data.");
  }
  if (format === "heif") {
    let offset = 0;
    while (offset < input.length) {
      if (input.length - offset < 8) throw new MyCasesMediaError("polyglot_rejected", "The image contains unsupported trailing data.");
      let size = input.readUInt32BE(offset); let header = 8;
      if (size === 0) throw new MyCasesMediaError("polyglot_rejected", "Open-ended image containers are not accepted.");
      if (size === 1) { if (input.length - offset < 16) throw new MyCasesMediaError("polyglot_rejected", "The image container is invalid."); const extended = input.readBigUInt64BE(offset + 8); if (extended > BigInt(Number.MAX_SAFE_INTEGER)) throw new MyCasesMediaError("polyglot_rejected", "The image container is too large."); size = Number(extended); header = 16; }
      if (size < header || offset + size > input.length) throw new MyCasesMediaError("polyglot_rejected", "The image container is invalid.");
      offset += size;
    }
    if (offset !== input.length) throw new MyCasesMediaError("polyglot_rejected", "The image contains unsupported trailing data.");
  }
}

export async function sanitizeEducationalImage(input: Buffer, declaredMime: string): Promise<SanitizedEducationalImage> {
  if (!input.length) throw new MyCasesMediaError("empty_file", "Choose an image to upload.");
  if (input.length > MYCASES_MEDIA_MAX_UPLOAD_BYTES) throw new MyCasesMediaError("file_too_large", "Image exceeds the 10 MB upload limit.", 413);
  if (!allowedDeclaredTypes.has(declaredMime.toLowerCase())) throw new MyCasesMediaError("unsupported_mime", "Only JPEG, PNG, or supported HEIC educational images are accepted.");
  rejectKnownUnsafeContainers(input);
  const format = detectedFormat(input);
  const expectedMime = format === "jpeg" ? "image/jpeg" : format === "png" ? "image/png" : format === "heif" ? new Set(["image/heic","image/heif"]) : null;
  if (!format || (typeof expectedMime === "string" ? expectedMime !== declaredMime.toLowerCase() : !expectedMime?.has(declaredMime.toLowerCase()))) throw new MyCasesMediaError("magic_mismatch", "The image content does not match its declared format.");
  rejectTrailingPayload(input, format);
  let metadata: sharp.Metadata;
  try { metadata = await sharp(input, { failOn: "error", limitInputPixels: MYCASES_MEDIA_MAX_PIXELS }).metadata(); }
  catch { throw new MyCasesMediaError("decode_failed", "The image could not be safely decoded."); }
  if (!metadata.width || !metadata.height) throw new MyCasesMediaError("invalid_dimensions", "The image dimensions could not be read.");
  if (metadata.width > MYCASES_MEDIA_MAX_DIMENSION || metadata.height > MYCASES_MEDIA_MAX_DIMENSION || metadata.width * metadata.height > MYCASES_MEDIA_MAX_PIXELS) throw new MyCasesMediaError("dimensions_exceeded", "Image dimensions exceed the secure processing limits.");
  try {
    const sanitized = await sharp(input, { failOn: "error", limitInputPixels: MYCASES_MEDIA_MAX_PIXELS })
      .rotate().webp({ quality: 90, effort: 4 }).toBuffer({ resolveWithObject: true });
    const thumbnail = await sharp(sanitized.data).resize({ width: 480, height: 480, fit: "inside", withoutEnlargement: true }).webp({ quality: 78, effort: 4 }).toBuffer();
    return { image: sanitized.data, thumbnail, width: sanitized.info.width, height: sanitized.info.height, checksum: createHash("sha256").update(sanitized.data).digest("hex"), mediaType: "image/webp" };
  } catch { throw new MyCasesMediaError("sanitize_failed", "The image could not be sanitized."); }
}
