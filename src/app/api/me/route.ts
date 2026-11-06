import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/authorization";
import { handleApiError } from "@/lib/api/handleError";

export async function GET() {
  try {
    const user = await getCurrentUser();
    return NextResponse.json({
      user: {
        email: user.email,
        name: user.name,
        role: user.role,
        employeeId: user.employeeId ?? null,
        departmentId: user.employee?.departmentId ?? null,
        permissions: user.permissions,
      },
    });
  } catch (err) {
    return handleApiError(err, "Unable to load account");
  }
}
