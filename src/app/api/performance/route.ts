import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/getAccessToken";
import { getPerformance } from "@/lib/excel/excelService";
import { UnauthorizedError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await requireSession();
    const all = await getPerformance();
    const performance =
      session.role === "admin"
        ? all
        : all.filter((p) => p.employeeId === session.employeeId);
    return NextResponse.json({ performance });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error(err);
    return NextResponse.json({ error: "Failed to load performance" }, { status: 500 });
  }
}