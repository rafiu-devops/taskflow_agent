"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";

type PerformanceRow = {
  employeeId: string;
  employeeName: string;
  totalAssignedTasks: number;
  completedTasks: number;
  completionRate: string | number;
  performanceSummary: string;
};

export default function PerformancePage() {
  const router = useRouter();
  const [rows, setRows] = useState<PerformanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const me = await fetch("/api/me");
        if (!me.ok) { router.push("/login"); return; }
        const res = await fetch("/api/performance");
        if (!res.ok) throw new Error("Failed to load performance data. Please refresh the page and try again.");
        setRows((await res.json()).performance);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Failed to load performance data.");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  return (
    <div>
      <PageHeader
        title="Performance"
        description="Understand progress through task completion and employee summaries."
        eyebrow="Team insights"
      />
      {loading ? (
        <div className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      ) : (
      error ? (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">{error}</div>
      ) : (
        <>
          <div className="mb-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/40">
              <p className="text-sm font-medium text-slate-500">People in this report</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{rows.length}</p>
              <p className="mt-1 text-xs text-slate-500">Employees with a performance summary</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/40">
              <p className="text-sm font-medium text-slate-500">Tasks completed</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-emerald-700">
                {rows.reduce((total, row) => total + (Number(row.completedTasks) || 0), 0)}
              </p>
              <p className="mt-1 text-xs text-slate-500">Combined completed task count</p>
            </div>
          </div>
          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold text-slate-900">Team performance</h2>
              <p className="mt-1 text-xs text-slate-500">Completion rates and task summaries by employee.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[760px] w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Employee</th>
                    <th className="px-5 py-3.5">Assigned</th>
                    <th className="px-5 py-3.5">Completed</th>
                    <th className="px-5 py-3.5">Completion</th>
                    <th className="px-5 py-3.5">Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row, index) => {
                    const rate = Number.parseFloat(String(row.completionRate ?? "0").replace("%", ""));
                    const progress = Number.isFinite(rate) ? Math.min(100, Math.max(0, rate)) : 0;
                    return (
                      <tr key={row.employeeId || index} className="transition hover:bg-slate-50/80">
                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-900">{row.employeeName || "Unnamed employee"}</p>
                          <p className="mt-0.5 text-xs text-slate-500">{row.employeeId || "No ID"}</p>
                        </td>
                        <td className="px-5 py-4 text-slate-600">{row.totalAssignedTasks ?? "—"}</td>
                        <td className="px-5 py-4 font-medium text-slate-800">{row.completedTasks ?? "—"}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <span className="w-12 font-medium text-slate-700">{row.completionRate || "0%"}</span>
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                              <div className="h-full rounded-full bg-indigo-600" style={{ width: `${progress}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="max-w-xs px-5 py-4 text-slate-600">{row.performanceSummary || "No summary available"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!rows.length && (
              <div className="px-5 py-14 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-sm font-bold text-violet-700">%</div>
                <h3 className="mt-3 text-sm font-semibold text-slate-900">No performance data yet</h3>
                <p className="mt-1 text-sm text-slate-500">Employee progress will appear here as task activity is recorded.</p>
              </div>
            )}
          </section>
        </>
      )
      )}
    </div>
  );
}