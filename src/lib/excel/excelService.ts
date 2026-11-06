import ExcelJS from "exceljs";
import { downloadWorkbook, uploadWorkbook } from "@/lib/google/driveClient";
import { withWorkbookLock } from "@/lib/excel/mutex";
import { NotFoundError } from "@/lib/errors";
import type {
  Employee,
  Department,
  Task,
  TaskStatus,
  TaskPriority,
  PerformanceRow,
  ActivityLog,
  DashboardSummary,
  PermissionRecord,
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

import {
  PERMISSION_KEYS,
  type PermissionGrantState,
  type PermissionKey,
  emptyEmployeePermissions,
} from "@/lib/auth/permissions";

// ---------- Readers ----------

export function parseEmployeesWorksheet(ws: ExcelJS.Worksheet): Employee[] {
  const { headers, rows } = readTable(ws);
  return rows
    .map((row) => rowToObject(headers, row))
    .filter((o) => o.Employee_ID)
    .map((o) => ({
      employeeId: String(o.Employee_ID).trim(),
      fullName: o.Full_Name ? String(o.Full_Name).trim() : "",
      email: toStr(o.Email)?.trim() ?? null,
      departmentId: toStr(o.Department_ID)?.trim() ?? null,
      designation: toStr(o.Designation)?.trim() ?? null,
      accountStatus: (toStr(o.Account_Status)?.trim() as "Active" | "Inactive" | null) ?? null,
      joiningDate: toStr(o.Joining_Date)?.trim() ?? null,
      createdAt: toStr(o.Created_At),
      updatedAt: toStr(o.Updated_At),
    }));
}

export async function getEmployees(): Promise<Employee[]> {
  const { buffer } = await downloadWorkbook();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as Parameters<typeof wb.xlsx.load>[0]);
  const ws = wb.getWorksheet("Employees");
  if (!ws) return [];
  return parseEmployeesWorksheet(ws);
}

export function parseDepartmentsWorksheet(ws: ExcelJS.Worksheet): Department[] {
  const { headers, rows } = readTable(ws);
  return rows
    .map((row) => rowToObject(headers, row))
    .filter((o) => o.Department_ID)
    .map((o) => ({
      departmentId: String(o.Department_ID).trim(),
      departmentName: String(o.Department_Name ?? "").trim(),
      description: toStr(o.Department_Description),
      manager: toStr(o.Department_Manager),
      status: (toStr(o.Department_Status)?.trim() as "Active" | "Inactive" | null) ?? null,
      createdAt: toStr(o.Created_At),
      updatedAt: toStr(o.Updated_At),
    }));
}

export function parseTasksWorksheet(ws: ExcelJS.Worksheet): Task[] {
  const { headers, rows } = readTable(ws);
  return rows
    .map((row) => rowToObject(headers, row))
    .filter((o) => o.Task_ID)
    .map((o) => ({
      taskId: String(o.Task_ID).trim(),
      title: String(o.Task_Title ?? "").trim(),
      description: toStr(o.Task_Description),
      assignedTo: toStr(o.Assigned_To)?.trim() ?? null,
      assignedBy: toStr(o.Assigned_By)?.trim() ?? null,
      departmentId: toStr(o.Department_ID)?.trim() ?? null,
      priority: (toStr(o.Priority)?.trim() as TaskPriority | null) ?? null,
      status: (toStr(o.Task_Status)?.trim() as TaskStatus | null) ?? null,
      assignedDate: toStr(o.Assigned_Date),
      dueDate: toStr(o.Due_Date),
      completionDate: toStr(o.Completion_Date),
      progressPercentage: toNum(o.Progress_Percentage),
      remarks: toStr(o.Task_Remarks),
      createdAt: toStr(o.Created_At),
      updatedAt: toStr(o.Updated_At),
    }));
}

export async function getDepartments(): Promise<Department[]> {
  const { buffer } = await downloadWorkbook();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as Parameters<typeof wb.xlsx.load>[0]);
  const ws = wb.getWorksheet("Departments");
  if (!ws) return [];
  return parseDepartmentsWorksheet(ws);
}

