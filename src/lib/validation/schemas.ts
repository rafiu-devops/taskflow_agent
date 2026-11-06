import { z } from "zod";

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

export const loginSchema = z.object({
  code: z.string().min(1),
  state: z.string().optional(),
});