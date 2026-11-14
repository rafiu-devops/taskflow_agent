import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/authorization";
import { getDepartments, updateDepartment } from "@/lib/excel/excelService";
import { handleApiError } from "@/lib/api/handleError";
import { departmentIdSchema, updateDepartmentSchema } from "@/lib/validation/schemas";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const departmentId = departmentIdSchema.parse(id);
    const user = await requireAdmin();
    const body = await request.json().catch(() => ({}));
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const patch: Record<string, unknown> = { ...(body as Record<string, unknown>) };
    delete patch.departmentId;
    const parsed = updateDepartmentSchema.parse({ ...patch, departmentId });
    const department = await updateDepartment(parsed, { email: user.email, role: "admin" });
    return NextResponse.json({ department });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message || "Invalid department ID" }, { status: 400 });
    }
    return handleApiError(err, "Failed to update department");
  }
}
