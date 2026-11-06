"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";

type TaskRow = {
  taskId: string;
  title: string;
  assignedTo: string | null;
  priority: string | null;
  status: string | null;
  dueDate: string | null;
};

type TaskScope = "all" | "department" | "own";

export default function TasksClient({ scope, canCreateTask }: { scope: TaskScope; canCreateTask: boolean }) {
  const [rows, setRows] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/tasks", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load tasks");
      setRows(data.tasks ?? []);
      return true;
    } catch {
      return false;
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loaded = await load();
        if (!cancelled && !loaded) setError("Failed to load tasks. Please refresh the page and try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, status: "Pending", priority: "Medium" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to create task");
        return;
      }
      setTitle("");
      if (!(await load())) setError("Task created, but the list could not be refreshed.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Failed to create task.");
    } finally {
      setSaving(false);
    }
  }

  const pendingCount = rows.filter((row) => String(row.status).toLowerCase() === "pending").length;
  const completedCount = rows.filter((row) => String(row.status).toLowerCase() === "completed").length;
  const overdueCount = rows.filter((row) => String(row.status).toLowerCase() === "overdue").length;
  const scopeLabel = scope === "all" ? "All tasks" : scope === "department" ? "Department tasks" : "My tasks";

  return (
    <div>
      <PageHeader
        title={scope === "own" ? "My Tasks" : "Tasks"}
        description={scope === "own" ? "A focused view of tasks assigned to you." : "Plan the work, keep priorities visible, and see what needs attention."}
        eyebrow={scope === "own" ? "My work" : "Work management"}
      />
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          ))}
          <div className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white sm:col-span-3" />
        </div>
      ) : (
      <>
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {[
          { label: scopeLabel, value: rows.length, tone: "text-slate-950", marker: "TK" },
          { label: "Pending", value: pendingCount, tone: "text-amber-700", marker: "…" },
          { label: "Completed", value: completedCount, tone: "text-emerald-700", marker: "✓" },
        ].map((metric) => (
          <div key={metric.label} className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/40">
            <div>
              <p className="text-sm text-slate-500">{metric.label}</p>
              <p className={`mt-1 text-2xl font-semibold ${metric.tone}`}>{metric.value}</p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-xs font-bold text-slate-500">{metric.marker}</span>
          </div>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="order-2 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40 xl:order-1">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="font-semibold text-slate-900">Task list</h2>
              <p className="mt-1 text-xs text-slate-500">A current view of work in your authorized scope</p>
            </div>
            {overdueCount > 0 && <StatusBadge value={`${overdueCount} overdue`} />}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[700px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Task</th>
                  <th className="px-5 py-3.5">Assigned to</th>
                  <th className="px-5 py-3.5">Priority</th>
                  <th className="px-5 py-3.5">Due date</th>
                  <th className="px-5 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.taskId} className="transition hover:bg-slate-50/80">
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-900">{row.title || "Untitled task"}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{row.taskId}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{row.assignedTo || "Unassigned"}</td>
                    <td className="px-5 py-4"><StatusBadge value={row.priority} /></td>
                    <td className="px-5 py-4 text-slate-600">{row.dueDate || "No due date"}</td>
                    <td className="px-5 py-4"><StatusBadge value={row.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!rows.length && (
            <div className="px-5 py-14 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-sm font-bold text-indigo-600">TK</div>
              <h3 className="mt-3 text-sm font-semibold text-slate-900">Nothing on the list yet</h3>
              <p className="mt-1 text-sm text-slate-500">No tasks are available in your authorized scope.</p>
            </div>
          )}
        </section>
        <aside className="order-1 h-fit rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/40 xl:order-2">
          {canCreateTask ? (
            <>
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-sm font-bold text-indigo-700">+</div>
              <h2 className="font-semibold text-slate-900">Create a task</h2>
              <p className="mt-1 text-sm leading-5 text-slate-500">Add a clear title so everyone knows what needs to get done.</p>
              <form onSubmit={createTask} className="mt-5 space-y-3">
                <label htmlFor="task-title" className="block text-xs font-medium text-slate-700">Task title</label>
                <input
                  id="task-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Prepare weekly update"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  required
                />
                {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
                <button type="submit" disabled={saving} className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60">
                  {saving ? "Adding task..." : "Add task"}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-500">LOCK</div>
              <h2 className="font-semibold text-slate-900">Task creation</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Task creation has not been granted for your account. Ask your administrator if you need this permission.
              </p>
              {error && <p role="alert" className="mt-3 text-sm text-rose-600">{error}</p>}
            </>
          )}
        </aside>
      </div>
      </>
      )}
    </div>
  );
}
