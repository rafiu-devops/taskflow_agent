import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/getAccessToken";
import { getEmployees, getDepartments, getTasks } from "@/lib/excel/excelService";
import { UnauthorizedError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await requireSession();
    const [employees, departments, tasks] = await Promise.all([
      getEmployees(),
      getDepartments(),
      getTasks(),
    ]);
    const scopedTasks =
      session.role === "admin" ? tasks : tasks.filter((t) => t.assignedTo === session.employeeId);
    const scopedEmployees =
      session.role === "admin" ? employees : employees.filter((e) => e.employeeId === session.employeeId);
    const summary = {
      totalEmployees: scopedEmployees.length,
      totalDepartments: session.role === "admin" ? departments.length : 0,
      totalTasks: scopedTasks.length,
      completedTasks: scopedTasks.filter((t) => t.status === "Completed").length,
      pendingTasks: scopedTasks.filter((t) => t.status === "Pending").length,
      overdueTasks: scopedTasks.filter((t) => t.status === "Overdue").length,
    };
    return NextResponse.json({ summary });
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error(err);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}