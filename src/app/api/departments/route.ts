import { NextResponse } from "next/server";
import { requirePermission, hasPermission } from "@/lib/auth/authorization";
import { getDepartments } from "@/lib/excel/excelService";
import { handleApiError } from "@/lib/api/handleError";

export async function GET() {
  try {
    const user = await requirePermission("DEPARTMENTS_VIEW");
    const departments = await getDepartments();
    if (user.role === "admin") {
      return NextResponse.json({ departments });
    }
    const canViewDetails = hasPermission(user, "DEPARTMENTS_VIEW_DETAILS");
    const scoped = departments.map((department) => ({
      departmentId: department.departmentId,
      departmentName: department.departmentName,
      description: canViewDetails ? department.description : null,
      manager: canViewDetails ? department.manager : null,
      status: department.status,
    }));
    return NextResponse.json({ departments: scoped });
  } catch (err) {
    return handleApiError(err, "Failed to load departments");
  }
}
