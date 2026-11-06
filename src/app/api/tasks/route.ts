import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/getAccessToken";
import { getTasks, createTask } from "@/lib/excel/excelService";
import { UnauthorizedError, WorkbookConflictError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await requireSession();
    const all = await getTasks();
    const tasks =
      session.role === "admin"
        ? all
        : all.filter((t) => t.assignedTo === session.employeeId);
    return NextResponse.json({ tasks });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error(err);
    return NextResponse.json({ error: "Failed to load tasks" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    if (session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await request.json();
    const task = await createTask(body, session.email);
    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err instanceof WorkbookConflictError) return NextResponse.json({ error: err.message }, { status: 409 });
    console.error(err);
    return NextResponse.json({ error: "Failed to create task" }, { status: 400 });
  }
}