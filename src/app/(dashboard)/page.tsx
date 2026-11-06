"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";

type DashboardSummary = {
  totalEmployees: number;
  totalDepartments: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
};

export default function DashboardPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const me = await fetch("/api/me");
        if (!me.ok) {
          router.push("/login");
          return;
        }
        const res = await fetch("/api/dashboard");
        if (!res.ok) throw new Error("Failed to load dashboard.");
        const data = await res.json();
        setSummary(data.summary);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Failed to load dashboard.");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

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

  const metrics: { key: keyof DashboardSummary; label: string; note: string; marker: string; tone: string }[] = [
    { key: "totalEmployees", label: "Team members", note: "People in your workspace", marker: "TM", tone: "bg-sky-50 text-sky-700" },
    { key: "totalDepartments", label: "Departments", note: "Teams across the organization", marker: "DP", tone: "bg-violet-50 text-violet-700" },
    { key: "totalTasks", label: "Total tasks", note: "Work items being tracked", marker: "TK", tone: "bg-indigo-50 text-indigo-700" },
    { key: "completedTasks", label: "Completed", note: "Tasks marked as complete", marker: "✓", tone: "bg-emerald-50 text-emerald-700" },
    { key: "pendingTasks", label: "Pending", note: "Tasks still to be completed", marker: "…", tone: "bg-amber-50 text-amber-700" },
    { key: "overdueTasks", label: "Overdue", note: "Tasks that need attention", marker: "!", tone: "bg-rose-50 text-rose-700" },
  ];
  const completed = Number(summary?.completedTasks ?? 0);
  const total = Number(summary?.totalTasks ?? 0);
  const completionRate = total ? Math.round((completed / total) * 100) : 0;

  return (
    <div>
      <PageHeader
        eyebrow="Your workspace"
        title="Overview"
        description="A clear view of your people, teams, and work."
      />
      <section className="mb-7 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 p-6 text-white shadow-lg shadow-indigo-200/50 sm:p-8">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div className="max-w-xl">
            <p className="text-sm font-medium text-indigo-100">Your workforce at a glance</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Good work starts with a clear view.</h2>
            <p className="mt-2 text-sm leading-6 text-indigo-100">
              Track team activity and keep important work moving from one place.
            </p>
          </div>
          <Link href="/tasks" className="inline-flex w-fit items-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50">
            View tasks <span className="ml-2" aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Your workspace metrics</h2>
          <p className="mt-1 text-sm text-slate-500">The latest counts across your workforce.</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <article key={metric.key} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/40 transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">{metric.label}</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                  {summary ? String(summary[metric.key] ?? 0) : "—"}
                </p>
              </div>
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold ${metric.tone}`}>
                {metric.marker}
              </span>
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
    </div>
  );
}