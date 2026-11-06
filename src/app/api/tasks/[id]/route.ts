import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/getAccessToken";
import { getTasks, updateTask } from "@/lib/excel/excelService";
import { UnauthorizedError, WorkbookConflictError, NotFoundError } from "@/lib/errors";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession();
    const tasks = await getTasks();
    const existing = tasks.find((t) => t.taskId === id);
    if (!existing) throw new NotFoundError(`Task ${id} not found`);
    if (session.role !== "admin" && existing.assignedTo !== session.employeeId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await request.json();
    const task = await updateTask({ ...body, taskId: id }, session.email);
    return NextResponse.json({ task });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err instanceof NotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    if (err instanceof WorkbookConflictError) return NextResponse.json({ error: err.message }, { status: 409 });
    console.error(err);
    return NextResponse.json({ error: "Failed to update task" }, { status: 400 });
  }
}