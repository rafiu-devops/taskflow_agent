import ExcelJS from "exceljs";
import { downloadWorkbook, uploadWorkbook } from "@/lib/google/driveClient";
import { withWorkbookLock } from "@/lib/excel/mutex";
import { ConflictError, NotFoundError } from "@/lib/errors";
import type {
  Employee,
  Department,
  Task,
  TaskStatus,
  TaskPriority,
  PerformanceRow,
  ActivityLog,
  DashboardSummary,
} from "@/lib/types/domain";
import { createTaskSchema, updateTaskSchema } from "@/lib/validation/schemas";

function cellValue(cell: ExcelJS.Cell): unknown {
  const v = cell.value;
  if (v === null || v === undefined) return null;
  if (v instanceof Date) {
    return v.toISOString().slice(0, 10);
  }
  if (typeof v === "object") {
    const obj = v as unknown as Record<string, unknown>;
    if (obj.result !== undefined) return obj.result;
    if (obj.text) return obj.text;
    if (Array.isArray(obj.richText)) {
      return (obj.richText as Array<{ text: string }>).map((t) => t.text).join("");
    }
    if (obj.formula) return null; // formula without cached result
  }
  return v;
}

function rowToObject(headers: string[], row: ExcelJS.Row): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  headers.forEach((h, i) => {
    if (!h) return;
    const cell = row.getCell(i + 1);
    obj[h] = cellValue(cell);
  });
  return obj;
}

function readTable(ws: ExcelJS.Worksheet): { headers: string[]; rows: ExcelJS.Row[] } {
  const headerRow = ws.getRow(1);
  const headers: string[] = [];
  for (let c = 1; c <= (headerRow.cellCount || ws.columnCount || 0); c++) {
    const v = headerRow.getCell(c).value;
    headers.push(v === null || v === undefined ? "" : String(v));
  }
  // trim trailing empty headers
  while (headers.length > 0 && headers[headers.length - 1] === "") headers.pop();

  const rows: ExcelJS.Row[] = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    // consider row if any cell non-empty
    let any = false;
    for (let c = 1; c <= headers.length; c++) {
      const v = cellValue(row.getCell(c));
      if (v !== null && v !== undefined && v !== "") {
        any = true;
        break;
      }
    }
    if (any) rows.push(row);
  }
  return { headers, rows };
}

function toStr(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  return String(v);
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// ---------- Readers ----------

export async function getEmployees(): Promise<Employee[]> {
  const { buffer } = await downloadWorkbook();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as any);
  const ws = wb.getWorksheet("Employees");
  if (!ws) return [];
  const { headers, rows } = readTable(ws);
  return rows
    .map((row) => rowToObject(headers, row))
    .filter((o) => o.Employee_ID)
    .map((o) => ({
      employeeId: String(o.Employee_ID),
      fullName: o.Full_Name ? String(o.Full_Name) : "",
      email: toStr(o.Email),
      departmentId: toStr(o.Department_ID),
      designation: toStr(o.Designation),
      accountStatus: (toStr(o.Account_Status) as "Active" | "Inactive" | null) ?? null,
      joiningDate: toStr(o.Joining_Date),
      createdAt: toStr(o.Created_At),
      updatedAt: toStr(o.Updated_At),
    }));
}

export async function getDepartments(): Promise<Department[]> {
  const { buffer } = await downloadWorkbook();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as any);
  const ws = wb.getWorksheet("Departments");
  if (!ws) return [];
  const { headers, rows } = readTable(ws);
  return rows
    .map((row) => rowToObject(headers, row))
    .filter((o) => o.Department_ID)
    .map((o) => ({
      departmentId: String(o.Department_ID),
      departmentName: String(o.Department_Name ?? ""),
      description: toStr(o.Department_Description),
      manager: toStr(o.Department_Manager),
      status: (toStr(o.Department_Status) as "Active" | "Inactive" | null) ?? null,
      createdAt: toStr(o.Created_At),
      updatedAt: toStr(o.Updated_At),
    }));
}

