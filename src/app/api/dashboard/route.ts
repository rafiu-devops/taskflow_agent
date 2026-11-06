import { NextResponse } from "next/server";
import {
  filterTasksForUser,
  hasPermission,
  requirePermission,
} from "@/lib/auth/authorization";
import { getAdminDashboardData, normalizeDashboardFilters } from "@/lib/excel/adminDashboardService";
import { getTasks } from "@/lib/excel/excelService";
import { handleApiError } from "@/lib/api/handleError";
import { DASHBOARD_TASK_STATUSES } from "@/lib/excel/adminDashboardService";

function statusMatches(value: string | null, expected: string): boolean {
  return String(value ?? "").trim().toLowerCase() === expected;
}

function parseAdminFilters(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = {
    from: searchParams.get("from") || null,
    to: searchParams.get("to") || null,
    departmentId: searchParams.get("departmentId") || null,
    employeeId: searchParams.get("employeeId") || null,
    status: searchParams.get("status") || null,
  };
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (raw.from && !datePattern.test(raw.from)) return { error: "Invalid from date. Use YYYY-MM-DD." } as const;
  if (raw.to && !datePattern.test(raw.to)) return { error: "Invalid to date. Use YYYY-MM-DD." } as const;
  const normalized = normalizeDashboardFilters({
    from: raw.from,
    to: raw.to,
    departmentId: raw.departmentId,
    employeeId: raw.employeeId,
    status: raw.status as typeof DASHBOARD_TASK_STATUSES[number] | null,
  });
  if ((raw.from && !normalized.from) || (raw.to && !normalized.to)) {
    return { error: "Invalid date range." } as const;
  }
  if (raw.status && !normalized.status) {
    return { error: "Invalid task status filter." } as const;
  }
  if (normalized.from && normalized.to && normalized.from > normalized.to) {
    return { error: "from date cannot be after to date." } as const;
  }
  return { filters: normalized } as const;
}

export async function GET(request: Request) {
  try {
    const user = await requirePermission("DASHBOARD_VIEW_PERSONAL");

    if (user.role === "admin") {
      const parsed = parseAdminFilters(request);
      if ("error" in parsed) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }
      const data = await getAdminDashboardData(parsed.filters);
      return NextResponse.json({
        role: "admin",
        scope: "organization",
        statsIncluded: true,
        ...data,
      });
    }

    const tasks = await getTasks();
    const statsIncluded = hasPermission(user, "DASHBOARD_VIEW_TASK_STATS");

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
