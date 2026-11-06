import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/getAccessToken";
import { getActivityLogs } from "@/lib/excel/excelService";
import { UnauthorizedError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await requireSession();
    if (session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const logs = await getActivityLogs();
    return NextResponse.json({ logs });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error(err);
    return NextResponse.json({ error: "Failed to load activity logs" }, { status: 500 });
  }
}