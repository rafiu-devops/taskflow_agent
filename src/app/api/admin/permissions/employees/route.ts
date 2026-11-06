import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { getPermissionEmployeeOverview } from "@/lib/excel/excelService";
import { handleApiError } from "@/lib/api/handleError";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? searchParams.get("q") ?? "";
    const employees = await getPermissionEmployeeOverview(search);
    return NextResponse.json({ employees });
  } catch (err) {
    return handleApiError(err, "Failed to load employees for permission management");
  }
}
