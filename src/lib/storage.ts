import { mkdir, writeFile, readFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { put } from "@vercel/blob";

const STORAGE_ROOT = path.join(process.cwd(), "storage", "faxes");

function useBlob() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function ensureStorageDir() {
  await mkdir(STORAGE_ROOT, { recursive: true });
}

/**
 * Saves a PDF and returns either a Vercel Blob URL or a local filename.
 */
export async function saveFaxPdf(
  buffer: Buffer,
  prefix = "fax"
): Promise<string> {
  const filename = `${prefix}-${randomUUID()}.pdf`;

  if (useBlob()) {
    const blob = await put(`faxes/${filename}`, buffer, {
      access: "public",
      contentType: "application/pdf",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return blob.url;
  }

  await ensureStorageDir();
  const fullPath = path.join(STORAGE_ROOT, filename);
  await writeFile(fullPath, buffer);
  return filename;
}

export function resolveFaxPath(mediaPath: string): string {
  const safe = path.basename(mediaPath);
  return path.join(STORAGE_ROOT, safe);
}

export async function readFaxPdf(mediaPath: string): Promise<Buffer> {
  if (mediaPath.startsWith("http://") || mediaPath.startsWith("https://")) {
    const res = await fetch(mediaPath);
    if (!res.ok) {
      throw new Error(`Failed to fetch blob media (${res.status})`);
    }
    return Buffer.from(await res.arrayBuffer());
  }

  return readFile(resolveFaxPath(mediaPath));
}
