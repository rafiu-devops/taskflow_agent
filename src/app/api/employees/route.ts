import { NextResponse } from "next/server";
import { requirePermission, hasPermission } from "@/lib/auth/authorization";
import { getEmployees } from "@/lib/excel/excelService";
import { handleApiError } from "@/lib/api/handleError";

export async function GET() {
  try {
    const user = await requirePermission("EMPLOYEES_VIEW_DIRECTORY");
    const all = await getEmployees();
    const canViewDetails = hasPermission(user, "EMPLOYEES_VIEW_DETAILS");
    const canViewContact = hasPermission(user, "EMPLOYEES_VIEW_CONTACT");

    if (user.role === "admin") {
      return NextResponse.json({ employees: all });
    }

    const employees = all.map((employee) => ({
      employeeId: employee.employeeId,
      fullName: employee.fullName,
      email: canViewContact ? employee.email : null,
      departmentId: canViewDetails ? employee.departmentId : null,
      designation: canViewDetails ? employee.designation : null,
      accountStatus: employee.accountStatus,
      joiningDate: canViewDetails ? employee.joiningDate : null,
    }));
    return NextResponse.json({ employees });
  } catch (err) {
    return handleApiError(err, "Failed to load employees");
  }
}