export async function getTasks(): Promise<Task[]> {
  const { buffer } = await downloadWorkbook();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as any);
  const ws = wb.getWorksheet("Tasks");
  if (!ws) return [];
  const { headers, rows } = readTable(ws);
  return rows
    .map((row) => rowToObject(headers, row))
    .filter((o) => o.Task_ID)
    .map((o) => ({
      taskId: String(o.Task_ID),
      title: String(o.Task_Title ?? ""),
      description: toStr(o.Task_Description),
      assignedTo: toStr(o.Assigned_To),
      assignedBy: toStr(o.Assigned_By),
      departmentId: toStr(o.Department_ID),
      priority: (toStr(o.Priority) as TaskPriority | null) ?? null,
      status: (toStr(o.Task_Status) as TaskStatus | null) ?? null,
      assignedDate: toStr(o.Assigned_Date),
      dueDate: toStr(o.Due_Date),
      completionDate: toStr(o.Completion_Date),
      progressPercentage: toNum(o.Progress_Percentage),
      remarks: toStr(o.Task_Remarks),
      createdAt: toStr(o.Created_At),
      updatedAt: toStr(o.Updated_At),
    }));
}

export async function getPerformance(): Promise<PerformanceRow[]> {
  const { buffer } = await downloadWorkbook();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as any);
  const ws = wb.getWorksheet("Performance");
  if (!ws) return [];
  const { headers, rows } = readTable(ws);
  return rows.map((row) => {
    const o = rowToObject(headers, row);
    return {
      performanceId: toStr(o.Performance_ID),
      employeeId: toStr(o.Employee_ID),
      employeeName: toStr(o.Employee_Name),
      departmentId: toStr(o.Department_ID),
      reportingPeriod: toStr(o.Reporting_Period),
      totalAssignedTasks: toNum(o.Total_Assigned_Tasks),
      completedTasks: toNum(o.Completed_Tasks),
      pendingTasks: toNum(o.Pending_Tasks),
      inProgressTasks: toNum(o.In_Progress_Tasks),
      overdueTasks: toNum(o.Overdue_Tasks),
      completionRate: toNum(o.Completion_Rate),
      onTimeCompletionRate: toNum(o.On_Time_Completion_Rate),
      performanceSummary: toStr(o.Performance_Summary),
      generatedAt: toStr(o.Generated_At),
    };
  });
}

export async function getActivityLogs(): Promise<ActivityLog[]> {
  const { buffer } = await downloadWorkbook();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as any);
  const ws = wb.getWorksheet("Activity_Logs");
  if (!ws) return [];
  const { headers, rows } = readTable(ws);
  return rows
    .map((row) => rowToObject(headers, row))
    .filter((o) => o.Log_ID)
    .map((o) => ({
      logId: String(o.Log_ID),
      userId: toStr(o.User_ID),
      userName: toStr(o.User_Name),
      userRole: toStr(o.User_Role),
      actionType: toStr(o.Action_Type),
      targetEntity: toStr(o.Target_Entity),
      targetId: toStr(o.Target_ID),
      actionDescription: toStr(o.Action_Description),
      previousValue: toStr(o.Previous_Value),
      newValue: toStr(o.New_Value),
      timestamp: toStr(o.Timestamp),
      status: toStr(o.Status),
    }));
}

// ---------- Writers ----------

function nowIso(): string {
  return new Date().toISOString();
}

