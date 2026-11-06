"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import PageHeader from "@/components/layout/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import type { AdminDashboardData, AdminDashboardFilters, AdminDashboardTask, EmployeePerformanceOverview } from "@/lib/types/domain";

type AdminDashboardClientProps = {
  user: {
    name: string;
    email: string;
  };
};

const EMPTY_FILTERS: AdminDashboardFilters = {
  from: null,
  to: null,
  departmentId: null,
  employeeId: null,
  status: null,
};

const STATUS_COLORS: Record<string, string> = {
  Pending: "#f59e0b",
  "In Progress": "#6366f1",
  Completed: "#10b981",
  Overdue: "#f43f5e",
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function numberValue(value: number | null | undefined): string {
  return String(Number(value ?? 0));
}

function rateValue(value: number | null | undefined): string {
  return `${Number(value ?? 0).toFixed(Number(value ?? 0) % 1 === 0 ? 0 : 1)}%`;
}

function taskSortValue(task: AdminDashboardTask): number {
  return Date.parse(task.updatedAt ?? task.createdAt ?? "") || 0;
}

export default function AdminDashboardClient({ user }: AdminDashboardClientProps) {
  const [draftFilters, setDraftFilters] = useState<AdminDashboardFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<AdminDashboardFilters>(EMPTY_FILTERS);
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSearch, setRecentSearch] = useState("");
  const [recentStatus, setRecentStatus] = useState("");
  const [recentPriority, setRecentPriority] = useState("");
  const [recentDepartment, setRecentDepartment] = useState("");
  const [detailTask, setDetailTask] = useState<AdminDashboardTask | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeePerformanceOverview | null>(null);
  const [employeeTasks, setEmployeeTasks] = useState<AdminDashboardTask[] | null>(null);
  const [employeeTasksLoading, setEmployeeTasksLoading] = useState(false);
  const [employeeTasksError, setEmployeeTasksError] = useState<string | null>(null);

  const filterQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (appliedFilters.from) params.set("from", appliedFilters.from);
    if (appliedFilters.to) params.set("to", appliedFilters.to);
    if (appliedFilters.departmentId) params.set("departmentId", appliedFilters.departmentId);
    if (appliedFilters.employeeId) params.set("employeeId", appliedFilters.employeeId);
    if (appliedFilters.status) params.set("status", appliedFilters.status);
    return params.toString();
  }, [appliedFilters]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setRefreshing(true);
      setError(null);
      try {
        const response = await fetch(`/api/dashboard${filterQuery ? `?${filterQuery}` : ""}`, { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Failed to load dashboard.");
        if (!cancelled) setData(payload as AdminDashboardData);
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Failed to load dashboard.");
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [filterQuery]);

  const applyFilters = () => setAppliedFilters({ ...draftFilters });
  const clearFilters = () => {
    setDraftFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
  };
  const refresh = () => setAppliedFilters((current) => ({ ...current }));

  const filteredRecentTasks = useMemo(() => {
    const tasks = data?.recentTasks ?? [];
    const query = recentSearch.trim().toLowerCase();
    return tasks.filter((task) => {
      if (query) {
        const haystack = [task.taskId, task.title, task.employeeName, task.departmentName].join(" ").toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (recentStatus && String(task.status ?? "") !== recentStatus) return false;
      if (recentPriority && String(task.priority ?? "") !== recentPriority) return false;
      if (recentDepartment && String(task.departmentId ?? "") !== recentDepartment) return false;
      return true;
    });
  }, [data?.recentTasks, recentSearch, recentStatus, recentPriority, recentDepartment]);

  async function openEmployeePerformance(row: EmployeePerformanceOverview) {
    setSelectedEmployee(row);
    setEmployeeTasks(null);
    setEmployeeTasksError(null);
    setEmployeeTasksLoading(true);
    try {
      const response = await fetch("/api/tasks", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Failed to load employee tasks.");
      const tasks: AdminDashboardTask[] = (payload.tasks ?? [])
        .filter((task: AdminDashboardTask) => task.assignedTo === row.employeeId)
        .map((task: AdminDashboardTask) => ({
          ...task,
          employeeName: row.employeeName,
          departmentName: row.departmentName,
          daysOverdue: null,
        }))
        .sort((a: AdminDashboardTask, b: AdminDashboardTask) => taskSortValue(b) - taskSortValue(a));
      setEmployeeTasks(tasks);
    } catch (reason) {
      setEmployeeTasksError(reason instanceof Error ? reason.message : "Failed to load employee tasks.");
    } finally {
      setEmployeeTasksLoading(false);
    }
  }

  const kpis = data?.kpis;
  const departmentOptions = data?.departments ?? [];
  const employeeOptions = data?.employees ?? [];

  if (loading) {
    return (
      <div aria-busy="true" aria-live="polite">
        <PageHeader title="Admin Dashboard" description="Loading the workforce control panel..." eyebrow="Administration" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 10 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl bg-slate-200/70" />)}
        </div>
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-80 animate-pulse rounded-2xl bg-slate-200/70" />)}
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div>
        <PageHeader title="Admin Dashboard" description="Monitor workforce activity from the workbook." eyebrow="Administration" />
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
          <p className="font-semibold">Unable to load the dashboard</p>
          <p className="mt-1">{error}</p>
          <button type="button" onClick={refresh} className="mt-4 rounded-xl bg-rose-700 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-800">
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Admin Dashboard"
        description="Monitor employees, departments, task assignments, completion rates, and overdue work from one live view."
        eyebrow="Administration"
      >
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {refreshing ? "Refreshing..." : "Refresh data"}
        </button>
      </PageHeader>

      {error && (
        <div role="alert" className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Dashboard refresh failed: {error}
        </div>
      )}

      {/* Global filters */}
      <section aria-label="Dashboard filters" className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/40 sm:p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="block xl:col-span-1">
            <span className="text-xs font-medium text-slate-500">From due date</span>
            <input type="date" value={draftFilters.from ?? ""} onChange={(e) => setDraftFilters((f) => ({ ...f, from: e.target.value || null }))} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100" />
          </label>
          <label className="block xl:col-span-1">
            <span className="text-xs font-medium text-slate-500">To due date</span>
            <input type="date" value={draftFilters.to ?? ""} onChange={(e) => setDraftFilters((f) => ({ ...f, to: e.target.value || null }))} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100" />
          </label>
          <label className="block xl:col-span-1">
            <span className="text-xs font-medium text-slate-500">Department</span>
            <select value={draftFilters.departmentId ?? ""} onChange={(e) => setDraftFilters((f) => ({ ...f, departmentId: e.target.value || null }))} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100">
              <option value="">All departments</option>
              {departmentOptions.map((department) => <option key={department.departmentId} value={department.departmentId}>{department.departmentName || department.departmentId}</option>)}
            </select>
          </label>
          <label className="block xl:col-span-1">
            <span className="text-xs font-medium text-slate-500">Employee</span>
            <select value={draftFilters.employeeId ?? ""} onChange={(e) => setDraftFilters((f) => ({ ...f, employeeId: e.target.value || null }))} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100">
              <option value="">All employees</option>
              {employeeOptions.map((employee) => <option key={employee.employeeId} value={employee.employeeId}>{employee.fullName || employee.employeeId}</option>)}
            </select>
          </label>
          <label className="block xl:col-span-1">
            <span className="text-xs font-medium text-slate-500">Status</span>
            <select value={draftFilters.status ?? ""} onChange={(e) => setDraftFilters((f) => ({ ...f, status: (e.target.value as AdminDashboardFilters["status"]) || null }))} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100">
              <option value="">All statuses</option>
              {["Pending", "In Progress", "Completed", "Overdue"].map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button type="button" onClick={applyFilters} disabled={refreshing} className="w-full rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
              Apply
            </button>
            <button type="button" onClick={clearFilters} disabled={refreshing} className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60">
              Clear
            </button>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">Signed in as {user.email}. Filters use task due dates and apply consistently to KPIs, charts, and tables.</p>
      </section>

      {/* KPI cards */}
      <div className="grid gap-6">
        <section aria-labelledby="workforce-kpis">
          <h2 id="workforce-kpis" className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">Workforce overview</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <KpiCard label="Total employees" value={numberValue(kpis?.totalEmployees)} note="In the current filter scope" tone="sky" marker="EMP" />
            <KpiCard label="Active employees" value={numberValue(kpis?.activeEmployees)} note="Active account status" tone="emerald" marker="ACT" />
            <KpiCard label="Departments" value={numberValue(kpis?.totalDepartments)} note="Teams included in scope" tone="violet" marker="DEP" />
          </div>
        </section>

        <section aria-labelledby="task-kpis">
          <h2 id="task-kpis" className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">Task overview</h2>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 xl:grid-cols-5">
            <KpiCard label="Total tasks" value={numberValue(kpis?.totalTasks)} note="Work items in scope" tone="indigo" marker="ALL" />
            <KpiCard label="Completed" value={numberValue(kpis?.completedTasks)} note="Marked complete" tone="emerald" marker="✓" />
            <KpiCard label="Pending" value={numberValue(kpis?.pendingTasks)} note="Awaiting action" tone="amber" marker="…" />
            <KpiCard label="In progress" value={numberValue(kpis?.inProgressTasks)} note="Currently active" tone="indigo" marker="IP" />
            <KpiCard label="Overdue" value={numberValue(kpis?.overdueTasks)} note="Due date passed" tone="rose" marker="!" />
          </div>
        </section>

        <section aria-labelledby="performance-kpis">
          <h2 id="performance-kpis" className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">Performance overview</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <RateCard label="Overall completion rate" value={rateValue(kpis?.overallCompletionRate)} note="Completed tasks ÷ total tasks" />
            <RateCard label="On-time completion rate" value={rateValue(kpis?.onTimeCompletionRate)} note="Completed by due date, among completed tasks with due dates" />
          </div>
        </section>
      </div>

      {/* Charts */}
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <ChartPanel title="Task status distribution" subtitle="Derived from live task records; completed work is never counted as overdue.">
          {data && data.statusDistribution.some((item) => item.value > 0) ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.statusDistribution} dataKey="value" nameKey="name" innerRadius={62} outerRadius={95} paddingAngle={3}>
                    {data.statusDistribution.map((entry) => <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyState message="No tasks match the current filters." />}
        </ChartPanel>

        <ChartPanel title="Department task distribution" subtitle="Assigned tasks per department in the selected scope.">
          {data && data.departmentDistribution.length ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.departmentDistribution} margin={{ bottom: 28 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="departmentName" interval={0} angle={-18} textAnchor="end" height={64} tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
                  <Tooltip cursor={{ fill: "rgba(99,102,241,0.08)" }} />
                  <Bar dataKey="tasks" name="Tasks" radius={[8, 8, 0, 0]} fill="#6366f1" />
                  <Bar dataKey="completed" name="Completed" radius={[8, 8, 0, 0]} fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyState message="No departments or tasks match the current filters." />}
        </ChartPanel>

        <ChartPanel title="Task completion trend" subtitle="Completions grouped daily, weekly, or monthly based on the selected date range.">
          {data && data.completionTrend.length ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.completionTrend} margin={{ left: -12 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} minTickGap={12} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
                  <Tooltip />
                  <Line type="monotone" dataKey="completed" name="Completed tasks" stroke="#4f46e5" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyState message="No completed tasks have a usable completion date in this range." />}
        </ChartPanel>

        <OverduePanel tasks={data?.overdueTasks ?? []} />
      </div>

      {/* Recent tasks */}
      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">Recent tasks</h2>
            <p className="mt-1 text-xs text-slate-500">Most recently created or updated first.</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <input type="search" value={recentSearch} onChange={(e) => setRecentSearch(e.target.value)} placeholder="Search tasks..." className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:bg-white sm:w-48" aria-label="Search recent tasks" />
            <select value={recentStatus} onChange={(e) => setRecentStatus(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400" aria-label="Filter recent tasks by status">
              <option value="">All statuses</option>
              {["Pending", "In Progress", "Completed", "Overdue"].map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <select value={recentPriority} onChange={(e) => setRecentPriority(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400" aria-label="Filter recent tasks by priority">
              <option value="">All priorities</option>
              {["Low", "Medium", "High", "Urgent"].map((priority) => <option key={priority} value={priority}>{priority}</option>)}
            </select>
            <select value={recentDepartment} onChange={(e) => setRecentDepartment(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400" aria-label="Filter recent tasks by department">
              <option value="">All departments</option>
              {departmentOptions.map((department) => <option key={department.departmentId} value={department.departmentId}>{department.departmentName}</option>)}
            </select>
            <Link href="/tasks" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Open task manager</Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Task ID</th>
                <th className="px-5 py-3.5">Title</th>
                <th className="px-5 py-3.5">Assigned employee</th>
                <th className="px-5 py-3.5">Department</th>
                <th className="px-5 py-3.5">Priority</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Due date</th>
                <th className="px-5 py-3.5"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecentTasks.map((task) => (
                <tr key={task.taskId} className="transition hover:bg-slate-50/80">
                  <td className="whitespace-nowrap px-5 py-4 font-mono text-xs text-slate-500">{task.taskId}</td>
                  <td className="max-w-xs px-5 py-4 font-medium text-slate-900">{task.title}</td>
                  <td className="px-5 py-4 text-slate-600">{task.employeeName}</td>
                  <td className="px-5 py-4 text-slate-600">{task.departmentName}</td>
                  <td className="px-5 py-4"><StatusBadge value={task.priority} /></td>
                  <td className="px-5 py-4"><StatusBadge value={task.status} /></td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-600">{formatDate(task.dueDate)}</td>
                  <td className="px-5 py-4 text-right"><button type="button" onClick={() => setDetailTask(task)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50">View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filteredRecentTasks.length && <EmptyState message="No recent tasks match your search or filters." />}
      </section>

      {/* Employee performance overview */}
      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40">
        <div className="border-b border-slate-100 p-5">
          <h2 className="font-semibold text-slate-900">Employee performance overview</h2>
          <p className="mt-1 text-xs text-slate-500">Calculated from actual assigned tasks in the current filter scope. Select an employee to open details.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Employee</th>
                <th className="px-5 py-3.5">Department</th>
                <th className="px-5 py-3.5">Assigned</th>
                <th className="px-5 py-3.5">Completed</th>
                <th className="px-5 py-3.5">Pending</th>
                <th className="px-5 py-3.5">Overdue</th>
                <th className="px-5 py-3.5">Completion</th>
                <th className="px-5 py-3.5"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data?.employeePerformance ?? []).map((row) => (
                <tr key={row.employeeId} className="transition hover:bg-slate-50/80">
                  <td className="px-5 py-4 font-medium text-slate-900">{row.employeeName}</td>
                  <td className="px-5 py-4 text-slate-600">{row.departmentName}</td>
                  <td className="px-5 py-4 text-slate-700">{row.assignedTasks}</td>
                  <td className="px-5 py-4 text-emerald-700">{row.completedTasks}</td>
                  <td className="px-5 py-4 text-amber-700">{row.pendingTasks}</td>
                  <td className="px-5 py-4 text-rose-700">{row.overdueTasks}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className="w-12 font-semibold text-slate-700">{rateValue(row.completionRate)}</span>
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-600" style={{ width: `${Math.min(100, row.completionRate)}%` }} /></div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right"><button type="button" onClick={() => openEmployeePerformance(row)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50">Details</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && data.employeePerformance.length === 0 && <EmptyState message="No employees match the current filters." />}
      </section>

      {detailTask && <TaskDetailModal task={detailTask} onClose={() => setDetailTask(null)} />}
      {selectedEmployee && (
        <EmployeePerformanceModal
          row={selectedEmployee}
          tasks={employeeTasks}
          loading={employeeTasksLoading}
          error={employeeTasksError}
          onClose={() => {
            setSelectedEmployee(null);
            setEmployeeTasks(null);
            setEmployeeTasksError(null);
          }}
        />
      )}
    </div>
  );
}

type Tone = "sky" | "emerald" | "violet" | "indigo" | "amber" | "rose";
const toneClasses: Record<Tone, string> = {
  sky: "bg-sky-50 text-sky-700",
  emerald: "bg-emerald-50 text-emerald-700",
  violet: "bg-violet-50 text-violet-700",
  indigo: "bg-indigo-50 text-indigo-700",
  amber: "bg-amber-50 text-amber-700",
  rose: "bg-rose-50 text-rose-700",
};

function KpiCard({ label, value, note, tone, marker }: { label: string; value: string; note: string; tone: Tone; marker: string }) {
  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/40 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{value}</p>
        </div>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[10px] font-bold ${toneClasses[tone]}`}>{marker}</span>
      </div>
      <p className="mt-3 border-t border-slate-100 pt-2 text-[11px] leading-4 text-slate-500">{note}</p>
    </article>
  );
}

function RateCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <article className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-white p-5 shadow-sm shadow-slate-200/40">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-500">Performance</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">{label}</h3>
          <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">{note}</p>
        </div>
        <p className="text-4xl font-semibold tracking-tight text-indigo-700">{value}</p>
      </div>
    </article>
  );
}

function ChartPanel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40">
      <div className="border-b border-slate-100 p-5">
        <h2 className="font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center p-6 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-sm font-bold text-slate-400">—</div>
      <p className="mt-3 text-sm text-slate-500">{message}</p>
    </div>
  );
}

function OverduePanel({ tasks }: { tasks: AdminDashboardTask[] }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-sm shadow-slate-200/40">
      <div className="flex items-center justify-between gap-3 border-b border-rose-100 bg-rose-50/60 p-5">
        <div>
          <h2 className="font-semibold text-rose-900">Overdue tasks</h2>
          <p className="mt-1 text-xs text-rose-700/80">Due date passed and status is not Completed.</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-rose-700 ring-1 ring-inset ring-rose-200">{tasks.length}</span>
      </div>
      <div className="max-h-72 overflow-y-auto divide-y divide-rose-50">
        {tasks.length ? tasks.map((task) => (
          <div key={task.taskId} className="grid gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{task.title}</p>
              <p className="mt-0.5 truncate text-xs text-slate-500">{task.employeeName} · {task.departmentName}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2"><StatusBadge value={task.priority} /><StatusBadge value={task.status} /></div>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs font-medium text-slate-500">Due {formatDate(task.dueDate)}</p>
              <p className="mt-1 text-lg font-semibold text-rose-700">{task.daysOverdue ?? 0} {task.daysOverdue === 1 ? "day" : "days"} overdue</p>
            </div>
          </div>
        )) : <EmptyState message="No overdue work in the current filter scope." />}
      </div>
    </section>
  );
}

function TaskDetailModal({ task, onClose }: { task: AdminDashboardTask; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="task-detail-title" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-xs uppercase tracking-wide text-slate-400">{task.taskId}</p>
            <h2 id="task-detail-title" className="mt-1 text-xl font-semibold text-slate-950">{task.title}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close task details">×</button>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
          <Detail label="Assigned to" value={task.employeeName} />
          <Detail label="Department" value={task.departmentName} />
          <Detail label="Priority" value={task.priority ?? "—"} />
          <Detail label="Status" value={task.status ?? "—"} />
          <Detail label="Due date" value={formatDate(task.dueDate)} />
          <Detail label="Completion date" value={formatDate(task.completionDate)} />
          <Detail label="Progress" value={`${task.progressPercentage ?? 0}%`} />
          <Detail label="Updated" value={formatDateTime(task.updatedAt)} />
        </dl>
        <div className="mt-6 flex justify-end">
          <Link href="/tasks" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Open in task manager</Link>
        </div>
      </div>
    </div>
  );
}

function EmployeePerformanceModal({ row, tasks, loading, error, onClose }: { row: EmployeePerformanceOverview; tasks: AdminDashboardTask[] | null; loading: boolean; error: string | null; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="employee-performance-title" className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Employee performance</p>
            <h2 id="employee-performance-title" className="mt-1 text-xl font-semibold text-slate-950">{row.employeeName}</h2>
            <p className="mt-1 text-sm text-slate-500">{row.departmentName}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close employee performance">×</button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <MiniMetric label="Assigned" value={String(row.assignedTasks)} />
          <MiniMetric label="Completed" value={String(row.completedTasks)} />
          <MiniMetric label="Pending" value={String(row.pendingTasks)} />
          <MiniMetric label="Overdue" value={String(row.overdueTasks)} />
          <MiniMetric label="Rate" value={rateValue(row.completionRate)} />
        </div>
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-slate-900">Assigned tasks</h3>
          {loading ? (
            <div className="mt-3 space-y-2">{Array.from({ length: 4 }, (_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />)}</div>
          ) : error ? (
            <div role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
          ) : tasks && tasks.length ? (
            <div className="mt-3 max-h-80 overflow-y-auto divide-y divide-slate-100 rounded-2xl border border-slate-200">
              {tasks.map((task) => (
                <div key={task.taskId} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{task.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{task.taskId} · Due {formatDate(task.dueDate)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2"><StatusBadge value={task.priority} /><StatusBadge value={task.status} /></div>
                </div>
              ))}
            </div>
          ) : <EmptyState message="No assigned tasks found for this employee." />}
        </div>
      </div>
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

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}
