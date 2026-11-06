import { google } from "googleapis";
import { Readable } from "stream";
import { WorkbookConflictError } from "@/lib/errors";

const SCOPE = "https://www.googleapis.com/auth/drive";
const MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getAuth() {
  const email = requiredEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  const rawKey = requiredEnv("GOOGLE_PRIVATE_KEY");
  const key = rawKey.replace(/\\n/g, "\n");
  return new google.auth.JWT({ email, key, scopes: [SCOPE] });
}

function fileId(): string {
  return requiredEnv("GOOGLE_DRIVE_FILE_ID");
}

export interface DownloadedWorkbook {
  buffer: Buffer;
  version: string;
}

export async function downloadWorkbook(): Promise<DownloadedWorkbook> {
  const auth = getAuth();
  const drive = google.drive({ version: "v3", auth });

  const meta = await drive.files.get({ fileId: fileId(), fields: "modifiedTime" });
  const version = meta.data.modifiedTime || "";

  const res = await drive.files.get(
    { fileId: fileId(), alt: "media" },
    { responseType: "arraybuffer" }
  );

  return { buffer: Buffer.from(res.data as ArrayBuffer), version };
}

export async function uploadWorkbook(buffer: Buffer, expectedVersion: string): Promise<string> {
  const auth = getAuth();
  const drive = google.drive({ version: "v3", auth });

  const meta = await drive.files.get({ fileId: fileId(), fields: "modifiedTime" });
  const currentVersion = meta.data.modifiedTime || "";
  if (currentVersion !== expectedVersion) {
    throw new WorkbookConflictError();
  }

  const updated = await drive.files.update({
    fileId: fileId(),
    media: {
      mimeType: MIME,
      body: Readable.from(buffer),
    },
    fields: "modifiedTime",
  });

  return updated.data.modifiedTime || "";
}

export async function getDriveFileMeta(): Promise<{ name: string; modifiedTime: string | null }> {
  const auth = getAuth();
  const drive = google.drive({ version: "v3", auth });
  const res = await drive.files.get({ fileId: fileId(), fields: "name,modifiedTime" });
  return { name: res.data.name || "", modifiedTime: res.data.modifiedTime || null };
}