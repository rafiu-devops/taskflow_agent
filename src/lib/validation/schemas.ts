import { z } from "zod";
import { isPermissionKey } from "@/lib/auth/permissions";

const idPattern = /^[A-Z]+-\d{3,}$/;

export const employeeIdSchema = z.string().regex(idPattern, "Invalid employee ID format");
export const departmentIdSchema = z.string().regex(idPattern, "Invalid department ID format");
export const taskIdSchema = z.string().regex(idPattern, "Invalid task ID format");

export const createTaskSchema = z.object({
  title: z.string().min(1, "Task title is required").max(200),
  description: z.string().max(2000).optional().nullable(),
  assignedTo: employeeIdSchema.optional().nullable(),
  assignedBy: z.string().max(100).optional().nullable(),
  departmentId: departmentIdSchema.optional().nullable(),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]).default("Medium"),
  status: z.enum(["Pending", "In Progress", "Completed", "Overdue"]).default("Pending"),
  assignedDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  progressPercentage: z.number().min(0).max(100).optional().nullable(),
  remarks: z.string().max(2000).optional().nullable(),
});

export const updateTaskSchema = createTaskSchema.partial().extend({
  taskId: taskIdSchema,
});

export const createEmployeeSchema = z.object({
  fullName: z.string().trim().min(1, "Employee full name is required").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid work email").max(254),
  employeeId: employeeIdSchema.optional(),
  departmentId: departmentIdSchema.optional().nullable(),
  designation: z.string().trim().max(120).optional().nullable(),
  accountStatus: z.enum(["Active", "Inactive"]).optional().nullable(),
  joiningDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").optional().nullable(),
});

export const createDepartmentSchema = z.object({
  departmentName: z.string().trim().min(1, "Department name is required").max(100, "Department name must be 100 characters or fewer"),
  description: z.string().max(1000).optional().nullable(),
  manager: z.string().trim().max(100).optional().nullable(),
  status: z.enum(["Active", "Inactive"]).optional().nullable(),
});

export const updateDepartmentSchema = createDepartmentSchema.partial().extend({
  departmentId: departmentIdSchema,
});

export const loginSchema = z.object({
  code: z.string().min(1),
  state: z.string().optional(),
});

export const updateEmployeePermissionsSchema = z.object({
  permissions: z
    .record(z.boolean())
    .superRefine((value, ctx) => {
      for (const key of Object.keys(value)) {
        if (!isPermissionKey(key)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Unknown permission key: ${key}` });
        }
      }
    }),
});