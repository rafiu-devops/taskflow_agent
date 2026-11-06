export type AccountStatus = "Active" | "Inactive";
export type DepartmentStatus = "Active" | "Inactive";
export type TaskPriority = "Low" | "Medium" | "High" | "Urgent";
export type TaskStatus = "Pending" | "In Progress" | "Completed" | "Overdue";

export interface Employee {
  employeeId: string;
  fullName: string;
  email: string | null;
  departmentId: string | null;
  designation: string | null;
  accountStatus: AccountStatus | null;
  joiningDate: string | null; // ISO date
  createdAt: string | null;
  updatedAt: string | null;
}

export interface Department {
  departmentId: string;
  departmentName: string;
  description: string | null;
  manager: string | null;
  status: DepartmentStatus | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface Task {
  taskId: string;
  title: string;
  description: string | null;
  assignedTo: string | null; // Employee_ID
  assignedBy: string | null; // Employee_ID / User
  departmentId: string | null;
  priority: TaskPriority | null;
  status: TaskStatus | null;
  assignedDate: string | null;
  dueDate: string | null;
  completionDate: string | null;
  progressPercentage: number | null;
  remarks: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface PerformanceRow {
  performanceId: string | null;
  employeeId: string | null;
  employeeName: string | null;
  departmentId: string | null;
  reportingPeriod: string | null;
  totalAssignedTasks: number | null;
  completedTasks: number | null;
  pendingTasks: number | null;
  inProgressTasks: number | null;
  overdueTasks: number | null;
  completionRate: number | null;
  onTimeCompletionRate: number | null;
  performanceSummary: string | null;
  generatedAt: string | null;
}

export interface ActivityLog {
  logId: string;
  userId: string | null;
  userName: string | null;
  userRole: string | null;
  actionType: string | null;
  targetEntity: string | null;
  targetId: string | null;
  actionDescription: string | null;
  previousValue: string | null;
  newValue: string | null;
  timestamp: string | null;
  status: string | null;
}

export interface DashboardSummary {
  totalEmployees: number;
  totalDepartments: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
}