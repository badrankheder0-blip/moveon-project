import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { env } from "@mon/config";

/**
 * The files sent with a job application: what is accepted, and where it is kept.
 *
 * Files are written to `JOB_FILES_DIR` on the API's disk under a random name,
 * never under the applicant's own file name, and are read back only through
 * the dashboard's signed-in download. The type is decided from the bytes; the
 * browser's claim and the file's extension are ignored, because both are
 * whatever the sender typed.
 */

export const JOB_FILE_MAX_BYTES = 10 * 1024 * 1024;
export const JOB_ATTACHMENTS_MAX = 5;

export interface JobFileFormat {
  extension: "pdf" | "doc" | "docx" | "jpg" | "png";
  contentType: string;
}

const PDF: JobFileFormat = { extension: "pdf", contentType: "application/pdf" };
const DOC: JobFileFormat = { extension: "doc", contentType: "application/msword" };
const DOCX: JobFileFormat = {
  extension: "docx",
  contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};
const JPG: JobFileFormat = { extension: "jpg", contentType: "image/jpeg" };
const PNG: JobFileFormat = { extension: "png", contentType: "image/png" };

const startsWith = (bytes: Buffer, signature: number[]) => signature.every((byte, i) => bytes[i] === byte);

/**
 * What the bytes are, among the types an application may carry.
 *
 * A CV is a document (PDF, Word); an attachment may also be a photo of a
 * certificate or licence. A DOCX is a ZIP, so a ZIP must also name the
 * `word/` part to count as one — any other ZIP is refused.
 */
export function detectJobFile(bytes: Buffer, kind: "cv" | "attachment"): JobFileFormat | null {
  let format: JobFileFormat | null = null;

  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) format = PDF; // %PDF-
  else if (startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) format = DOC; // OLE2
  else if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]) && bytes.includes("word/")) format = DOCX;
  else if (startsWith(bytes, [0xff, 0xd8, 0xff])) format = JPG;
  else if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) format = PNG;

  if (!format) return null;
  if (kind === "cv" && (format === JPG || format === PNG)) return null;
  return format;
}

/** The applicant's file name, reduced to something safe to show and send back. */
export function cleanFileName(name: string, format: JobFileFormat): string {
  const base = name
    .normalize("NFC")
    .replace(/\.[^.]*$/, "")
    .replace(/[^\p{L}\p{N} ._()-]+/gu, "_")
    .trim()
    .slice(0, 80);
  return `${base || "datei"}.${format.extension}`;
}

/** Writes one file and returns the name it is stored under. */
export async function storeJobFile(bytes: Buffer, format: JobFileFormat): Promise<string> {
  await mkdir(env.JOB_FILES_DIR, { recursive: true, mode: 0o700 });
  const storedName = `${randomUUID()}.${format.extension}`;
  await writeFile(join(env.JOB_FILES_DIR, storedName), bytes, { mode: 0o600, flag: "wx" });
  return storedName;
}

/** Reads a stored file back. `storedName` comes from the database, never from a request. */
export function readJobFile(storedName: string): Promise<Buffer> {
  if (!/^[0-9a-f-]{36}\.(pdf|docx?|jpg|png)$/.test(storedName)) {
    return Promise.reject(new Error("Unexpected stored file name"));
  }
  return readFile(join(env.JOB_FILES_DIR, storedName));
}
