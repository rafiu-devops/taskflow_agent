import { cookies } from "next/headers";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { env } from "@/lib/config/env";

export interface SessionData {
  email?: string;
  name?: string;
  role?: "admin" | "employee";
  employeeId?: string;
}

const COOKIE_NAME = "taskflow_session";

function secret(): Buffer {
  const s = env.SESSION_SECRET || "dev-secret-please-set-SESSION_SECRET-32chars-min";
  return Buffer.from(s.padEnd(32, "0").slice(0, 32));
}

function encrypt(data: SessionData): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secret(), iv);
  const json = JSON.stringify(data);
  const enc = Buffer.concat([cipher.update(json, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64url");
}

function decrypt(value: string): SessionData {
  try {
    const buf = Buffer.from(value, "base64url");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const enc = buf.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", secret(), iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
    return JSON.parse(dec);
  } catch {
    return {};
  }
}

function toData(session: any): SessionData {
  return {
    email: session.email,
    name: session.name,
    role: session.role,
    employeeId: session.employeeId,
  };
}

export async function getSession() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  const data = cookie?.value ? decrypt(cookie.value) : {};

  const session: any = {
    email: data.email,
    name: data.name,
    role: data.role,
    employeeId: data.employeeId,
    async save() {
      const cs = await cookies();
      cs.set(COOKIE_NAME, encrypt(toData(this)), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
    },
    async destroy() {
      const cs = await cookies();
      cs.delete(COOKIE_NAME);
    },
  };

  return session;
}