import assert from "node:assert/strict";
import sharp from "sharp";
import { sanitizeEducationalImage, validateEducationalCaption } from "./processor";
import { MYCASES_MEDIA_MAX_UPLOAD_BYTES, MyCasesMediaError } from "./types";

const png = await sharp({ create:{ width:120, height:80, channels:3, background:{r:20,g:100,b:180} } }).png().toBuffer();
const sanitized = await sanitizeEducationalImage(png,"image/png");
const cleanMetadata = await sharp(sanitized.image).metadata();
const thumbnailMetadata = await sharp(sanitized.thumbnail).metadata();
assert.equal(cleanMetadata.format,"webp"); assert.equal(cleanMetadata.exif,undefined); assert.equal(cleanMetadata.icc,undefined);
assert.equal(sanitized.width,120); assert.equal(sanitized.height,80); assert.equal(sanitized.checksum.length,64);
assert((thumbnailMetadata.width??0)<=480); assert((thumbnailMetadata.height??0)<=480);

const jpegWithMetadata = await sharp({ create:{ width:20,height:20,channels:3,background:"red" } }).jpeg().withMetadata({ orientation:6 }).toBuffer();
const cleanedJpeg = await sanitizeEducationalImage(jpegWithMetadata,"image/jpeg");
assert.equal((await sharp(cleanedJpeg.image).metadata()).exif,undefined);

await assert.rejects(()=>sanitizeEducationalImage(Buffer.from("%PDF-1.7"),"image/jpeg"),(e:unknown)=>e instanceof MyCasesMediaError&&e.code==="unsupported_format");
await assert.rejects(()=>sanitizeEducationalImage(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>") ,"image/png"),(e:unknown)=>e instanceof MyCasesMediaError&&e.code==="unsupported_format");
await assert.rejects(()=>sanitizeEducationalImage(Buffer.concat([Buffer.alloc(128),Buffer.from("DICM")]),"image/jpeg"),(e:unknown)=>e instanceof MyCasesMediaError&&e.code==="unsupported_format");
await assert.rejects(()=>sanitizeEducationalImage(png,"image/jpeg"),(e:unknown)=>e instanceof MyCasesMediaError&&e.code==="magic_mismatch");
await assert.rejects(()=>sanitizeEducationalImage(Buffer.concat([png,Buffer.from("%PDF-1.7")]),"image/png"),(e:unknown)=>e instanceof MyCasesMediaError&&(e.code==="unsupported_format"||e.code==="polyglot_rejected"));
await assert.rejects(()=>sanitizeEducationalImage(Buffer.alloc(MYCASES_MEDIA_MAX_UPLOAD_BYTES+1),"image/jpeg"),(e:unknown)=>e instanceof MyCasesMediaError&&e.code==="file_too_large");
const tooWide = await sharp({create:{width:8001,height:1,channels:3,background:"blue"}}).png().toBuffer();
await assert.rejects(()=>sanitizeEducationalImage(tooWide,"image/png"),(e:unknown)=>e instanceof MyCasesMediaError&&e.code==="dimensions_exceeded");
assert.equal(validateEducationalCaption("  teaching view  "),"teaching view");
assert.throws(()=>validateEducationalCaption("x".repeat(501)),(e:unknown)=>e instanceof MyCasesMediaError&&e.code==="caption_too_long");
console.log("MyCases educational media processor tests passed");
