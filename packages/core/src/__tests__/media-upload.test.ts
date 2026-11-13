import { describe, expect, it } from "vitest";

import { IMAGE_UPLOAD_MAX_BYTES } from "../image-upload.js";
import {
  UPLOAD_MAX_BYTES,
  VIDEO_UPLOAD_MAX_BYTES,
  checkMediaUpload,
  detectMediaFormat,
  detectVideoFormat,
} from "../media-upload.js";

function bytes(...parts: Array<number[] | string>): Uint8Array {
  const flat: number[] = [];
  for (const part of parts) {
    if (typeof part === "string") flat.push(...Array.from(part, (c) => c.charCodeAt(0)));
    else flat.push(...part);
  }
  return new Uint8Array(flat);
}

// The first bytes of what ffmpeg writes for `-c:v libx264 -movflags +faststart`:
// a 32-byte ftyp box, major brand "isom", then the moov box.
const MP4 = bytes([0, 0, 0, 32], "ftyp", "isom", [0, 0, 2, 0], "isom", "iso2", "avc1", "mp41", [0, 0, 6, 0xf4], "moov");
// ffmpeg's WebM: the EBML header (31 bytes) with DocType "webm", then the Segment.
const WEBM = bytes(
  [0x1a, 0x45, 0xdf, 0xa3, 0x9f],
  [0x42, 0x86, 0x81, 0x01, 0x42, 0xf7, 0x81, 0x01, 0x42, 0xf2, 0x81, 0x04, 0x42, 0xf3, 0x81, 0x08],
  [0x42, 0x82, 0x84],
  "webm",
  [0x42, 0x87, 0x81, 0x02, 0x42, 0x85, 0x81, 0x02],
  [0x18, 0x53, 0x80, 0x67, 0x01, 0, 0, 0, 0, 0x01, 0x19, 0x4d],
);
const JPEG = bytes([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10], "JFIF", [0x00]);
const AVIF = bytes([0, 0, 0, 28], "ftyp", "avif", [0, 0, 0, 0], "avif", "mif1", "miaf");

describe("detectVideoFormat", () => {
  it("recognises MP4 and WebM by their signature", () => {
    expect(detectVideoFormat(MP4)).toEqual({ type: "mp4", contentType: "video/mp4", extension: "mp4" });
    expect(detectVideoFormat(WEBM)).toEqual({ type: "webm", contentType: "video/webm", extension: "webm" });
  });

  it("accepts the common MP4 brands, as major or compatible brand", () => {
    for (const brand of ["mp42", "mp41", "iso2", "iso5", "avc1", "dash", "M4V "]) {
      expect(detectVideoFormat(bytes([0, 0, 0, 20], "ftyp", brand, [0, 0, 0, 0], brand))?.type).toBe("mp4");
    }
    // A brand the list does not know as major, MP4 among the compatible ones.
    expect(detectVideoFormat(bytes([0, 0, 0, 24], "ftyp", "XAVC", [0, 0, 0, 0], "XAVC", "mp42"))?.type).toBe("mp4");
  });

  it("refuses QuickTime, Matroska and the HEIF photo family", () => {
    expect(detectVideoFormat(bytes([0, 0, 0, 20], "ftyp", "qt  ", [0, 0, 2, 0], "qt  "))).toBeNull();
    // QuickTime stays QuickTime even when it lists an MP4 brand.
    expect(detectVideoFormat(bytes([0, 0, 0, 24], "ftyp", "qt  ", [0, 0, 0, 0], "qt  ", "isom"))).toBeNull();

    const mkv = new Uint8Array(WEBM);
    mkv.set(Array.from("matr", (c) => c.charCodeAt(0)), 24);
    expect(detectVideoFormat(mkv)).toBeNull();

    expect(detectVideoFormat(AVIF)).toBeNull();
    // An animated AVIF lists iso8 beside its HEIF brands; still a photo format.
    expect(detectVideoFormat(bytes([0, 0, 0, 32], "ftyp", "avis", [0, 0, 0, 0], "avis", "msf1", "iso8", "mif1"))).toBeNull();
    expect(detectVideoFormat(bytes([0, 0, 0, 24], "ftyp", "heic", [0, 0, 0, 0], "mif1", "isom"))).toBeNull();
  });

  it("refuses text and other formats, whatever the file is called", () => {
    expect(detectVideoFormat(bytes("<svg/>"))).toBeNull();
    expect(detectVideoFormat(bytes("<!doctype html><video>"))).toBeNull();
    expect(detectVideoFormat(JPEG)).toBeNull();
    expect(detectVideoFormat(bytes("RIFF", [0x24, 0, 0, 0], "AVI LIST"))).toBeNull();
    expect(detectVideoFormat(bytes("OggS", [0, 2, 0, 0, 0, 0, 0, 0]))).toBeNull();
  });

  it("does not read past a truncated header", () => {
    expect(detectVideoFormat(new Uint8Array())).toBeNull();
    expect(detectVideoFormat(bytes([0, 0, 0, 32], "ftyp", "isom"))).toBeNull();
    expect(detectVideoFormat(bytes([0, 0, 0, 8], "ftyp", "isom", [0, 0, 0, 0]))).toBeNull();
    expect(detectVideoFormat(WEBM.subarray(0, 26))).toBeNull();
    expect(detectVideoFormat(bytes([0x1a, 0x45, 0xdf, 0xa3]))).toBeNull();
    // A size field claiming more than the file holds.
    expect(detectVideoFormat(bytes([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x82, 0x88], "webm"))).toBeNull();
  });
});

