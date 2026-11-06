import { NextResponse } from "next/server";
import { hasPermission, requireAnyPermission } from "@/lib/auth/authorization";
import { getActivityLogs } from "@/lib/excel/excelService";
import { handleApiError } from "@/lib/api/handleError";

export async function GET() {
  try {
    const user = await requireAnyPermission(["ACTIVITY_LOGS_VIEW", "ACTIVITY_LOGS_VIEW_MY"]);
    const logs = await getActivityLogs();
    if (user.role === "admin" || hasPermission(user, "ACTIVITY_LOGS_VIEW")) {
      return NextResponse.json({ logs, scope: "organization" });
    }
    const email = user.email.toLowerCase();
    const ownLogs = logs.filter((log) => String(log.userId ?? "").trim().toLowerCase() === email);
    return NextResponse.json({ logs: ownLogs, scope: "own" });
  } catch (err) {
    return handleApiError(err, "Failed to load activity logs");
  }
}