export async function getTasks(): Promise<Task[]> {
  const { buffer } = await downloadWorkbook();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as Parameters<typeof wb.xlsx.load>[0]);
  const ws = wb.getWorksheet("Tasks");
  if (!ws) return [];
  return parseTasksWorksheet(ws);
}

export async function getPerformance(): Promise<PerformanceRow[]> {
  const { buffer } = await downloadWorkbook();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as Parameters<typeof wb.xlsx.load>[0]);
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
  await wb.xlsx.load(buffer as unknown as Parameters<typeof wb.xlsx.load>[0]);
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

// ---------- Permission management ----------

const PERMISSION_SHEET = "Permission_Management";
const PERMISSION_TABLE = "tblPermissionManagement";
const PERMISSION_HEADERS = [
  "Permission_Record_ID",
  "Employee_ID",
  "Employee_Email",
  "Permission_Key",
  "Permission_Granted",
  "Granted_By_Admin_Email",
  "Updated_By_Admin_Email",
  "Created_At",
  "Updated_At",
] as const;

type PermissionHeader = (typeof PERMISSION_HEADERS)[number];

function parsePermissionBoolean(value: unknown): boolean {
  if (value === true) return true;
  if (value === false || value === null || value === undefined) return false;
  const normalized = String(value).trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "y";
}

function normalizeEmailForWorkbook(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function permissionRecordFromObject(raw: Record<string, unknown>): PermissionRecord | null {
  const key = String(raw.Permission_Key ?? "").trim();
  if (!(PERMISSION_KEYS as string[]).includes(key)) return null;
  const employeeId = String(raw.Employee_ID ?? "").trim();
  if (!employeeId) return null;
  return {
    recordId: String(raw.Permission_Record_ID ?? "").trim(),
    employeeId,
    employeeEmail: raw.Employee_Email ? normalizeEmailForWorkbook(raw.Employee_Email) : null,
    permissionKey: key as PermissionKey,
    granted: parsePermissionBoolean(raw.Permission_Granted),
    grantedByAdminEmail: raw.Granted_By_Admin_Email ? normalizeEmailForWorkbook(raw.Granted_By_Admin_Email) : null,
    updatedByAdminEmail: raw.Updated_By_Admin_Email ? normalizeEmailForWorkbook(raw.Updated_By_Admin_Email) : null,
    createdAt: toStr(raw.Created_At),
    updatedAt: toStr(raw.Updated_At),
  };
}

function readPermissionRecordsFromWorkbook(wb: ExcelJS.Workbook): PermissionRecord[] {
  const ws = wb.getWorksheet(PERMISSION_SHEET);
  if (!ws) return [];
  const { headers, rows } = readTable(ws);
  const records: PermissionRecord[] = [];
  for (const row of rows) {
    const raw = rowToObject(headers, row);
    const record = permissionRecordFromObject(raw);
    if (record) records.push(record);
  }
  return records;
}

export async function getPermissionRecords(employeeId?: string): Promise<PermissionRecord[]> {
  const { buffer } = await downloadWorkbook();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as Parameters<typeof wb.xlsx.load>[0]);
  const records = readPermissionRecordsFromWorkbook(wb);
  return employeeId ? records.filter((record) => record.employeeId === employeeId) : records;
}

export async function getEmployeePermissionGrantState(employeeId: string): Promise<PermissionGrantState> {
  const grants = emptyEmployeePermissions();
  const records = await getPermissionRecords(employeeId);
  const latestByKey = new Map<PermissionKey, PermissionRecord>();
  for (const record of records) {
    const current = latestByKey.get(record.permissionKey);
    if (!current || String(record.updatedAt ?? "") >= String(current.updatedAt ?? "")) {
      latestByKey.set(record.permissionKey, record);
    }
  }
  for (const [key, record] of latestByKey) {
    grants[key] = record.granted;
  }
  return grants;
}

