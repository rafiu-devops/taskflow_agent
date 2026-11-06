import { NextResponse } from "next/server";
import {
  filterTasksForUser,
  getTaskDataScope,
  hasPermission,
  requireAnyPermission,
  requirePermission,
} from "@/lib/auth/authorization";
import { createTask, getEmployees, getTasks } from "@/lib/excel/excelService";
import { ForbiddenError } from "@/lib/errors";
import { handleApiError } from "@/lib/api/handleError";
import { createTaskSchema } from "@/lib/validation/schemas";

export async function GET() {
  try {
    const user = await requireAnyPermission(["TASKS_VIEW_MY", "TASKS_VIEW_DEPARTMENT", "TASKS_VIEW_ALL"]);
    const all = await getTasks();
    const tasks = user.role === "admin" ? all : filterTasksForUser(user, all);
    return NextResponse.json({ tasks, scope: getTaskDataScope(user) });
  } catch (err) {
    return handleApiError(err, "Failed to load tasks");
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("TASKS_CREATE");
    const raw = await request.json().catch(() => ({}));
    const input = { ...(raw && typeof raw === "object" ? raw : {}) } as Record<string, unknown>;

    if (user.role === "admin") {
      if (input.assignedBy === undefined) input.assignedBy = user.email;
      if (input.assignedTo) {
        const employees = await getEmployees();
        if (!employees.some((employee) => employee.employeeId === input.assignedTo)) {
          return NextResponse.json({ error: "Assigned employee does not exist" }, { status: 400 });
        }
      }
      const task = await createTask(input, { email: user.email, role: "admin" });
      return NextResponse.json({ task }, { status: 201 });
    }

    const ownEmployeeId = user.employeeId;
    if (!ownEmployeeId || !user.employee) throw new ForbiddenError();

    // Employees can only create work for themselves unless they have assignment rights.
    if (!hasPermission(user, "TASKS_ASSIGN")) {
      if (input.assignedTo === undefined || input.assignedTo === null) {
        input.assignedTo = ownEmployeeId;
      } else if (input.assignedTo !== ownEmployeeId) {
        throw new ForbiddenError("You can only assign tasks to yourself");
      }
      if (input.departmentId === undefined || input.departmentId === null) {
        input.departmentId = user.employee.departmentId ?? null;
      } else if (input.departmentId !== user.employee.departmentId) {
        throw new ForbiddenError("You can only create tasks in your department");
      }
    } else if (input.assignedTo) {
      const employees = await getEmployees();
      if (!employees.some((employee) => employee.employeeId === input.assignedTo)) {
        return NextResponse.json({ error: "Assigned employee does not exist" }, { status: 400 });
      }
    }

    input.assignedBy = user.email;

    const priority = input.priority === undefined ? undefined : String(input.priority);
    if (priority && priority !== "Medium" && !hasPermission(user, "TASKS_CHANGE_PRIORITY")) {
      throw new ForbiddenError("You do not have permission to set task priority");
    }

    const status = input.status === undefined ? undefined : String(input.status);
    if (status === "Completed") {
      if (!hasPermission(user, "TASKS_COMPLETE")) throw new ForbiddenError("You do not have permission to complete tasks");
    } else if (status && status !== "Pending" && !hasPermission(user, "TASKS_CHANGE_STATUS")) {
      throw new ForbiddenError("You do not have permission to change task status");
    }

    const progress = input.progressPercentage === undefined ? undefined : Number(input.progressPercentage);
    if (progress !== undefined && progress !== 0 && !hasPermission(user, "TASKS_UPDATE_PROGRESS")) {
      throw new ForbiddenError("You do not have permission to set task progress");
    }

    if (input.remarks && !hasPermission(user, "TASKS_ADD_REMARKS")) {
      throw new ForbiddenError("You do not have permission to add task remarks");
    }

    const parsed = createTaskSchema.parse(input);
    const task = await createTask(parsed, { email: user.email, role: "employee" });
    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    return handleApiError(err, "Failed to create task");
  }
}
