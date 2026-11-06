"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import type { PermissionGrantState } from "@/lib/auth/permissions";

type SafeUser = {
  email: string;
  name: string;
  role: "admin" | "employee";
  employeeId: string | null;
  departmentId: string | null;
  permissions: PermissionGrantState;
};

type DashboardSummary = {
  totalEmployees: number | null;
  totalDepartments: number | null;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
};

type DashboardResponse = {
  role: "admin" | "employee";
  scope: "organization" | "department" | "personal";
  statsIncluded: boolean;
  summary: DashboardSummary | null;
};

export default function DashboardClient({ user }: { user: SafeUser }) {
  const canViewDashboard = Boolean(user.permissions.DASHBOARD_VIEW_PERSONAL);
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(canViewDashboard);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canViewDashboard) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/dashboard", { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Failed to load dashboard.");
        if (!cancelled) setData(payload);
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Failed to load dashboard.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canViewDashboard]);

  if (!canViewDashboard) {
    return (
      <div>
        <PageHeader
          eyebrow="Account access"
          title="You're signed in"
          description="Your account is active, but no workspace modules have been granted yet."
        />
        <section className="max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-sm font-bold text-indigo-700">
            ✓
          </div>
          <h2 className="mt-5 text-xl font-semibold tracking-tight text-slate-950">Waiting for access</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            You can reach your account settings, but your administrator needs to grant dashboard and module permissions before workspace data appears.
          </p>
          <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-medium text-slate-800">{user.name}</p>
            <p className="mt-1">{user.email}</p>
          </div>
          <Link href="/settings" className="mt-6 inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
            View account settings
          </Link>
        </section>
      </div>
    );
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Overview" description="A clear view of your people, teams, and work." />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-slate-200/70" />
          ))}
        </div>
      </>
    );
  }
  if (error) {
    return (
      <>
        <PageHeader title="Overview" description="A clear view of your people, teams, and work." />
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">{error}</div>
      </>
    );
  }

  const summary = data?.summary ?? null;
  const statsIncluded = Boolean(data?.statsIncluded && summary);
  const isAdmin = user.role === "admin";
  const scopeLabel = data?.scope === "organization" ? "Organization" : data?.scope === "department" ? "Department" : "Personal";

  const metrics = summary
    ? [
        ...(isAdmin
          ? [
              { label: "Team members", note: "People in your workspace", value: summary.totalEmployees, marker: "TM", tone: "bg-sky-50 text-sky-700" },
              { label: "Departments", note: "Teams across the organization", value: summary.totalDepartments, marker: "DP", tone: "bg-violet-50 text-violet-700" },
            ]
          : []),
        { label: "Total tasks", note: `${scopeLabel} work items`, value: summary.totalTasks, marker: "TK", tone: "bg-indigo-50 text-indigo-700" },
        { label: "Completed", note: "Tasks marked as complete", value: summary.completedTasks, marker: "✓", tone: "bg-emerald-50 text-emerald-700" },
        { label: "Pending", note: "Tasks still to be completed", value: summary.pendingTasks, marker: "…", tone: "bg-amber-50 text-amber-700" },
        { label: "Overdue", note: "Tasks that need attention", value: summary.overdueTasks, marker: "!", tone: "bg-rose-50 text-rose-700" },
      ]
    : [];
  const completed = summary?.completedTasks ?? 0;
  const total = summary?.totalTasks ?? 0;
  const completionRate = total ? Math.round((completed / total) * 100) : 0;

  return (
    <div>
      <PageHeader
        eyebrow={isAdmin ? "Admin workspace" : "Your workspace"}
        title={isAdmin ? "Overview" : "My dashboard"}
        description={isAdmin ? "A clear view of your people, teams, and work." : "A focused view of the work available to you."}
      />
      <section className="mb-7 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 p-6 text-white shadow-lg shadow-indigo-200/50 sm:p-8">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div className="max-w-xl">
            <p className="text-sm font-medium text-indigo-100">{isAdmin ? "Your workforce at a glance" : `${scopeLabel} scope`}</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Good work starts with a clear view.</h2>
            <p className="mt-2 text-sm leading-6 text-indigo-100">
              {isAdmin ? "Track team activity and keep important work moving from one place." : "See the work you are allowed to see and jump into the next step."}
            </p>
          </div>
          <Link href="/tasks" className="inline-flex w-fit items-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50">
            View tasks <span className="ml-2" aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      {!statsIncluded ? (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-200/40">
          <h2 className="text-base font-semibold text-slate-900">Task statistics are not enabled</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Your dashboard is available, but general task statistics have not been granted for your account. Contact your administrator if you need task metrics.
          </p>
        </section>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">{isAdmin ? "Your workspace metrics" : "Your task metrics"}</h2>
              <p className="mt-1 text-sm text-slate-500">{isAdmin ? "The latest counts across your workforce." : "The latest counts within your authorized scope."}</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {metrics.map((metric) => (
              <article key={metric.label} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/40 transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-500">{metric.label}</p>
                    <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{String(metric.value ?? 0)}</p>
                  </div>
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold ${metric.tone}`}>{metric.marker}</span>
                </div>
                <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">{metric.note}</p>
              </article>
            ))}
          </div>
          <section className="mt-7 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/40 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Task completion</h2>
                <p className="mt-1 text-sm text-slate-500">{completed} of {total} tasks completed</p>
              </div>
              <p className="text-2xl font-semibold tracking-tight text-indigo-700">{completionRate}%</p>
            </div>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label="Task completion" aria-valuenow={completionRate} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${completionRate}%` }} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
