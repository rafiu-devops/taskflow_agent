import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/getAccessToken";
import { getEmployees } from "@/lib/excel/excelService";
import { UnauthorizedError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await requireSession();
    const all = await getEmployees();
    const employees =
      session.role === "admin"
        ? all
        : all.filter((e) => e.employeeId === session.employeeId);
    return NextResponse.json({ employees });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error(err);
    return NextResponse.json({ error: "Failed to load employees" }, { status: 500 });
  }
}