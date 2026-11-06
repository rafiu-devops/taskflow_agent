export const EMPLOYEE_PERMISSIONS = [
  // Dashboard
  {
    key: "DASHBOARD_VIEW_PERSONAL",
    label: "View Personal Dashboard",
    description: "Access the employee overview and personal workspace summary.",
    category: "Dashboard",
  },
  {
    key: "DASHBOARD_VIEW_TASK_STATS",
    label: "View General Task Statistics",
    description: "See task completion and status statistics within the authorized scope.",
    category: "Dashboard",
  },

  // Employee Directory
  {
    key: "EMPLOYEES_VIEW_DIRECTORY",
    label: "View Employee Directory",
    description: "Browse the employee directory.",
    category: "Employee Directory",
  },
  {
    key: "EMPLOYEES_VIEW_DETAILS",
    label: "View Employee Details",
    description: "See department and designation details for employees.",
    category: "Employee Directory",
  },
  {
    key: "EMPLOYEES_VIEW_CONTACT",
    label: "View Employee Contact Information",
    description: "See work email addresses in the directory.",
    category: "Employee Directory",
  },

  // Departments
  {
    key: "DEPARTMENTS_VIEW",
    label: "View Departments",
    description: "View the department directory.",
    category: "Departments",
  },
  {
    key: "DEPARTMENTS_VIEW_DETAILS",
    label: "View Department Details",
    description: "See department descriptions, leads, and status.",
    category: "Departments",
  },
  {
    key: "DEPARTMENTS_VIEW_TASK_STATS",
    label: "View Department Task Statistics",
    description: "See task statistics for departments the employee is allowed to view.",
    category: "Departments",
  },

  // Task Management
  {
    key: "TASKS_VIEW_MY",
    label: "View My Tasks",
    description: "View tasks assigned to the authenticated employee.",
    category: "Task Management",
  },
  {
    key: "TASKS_VIEW_DEPARTMENT",
    label: "View Department Tasks",
    description: "View tasks in the authenticated employee's department.",
    category: "Task Management",
  },
  {
    key: "TASKS_VIEW_ALL",
    label: "View All Tasks",
    description: "View tasks across the organization.",
    category: "Task Management",
  },
  {
    key: "TASKS_CREATE",
    label: "Create Tasks",
    description: "Create new tasks within the authorized scope.",
    category: "Task Management",
  },
  {
    key: "TASKS_EDIT",
    label: "Edit Tasks",
    description: "Edit task details within the authorized scope and ownership limits.",
    category: "Task Management",
  },
  {
    key: "TASKS_DELETE",
    label: "Delete Tasks",
    description: "Delete tasks within the authorized scope. Reserved for task-delete operations.",
    category: "Task Management",
  },
  {
    key: "TASKS_ASSIGN",
    label: "Assign Tasks",
    description: "Assign or reassign tasks to employees and departments.",
    category: "Task Management",
  },
  {
    key: "TASKS_CHANGE_PRIORITY",
    label: "Change Task Priority",
    description: "Change the priority of permitted tasks.",
    category: "Task Management",
  },
  {
    key: "TASKS_CHANGE_STATUS",
    label: "Change Task Status",
    description: "Change the status of permitted tasks according to allowed transitions.",
    category: "Task Management",
  },
  {
    key: "TASKS_UPDATE_PROGRESS",
    label: "Update Task Progress",
    description: "Update progress percentages on permitted tasks.",
    category: "Task Management",
  },
  {
    key: "TASKS_COMPLETE",
    label: "Complete Tasks",
    description: "Mark permitted tasks as completed.",
    category: "Task Management",
  },
  {
    key: "TASKS_ADD_REMARKS",
    label: "Add Task Remarks",
    description: "Add or update remarks on permitted tasks.",
    category: "Task Management",
  },

  // Performance
  {
    key: "PERFORMANCE_VIEW_MY",
    label: "View My Performance",
    description: "View the authenticated employee's performance records.",
    category: "Performance",
  },
  {
    key: "PERFORMANCE_VIEW_DEPARTMENT",
    label: "View Department Performance",
    description: "View performance records in the authenticated employee's department.",
    category: "Performance",
  },
  {
    key: "PERFORMANCE_VIEW_ALL",
    label: "View All Employee Performance",
    description: "View performance records across the organization.",
    category: "Performance",
  },
  {
    key: "PERFORMANCE_GENERATE_REPORTS",
    label: "Generate Performance Reports",
    description: "Generate performance reports within the authorized scope.",
    category: "Performance",
  },
  {
    key: "PERFORMANCE_EXPORT_REPORTS",
    label: "Export Performance Reports",
    description: "Export performance reports within the authorized scope.",
    category: "Performance",
  },

  // Reports & Analytics
  {
    key: "REPORTS_VIEW_DASHBOARD",
    label: "View Dashboard Reports",
    description: "View dashboard and analytics reports.",
    category: "Reports & Analytics",
  },
  {
    key: "REPORTS_VIEW_DEPARTMENT",
    label: "View Department Reports",
    description: "View reports for the authenticated employee's department.",
    category: "Reports & Analytics",
  },
  {
    key: "REPORTS_VIEW_ALL",
    label: "View All Employee Reports",
    description: "View reports across the organization.",
    category: "Reports & Analytics",
  },
  {
    key: "REPORTS_EXPORT",
    label: "Export Reports",
    description: "Export reports within the authorized scope.",
    category: "Reports & Analytics",
  },

  // Activity Logs
  {
    key: "ACTIVITY_LOGS_VIEW",
    label: "View Activity Logs",
    description: "View organization-wide activity logs.",
    category: "Activity Logs",
  },
  {
    key: "ACTIVITY_LOGS_VIEW_MY",
    label: "View My Activity History",
    description: "View the authenticated employee's own activity history.",
    category: "Activity Logs",
  },

  // AI Assistant
  {
    key: "ASSISTANT_EMPLOYEE_ACCESS",
    label: "Access Employee AI Agent",
    description: "Access the employee-facing AI assistant.",
    category: "AI Assistant",
  },
  {
    key: "ASSISTANT_TASK_TOOLS",
    label: "Use AI Task Management Tools",
    description: "Use AI tools that read or modify tasks, subject to task permissions.",
    category: "AI Assistant",
  },
  {
    key: "ASSISTANT_PERFORMANCE_TOOLS",
    label: "Use AI Performance Report Tools",
    description: "Use AI tools that read performance data, subject to performance permissions.",
    category: "AI Assistant",
  },
  {
    key: "ASSISTANT_DEPARTMENT_TOOLS",
    label: "Use AI Department Query Tools",
    description: "Use AI tools that answer department queries, subject to department permissions.",
    category: "AI Assistant",
  },
] as const;