export type EmployeePermissionOverview = Employee & {
  grantedPermissions: number;
  totalPermissions: number;
  permissionStatus: "Not configured" | "Partial access" | "Full employee access";
  lastPermissionUpdate: string | null;
};

function buildPermissionOverview(
  employees: Employee[],
  records: PermissionRecord[],
  search?: string,
): EmployeePermissionOverview[] {
  const byEmployee = new Map<string, PermissionRecord[]>();
  for (const record of records) {
    const list = byEmployee.get(record.employeeId) ?? [];
    list.push(record);
    byEmployee.set(record.employeeId, list);
  }
  const query = (search ?? "").trim().toLowerCase();
  return employees
    .filter((employee) => {
      if (!query) return true;
      return [employee.fullName, employee.email ?? "", employee.employeeId, employee.departmentId ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(query);
    })
    .map((employee) => {
      const employeeRecords = byEmployee.get(employee.employeeId) ?? [];
      const latestByKey = new Map<PermissionKey, PermissionRecord>();
      for (const record of employeeRecords) {
        const current = latestByKey.get(record.permissionKey);
        if (!current || String(record.updatedAt ?? "") >= String(current.updatedAt ?? "")) {
          latestByKey.set(record.permissionKey, record);
        }
      }
      const effective = Array.from(latestByKey.values());
      const grantedPermissions = effective.filter((record) => record.granted).length;
      const totalPermissions = PERMISSION_KEYS.length;
      const lastPermissionUpdate = effective.reduce<string | null>((latest, record) => {
        if (!record.updatedAt) return latest;
        return !latest || record.updatedAt > latest ? record.updatedAt : latest;
      }, null);
      const permissionStatus: EmployeePermissionOverview["permissionStatus"] =
        effective.length === 0
          ? "Not configured"
          : grantedPermissions === 0
            ? "Not configured"
            : grantedPermissions === totalPermissions
              ? "Full employee access"
              : "Partial access";
      return {
        ...employee,
        grantedPermissions,
        totalPermissions,
        permissionStatus,
        lastPermissionUpdate,
      };
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}

export async function getPermissionEmployeeOverview(search?: string): Promise<EmployeePermissionOverview[]> {
  const { buffer } = await downloadWorkbook();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as Parameters<typeof wb.xlsx.load>[0]);
  const employeesWs = wb.getWorksheet("Employees");
  const employees = employeesWs ? parseEmployeesWorksheet(employeesWs) : [];
  const records = readPermissionRecordsFromWorkbook(wb);
  return buildPermissionOverview(employees, records, search);
}

export type EmployeePermissionDetails = {
  employee: Employee;
  permissions: PermissionGrantState;
  lastUpdatedAt: string | null;
  updatedBy: string | null;
  grantedCount: number;
  totalPermissions: number;
  missingSheet: boolean;
};

export async function getEmployeePermissionDetails(employeeId: string): Promise<EmployeePermissionDetails | null> {
  const { buffer } = await downloadWorkbook();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as Parameters<typeof wb.xlsx.load>[0]);
  const employeesWs = wb.getWorksheet("Employees");
  const employee = employeesWs
    ? parseEmployeesWorksheet(employeesWs).find((row) => row.employeeId === employeeId)
    : undefined;
  if (!employee) return null;

  const permissionWs = wb.getWorksheet(PERMISSION_SHEET);
  const records = readPermissionRecordsFromWorkbook(wb).filter((record) => record.employeeId === employeeId);
  const grants = emptyEmployeePermissions();
  const latestByKey = new Map<PermissionKey, PermissionRecord>();
  for (const record of records) {
    const current = latestByKey.get(record.permissionKey);
    if (!current || String(record.updatedAt ?? "") >= String(current.updatedAt ?? "")) {
      latestByKey.set(record.permissionKey, record);
    }
  }
  for (const [key, record] of latestByKey) grants[key] = record.granted;

  let lastUpdatedAt: string | null = null;
  let updatedBy: string | null = null;
  for (const record of latestByKey.values()) {
    if (record.updatedAt && (!lastUpdatedAt || record.updatedAt > lastUpdatedAt)) {
      lastUpdatedAt = record.updatedAt;
      updatedBy = record.updatedByAdminEmail ?? record.grantedByAdminEmail;
    }
  }
  const grantedCount = Object.values(grants).filter(Boolean).length;
  return {
    employee,
    permissions: grants,
    lastUpdatedAt,
    updatedBy,
    grantedCount,
    totalPermissions: PERMISSION_KEYS.length,
    missingSheet: !permissionWs,
  };
}

function worksheetHeaders(ws: ExcelJS.Worksheet): string[] {
  const headerRow = ws.getRow(1);
  const headers: string[] = [];
  for (let c = 1; c <= headerRow.cellCount; c++) {
    const value = headerRow.getCell(c).value;
    headers.push(value === null || value === undefined ? "" : String(value));
  }
  while (headers.length && headers[headers.length - 1] === "") headers.pop();
  return headers;
}

function readWorksheetRows(ws: ExcelJS.Worksheet, headers: string[]): unknown[][] {
  const rows: unknown[][] = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const values: unknown[] = [];
    let any = false;
    for (let c = 1; c <= headers.length; c++) {
      const value = cellValue(row.getCell(c));
      values.push(value);
      if (value !== null && value !== undefined && value !== "") any = true;
    }
    if (any) rows.push(values);
  }
  return rows;
}

