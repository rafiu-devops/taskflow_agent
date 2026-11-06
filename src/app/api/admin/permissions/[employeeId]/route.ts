import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/authorization";
import {
  getEmployeePermissionDetails,
  saveEmployeePermissionGrants,
} from "@/lib/excel/excelService";
import { handleApiError } from "@/lib/api/handleError";
import { updateEmployeePermissionsSchema } from "@/lib/validation/schemas";
import { PERMISSION_KEYS, normalizePermissionGrants, type PermissionKey } from "@/lib/auth/permissions";

const employeeIdSchema = z.string().trim().min(1).max(100);

function permissionStatus(grantedCount: number, total: number): string {
  if (grantedCount === 0) return "Not configured";
  if (grantedCount === total) return "Full employee access";
  return "Partial access";
}

export async function GET(_request: Request, { params }: { params: Promise<{ employeeId: string }> }) {
  try {
    await requireAdmin();
    const { employeeId: rawEmployeeId } = await params;
    const employeeId = employeeIdSchema.parse(rawEmployeeId);
    const details = await getEmployeePermissionDetails(employeeId);
    if (!details) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }
    return NextResponse.json({
      ...details,
      permissionStatus: permissionStatus(details.grantedCount, details.totalPermissions),
    });
  } catch (err) {
    return handleApiError(err, "Failed to load employee permissions");
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ employeeId: string }> }) {
  try {
    const admin = await requireAdmin();
    const { employeeId: rawEmployeeId } = await params;
    const employeeId = employeeIdSchema.parse(rawEmployeeId);
    const body = await request.json().catch(() => ({}));
    const parsed = updateEmployeePermissionsSchema.parse(body);

    const submittedKeys = Object.keys(parsed.permissions) as PermissionKey[];
    const missing = PERMISSION_KEYS.filter((key) => !submittedKeys.includes(key));
    if (missing.length) {
      return NextResponse.json(
        { error: `Missing permission keys: ${missing.join(", ")}` },
        { status: 400 },
      );
    }

    const grants = normalizePermissionGrants(parsed.permissions);
    const result = await saveEmployeePermissionGrants(employeeId, grants, admin.email);
    const grantedCount = Object.values(result.permissions).filter(Boolean).length;

    return NextResponse.json({
      employee: result.employee,
      permissions: result.permissions,
      lastUpdatedAt: result.lastUpdatedAt,
      updatedBy: result.updatedBy,
      grantedCount,
      totalPermissions: PERMISSION_KEYS.length,
      permissionStatus: permissionStatus(grantedCount, PERMISSION_KEYS.length),
      changedCount: result.changed.length,
      changedPermissions: result.changed.map((record) => ({
        key: record.permissionKey,
        granted: record.granted,
      })),
    });
  } catch (err) {
    return handleApiError(err, "Failed to save employee permissions");
  }
}