describe("detectMediaFormat", () => {
  it("tells a photo from a video, AVIF staying a photo", () => {
    expect(detectMediaFormat(JPEG)).toMatchObject({ kind: "image", type: "jpeg" });
    expect(detectMediaFormat(AVIF)).toMatchObject({ kind: "image", type: "avif" });
    expect(detectMediaFormat(MP4)).toMatchObject({ kind: "video", type: "mp4", contentType: "video/mp4" });
    expect(detectMediaFormat(WEBM)).toMatchObject({ kind: "video", type: "webm" });
    expect(detectMediaFormat(bytes("<svg/>"))).toBeNull();
  });
});

describe("checkMediaUpload", () => {
  it("lets the parser take the larger limit", () => {
    expect(UPLOAD_MAX_BYTES).toBe(VIDEO_UPLOAD_MAX_BYTES);
    expect(VIDEO_UPLOAD_MAX_BYTES).toBeGreaterThan(IMAGE_UPLOAD_MAX_BYTES);
  });

  it("applies each kind's own size limit", () => {
    const video = new Uint8Array(VIDEO_UPLOAD_MAX_BYTES);
    video.set(MP4);
    expect(checkMediaUpload(video)).toMatchObject({ ok: true, format: { kind: "video" } });

    const bigVideo = new Uint8Array(VIDEO_UPLOAD_MAX_BYTES + 1);
    bigVideo.set(WEBM);
    expect(checkMediaUpload(bigVideo)).toEqual({ ok: false, reason: "too_large", kind: "video" });

    // A photo the size of a video is still too large for a photo.
    const bigPhoto = new Uint8Array(IMAGE_UPLOAD_MAX_BYTES + 1);
    bigPhoto.set(JPEG);
    expect(checkMediaUpload(bigPhoto)).toEqual({ ok: false, reason: "too_large", kind: "image" });
  });

  it("holds a field to the kind it expects", () => {
    expect(checkMediaUpload(MP4, "video")).toMatchObject({ ok: true });
    expect(checkMediaUpload(JPEG, "image")).toMatchObject({ ok: true });
    expect(checkMediaUpload(JPEG, "video")).toEqual({ ok: false, reason: "unsupported_type", kind: "video" });
    expect(checkMediaUpload(MP4, "image")).toEqual({ ok: false, reason: "unsupported_type", kind: "image" });
  });

  it("rejects empty and unrecognised files", () => {
    expect(checkMediaUpload(new Uint8Array())).toEqual({ ok: false, reason: "empty" });
    expect(checkMediaUpload(bytes("<svg/>"))).toEqual({ ok: false, reason: "unsupported_type" });
  });
});