function nextId(existing: string[], prefix: string): string {
  let max = 0;
  for (const id of existing) {
    const m = id.match(new RegExp(`^${prefix}-(\\d+)$`));
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  const next = max + 1;
  return `${prefix}-${String(next).padStart(3, "0")}`;
}

function rebuildTable(ws: ExcelJS.Worksheet, tableName: string, headers: string[], rows: unknown[][]): void {
  const old = (ws as any).tables?.[tableName];
  const style = old?.table?.style;
  (ws as any).removeTable(tableName);
  const table = (ws as any).addTable({
    name: tableName,
    ref: "A1",
    headerRow: true,
    totalsRow: false,
    style: {
      theme: ((style?.name as string) || "TableStyleMedium2") as any,
      showFirstColumn: style?.showFirstColumn === "1" || style?.showFirstColumn === true,
      showLastColumn: style?.showLastColumn === "1" || style?.showLastColumn === true,
      showRowStripes: style?.showRowStripes !== "0" && style?.showRowStripes !== false,
      showColumnStripes: style?.showColumnStripes === "1" || style?.showColumnStripes === true,
    },
    columns: headers.map((h) => ({ name: h })),
    rows,
  });
  table.commit();
}

export async function createTask(
  input: unknown,
  actorId: string | null = null
): Promise<Task> {
  const parsed = createTaskSchema.parse(input);
  return withWorkbookLock(async () => {
    const { buffer, version } = await downloadWorkbook();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as any);

    const ws = wb.getWorksheet("Tasks");
    if (!ws) throw new Error("Tasks sheet not found");

    // read headers
    const headerRow = ws.getRow(1);
    const headers: string[] = [];
    for (let c = 1; c <= headerRow.cellCount; c++) {
      const v = headerRow.getCell(c).value;
      headers.push(v === null || v === undefined ? "" : String(v));
    }
    while (headers.length && headers[headers.length - 1] === "") headers.pop();

    const colIndex = (name: string) => headers.indexOf(name) + 1;

    // existing rows data
    const existingRows: unknown[][] = [];
    const existingIds: string[] = [];
    for (let r = 2; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const vals: unknown[] = [];
      let any = false;
      for (let c = 1; c <= headers.length; c++) {
        const v = cellValue(row.getCell(c));
        vals.push(v);
        if (v !== null && v !== undefined && v !== "") any = true;
      }
      if (any) {
        existingRows.push(vals);
        const id = vals[colIndex("Task_ID") - 1];
        if (id) existingIds.push(String(id));
      }
    }

    const taskId = nextId(existingIds, "TASK");
    const now = nowIso();
    const newRow: unknown[] = new Array(headers.length).fill(null);
    const set = (name: string, value: unknown) => {
      const idx = colIndex(name) - 1;
      if (idx >= 0) newRow[idx] = value;
    };
    set("Task_ID", taskId);
    set("Task_Title", parsed.title);
    set("Task_Description", parsed.description ?? null);
    set("Assigned_To", parsed.assignedTo ?? null);
    set("Assigned_By", parsed.assignedBy ?? actorId ?? null);
    set("Department_ID", parsed.departmentId ?? null);
    set("Priority", parsed.priority);
    set("Task_Status", parsed.status);
    set("Assigned_Date", parsed.assignedDate ?? now.slice(0, 10));
    set("Due_Date", parsed.dueDate ?? null);
    set("Completion_Date", null);
    set("Progress_Percentage", parsed.progressPercentage ?? 0);
    set("Task_Remarks", parsed.remarks ?? null);
    set("Created_At", now);
    set("Updated_At", now);

    existingRows.push(newRow);

    rebuildTable(ws, "tblTasks", headers, existingRows);

    // append activity log (best-effort)
    try {
      const logWs = wb.getWorksheet("Activity_Logs");
      if (logWs) {
        const logHeaderRow = logWs.getRow(1);
        const logHeaders: string[] = [];
        for (let c = 1; c <= logHeaderRow.cellCount; c++) {
          const v = logHeaderRow.getCell(c).value;
          logHeaders.push(v === null || v === undefined ? "" : String(v));
        }
        while (logHeaders.length && logHeaders[logHeaders.length - 1] === "") logHeaders.pop();

        const logExisting: unknown[][] = [];
        const logIds: string[] = [];
        for (let r = 2; r <= logWs.rowCount; r++) {
          const row = logWs.getRow(r);
          const vals: unknown[] = [];
          let any = false;
          for (let c = 1; c <= logHeaders.length; c++) {
            const v = cellValue(row.getCell(c));
            vals.push(v);
            if (v !== null && v !== undefined && v !== "") any = true;
          }
          if (any) {
            logExisting.push(vals);
            const id = vals[logHeaders.indexOf("Log_ID")];
            if (id) logIds.push(String(id));
          }
        }
        const logId = nextId(logIds, "LOG");
        const logRow: unknown[] = new Array(logHeaders.length).fill(null);
        const lset = (name: string, value: unknown) => {
          const idx = logHeaders.indexOf(name);
          if (idx >= 0) logRow[idx] = value;
        };
        lset("Log_ID", logId);
        lset("User_ID", actorId);
        lset("User_Name", actorId);
        lset("User_Role", "Admin");
        lset("Action_Type", "CREATE");
        lset("Target_Entity", "Task");
        lset("Target_ID", taskId);
        lset("Action_Description", `Created task ${taskId}`);
        lset("Previous_Value", null);
        lset("New_Value", parsed.title);
        lset("Timestamp", now);
        lset("Status", "Success");
        logExisting.push(logRow);
        rebuildTable(logWs, "tblActivityLogs", logHeaders, logExisting);
      }
    } catch {
      // ignore logging failures
    }

    const outBuffer = await wb.xlsx.writeBuffer();
    await uploadWorkbook(Buffer.from(outBuffer), version);

    return {
      taskId,
      title: parsed.title,
      description: parsed.description ?? null,
      assignedTo: parsed.assignedTo ?? null,
      assignedBy: parsed.assignedBy ?? actorId ?? null,
      departmentId: parsed.departmentId ?? null,
      priority: parsed.priority,
      status: parsed.status,
      assignedDate: parsed.assignedDate ?? now.slice(0, 10),
      dueDate: parsed.dueDate ?? null,
      completionDate: null,
      progressPercentage: parsed.progressPercentage ?? 0,
      remarks: parsed.remarks ?? null,
      createdAt: now,
      updatedAt: now,
    };
  });
}

