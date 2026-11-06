import TasksClient from "./TasksClient";
import { getTaskDataScope, hasPermission } from "@/lib/auth/authorization";
import { requireAnyPagePermission } from "@/lib/auth/pageGuards";

export default async function TasksPage() {
  const user = await requireAnyPagePermission(["TASKS_VIEW_MY", "TASKS_VIEW_DEPARTMENT", "TASKS_VIEW_ALL"]);
  const scope = getTaskDataScope(user) ?? "own";
  return (
    <TasksClient
      scope={scope}
      canCreateTask={hasPermission(user, "TASKS_CREATE")}
      user={{
        role: user.role,
        employeeId: user.employeeId ?? null,
        departmentId: user.employee?.departmentId ?? null,
        permissions: user.permissions,
      }}
    />
  );
}