type WorksheetTableStyle = {
  name?: string;
  showFirstColumn?: string | number | boolean;
  showLastColumn?: string | number | boolean;
  showRowStripes?: string | number | boolean;
  showColumnStripes?: string | number | boolean;
};

type WorksheetWithTables = ExcelJS.Worksheet & {
  tables?: Record<string, { table?: { style?: WorksheetTableStyle } }>;
  removeTable: (tableName: string) => void;
  addTable: (config: Record<string, unknown>) => { commit: () => void };
};

function tableWorksheet(ws: ExcelJS.Worksheet): WorksheetWithTables {
  return ws as unknown as WorksheetWithTables;
}

function ensurePermissionWorksheet(wb: ExcelJS.Workbook): ExcelJS.Worksheet {
  let ws = wb.getWorksheet(PERMISSION_SHEET);
  if (!ws) {
    ws = wb.addWorksheet(PERMISSION_SHEET);
    ws.addRow([...PERMISSION_HEADERS]);
  }

  const headers = worksheetHeaders(ws);
  const missing = PERMISSION_HEADERS.filter((header) => !headers.includes(header));
  if (missing.length) {
    throw new Error(`Permission_Management sheet is missing required columns: ${missing.join(", ")}`);
  }

  const wsWithTables = tableWorksheet(ws);
  const table = wsWithTables.tables?.[PERMISSION_TABLE];
  if (!table) {
    wsWithTables.addTable({
      name: PERMISSION_TABLE,
      ref: "A1",
      headerRow: true,
      totalsRow: false,
      style: { theme: "TableStyleMedium2", showFirstColumn: false, showLastColumn: false, showRowStripes: true, showColumnStripes: false },
      columns: PERMISSION_HEADERS.map((name) => ({ name })),
      rows: readWorksheetRows(ws, worksheetHeaders(ws)),
    }).commit();
  }
  return ws;
}

function permissionRowsFromRecords(records: PermissionRecord[]): unknown[][] {
  return records.map((record) => [
    record.recordId,
    record.employeeId,
    record.employeeEmail,
    record.permissionKey,
    record.granted ? "TRUE" : "FALSE",
    record.grantedByAdminEmail,
    record.updatedByAdminEmail,
    record.createdAt,
    record.updatedAt,
  ]);
}

