import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { EMPLOYEE_PERMISSIONS, PERMISSION_KEYS } from "@/lib/auth/permissions";
import { handleApiError } from "@/lib/api/handleError";

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({
      permissions: EMPLOYEE_PERMISSIONS,
      keys: PERMISSION_KEYS,
      total: PERMISSION_KEYS.length,
    });
  } catch (err) {
    return handleApiError(err, "Failed to load permission catalog");
  }
}