export type EmployeePermissionDefinition = (typeof EMPLOYEE_PERMISSIONS)[number];
export type PermissionKey = EmployeePermissionDefinition["key"];

export const PERMISSION_KEYS = EMPLOYEE_PERMISSIONS.map((permission) => permission.key) as PermissionKey[];

export type PermissionCategory = EmployeePermissionDefinition["category"];

const categoryOrder: PermissionCategory[] = [
  "Dashboard",
  "Employee Directory",
  "Departments",
  "Task Management",
  "Performance",
  "Reports & Analytics",
  "Activity Logs",
  "AI Assistant",
];

export const PERMISSION_CATEGORIES = categoryOrder.map((category) => ({
  name: category,
  permissions: EMPLOYEE_PERMISSIONS.filter((permission) => permission.category === category),
}));

export type PermissionGrantState = Record<PermissionKey, boolean>;

export function emptyEmployeePermissions(): PermissionGrantState {
  return Object.fromEntries(PERMISSION_KEYS.map((key) => [key, false])) as PermissionGrantState;
}

export function adminPermissions(): PermissionGrantState {
  return Object.fromEntries(PERMISSION_KEYS.map((key) => [key, true])) as PermissionGrantState;
}

export function isPermissionKey(value: string): value is PermissionKey {
  return (PERMISSION_KEYS as string[]).includes(value);
}

export function normalizePermissionGrants(input: unknown): PermissionGrantState {
  const result = emptyEmployeePermissions();
  if (!input || typeof input !== "object") return result;
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (isPermissionKey(key) && typeof value === "boolean") {
      result[key] = value;
    }
  }
  return result;
}

export function countGrantedPermissions(grants: PermissionGrantState): number {
  return PERMISSION_KEYS.reduce((total, key) => total + (grants[key] ? 1 : 0), 0);
}

export function taskViewPermissions(grants: PermissionGrantState): PermissionKey[] {
  return ["TASKS_VIEW_MY", "TASKS_VIEW_DEPARTMENT", "TASKS_VIEW_ALL"].filter(
    (key) => grants[key as PermissionKey],
  ) as PermissionKey[];
}

export function performanceViewPermissions(grants: PermissionGrantState): PermissionKey[] {
  return ["PERFORMANCE_VIEW_MY", "PERFORMANCE_VIEW_DEPARTMENT", "PERFORMANCE_VIEW_ALL"].filter(
    (key) => grants[key as PermissionKey],
  ) as PermissionKey[];
}

export function reportViewPermissions(grants: PermissionGrantState): PermissionKey[] {
  return ["REPORTS_VIEW_DASHBOARD", "REPORTS_VIEW_DEPARTMENT", "REPORTS_VIEW_ALL"].filter(
    (key) => grants[key as PermissionKey],
  ) as PermissionKey[];
}