export type PermissionSaveResult = {
  employeeId: string;
  employee: Employee;
  permissions: PermissionGrantState;
  changed: PermissionRecord[];
  lastUpdatedAt: string;
  updatedBy: string;
  createdSheet: boolean;
};

export async function saveEmployeePermissionGrants(
  employeeId: string,
  grants: PermissionGrantState,
  actorAdminEmail: string,
): Promise<PermissionSaveResult> {
  const actor = normalizeEmailForWorkbook(actorAdminEmail);
  const now = nowIso();
  return withWorkbookLock(async () => {
    const { buffer, version } = await downloadWorkbook();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as unknown as Parameters<typeof wb.xlsx.load>[0]);

    const employeesWs = wb.getWorksheet("Employees");
    const employee = employeesWs
      ? parseEmployeesWorksheet(employeesWs).find((row) => row.employeeId === employeeId)
      : undefined;
    if (!employee) throw new NotFoundError("Employee not found");

    const createdSheet = !wb.getWorksheet(PERMISSION_SHEET);
    const permissionWs = ensurePermissionWorksheet(wb);
    const existingRecords = readPermissionRecordsFromWorkbook(wb);
    const previousForEmployee = existingRecords.filter((record) => record.employeeId === employeeId);
    const latestPrevious = new Map<PermissionKey, PermissionRecord>();
    for (const record of previousForEmployee) {
      const current = latestPrevious.get(record.permissionKey);
      if (!current || String(record.updatedAt ?? "") >= String(current.updatedAt ?? "")) {
        latestPrevious.set(record.permissionKey, record);
      }
    }

    const keptRecords = existingRecords.filter((record) => record.employeeId !== employeeId);
    const usedIds = new Set(existingRecords.map((record) => record.recordId).filter(Boolean));
    let nextPermissionNumber = 1;
    for (const id of usedIds) {
      const match = id.match(/^PERM-(\d+)$/);
      if (match) nextPermissionNumber = Math.max(nextPermissionNumber, Number(match[1]) + 1);
    }
    const allocateId = () => {
      let candidate = `PERM-${String(nextPermissionNumber).padStart(3, "0")}`;
      while (usedIds.has(candidate)) {
        nextPermissionNumber += 1;
        candidate = `PERM-${String(nextPermissionNumber).padStart(3, "0")}`;
      }
      usedIds.add(candidate);
      nextPermissionNumber += 1;
      return candidate;
    };

    const nextRecords: PermissionRecord[] = [];
    const changed: PermissionRecord[] = [];
    for (const key of PERMISSION_KEYS) {
      const previous = latestPrevious.get(key);
      const desired = grants[key];
      const previousGranted = previous?.granted ?? false;
      const changedState = previous ? previousGranted !== desired : desired;
      const record: PermissionRecord = {
        recordId: previous?.recordId || allocateId(),
        employeeId,
        employeeEmail: employee.email ? normalizeEmailForWorkbook(employee.email) : null,
        permissionKey: key,
        granted: desired,
        grantedByAdminEmail: desired
          ? previousGranted
            ? previous?.grantedByAdminEmail ?? actor
            : actor
          : previous?.grantedByAdminEmail ?? actor,
        updatedByAdminEmail: actor,
        createdAt: previous?.createdAt ?? now,
        updatedAt: now,
      };
      nextRecords.push(record);
      if (changedState) changed.push(record);
    }

    if (changed.length === 0) {
      return {
        employeeId,
        employee,
        permissions: grants,
        changed,
        lastUpdatedAt: now,
        updatedBy: actor,
        createdSheet: false,
      };
    }

    rebuildTable(
      permissionWs,
      PERMISSION_TABLE,
      [...PERMISSION_HEADERS],
      permissionRowsFromRecords([...keptRecords, ...nextRecords]),
    );

    if (changed.length) {
      appendActivityLogs(wb, changed.map((record) => ({
        actorEmail: actor,
        actionType: record.granted ? "PERMISSION_GRANTED" : "PERMISSION_REVOKED",
        targetEntity: "Employee_Permission",
        targetId: `${employeeId}:${record.permissionKey}`,
        description: `${actor} ${record.granted ? "granted" : "revoked"} ${record.permissionKey} for ${employeeId}`,
        previousValue: String(latestPrevious.get(record.permissionKey)?.granted ?? false).toUpperCase(),
        newValue: String(record.granted).toUpperCase(),
      })));
    }

    const outBuffer = await wb.xlsx.writeBuffer();
    await uploadWorkbook(Buffer.from(outBuffer), version);

    const updatedGrants = emptyEmployeePermissions();
    for (const record of nextRecords) updatedGrants[record.permissionKey] = record.granted;
    return {
      employeeId,
      employee,
      permissions: updatedGrants,
      changed,
      lastUpdatedAt: now,
      updatedBy: actor,
      createdSheet,
    };
  });
}