export async function updateTask(
  input: unknown,
  actorId: string | null = null
): Promise<Task> {
  const parsed = updateTaskSchema.parse(input);
  const taskId = parsed.taskId;
  return withWorkbookLock(async () => {
    const { buffer, version } = await downloadWorkbook();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as any);

    const ws = wb.getWorksheet("Tasks");
    if (!ws) throw new Error("Tasks sheet not found");

    const headerRow = ws.getRow(1);
    const headers: string[] = [];
    for (let c = 1; c <= headerRow.cellCount; c++) {
      const v = headerRow.getCell(c).value;
      headers.push(v === null || v === undefined ? "" : String(v));
    }
    while (headers.length && headers[headers.length - 1] === "") headers.pop();
    const colIndex = (name: string) => headers.indexOf(name) + 1;

    // find row
    let targetRow: ExcelJS.Row | null = null;
    for (let r = 2; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const id = cellValue(row.getCell(colIndex("Task_ID")));
      if (id && String(id) === taskId) {
        targetRow = row;
        break;
      }
    }
    if (!targetRow) throw new NotFoundError(`Task ${taskId} not found`);

    const now = nowIso();
    const setCell = (name: string, value: unknown) => {
      const idx = colIndex(name);
      if (idx > 0) targetRow!.getCell(idx).value = value as ExcelJS.CellValue;
    };

    // read previous for log
    const prevTitle = cellValue(targetRow.getCell(colIndex("Task_Title")));

    if (parsed.title !== undefined) setCell("Task_Title", parsed.title);
    if (parsed.description !== undefined) setCell("Task_Description", parsed.description);
    if (parsed.assignedTo !== undefined) setCell("Assigned_To", parsed.assignedTo);
    if (parsed.assignedBy !== undefined) setCell("Assigned_By", parsed.assignedBy);
    if (parsed.departmentId !== undefined) setCell("Department_ID", parsed.departmentId);
    if (parsed.priority !== undefined) setCell("Priority", parsed.priority);
    if (parsed.status !== undefined) setCell("Task_Status", parsed.status);
    if (parsed.assignedDate !== undefined) setCell("Assigned_Date", parsed.assignedDate);
    if (parsed.dueDate !== undefined) setCell("Due_Date", parsed.dueDate);
    if (parsed.progressPercentage !== undefined) setCell("Progress_Percentage", parsed.progressPercentage);
    if (parsed.remarks !== undefined) setCell("Task_Remarks", parsed.remarks);
    setCell("Updated_At", now);
    if (parsed.status === "Completed") {
      setCell("Completion_Date", now.slice(0, 10));
    }

    const outBuffer = await wb.xlsx.writeBuffer();
    await uploadWorkbook(Buffer.from(outBuffer), version);

    // read back
    const updated = await getTasks().then((ts) => ts.find((t) => t.taskId === taskId)!);
    return updated;
  });
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const [employees, departments, tasks] = await Promise.all([
    getEmployees(),
    getDepartments(),
    getTasks(),
  ]);
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "Completed").length;
  const pendingTasks = tasks.filter((t) => t.status === "Pending").length;
  const overdueTasks = tasks.filter((t) => t.status === "Overdue").length;
  return {
    totalEmployees: employees.length,
    totalDepartments: departments.length,
    totalTasks,
    completedTasks,
    pendingTasks,
    overdueTasks,
  };
}