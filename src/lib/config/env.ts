import { z } from "zod";

const envSchema = z.object({
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().min(1, "GOOGLE_SERVICE_ACCOUNT_EMAIL is required"),
  GOOGLE_PRIVATE_KEY: z.string().min(1, "GOOGLE_PRIVATE_KEY is required"),
  GOOGLE_DRIVE_FILE_ID: z.string().min(1, "GOOGLE_DRIVE_FILE_ID is required"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  ADMIN_EMAILS: z.string().optional().default(""),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
    return process.env as unknown as Env;
  }
  return parsed.data;
}

export const env = loadEnv();

export function hasDriveConfig(): boolean {
  return Boolean(env.GOOGLE_SERVICE_ACCOUNT_EMAIL && env.GOOGLE_PRIVATE_KEY && env.GOOGLE_DRIVE_FILE_ID);
}

export function assertDriveConfig(): void {
  if (!hasDriveConfig()) {
    throw new Error(
      "Google Drive workbook is not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, and GOOGLE_DRIVE_FILE_ID."
    );
  }
}