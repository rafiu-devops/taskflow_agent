import ExcelJS from "exceljs";
import { downloadWorkbook } from "@/lib/google/driveClient";
import {
  parseDepartmentsWorksheet,
  parseEmployeesWorksheet,
  parseTasksWorksheet,
} from "@/lib/excel/excelService";
import type {
  AdminDashboardData,
  AdminDashboardFilters,
  AdminDashboardTask,
  CompletionTrendPoint,
  Department,
  DepartmentDistributionItem,
  Employee,
  EmployeePerformanceOverview,
  Task,
  TaskPriority,
  TaskStatus,
} from "@/lib/types/domain";

export const DASHBOARD_TASK_STATUSES = ["Pending", "In Progress", "Completed", "Overdue"] as const;
export type DashboardTaskStatus = (typeof DASHBOARD_TASK_STATUSES)[number];

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function todayUtcDateOnly(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseDateOnly(value: string | null | undefined): { year: number; month: number; day: number } | null {
  const match = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
  return { year, month, day };
}

function dateOnlyToUtc(value: string): number {
  const parsed = parseDateOnly(value);
  if (!parsed) return Number.NaN;
  return Date.UTC(parsed.year, parsed.month - 1, parsed.day);
}

function utcToDateOnly(value: number): string {
  const date = new Date(value);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function addUtcDays(value: string, days: number): string {
  return utcToDateOnly(dateOnlyToUtc(value) + days * 86_400_000);
}

function diffUtcDays(start: string, end: string): number {
  return Math.floor((dateOnlyToUtc(end) - dateOnlyToUtc(start)) / 86_400_000);
}

function startOfWeekUtc(value: string): string {
  const timestamp = dateOnlyToUtc(value);
  const day = new Date(timestamp).getUTCDay();
  const offset = (day + 6) % 7; // Monday is the start of the week.
  return utcToDateOnly(timestamp - offset * 86_400_000);
}

function addMonthsUtc(year: number, monthIndex: number, offset: number): { year: number; monthIndex: number } {
  const date = new Date(Date.UTC(year, monthIndex + offset, 1));
  return { year: date.getUTCFullYear(), monthIndex: date.getUTCMonth() };
}

function monthKey(year: number, monthIndex: number): string {
  return `${year}-${pad(monthIndex + 1)}`;
}

function monthLabel(year: number, monthIndex: number): string {
  return new Date(Date.UTC(year, monthIndex, 1)).toLocaleString("en", { month: "short", year: "numeric", timeZone: "UTC" });
}

function shortDateLabel(value: string): string {
  const parsed = parseDateOnly(value);
  if (!parsed) return value;
  return new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day)).toLocaleString("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function normalizeTaskStatus(value: unknown): DashboardTaskStatus {
  const normalized = String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  if (normalized === "completed" || normalized === "complete") return "Completed";
  if (normalized === "in progress" || normalized === "in-progress" || normalized === "inprogress") return "In Progress";
  if (normalized === "overdue") return "Overdue";
  return "Pending";
}

export function isTaskCompleted(task: Pick<Task, "status">): boolean {
  return normalizeTaskStatus(task.status) === "Completed";
}

export function isTaskOverdue(task: Pick<Task, "status" | "dueDate">, today = todayUtcDateOnly()): boolean {
  if (isTaskCompleted(task)) return false;
  const due = String(task.dueDate ?? "").slice(0, 10);
  return Boolean(parseDateOnly(due) && due < today);
}

export function getTaskCategory(task: Pick<Task, "status" | "dueDate">, today = todayUtcDateOnly()): DashboardTaskStatus {
  const status = normalizeTaskStatus(task.status);
  if (status === "Completed") return "Completed";
  if (status === "Overdue" || isTaskOverdue(task, today)) return "Overdue";
  if (status === "In Progress") return "In Progress";
  return "Pending";
}

function daysOverdue(task: Task, today: string): number | null {
  if (!isTaskOverdue(task, today)) return null;
  return Math.max(0, diffUtcDays(String(task.dueDate).slice(0, 10), today));
}

function toDateString(value: string | null | undefined): string | null {
  const date = String(value ?? "").slice(0, 10);
  return parseDateOnly(date) ? date : null;
}

function sortableTimestamp(value: string | null | undefined): number {
  const parsed = Date.parse(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function firstString(value: string | null | undefined): string {
  return String(value ?? "").trim();
}

function roundRate(value: number): number {
  return Math.round(value * 10) / 10;
}

function makeEmployeeName(employee: Employee | undefined, employeeId: string | null): string {
  return employee?.fullName?.trim() || (employeeId ? `Unknown employee (${employeeId})` : "Unassigned");
}

function makeDepartmentName(department: Department | undefined, departmentId: string | null): string {
  return department?.departmentName?.trim() || (departmentId ? `Unknown department (${departmentId})` : "Unassigned");
}

function employeeOption(employee: Employee) {
  return {
    employeeId: employee.employeeId,
    fullName: employee.fullName,
    departmentId: employee.departmentId,
    accountStatus: employee.accountStatus,
  };
}

function departmentOption(department: Department) {
  return {
    departmentId: department.departmentId,
    departmentName: department.departmentName,
    status: department.status,
  };
}

function enrichTask(
  task: Task,
  employeeById: Map<string, Employee>,
  departmentById: Map<string, Department>,
  today: string,
): AdminDashboardTask {
  const employee = task.assignedTo ? employeeById.get(task.assignedTo) : undefined;
  const department = task.departmentId ? departmentById.get(task.departmentId) : undefined;
  return {
    taskId: task.taskId,
    title: task.title,
    assignedTo: task.assignedTo,
    employeeName: makeEmployeeName(employee, task.assignedTo),
    departmentId: task.departmentId,
    departmentName: makeDepartmentName(department, task.departmentId),
    priority: task.priority as TaskPriority | null,
    status: task.status as TaskStatus | null,
    dueDate: task.dueDate,
    assignedDate: task.assignedDate,
    completionDate: task.completionDate,
    progressPercentage: task.progressPercentage,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    daysOverdue: daysOverdue(task, today),
  };
}

function filterTasks(tasks: Task[], filters: AdminDashboardFilters, today: string): Task[] {
  return tasks.filter((task) => {
    if (filters.departmentId && task.departmentId !== filters.departmentId) return false;
    if (filters.employeeId && task.assignedTo !== filters.employeeId) return false;
    if (filters.status && getTaskCategory(task, today) !== filters.status) return false;
    const dueDate = toDateString(task.dueDate);
    if (filters.from && (!dueDate || dueDate < filters.from)) return false;
    if (filters.to && (!dueDate || dueDate > filters.to)) return false;
    return true;
  });
}

function filterEmployees(employees: Employee[], filters: AdminDashboardFilters): Employee[] {
  return employees.filter((employee) => {
    if (filters.departmentId && employee.departmentId !== filters.departmentId) return false;
    if (filters.employeeId && employee.employeeId !== filters.employeeId) return false;
    return true;
  });
}

function filterDepartments(departments: Department[], filters: AdminDashboardFilters): Department[] {
  return departments.filter((department) => !filters.departmentId || department.departmentId === filters.departmentId);
}

function buildDepartmentDistribution(
  filteredTasks: Task[],
  departments: Department[],
): DepartmentDistributionItem[] {
  const byId = new Map<string, DepartmentDistributionItem>();
  for (const department of departments) {
    byId.set(department.departmentId, {
      departmentId: department.departmentId,
      departmentName: department.departmentName || department.departmentId,
      tasks: 0,
      completed: 0,
    });
  }
  for (const task of filteredTasks) {
    const id = task.departmentId ?? "__unassigned__";
    const existing = byId.get(id) ?? {
      departmentId: id,
      departmentName: id === "__unassigned__" ? "Unassigned" : `Unknown department (${id})`,
      tasks: 0,
      completed: 0,
    };
    existing.tasks += 1;
    if (isTaskCompleted(task)) existing.completed += 1;
    byId.set(id, existing);
  }
  return Array.from(byId.values()).sort((a, b) => b.tasks - a.tasks || a.departmentName.localeCompare(b.departmentName));
}

function monthBucketCount(from: string, to: string): number {
  const start = parseDateOnly(from);
  const end = parseDateOnly(to);
  if (!start || !end) return 0;
  return (end.year - start.year) * 12 + (end.month - start.month) + 1;
}

function buildCompletionTrend(filteredTasks: Task[], filters: AdminDashboardFilters): CompletionTrendPoint[] {
  const completed = filteredTasks
    .filter(isTaskCompleted)
    .map((task) => toDateString(task.completionDate))
    .filter((value): value is string => Boolean(value))
    .sort();

  if (completed.length === 0) return [];

  const from = filters.from ?? completed[0];
  const to = filters.to ?? completed[completed.length - 1];
  const spanDays = diffUtcDays(from, to);
  const mode: "day" | "week" | "month" = filters.from && filters.to
    ? spanDays <= 31
      ? "day"
      : spanDays <= 210 && monthBucketCount(from, to) <= 31
        ? "week"
        : "month"
    : "month";

  const counts = new Map<string, number>();
  for (const date of completed) counts.set(date, (counts.get(date) ?? 0) + 1);

  if (mode === "day") {
    const points: CompletionTrendPoint[] = [];
    for (let current = from; current <= to; current = addUtcDays(current, 1)) {
      points.push({ label: shortDateLabel(current), completed: counts.get(current) ?? 0 });
    }
    return points;
  }

  if (mode === "week") {
    const start = startOfWeekUtc(from);
    const end = startOfWeekUtc(to);
    const buckets = new Map<string, number>();
    for (const date of completed) {
      if (date < from || date > to) continue;
      const week = startOfWeekUtc(date);
      buckets.set(week, (buckets.get(week) ?? 0) + 1);
    }
    const points: CompletionTrendPoint[] = [];
    for (let current = start; current <= end; current = addUtcDays(current, 7)) {
      points.push({ label: `Week of ${shortDateLabel(current)}`, completed: buckets.get(current) ?? 0 });
    }
    return points;
  }

  const start = parseDateOnly(from);
  const end = parseDateOnly(to);
  if (!start || !end) return [];
  const monthCounts = new Map<string, number>();
  for (const date of completed) {
    if (date < from || date > to) continue;
    monthCounts.set(date.slice(0, 7), (monthCounts.get(date.slice(0, 7)) ?? 0) + 1);
  }
  const totalMonths = (end.year - start.year) * 12 + (end.month - start.month) + 1;
  const points: CompletionTrendPoint[] = [];
  for (let offset = 0; offset < totalMonths; offset += 1) {
    const month = addMonthsUtc(start.year, start.month - 1, offset);
    const key = monthKey(month.year, month.monthIndex);
    points.push({ label: monthLabel(month.year, month.monthIndex), completed: monthCounts.get(key) ?? 0 });
  }
  return points;
}

function buildEmployeePerformance(
  filteredTasks: Task[],
  scopedEmployees: Employee[],
  departmentsById: Map<string, Department>,
  today: string,
): EmployeePerformanceOverview[] {
  const byEmployee = new Map<string, Task[]>();
  for (const task of filteredTasks) {
    if (!task.assignedTo) continue;
    const list = byEmployee.get(task.assignedTo) ?? [];
    list.push(task);
    byEmployee.set(task.assignedTo, list);
  }

  const rows = new Map<string, EmployeePerformanceOverview>();
  const sourceEmployees = new Map<string, Employee | undefined>(scopedEmployees.map((employee) => [employee.employeeId, employee]));

  // Include employees who have filtered tasks even if their own profile is outside the current employee filter.
  for (const employeeId of byEmployee.keys()) {
    if (!sourceEmployees.has(employeeId)) sourceEmployees.set(employeeId, undefined);
  }

  for (const [employeeId, employee] of sourceEmployees) {
    const tasks = byEmployee.get(employeeId) ?? [];
    const assignedTasks = tasks.length;
    const completedTasks = tasks.filter(isTaskCompleted).length;
    const pendingTasks = tasks.filter((task) => getTaskCategory(task, today) === "Pending").length;
    const overdueTasks = tasks.filter((task) => isTaskOverdue(task, today)).length;
    const completionRate = assignedTasks ? roundRate((completedTasks / assignedTasks) * 100) : 0;
    const department = employee?.departmentId ? departmentsById.get(employee.departmentId) : undefined;
    rows.set(employeeId, {
      employeeId,
      employeeName: makeEmployeeName(employee, employeeId),
      departmentId: employee?.departmentId ?? tasks[0]?.departmentId ?? null,
      departmentName: makeDepartmentName(department, employee?.departmentId ?? tasks[0]?.departmentId ?? null),
      assignedTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
      completionRate,
    });
  }

  return Array.from(rows.values()).sort(
    (a, b) => b.assignedTasks - a.assignedTasks || b.completedTasks - a.completedTasks || a.employeeName.localeCompare(b.employeeName),
  );
}

export async function getAdminDashboardData(filters: AdminDashboardFilters): Promise<AdminDashboardData> {
  const today = todayUtcDateOnly();
  const { buffer } = await downloadWorkbook();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as Parameters<typeof wb.xlsx.load>[0]);

  const employees = wb.getWorksheet("Employees") ? parseEmployeesWorksheet(wb.getWorksheet("Employees")!) : [];
  const departments = wb.getWorksheet("Departments") ? parseDepartmentsWorksheet(wb.getWorksheet("Departments")!) : [];
  const tasks = wb.getWorksheet("Tasks") ? parseTasksWorksheet(wb.getWorksheet("Tasks")!) : [];

  const employeeById = new Map(employees.map((employee) => [employee.employeeId, employee]));
  const departmentById = new Map(departments.map((department) => [department.departmentId, department]));
  const filteredTasks = filterTasks(tasks, filters, today);
  const scopedEmployees = filterEmployees(employees, filters);
  const scopedDepartments = filterDepartments(departments, filters);

  const statusDistribution = DASHBOARD_TASK_STATUSES.map((name) => ({
    name,
    value: filteredTasks.filter((task) => getTaskCategory(task, today) === name).length,
  }));
  const completedTasks = statusDistribution.find((item) => item.name === "Completed")?.value ?? 0;
  const pendingTasks = statusDistribution.find((item) => item.name === "Pending")?.value ?? 0;
  const inProgressTasks = statusDistribution.find((item) => item.name === "In Progress")?.value ?? 0;
  const overdueTasks = statusDistribution.find((item) => item.name === "Overdue")?.value ?? 0;
  const totalTasks = filteredTasks.length;
  const overallCompletionRate = totalTasks ? roundRate((completedTasks / totalTasks) * 100) : 0;
  const completedWithDue = filteredTasks.filter((task) => isTaskCompleted(task) && toDateString(task.dueDate));
  const onTimeCompleted = completedWithDue.filter((task) => {
    const due = toDateString(task.dueDate);
    const completed = toDateString(task.completionDate);
    return Boolean(due && completed && completed <= due);
  }).length;
  const onTimeCompletionRate = completedWithDue.length
    ? roundRate((onTimeCompleted / completedWithDue.length) * 100)
    : 0;

  const enriched = filteredTasks.map((task) => enrichTask(task, employeeById, departmentById, today));
  const recentTasks = [...enriched]
    .sort((a, b) => sortableTimestamp(b.updatedAt ?? b.createdAt) - sortableTimestamp(a.updatedAt ?? a.createdAt))
    .slice(0, 10);
  const overdueList = enriched
    .filter((task) => task.daysOverdue !== null)
    .sort((a, b) => (b.daysOverdue ?? 0) - (a.daysOverdue ?? 0) || String(a.dueDate).localeCompare(String(b.dueDate)))
    .slice(0, 8);

  return {
    filters,
    kpis: {
      totalEmployees: scopedEmployees.length,
      activeEmployees: scopedEmployees.filter((employee) => String(employee.accountStatus).trim().toLowerCase() === "active").length,
      totalDepartments: scopedDepartments.length,
      totalTasks,
      completedTasks,
      pendingTasks,
      inProgressTasks,
      overdueTasks,
      overallCompletionRate,
      onTimeCompletionRate,
    },
    statusDistribution,
    departmentDistribution: buildDepartmentDistribution(filteredTasks, scopedDepartments),
    completionTrend: buildCompletionTrend(filteredTasks, filters),
    recentTasks,
    overdueTasks: overdueList,
    employeePerformance: buildEmployeePerformance(filteredTasks, scopedEmployees, departmentById, today),
    employees: employees.map(employeeOption),
    departments: departments.map(departmentOption),
    generatedAt: new Date().toISOString(),
  };
}

export function normalizeDashboardFilters(input: Partial<AdminDashboardFilters>): AdminDashboardFilters {
  const from = input.from && parseDateOnly(input.from) ? input.from : null;
  const to = input.to && parseDateOnly(input.to) ? input.to : null;
  const departmentId = firstString(input.departmentId) || null;
  const employeeId = firstString(input.employeeId) || null;
  const status = DASHBOARD_TASK_STATUSES.includes(input.status as DashboardTaskStatus)
    ? (input.status as DashboardTaskStatus)
    : null;
  return { from, to, departmentId, employeeId, status };
}
