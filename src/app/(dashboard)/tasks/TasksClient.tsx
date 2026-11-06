"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import type { PermissionGrantState } from "@/lib/auth/permissions";

type TaskRow = {
  taskId: string;
  title: string;
  description: string | null;
  assignedTo: string | null;
  assignedBy: string | null;
  departmentId: string | null;
  priority: string | null;
  status: string | null;
  assignedDate: string | null;
  dueDate: string | null;
  completionDate: string | null;
  progressPercentage: number | null;
  remarks: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type EmployeeOption = {
  employeeId: string;
  fullName: string;
  departmentId: string | null;
  accountStatus: string | null;
};

type DepartmentOption = {
  departmentId: string;
  departmentName: string;
  status: string | null;
};

type TaskScope = "all" | "department" | "own";
type TasksClientUser = {
  role: "admin" | "employee";
  employeeId: string | null;
  departmentId: string | null;
  permissions: PermissionGrantState;
};

type TaskFormState = {
  title: string;
  description: string;
  assignedTo: string;
  departmentId: string;
  priority: string;
  status: string;
  assignedDate: string;
  dueDate: string;
  progressPercentage: string;
  remarks: string;
};

const EMPTY_FORM: TaskFormState = {
  title: "",
  description: "",
  assignedTo: "",
  departmentId: "",
  priority: "Medium",
  status: "Pending",
  assignedDate: "",
  dueDate: "",
  progressPercentage: "0",
  remarks: "",
};

function isCompleted(status: string | null | undefined): boolean {
  return String(status ?? "").trim().toLowerCase() === "completed";
}

function isOverdue(task: Pick<TaskRow, "status" | "dueDate">): boolean {
  if (isCompleted(task.status)) return false;
  const due = String(task.dueDate ?? "").slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(due) && due < today;
}

function taskToForm(task: TaskRow): TaskFormState {
  return {
    title: task.title ?? "",
    description: task.description ?? "",
    assignedTo: task.assignedTo ?? "",
    departmentId: task.departmentId ?? "",
    priority: task.priority ?? "Medium",
    status: task.status ?? "Pending",
    assignedDate: task.assignedDate ?? "",
    dueDate: task.dueDate ?? "",
    progressPercentage: String(task.progressPercentage ?? 0),
    remarks: task.remarks ?? "",
  };
}

export default function TasksClient({
  user,
  scope,
  canCreateTask,
}: {
  user: TasksClientUser;
  scope: TaskScope;
  canCreateTask: boolean;
}) {
  const [rows, setRows] = useState<TaskRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [auxError, setAuxError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [form, setForm] = useState<TaskFormState>(EMPTY_FORM);
  const [selectedTask, setSelectedTask] = useState<TaskRow | null>(null);
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null);
  const [editForm, setEditForm] = useState<TaskFormState>(EMPTY_FORM);
  const [modalError, setModalError] = useState<string | null>(null);

  const isAdmin = user.role === "admin";
  const permissions = user.permissions;
  const canAssign = isAdmin || Boolean(permissions.TASKS_ASSIGN);
  const canEditDetails = isAdmin || Boolean(permissions.TASKS_EDIT);
  const canChangePriority = isAdmin || Boolean(permissions.TASKS_CHANGE_PRIORITY);
  const canChangeStatus = isAdmin || Boolean(permissions.TASKS_CHANGE_STATUS);
  const canComplete = isAdmin || Boolean(permissions.TASKS_COMPLETE);
  const canUpdateProgress = isAdmin || Boolean(permissions.TASKS_UPDATE_PROGRESS);
  const canAddRemarks = isAdmin || Boolean(permissions.TASKS_ADD_REMARKS);
  const canEditAnything = canEditDetails || canAssign || canChangePriority || canChangeStatus || canComplete || canUpdateProgress || canAddRemarks;
  const employeeById = useMemo(() => new Map(employees.map((employee) => [employee.employeeId, employee])), [employees]);
  const departmentById = useMemo(() => new Map(departments.map((department) => [department.departmentId, department])), [departments]);
  const canLoadEmployees = isAdmin || Boolean(permissions.EMPLOYEES_VIEW_DIRECTORY);

  async function loadAuxiliaryData() {
    setAuxError(null);
    const auxiliaryErrors: string[] = [];
    if (canLoadEmployees) {
      try {
        const res = await fetch("/api/employees", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (res.ok) setEmployees(data.employees ?? []);
        else if (res.status !== 403) auxiliaryErrors.push(data.error || "Employee directory could not be loaded.");
      } catch {
        auxiliaryErrors.push("Employee directory could not be loaded.");
      }
    }
    try {
      const res = await fetch("/api/departments", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setDepartments(data.departments ?? []);
      else if (res.status !== 403) auxiliaryErrors.push(data.error || "Departments could not be loaded.");
    } catch {
      auxiliaryErrors.push("Departments could not be loaded.");
    }
    if (auxiliaryErrors.length) setAuxError(auxiliaryErrors.join(" "));
  }

  async function loadTasks() {
    try {
      const res = await fetch("/api/tasks", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load tasks.");
      setRows(data.tasks ?? []);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Failed to load tasks.");
      return false;
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadAuxiliaryData();
      const loaded = await loadTasks();
      if (!cancelled && !loaded) setError("Failed to load tasks. Please refresh the page and try again.");
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((task) => {
      if (q) {
        const assignee = employeeById.get(task.assignedTo ?? "")?.fullName ?? task.assignedTo ?? "";
        const haystack = [task.taskId, task.title, assignee, task.assignedTo ?? ""].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (statusFilter) {
        if (statusFilter === "Overdue" ? !isOverdue(task) : String(task.status ?? "") !== statusFilter) return false;
      }
      if (priorityFilter && String(task.priority ?? "") !== priorityFilter) return false;
      if (departmentFilter && String(task.departmentId ?? "") !== departmentFilter) return false;
      if (assigneeFilter && String(task.assignedTo ?? "") !== assigneeFilter) return false;
      return true;
    });
  }, [rows, query, statusFilter, priorityFilter, departmentFilter, assigneeFilter, employeeById]);

  const clearFilters = () => {
    setQuery("");
    setStatusFilter("");
    setPriorityFilter("");
    setDepartmentFilter("");
    setAssigneeFilter("");
  };

  const totalCount = rows.length;
  const completedCount = rows.filter((row) => isCompleted(row.status)).length;
  const pendingCount = rows.filter((row) => String(row.status).trim().toLowerCase() === "pending").length;
  const inProgressCount = rows.filter((row) => String(row.status).trim().toLowerCase() === "in progress").length;
  const overdueCount = rows.filter(isOverdue).length;

  async function createTask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        status: isAdmin || canChangeStatus ? form.status : "Pending",
        priority: isAdmin || canChangePriority ? form.priority : "Medium",
      };
      if (form.description.trim()) payload.description = form.description.trim();
      if (form.assignedTo) payload.assignedTo = form.assignedTo;
      if (form.departmentId) payload.departmentId = form.departmentId;
      if (form.assignedDate) payload.assignedDate = form.assignedDate;
      if (form.dueDate) payload.dueDate = form.dueDate;
      if (form.progressPercentage !== "") payload.progressPercentage = Number(form.progressPercentage);
      if (form.remarks.trim() && canAddRemarks) payload.remarks = form.remarks.trim();

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to create task.");
      setForm(EMPTY_FORM);
      setNotice("Task created.");
      await loadTasks();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Failed to create task.");
    } finally {
      setSaving(false);
    }
  }

  function openEdit(task: TaskRow) {
    setEditingTask(task);
    setEditForm(taskToForm(task));
    setModalError(null);
  }

  async function saveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingTask) return;
    setSaving(true);
    setModalError(null);
    setNotice(null);
    try {
      const payload: Record<string, unknown> = {
        title: editForm.title.trim(),
        description: editForm.description.trim() || null,
        dueDate: editForm.dueDate || null,
        assignedDate: editForm.assignedDate || null,
        progressPercentage: Number(editForm.progressPercentage || 0),
        remarks: editForm.remarks.trim() || null,
      };
      if (canAssign) {
        payload.assignedTo = editForm.assignedTo || null;
        payload.departmentId = editForm.departmentId || null;
      }
      if (canChangePriority) payload.priority = editForm.priority;
      if (canChangeStatus || canComplete) payload.status = editForm.status;

      const res = await fetch(`/api/tasks/${encodeURIComponent(editingTask.taskId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to update task.");
      setEditingTask(null);
      setNotice("Task updated.");
      await loadTasks();
    } catch (reason) {
      setModalError(reason instanceof Error ? reason.message : "Failed to update task.");
    } finally {
      setSaving(false);
    }
  }

  const scopeLabel = scope === "all" ? "All tasks" : scope === "department" ? "Department tasks" : "My tasks";

  return (
    <div>
      <PageHeader
        title={scope === "own" ? "My Tasks" : "Task Management"}
        description={scope === "own" ? "A focused view of tasks assigned to you." : "Assign, track, and resolve work across the organization from one place."}
        eyebrow={scope === "own" ? "My work" : "Work management"}
      />

      {notice && <div role="status" className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</div>}
      {error && <div role="alert" className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
      {auxError && <div role="alert" className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{auxError}</div>}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => <div key={index} className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-white" />)}
          <div className="h-96 animate-pulse rounded-2xl border border-slate-200 bg-white sm:col-span-5" />
        </div>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            <SummaryCard label={scopeLabel} value={totalCount} tone="text-slate-950" marker="TK" />
            <SummaryCard label="In progress" value={inProgressCount} tone="text-indigo-700" marker="IP" />
            <SummaryCard label="Pending" value={pendingCount} tone="text-amber-700" marker="…" />
            <SummaryCard label="Completed" value={completedCount} tone="text-emerald-700" marker="✓" />
            <SummaryCard label="Overdue" value={overdueCount} tone="text-rose-700" marker="!" />
          </div>

          <section aria-label="Task filters" className="mb-5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/40">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, ID, or employee..." aria-label="Search tasks" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:bg-white xl:col-span-2" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400" aria-label="Filter by status">
                <option value="">All statuses</option>
                {["Pending", "In Progress", "Completed", "Overdue"].map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
              <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400" aria-label="Filter by priority">
                <option value="">All priorities</option>
                {["Low", "Medium", "High", "Urgent"].map((priority) => <option key={priority} value={priority}>{priority}</option>)}
              </select>
              <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400" aria-label="Filter by department">
                <option value="">All departments</option>
                {departments.map((department) => <option key={department.departmentId} value={department.departmentId}>{department.departmentName || department.departmentId}</option>)}
              </select>
              <div className="flex gap-2">
                <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400" aria-label="Filter by assignee">
                  <option value="">All assignees</option>
                  {employees.map((employee) => <option key={employee.employeeId} value={employee.employeeId}>{employee.fullName || employee.employeeId}</option>)}
                </select>
                <button type="button" onClick={clearFilters} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Clear</button>
              </div>
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="order-2 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40 xl:order-1">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="font-semibold text-slate-900">Task list</h2>
                  <p className="mt-1 text-xs text-slate-500">{filteredRows.length} of {rows.length} tasks</p>
                </div>
                {overdueCount > 0 && <StatusBadge value={`${overdueCount} overdue`} />}
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[980px] w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3.5">Task</th>
                      <th className="px-5 py-3.5">Assigned to</th>
                      <th className="px-5 py-3.5">Department</th>
                      <th className="px-5 py-3.5">Priority</th>
                      <th className="px-5 py-3.5">Due</th>
                      <th className="px-5 py-3.5">Progress</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRows.map((task) => {
                      const assignee = task.assignedTo ? employeeById.get(task.assignedTo) : undefined;
                      const department = task.departmentId ? departmentById.get(task.departmentId) : undefined;
                      return (
                        <tr key={task.taskId} className="align-middle transition hover:bg-slate-50/80">
                          <td className="max-w-xs px-5 py-4">
                            <button type="button" onClick={() => setSelectedTask(task)} className="text-left">
                              <span className="block font-medium leading-5 text-slate-900 hover:text-indigo-700">{task.title}</span>
                              <span className="mt-1 block font-mono text-[10px] uppercase tracking-wide text-slate-400">{task.taskId}</span>
                            </button>
                          </td>
                          <td className="px-5 py-4 text-slate-600">{assignee?.fullName || task.assignedTo || "Unassigned"}</td>
                          <td className="px-5 py-4 text-slate-600">{department?.departmentName || task.departmentId || "—"}</td>
                          <td className="px-5 py-4"><StatusBadge value={task.priority} /></td>
                          <td className="whitespace-nowrap px-5 py-4 text-slate-600">{formatDate(task.dueDate)}</td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2"><div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-600" style={{ width: `${Math.max(0, Math.min(100, task.progressPercentage ?? 0))}%` }} /></div><span className="text-xs font-medium text-slate-600">{task.progressPercentage ?? 0}%</span></div>
                          </td>
                          <td className="px-5 py-4"><StatusBadge value={task.status} /></td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button type="button" onClick={() => setSelectedTask(task)} className="rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100">View</button>
                              {canEditAnything && <button type="button" onClick={() => openEdit(task)} className="rounded-lg px-2 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50">Edit</button>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {!filteredRows.length && (
                <div className="px-5 py-14 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-sm font-bold text-indigo-600">TK</div>
                  <h3 className="mt-3 text-sm font-semibold text-slate-900">No tasks match</h3>
                  <p className="mt-1 text-sm text-slate-500">Adjust the filters or create a new task.</p>
                </div>
              )}
            </section>

            <aside className="order-1 h-fit rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/40 xl:order-2">
              {canCreateTask ? (
                <>
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-sm font-bold text-indigo-700">+</div>
                  <h2 className="font-semibold text-slate-900">{isAdmin ? "Assign a task" : "Create a task"}</h2>
                  <p className="mt-1 text-sm leading-5 text-slate-500">{isAdmin ? "Choose an employee, due date, and priority." : "Add a clear title and the details you are allowed to set."}</p>
                  <form onSubmit={createTask} className="mt-5 space-y-3">
                    <label htmlFor="task-title" className="block text-xs font-medium text-slate-700">Task title</label>
                    <input id="task-title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Prepare weekly update" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:bg-white" required />
                    <label htmlFor="task-description" className="block text-xs font-medium text-slate-700">Description</label>
                    <textarea id="task-description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} placeholder="Optional context..." className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:bg-white" />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-xs font-medium text-slate-700">Assign to
                        <select value={form.assignedTo} onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))} disabled={!canAssign} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 disabled:opacity-60">
                          <option value="">{isAdmin ? "Unassigned" : "Myself"}</option>
                          {employees.map((employee) => <option key={employee.employeeId} value={employee.employeeId}>{employee.fullName || employee.employeeId}</option>)}
                        </select>
                      </label>
                      <label className="block text-xs font-medium text-slate-700">Department
                        <select value={form.departmentId} onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))} disabled={!canAssign} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 disabled:opacity-60">
                          <option value="">Default</option>
                          {departments.map((department) => <option key={department.departmentId} value={department.departmentId}>{department.departmentName || department.departmentId}</option>)}
                        </select>
                      </label>
                      <label className="block text-xs font-medium text-slate-700">Priority
                        <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} disabled={!isAdmin && !canChangePriority} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none disabled:opacity-60">
                          {["Low", "Medium", "High", "Urgent"].map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                        </select>
                      </label>
                      <label className="block text-xs font-medium text-slate-700">Due date
                        <input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400" />
                      </label>
                    </div>
                    {(isAdmin || canChangeStatus) && (
                      <label className="block text-xs font-medium text-slate-700">Initial status
                        <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400">
                          {["Pending", "In Progress", ...(isAdmin ? ["Completed", "Overdue"] : ["Completed"])].map((status) => <option key={status} value={status}>{status}</option>)}
                        </select>
                      </label>
                    )}
                    <button type="submit" disabled={saving} className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
                      {saving ? "Saving..." : isAdmin ? "Assign task" : "Create task"}
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-500">LOCK</div>
                  <h2 className="font-semibold text-slate-900">Task creation</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">Task creation has not been granted for your account. Ask your administrator.</p>
                </>
              )}
            </aside>
          </div>
        </>
      )}

      {selectedTask && <TaskDetailModal task={selectedTask} employees={employees} departments={departments} onClose={() => setSelectedTask(null)} />}
      {editingTask && (
        <TaskEditModal
          task={editingTask}
          form={editForm}
          employees={employees}
          departments={departments}
          saving={saving}
          error={modalError}
          isAdmin={isAdmin}
          canAssign={canAssign}
          canEditDetails={canEditDetails}
          canChangePriority={canChangePriority}
          canChangeStatus={canChangeStatus}
          canComplete={canComplete}
          canUpdateProgress={canUpdateProgress}
          canAddRemarks={canAddRemarks}
          onChange={setEditForm}
          onSubmit={saveEdit}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  );
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

function SummaryCard({ label, value, tone, marker }: { label: string; value: number; tone: string; marker: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/40">
      <div className="min-w-0">
        <p className="truncate text-xs text-slate-500">{label}</p>
        <p className={`mt-1 text-2xl font-semibold ${tone}`}>{value}</p>
      </div>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-[10px] font-bold text-slate-500">{marker}</span>
    </div>
  );
}

function TaskDetailModal({ task, employees, departments, onClose }: { task: TaskRow; employees: EmployeeOption[]; departments: DepartmentOption[]; onClose: () => void }) {
  const assignee = task.assignedTo ? employees.find((employee) => employee.employeeId === task.assignedTo) : undefined;
  const department = task.departmentId ? departments.find((item) => item.departmentId === task.departmentId) : undefined;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="task-detail-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-xs uppercase tracking-wide text-slate-400">{task.taskId}</p>
            <h2 id="task-detail-title" className="mt-1 text-xl font-semibold text-slate-950">{task.title}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close task details">×</button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2"><StatusBadge value={task.priority} /><StatusBadge value={task.status} /></div>
        {task.description && <p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-slate-600">{task.description}</p>}
        <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <Detail label="Assigned to" value={assignee?.fullName || task.assignedTo || "Unassigned"} />
          <Detail label="Department" value={department?.departmentName || task.departmentId || "—"} />
          <Detail label="Assigned by" value={task.assignedBy || "—"} />
          <Detail label="Assigned date" value={formatDate(task.assignedDate)} />
          <Detail label="Due date" value={formatDate(task.dueDate)} />
          <Detail label="Completion date" value={formatDate(task.completionDate)} />
          <Detail label="Progress" value={`${task.progressPercentage ?? 0}%`} />
          <Detail label="Created" value={formatDate(task.createdAt)} />
          <Detail label="Updated" value={formatDate(task.updatedAt)} />
        </dl>
        {task.remarks && <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Remarks</p><p className="mt-1">{task.remarks}</p></div>}
        <div className="mt-6 flex justify-end"><button type="button" onClick={onClose} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Close</button></div>
      </div>
    </div>
  );
}

type TaskEditModalProps = {
  task: TaskRow;
  form: TaskFormState;
  employees: EmployeeOption[];
  departments: DepartmentOption[];
  saving: boolean;
  error: string | null;
  isAdmin: boolean;
  canAssign: boolean;
  canEditDetails: boolean;
  canChangePriority: boolean;
  canChangeStatus: boolean;
  canComplete: boolean;
  canUpdateProgress: boolean;
  canAddRemarks: boolean;
  onChange: (value: TaskFormState) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
};

function TaskEditModal(props: TaskEditModalProps) {
  const { task, form, employees, departments, saving, error, isAdmin, canAssign, canEditDetails, canChangePriority, canChangeStatus, canComplete, canUpdateProgress, canAddRemarks, onChange, onSubmit, onClose } = props;
  const set = (patch: Partial<TaskFormState>) => onChange({ ...form, ...patch });
  const editableStatusOptions = isAdmin ? ["Pending", "In Progress", "Completed", "Overdue"] : ["Pending", "In Progress", ...(canComplete ? ["Completed"] : [])];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onMouseDown={onClose}>
      <form onSubmit={onSubmit} role="dialog" aria-modal="true" aria-labelledby="task-edit-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-xs uppercase tracking-wide text-slate-400">{task.taskId}</p>
            <h2 id="task-edit-title" className="mt-1 text-xl font-semibold text-slate-950">Edit task</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close editor">×</button>
        </div>
        {error && <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
        <div className="mt-5 space-y-4">
          <label className="block text-xs font-medium text-slate-700">Title
            <input value={form.title} onChange={(e) => set({ title: e.target.value })} disabled={!canEditDetails} required className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 disabled:opacity-60" />
          </label>
          <label className="block text-xs font-medium text-slate-700">Description
            <textarea value={form.description} onChange={(e) => set({ description: e.target.value })} disabled={!canEditDetails} rows={3} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 disabled:opacity-60" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-medium text-slate-700">Assign to
              <select value={form.assignedTo} onChange={(e) => set({ assignedTo: e.target.value })} disabled={!canAssign} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none disabled:opacity-60">
                <option value="">Unassigned</option>
                {employees.map((employee) => <option key={employee.employeeId} value={employee.employeeId}>{employee.fullName || employee.employeeId}</option>)}
              </select>
            </label>
            <label className="block text-xs font-medium text-slate-700">Department
              <select value={form.departmentId} onChange={(e) => set({ departmentId: e.target.value })} disabled={!canAssign} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none disabled:opacity-60">
                <option value="">No department</option>
                {departments.map((department) => <option key={department.departmentId} value={department.departmentId}>{department.departmentName || department.departmentId}</option>)}
              </select>
            </label>
            <label className="block text-xs font-medium text-slate-700">Priority
              <select value={form.priority} onChange={(e) => set({ priority: e.target.value })} disabled={!canChangePriority} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none disabled:opacity-60">
                {["Low", "Medium", "High", "Urgent"].map((priority) => <option key={priority} value={priority}>{priority}</option>)}
              </select>
            </label>
            <label className="block text-xs font-medium text-slate-700">Status
              <select value={form.status} onChange={(e) => set({ status: e.target.value })} disabled={!canChangeStatus && !canComplete} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none disabled:opacity-60">
                {editableStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>
            <label className="block text-xs font-medium text-slate-700">Assigned date
              <input type="date" value={form.assignedDate} onChange={(e) => set({ assignedDate: e.target.value })} disabled={!canEditDetails} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none disabled:opacity-60" />
            </label>
            <label className="block text-xs font-medium text-slate-700">Due date
              <input type="date" value={form.dueDate} onChange={(e) => set({ dueDate: e.target.value })} disabled={!canEditDetails} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none disabled:opacity-60" />
            </label>
            <label className="block text-xs font-medium text-slate-700">Progress (%)
              <input type="number" min={0} max={100} step={1} value={form.progressPercentage} onChange={(e) => set({ progressPercentage: e.target.value })} disabled={!canUpdateProgress} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none disabled:opacity-60" />
            </label>
          </div>
          <label className="block text-xs font-medium text-slate-700">Remarks
            <textarea value={form.remarks} onChange={(e) => set({ remarks: e.target.value })} disabled={!canAddRemarks} rows={2} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 disabled:opacity-60" />
          </label>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={saving} className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">{saving ? "Saving..." : "Save changes"}</button>
        </div>
      </form>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-800">{value}</dd>
    </div>
  );
}
