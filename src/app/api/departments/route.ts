import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/getAccessToken";
import { getDepartments } from "@/lib/excel/excelService";
import { UnauthorizedError } from "@/lib/errors";

export async function GET() {
  try {
    await requireSession();
    const departments = await getDepartments();
    return NextResponse.json({ departments });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error(err);
    return NextResponse.json({ error: "Failed to load departments" }, { status: 500 });
  }
}