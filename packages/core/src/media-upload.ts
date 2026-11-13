/**
 * Which uploaded videos the dashboard may put on the public pages, and how a
 * single upload endpoint tells a photo from a video.
 *
 * The homepage's strip plays five short clips, so the upload that already took
 * photos takes videos too. The rule is the photos' (image-upload.ts): the type
 * is decided by the leading bytes, never by the file name or the
 * `Content-Type` the browser sent, and only formats every current browser
 * plays in a `<video>` are recognised — MP4 and WebM. Anything else, a
 * QuickTime `.mov` from a phone included, is refused rather than stored as
 * a clip half the visitors cannot see.
 *
 * Videos get their own, larger size limit. The multipart parser cannot know
 * the type before it has the bytes, so it is capped at the larger of the two
 * limits and the per-type limit is applied once the type is known.
 */

import { IMAGE_UPLOAD_MAX_BYTES, detectImageFormat, type UploadImageFormat } from "./image-upload.js";

export type UploadVideoType = "mp4" | "webm";

export interface UploadVideoFormat {
  type: UploadVideoType;
  contentType: string;
  extension: string;
}

/**
 * Room for a short full-HD loop. A strip clip should be far smaller — five of
 * them play on every homepage visit — but the limit is a ceiling against
 * abuse, not the size to aim for.
 */
export const VIDEO_UPLOAD_MAX_BYTES = 60 * 1024 * 1024;

/** What the file picker offers; the server does not trust it. */
export const VIDEO_UPLOAD_ACCEPT = "video/mp4,video/webm";

/** What the multipart parser lets through before the type is known. */
export const UPLOAD_MAX_BYTES = Math.max(IMAGE_UPLOAD_MAX_BYTES, VIDEO_UPLOAD_MAX_BYTES);

const VIDEO_FORMATS: Record<UploadVideoType, UploadVideoFormat> = {
  mp4: { type: "mp4", contentType: "video/mp4", extension: "mp4" },
  webm: { type: "webm", contentType: "video/webm", extension: "webm" },
};

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

/**
 * ISO-BMFF brands that mean "an MP4 a browser plays": the ISO base family,
 * MPEG-4 v1/v2, H.264, DASH segments and Apple's M4V (an MP4 by another name).
 */
const MP4_BRANDS = new Set(["isom", "iso2", "iso3", "iso4", "iso5", "iso6", "mp41", "mp42", "avc1", "dash", "M4V "]);

/**
 * Brands of the HEIF still-image family. AVIF and HEIC share the container,
 * and an animated AVIF lists `iso8` among its brands — it is a photo format
 * all the same, handled (or refused) by the image rule.
 */
const HEIF_BRANDS = new Set(["avif", "avis", "mif1", "mif2", "msf1", "heic", "heix", "heim", "heis", "hevc", "hevx"]);

function detectMp4(bytes: Uint8Array): UploadVideoFormat | null {
  // size(4) "ftyp" major(4) minor(4) — the shortest legal ftyp box.
  if (bytes.length < 16 || ascii(bytes, 4, 4) !== "ftyp") return null;

  const boxSize = ((bytes[0]! << 24) | (bytes[1]! << 16) | (bytes[2]! << 8) | bytes[3]!) >>> 0;
  if (boxSize < 16) return null;

  const major = ascii(bytes, 8, 4);
  const brands = [major];
  const end = Math.min(boxSize, bytes.length);
  // Offset 12 is the minor version; the compatible brands follow it.
  for (let offset = 16; offset + 4 <= end; offset += 4) brands.push(ascii(bytes, offset, 4));

  // QuickTime is ISO-BMFF's ancestor, not an MP4: Chrome and Firefox do not
  // reliably play a .mov, whatever brands it lists.
  if (major === "qt  ") return null;
  if (brands.some((brand) => HEIF_BRANDS.has(brand))) return null;

  return brands.some((brand) => MP4_BRANDS.has(brand)) ? VIDEO_FORMATS.mp4 : null;
}