type ActivityLogEntry = {
  actorEmail: string;
  actorRole?: string;
  actionType: string;
  targetEntity: string;
  targetId: string;
  description: string;
  previousValue: string | null;
  newValue: string | null;
};

function appendActivityLogs(wb: ExcelJS.Workbook, entries: ActivityLogEntry[]): void {
  const logWs = wb.getWorksheet("Activity_Logs");
  if (!logWs || entries.length === 0) return;
  const headers = worksheetHeaders(logWs);
  const existingRows = readWorksheetRows(logWs, headers);
  const existingIds = existingRows
    .map((row) => row[headers.indexOf("Log_ID")])
    .filter(Boolean)
    .map(String);
  let nextLogNumber = 1;
  for (const id of existingIds) {
    const match = id.match(/^LOG-(\d+)$/);
    if (match) nextLogNumber = Math.max(nextLogNumber, Number(match[1]) + 1);
  }
  const now = nowIso();
  const rows = [...existingRows];
  for (const entry of entries) {
    const logId = `LOG-${String(nextLogNumber).padStart(3, "0")}`;
    nextLogNumber += 1;
    const row = new Array(headers.length).fill(null);
    const set = (name: PermissionHeader | string, value: unknown) => {
      const idx = headers.indexOf(name);
      if (idx >= 0) row[idx] = value;
    };
    set("Log_ID", logId);
    set("User_ID", entry.actorEmail);
    set("User_Name", entry.actorEmail);
    set("User_Role", entry.actorRole ?? "Admin");
    set("Action_Type", entry.actionType);
    set("Target_Entity", entry.targetEntity);
    set("Target_ID", entry.targetId);
    set("Action_Description", entry.description);
    set("Previous_Value", entry.previousValue);
    set("New_Value", entry.newValue);
    set("Timestamp", now);
    set("Status", "Success");
    rows.push(row);
  }
  rebuildTable(logWs, "tblActivityLogs", headers, rows);
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
  const wsWithTables = tableWorksheet(ws);
  const old = wsWithTables.tables?.[tableName];
  const style = old?.table?.style;
  wsWithTables.removeTable(tableName);
  const table = wsWithTables.addTable({
    name: tableName,
    ref: "A1",
    headerRow: true,
    totalsRow: false,
    style: {
      theme: style?.name || "TableStyleMedium2",
      showFirstColumn: style?.showFirstColumn === "1" || style?.showFirstColumn === 1 || style?.showFirstColumn === true,
      showLastColumn: style?.showLastColumn === "1" || style?.showLastColumn === 1 || style?.showLastColumn === true,
      showRowStripes: style?.showRowStripes !== "0" && style?.showRowStripes !== 0 && style?.showRowStripes !== false,
      showColumnStripes: style?.showColumnStripes === "1" || style?.showColumnStripes === 1 || style?.showColumnStripes === true,
    },
    columns: headers.map((h) => ({ name: h })),
    rows,
  });
  table.commit();
}

export interface TaskActor {
  email: string;
  role?: "admin" | "employee";
}

