import { NextResponse } from "next/server";
import {
  filterPerformanceForUser,
  getPerformanceDataScope,
  requireAnyPermission,
} from "@/lib/auth/authorization";
import { getPerformance } from "@/lib/excel/excelService";
import { handleApiError } from "@/lib/api/handleError";

export async function GET() {
  try {
    const user = await requireAnyPermission([
      "PERFORMANCE_VIEW_MY",
      "PERFORMANCE_VIEW_DEPARTMENT",
      "PERFORMANCE_VIEW_ALL",
    ]);
    const all = await getPerformance();
    const performance = user.role === "admin" ? all : filterPerformanceForUser(user, all);
    return NextResponse.json({
      performance,
      scope: getPerformanceDataScope(user),
    });
  } catch (err) {
    return handleApiError(err, "Failed to load performance");
  }
}
