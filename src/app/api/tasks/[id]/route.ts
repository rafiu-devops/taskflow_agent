import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getTaskDataScope,
  hasPermission,
  requireAuthenticatedUser,
  taskIsInScope,
} from "@/lib/auth/authorization";
import { getEmployees, getTasks, updateTask } from "@/lib/excel/excelService";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { handleApiError } from "@/lib/api/handleError";
import { taskIdSchema } from "@/lib/validation/schemas";

const TASK_ID = taskIdSchema;
const nonAdminTransitions: Record<string, string[]> = {
  Pending: ["In Progress", "Completed"],
  "In Progress": ["Pending", "Completed"],
  Overdue: ["In Progress", "Completed"],
  Completed: [],
};

const restrictedKeys = new Set(["taskId", "assignedBy", "createdAt", "updatedAt", "completionDate"]);

function normalized(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  return String(value).trim();
}

function changed(bodyValue: unknown, currentValue: unknown): boolean {
  return normalized(bodyValue) !== normalized(currentValue);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const taskId = TASK_ID.parse(id);
    const user = await requireAuthenticatedUser();
    const bodyRaw = await request.json().catch(() => ({}));
    if (!bodyRaw || typeof bodyRaw !== "object" || Array.isArray(bodyRaw)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const body = { ...(bodyRaw as Record<string, unknown>) };

    const tasks = await getTasks();
    const existing = tasks.find((task) => task.taskId === taskId);
    if (!existing) throw new NotFoundError(`Task ${taskId} not found`);

    if (user.role !== "admin" && !taskIsInScope(user, existing)) {
      // Do not leak whether another employee's task exists.
      throw new NotFoundError(`Task ${taskId} not found`);
    }

    const patch: Record<string, unknown> = {};
    const requestedKeys = Object.keys(body).filter((key) => !restrictedKeys.has(key));

    if (user.role === "admin") {
      for (const key of requestedKeys) patch[key] = body[key];
      if (Object.keys(patch).length === 0) {
        return NextResponse.json({ error: "No editable fields were provided" }, { status: 400 });
      }
      if (patch.assignedTo !== undefined && patch.assignedTo !== null) {
        const employees = await getEmployees();
        if (!employees.some((employee) => employee.employeeId === patch.assignedTo)) {
          return NextResponse.json({ error: "Assigned employee does not exist" }, { status: 400 });
        }
      }
      const task = await updateTask({ ...patch, taskId }, { email: user.email, role: "admin" });
      return NextResponse.json({ task });
    }

    if (!getTaskDataScope(user)) throw new ForbiddenError();

    const requireFieldPermission = (
      condition: boolean,
      permission: Parameters<typeof hasPermission>[1],
      message: string,
    ) => {
      if (condition && !hasPermission(user, permission)) throw new ForbiddenError(message);
    };

    requireFieldPermission(
      ["title", "description", "dueDate", "assignedDate"].some((key) => body[key] !== undefined),
      "TASKS_EDIT",
      "You do not have permission to edit task details",
    );

    if (body.title !== undefined) patch.title = body.title;
    if (body.description !== undefined) patch.description = body.description;
    if (body.dueDate !== undefined) patch.dueDate = body.dueDate;
    if (body.assignedDate !== undefined) patch.assignedDate = body.assignedDate;

    if (body.assignedTo !== undefined && changed(body.assignedTo, existing.assignedTo)) {
      if (!hasPermission(user, "TASKS_ASSIGN")) {
        throw new ForbiddenError("You do not have permission to assign tasks");
      }
      if (body.assignedTo !== null) {
        const employees = await getEmployees();
        if (!employees.some((employee) => employee.employeeId === body.assignedTo)) {
          return NextResponse.json({ error: "Assigned employee does not exist" }, { status: 400 });
        }
      }
      patch.assignedTo = body.assignedTo;
    }

    if (body.departmentId !== undefined && changed(body.departmentId, existing.departmentId)) {
      if (!hasPermission(user, "TASKS_ASSIGN")) {
        throw new ForbiddenError("You do not have permission to change a task's department");
      }
      patch.departmentId = body.departmentId;
    }

    if (body.priority !== undefined && changed(body.priority, existing.priority)) {
      if (!hasPermission(user, "TASKS_CHANGE_PRIORITY")) {
        throw new ForbiddenError("You do not have permission to change task priority");
      }
      patch.priority = body.priority;
    }

    if (body.status !== undefined && changed(body.status, existing.status)) {
      const nextStatus = String(body.status);
      if (nextStatus === "Overdue") {
        throw new ForbiddenError("Tasks cannot be manually marked Overdue");
      }
      if (nextStatus === "Completed") {
        if (!hasPermission(user, "TASKS_COMPLETE")) {
          throw new ForbiddenError("You do not have permission to complete tasks");
        }
      } else if (!hasPermission(user, "TASKS_CHANGE_STATUS")) {
        throw new ForbiddenError("You do not have permission to change task status");
      }
      const currentStatus = String(existing.status ?? "Pending");
      const allowed = nonAdminTransitions[currentStatus] ?? [];
      if (!allowed.includes(nextStatus)) {
        return NextResponse.json(
          { error: `Invalid task status transition from ${currentStatus} to ${nextStatus}` },
          { status: 400 },
        );
      }
      patch.status = nextStatus;
    }

    if (body.progressPercentage !== undefined && changed(body.progressPercentage, existing.progressPercentage)) {
      if (!hasPermission(user, "TASKS_UPDATE_PROGRESS")) {
        throw new ForbiddenError("You do not have permission to update task progress");
      }
      patch.progressPercentage = body.progressPercentage;
    }

    if (body.remarks !== undefined && changed(body.remarks, existing.remarks)) {
      if (!hasPermission(user, "TASKS_ADD_REMARKS")) {
        throw new ForbiddenError("You do not have permission to add task remarks");
      }
      patch.remarks = body.remarks;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No permitted changes were provided" }, { status: 400 });
    }

    const task = await updateTask({ ...patch, taskId }, { email: user.email, role: "employee" });
    return NextResponse.json({ task });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message || "Invalid task ID" }, { status: 400 });
    }
    return handleApiError(err, "Failed to update task");
  }
}
