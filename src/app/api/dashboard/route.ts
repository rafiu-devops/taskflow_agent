import { NextResponse } from "next/server";
import { filterTasksForUser, hasPermission, requirePermission } from "@/lib/auth/authorization";
import { getEmployees, getDepartments, getTasks } from "@/lib/excel/excelService";
import { handleApiError } from "@/lib/api/handleError";

function statusMatches(value: string | null, expected: string): boolean {
  return String(value ?? "").trim().toLowerCase() === expected;
}

export async function GET() {
  try {
    const user = await requirePermission("DASHBOARD_VIEW_PERSONAL");
    const tasks = await getTasks();
    const statsIncluded = hasPermission(user, "DASHBOARD_VIEW_TASK_STATS");

    if (user.role === "admin") {
      const [employees, departments] = await Promise.all([getEmployees(), getDepartments()]);
      const summary = {
        totalEmployees: employees.length,
        totalDepartments: departments.length,
        totalTasks: tasks.length,
        completedTasks: tasks.filter((task) => statusMatches(task.status, "completed")).length,
        pendingTasks: tasks.filter((task) => statusMatches(task.status, "pending")).length,
        overdueTasks: tasks.filter((task) => statusMatches(task.status, "overdue")).length,
      };
      return NextResponse.json({ role: "admin", scope: "organization", statsIncluded: true, summary });
    }

    if (!statsIncluded) {
      return NextResponse.json({
        role: "employee",
        scope: "personal",
        statsIncluded: false,
        summary: null,
      });
    }

    const scopedTasks = filterTasksForUser(user, tasks);
    const summary = {
      totalEmployees: null,
      totalDepartments: null,
      totalTasks: scopedTasks.length,
      completedTasks: scopedTasks.filter((task) => statusMatches(task.status, "completed")).length,
      pendingTasks: scopedTasks.filter((task) => statusMatches(task.status, "pending")).length,
      overdueTasks: scopedTasks.filter((task) => statusMatches(task.status, "overdue")).length,
    };
    const scope = hasPermission(user, "TASKS_VIEW_ALL")
      ? "organization"
      : hasPermission(user, "TASKS_VIEW_DEPARTMENT")
        ? "department"
        : "personal";
    return NextResponse.json({ role: "employee", scope, statsIncluded: true, summary });
  } catch (err) {
    return handleApiError(err, "Failed to load dashboard");
  }
}
