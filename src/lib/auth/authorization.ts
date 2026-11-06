import { getSession } from "@/lib/auth/session";
import { env } from "@/lib/config/env";
import { getEmployees, getEmployeePermissionGrantState } from "@/lib/excel/excelService";
import {
  AuthorizationUnavailableError,
  ForbiddenError,
  UnauthorizedError,
} from "@/lib/errors";
import {
  adminPermissions,
  emptyEmployeePermissions,
  type PermissionGrantState,
  type PermissionKey,
} from "@/lib/auth/permissions";
import type { Employee } from "@/lib/types/domain";

export type UserRole = "admin" | "employee";
export type TaskDataScope = "all" | "department" | "own";
export type PerformanceDataScope = "all" | "department" | "own";

export interface CurrentUser {
  email: string;
  name: string;
  role: UserRole;
  employeeId?: string;
  employee?: Employee;
  permissions: PermissionGrantState;
}

export function normalizeEmail(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export function getAdminEmails(): string[] {
  return String(env.ADMIN_EMAILS ?? "")
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean);
}

export function isAdminEmail(email: unknown): boolean {
  const normalized = normalizeEmail(email);
  return normalized.length > 0 && getAdminEmails().includes(normalized);
}

function isActiveAccount(value: string | null | undefined): boolean {
  return String(value ?? "").trim().toLowerCase() === "active";
}

export async function findEmployeeByEmail(email: string): Promise<Employee | undefined> {
  const normalized = normalizeEmail(email);
  const employees = await getEmployees();
  return employees.find((employee) => normalizeEmail(employee.email) === normalized);
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const session = await getSession();
  const email = normalizeEmail(session.email);
  if (!email) throw new UnauthorizedError();

  if (isAdminEmail(email)) {
    return {
      email,
      name: session.name?.trim() || email,
      role: "admin",
      permissions: adminPermissions(),
    };
  }

  let employee: Employee | undefined;
  try {
    employee = await findEmployeeByEmail(email);
  } catch (error) {
    console.error("Unable to verify employee access", error);
    throw new AuthorizationUnavailableError();
  }
  if (!employee || !isActiveAccount(employee.accountStatus)) {
    throw new ForbiddenError("This account is not authorized to access TaskFlow AI");
  }

  let permissions: PermissionGrantState;
  try {
    permissions = await getEmployeePermissionGrantState(employee.employeeId);
  } catch (error) {
    console.error("Unable to load employee permissions", error);
    throw new AuthorizationUnavailableError();
  }

  return {
    email,
    name: employee.fullName || session.name?.trim() || email,
    role: "employee",
    employeeId: employee.employeeId,
    employee,
    permissions,
  };
}

export async function requireAuthenticatedUser(): Promise<CurrentUser> {
  return getCurrentUser();
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (user.role !== "admin") throw new ForbiddenError();
  return user;
}

export async function requireEmployee(): Promise<CurrentUser & { role: "employee"; employeeId: string; employee: Employee }> {
  const user = await getCurrentUser();
  if (user.role !== "employee" || !user.employeeId || !user.employee) {
    throw new ForbiddenError();
  }
  return user as CurrentUser & { role: "employee"; employeeId: string; employee: Employee };
}

export async function getCurrentUserRole(): Promise<UserRole> {
  return (await getCurrentUser()).role;
}

export async function getEmployeePermissions(): Promise<PermissionGrantState> {
  return (await getCurrentUser()).permissions;
}

export function hasPermission(user: CurrentUser, permission: PermissionKey): boolean {
  if (user.role === "admin") return true;
  return Boolean(user.permissions[permission]);
}

export function hasAnyPermission(user: CurrentUser, permissions: readonly PermissionKey[]): boolean {
  return permissions.some((permission) => hasPermission(user, permission));
}

export async function requirePermission(permission: PermissionKey): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!hasPermission(user, permission)) throw new ForbiddenError();
  return user;
}

export async function requireAnyPermission(permissions: readonly PermissionKey[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!hasAnyPermission(user, permissions)) throw new ForbiddenError();
  return user;
}

export async function getEmployeeContext(): Promise<CurrentUser & { role: "employee"; employeeId: string; employee: Employee }> {
  return requireEmployee();
}

export function checkResourceOwnership(user: CurrentUser, resourceEmployeeId: string | null | undefined): boolean {
  if (user.role === "admin") return true;
  const normalized = String(resourceEmployeeId ?? "").trim();
  return normalized.length > 0 && normalized === user.employeeId;
}

export function getTaskDataScope(user: CurrentUser): TaskDataScope | null {
  if (user.role === "admin") return "all";
  if (hasPermission(user, "TASKS_VIEW_ALL")) return "all";
  if (hasPermission(user, "TASKS_VIEW_DEPARTMENT") && user.employee?.departmentId) return "department";
  if (hasPermission(user, "TASKS_VIEW_MY")) return "own";
  return null;
}

export function getPerformanceDataScope(user: CurrentUser): PerformanceDataScope | null {
  if (user.role === "admin") return "all";
  if (hasPermission(user, "PERFORMANCE_VIEW_ALL")) return "all";
  if (hasPermission(user, "PERFORMANCE_VIEW_DEPARTMENT") && user.employee?.departmentId) return "department";
  if (hasPermission(user, "PERFORMANCE_VIEW_MY")) return "own";
  return null;
}

export function filterTasksForUser<T extends { assignedTo: string | null; departmentId: string | null }>(
  user: CurrentUser,
  tasks: T[],
): T[] {
  const scope = getTaskDataScope(user);
  if (scope === "all") return tasks;
  if (scope === "department") {
    const departmentId = user.employee?.departmentId;
    return departmentId ? tasks.filter((task) => task.departmentId === departmentId) : [];
  }
  if (scope === "own") {
    return tasks.filter((task) => checkResourceOwnership(user, task.assignedTo));
  }
  return [];
}

export function filterPerformanceForUser<T extends { employeeId: string | null; departmentId: string | null }>(
  user: CurrentUser,
  rows: T[],
): T[] {
  const scope = getPerformanceDataScope(user);
  if (scope === "all") return rows;
  if (scope === "department") {
    const departmentId = user.employee?.departmentId;
    return departmentId ? rows.filter((row) => row.departmentId === departmentId) : [];
  }
  if (scope === "own") {
    return rows.filter((row) => checkResourceOwnership(user, row.employeeId));
  }
  return [];
}

export function taskIsInScope(user: CurrentUser, task: { assignedTo: string | null; departmentId: string | null }): boolean {
  const scope = getTaskDataScope(user);
  if (scope === "all") return true;
  if (scope === "department") return Boolean(user.employee?.departmentId) && task.departmentId === user.employee?.departmentId;
  if (scope === "own") return checkResourceOwnership(user, task.assignedTo);
  return false;
}

export function canEditTaskFields(user: CurrentUser, task: { assignedTo: string | null; departmentId: string | null }): boolean {
  return hasPermission(user, "TASKS_EDIT") && taskIsInScope(user, task);
}

export function emptyPermissionsForDeniedUser(): PermissionGrantState {
  return emptyEmployeePermissions();
}