function normalizeTaskActor(actor: string | TaskActor | null | undefined): TaskActor {
  if (!actor) return { email: "system", role: "admin" };
  if (typeof actor === "string") return { email: actor, role: "admin" };
  return { email: actor.email, role: actor.role ?? "employee" };
}

export async function createTask(
  input: unknown,
  actorInput: string | TaskActor | null = null
): Promise<Task> {
  const actor = normalizeTaskActor(actorInput);
  const actorId = actor.email;
  const actorRole = actor.role === "admin" ? "Admin" : "Employee";
  const parsed = createTaskSchema.parse(input);
  return withWorkbookLock(async () => {
    const { buffer, version } = await downloadWorkbook();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as unknown as Parameters<typeof wb.xlsx.load>[0]);

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
        lset("User_Role", actorRole);
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
  actorInput: string | TaskActor | null = null
): Promise<Task> {
  const parsed = updateTaskSchema.parse(input);
  const actor = normalizeTaskActor(actorInput);
  const actorRole = actor.role === "admin" ? "Admin" : "Employee";
  const taskId = parsed.taskId;
  return withWorkbookLock(async () => {
    const { buffer, version } = await downloadWorkbook();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as unknown as Parameters<typeof wb.xlsx.load>[0]);

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
    const changes: Record<string, { previous: unknown; next: unknown }> = {};
    const normalizeForCompare = (value: unknown): string => String(value ?? "").trim();
    const trackCell = (column: string, value: unknown) => {
      const idx = colIndex(column);
      if (idx <= 0) return;
      const previous = cellValue(targetRow!.getCell(idx));
      if (normalizeForCompare(previous) !== normalizeForCompare(value)) {
        changes[column] = { previous, next: value };
      }
      targetRow!.getCell(idx).value = value as ExcelJS.CellValue;
    };

    if (parsed.title !== undefined) trackCell("Task_Title", parsed.title);
    if (parsed.description !== undefined) trackCell("Task_Description", parsed.description);
    if (parsed.assignedTo !== undefined) trackCell("Assigned_To", parsed.assignedTo);
    if (parsed.assignedBy !== undefined) trackCell("Assigned_By", parsed.assignedBy);
    if (parsed.departmentId !== undefined) trackCell("Department_ID", parsed.departmentId);
    if (parsed.priority !== undefined) trackCell("Priority", parsed.priority);
    if (parsed.status !== undefined) trackCell("Task_Status", parsed.status);
    if (parsed.assignedDate !== undefined) trackCell("Assigned_Date", parsed.assignedDate);
    if (parsed.dueDate !== undefined) trackCell("Due_Date", parsed.dueDate);
    if (parsed.progressPercentage !== undefined) trackCell("Progress_Percentage", parsed.progressPercentage);
    if (parsed.remarks !== undefined) trackCell("Task_Remarks", parsed.remarks);

    const updatedIdx = colIndex("Updated_At");
    if (updatedIdx > 0) targetRow!.getCell(updatedIdx).value = now;
    if (parsed.status === "Completed") {
      trackCell("Completion_Date", now.slice(0, 10));
    }

    if (Object.keys(changes).length) {
      try {
        const changedFields = Object.keys(changes);
        const isCompletion = parsed.status === "Completed" && normalizeForCompare(changes.Task_Status?.next) === "completed";
        appendActivityLogs(wb, [{
          actorEmail: actor.email,
          actorRole,
          actionType: isCompletion ? "TASK_COMPLETED" : "TASK_UPDATED",
          targetEntity: "Task",
          targetId: taskId,
          description: `${actorRole} ${isCompletion ? "completed" : "updated"} task ${taskId}${changedFields.length ? ` (${changedFields.join(", ")})` : ""}`,
          previousValue: JSON.stringify(Object.fromEntries(changedFields.map((field) => [field, changes[field].previous]))),
          newValue: JSON.stringify(Object.fromEntries(changedFields.map((field) => [field, changes[field].next]))),
        }]);
      } catch (logError) {
        console.error("Unable to write task activity log", logError);
      }
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