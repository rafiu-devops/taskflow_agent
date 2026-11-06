"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";

type DepartmentRow = {
  departmentId: string;
  departmentName: string;
  description: string;
  manager: string;
  status: string;
};

export default function DepartmentsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<DepartmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const me = await fetch("/api/me");
        if (!me.ok) { router.push("/login"); return; }
        const res = await fetch("/api/departments");
        if (!res.ok) throw new Error("Failed to load departments. Please refresh the page and try again.");
        setRows((await res.json()).departments);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Failed to load departments.");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  return (
    <div>
      <PageHeader
        title="Departments"
        description="Explore how your organization is structured and who leads each team."
        eyebrow="Organization"
      />
      {loading ? (
        <div className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      ) : (
      error ? (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">{error}</div>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap gap-3">
            <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm shadow-slate-200/40">
              <span className="text-xs text-slate-500">Departments</span>
              <span className="ml-3 text-lg font-semibold text-slate-900">{rows.length}</span>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm shadow-slate-200/40">
              <span className="text-xs text-slate-500">Active teams</span>
              <span className="ml-3 text-lg font-semibold text-emerald-700">
                {rows.filter((row) => String(row.status).toLowerCase() === "active").length}
              </span>
            </div>
          </div>
          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold text-slate-900">Department directory</h2>
              <p className="mt-1 text-xs text-slate-500">A quick reference for teams and their leads.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[760px] w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Department</th>
                    <th className="px-5 py-3.5">Description</th>
                    <th className="px-5 py-3.5">Department lead</th>
                    <th className="px-5 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => (
                    <tr key={row.departmentId} className="transition hover:bg-slate-50/80">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-xs font-semibold text-violet-700">
                            {String(row.departmentName || "D").slice(0, 2).toUpperCase()}
                          </span>
                          <div>
                            <p className="font-medium text-slate-900">{row.departmentName || "Unnamed department"}</p>
                            <p className="mt-0.5 text-xs text-slate-500">{row.departmentId || "No ID"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-sm px-5 py-4 text-slate-600">{row.description || "No description provided"}</td>
                      <td className="px-5 py-4 text-slate-600">{row.manager || "Not assigned"}</td>
                      <td className="px-5 py-4"><StatusBadge value={row.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!rows.length && (
              <div className="px-5 py-14 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-lg text-slate-500">D</div>
                <h3 className="mt-3 text-sm font-semibold text-slate-900">No departments yet</h3>
                <p className="mt-1 text-sm text-slate-500">Department records will appear here when they are added.</p>
              </div>
            )}
          </section>
        </>
      )
      )}
    </div>
  );
}