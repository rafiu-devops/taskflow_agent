import { NextResponse } from "next/server";
import { requireAdmin, requirePermission, hasPermission } from "@/lib/auth/authorization";
import { getEmployees, createEmployee } from "@/lib/excel/excelService";
import { handleApiError } from "@/lib/api/handleError";
import { createEmployeeSchema } from "@/lib/validation/schemas";

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

export async function POST(request: Request) {
  try {
    const user = await requireAdmin();
    const body = await request.json().catch(() => ({}));
    const parsed = createEmployeeSchema.parse(body);
    const employee = await createEmployee(parsed, { email: user.email, role: "admin" });
    return NextResponse.json({ employee }, { status: 201 });
  } catch (err) {
    return handleApiError(err, "Failed to create employee");
  }
}
