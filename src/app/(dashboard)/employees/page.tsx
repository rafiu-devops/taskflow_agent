"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";

type EmployeeRow = {
  employeeId: string;
  fullName: string;
  email: string;
  departmentId: string;
  designation: string;
  accountStatus: string;
};

export default function EmployeesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const me = await fetch("/api/me");
        if (!me.ok) { router.push("/login"); return; }
        const res = await fetch("/api/employees");
        if (!res.ok) throw new Error("Failed to load employees. Please refresh the page and try again.");
        setRows((await res.json()).employees);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Failed to load employees.");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const filteredRows = rows.filter((row) =>
    [row.fullName, row.email, row.departmentId, row.designation]
      .some((value) => String(value ?? "").toLowerCase().includes(search.toLowerCase())),
  );
  const activeCount = rows.filter((row) => String(row.accountStatus).toLowerCase() === "active").length;

  return (
    <div>
      <PageHeader
        title="Employees"
        description="Get to know the people behind the work and find team details quickly."
        eyebrow="People"
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
              <p className="text-sm font-medium text-slate-500">Team members</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{rows.length}</p>
              <p className="mt-1 text-xs text-slate-500">People listed in your workspace</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/40">
              <p className="text-sm font-medium text-slate-500">Active accounts</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-emerald-700">{activeCount}</p>
              <p className="mt-1 text-xs text-slate-500">Employees with an active account</p>
            </div>
          </div>
          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <h2 className="font-semibold text-slate-900">Team directory</h2>
                <p className="mt-1 text-xs text-slate-500">{filteredRows.length} {filteredRows.length === 1 ? "person" : "people"}</p>
              </div>
              <label className="relative block sm:w-72">
                <span className="sr-only">Search employees</span>
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400" aria-hidden="true">⌕</span>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search people..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                />
              </label>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[760px] w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Employee</th>
                    <th className="px-5 py-3.5">Department</th>
                    <th className="px-5 py-3.5">Role</th>
                    <th className="px-5 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRows.map((row) => {
                    const initials = String(row.fullName || "?")
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((part: string) => part[0])
                      .join("")
                      .toUpperCase();
                    return (
                      <tr key={row.employeeId} className="transition hover:bg-slate-50/80">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-700">{initials}</span>
                            <div>
                              <p className="font-medium text-slate-900">{row.fullName || "Unnamed employee"}</p>
                              <p className="mt-0.5 text-xs text-slate-500">{row.email || "No email provided"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-600">{row.departmentId || "—"}</td>
                        <td className="px-5 py-4 text-slate-600">{row.designation || "—"}</td>
                        <td className="px-5 py-4"><StatusBadge value={row.accountStatus} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredRows.length === 0 && (
              <div className="px-5 py-14 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-lg text-slate-500">⌕</div>
                <h3 className="mt-3 text-sm font-semibold text-slate-900">{rows.length ? "No matching employees" : "No employees yet"}</h3>
                <p className="mt-1 text-sm text-slate-500">{rows.length ? "Try a different name, email, or department." : "Employee records will appear here when they are added."}</p>
              </div>
            )}
          </section>
        </>
      )
      )}
    </div>
  );
}