/** An EBML variable-length integer: its byte length and, for a size, its value. */
function readVint(bytes: Uint8Array, offset: number): { length: number; value: number } | null {
  const first = bytes[offset];
  if (first === undefined || first === 0) return null;

  const length = Math.clz32(first) - 23; // leading zeros within the byte, plus one
  if (offset + length > bytes.length) return null;

  let value = first & (0xff >> length);
  for (let index = 1; index < length; index += 1) value = value * 256 + bytes[offset + index]!;

  return { length, value };
}

/**
 * WebM: an EBML header whose DocType is "webm". Matroska (.mkv) shares the
 * header, and Safari does not play it, so the DocType is what decides.
 */
function detectWebm(bytes: Uint8Array): UploadVideoFormat | null {
  if (bytes.length < 8 || bytes[0] !== 0x1a || bytes[1] !== 0x45 || bytes[2] !== 0xdf || bytes[3] !== 0xa3) {
    return null;
  }

  const headerSize = readVint(bytes, 4);
  if (!headerSize) return null;

  let offset = 4 + headerSize.length;
  // A real header is a few dozen bytes; the bound keeps a hostile size field
  // from sending the loop through the whole file.
  const end = Math.min(offset + headerSize.value, bytes.length, 256);

  while (offset < end) {
    // Element IDs keep their length marker: DocType is 0x42 0x82.
    const id = readVint(bytes, offset);
    if (!id) return null;
    const size = readVint(bytes, offset + id.length);
    if (!size) return null;

    const data = offset + id.length + size.length;
    if (id.length === 2 && bytes[offset] === 0x42 && bytes[offset + 1] === 0x82) {
      return data + size.value <= bytes.length && ascii(bytes, data, size.value) === "webm"
        ? VIDEO_FORMATS.webm
        : null;
    }

    offset = data + size.value;
  }

  return null;
}

/** The video format the bytes actually are, or null for anything not accepted. */
export function detectVideoFormat(bytes: Uint8Array): UploadVideoFormat | null {
  return detectMp4(bytes) ?? detectWebm(bytes);
}

export type UploadMediaKind = "image" | "video";

export type UploadMediaFormat =
  | ({ kind: "image" } & UploadImageFormat)
  | ({ kind: "video" } & UploadVideoFormat);

/** A photo or a video, by its bytes; null for anything else. */
export function detectMediaFormat(bytes: Uint8Array): UploadMediaFormat | null {
  // Images first: an AVIF is ISO-BMFF too, and must be read as the photo it is.
  const image = detectImageFormat(bytes);
  if (image) return { kind: "image", ...image };

  const video = detectVideoFormat(bytes);
  return video ? { kind: "video", ...video } : null;
}

export type MediaUploadRejection = "empty" | "too_large" | "unsupported_type";

/**
 * Checks an upload against the type and the size rules; the format when it passes.
 *
 * `expect` narrows it to one kind, for a field that only takes photos or only
 * videos. A refusal names the kind it was judged as when that is known, so a
 * "too large" message can quote the right limit.
 */
export function checkMediaUpload(
  bytes: Uint8Array,
  expect?: UploadMediaKind,
):
  | { ok: true; format: UploadMediaFormat }
  | { ok: false; reason: MediaUploadRejection; kind?: UploadMediaKind } {
  if (bytes.length === 0) return { ok: false, reason: "empty" };

  const format = detectMediaFormat(bytes);
  if (!format || (expect && format.kind !== expect)) {
    return expect ? { ok: false, reason: "unsupported_type", kind: expect } : { ok: false, reason: "unsupported_type" };
  }

  const limit = format.kind === "image" ? IMAGE_UPLOAD_MAX_BYTES : VIDEO_UPLOAD_MAX_BYTES;
  if (bytes.length > limit) return { ok: false, reason: "too_large", kind: format.kind };

  return { ok: true, format };
}
