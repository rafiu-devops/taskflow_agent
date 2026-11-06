"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  EMPLOYEE_PERMISSIONS,
  PERMISSION_CATEGORIES,
  emptyEmployeePermissions,
  type PermissionGrantState,
  type PermissionKey,
} from "@/lib/auth/permissions";

type EmployeePermissionRow = {
  employeeId: string;
  fullName: string;
  email: string | null;
  departmentId: string | null;
  designation: string | null;
  accountStatus: string | null;
  grantedPermissions: number;
  totalPermissions: number;
  permissionStatus: string;
  lastPermissionUpdate: string | null;
};

type EmployeeDetails = {
  employee: EmployeePermissionRow;
  permissions: PermissionGrantState;
  lastUpdatedAt: string | null;
  updatedBy: string | null;
  grantedCount: number;
  totalPermissions: number;
  permissionStatus: string;
  missingSheet?: boolean;
};

type Notice = { type: "success" | "error"; text: string } | null;

const permissionLabel = new Map(EMPLOYEE_PERMISSIONS.map((permission) => [permission.key, permission.label]));

function permissionStatusTone(status: string): string {
  if (status === "Full employee access") return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
  if (status === "Partial access") return "bg-amber-50 text-amber-800 ring-amber-600/20";
  return "bg-slate-100 text-slate-600 ring-slate-500/10";
}

function formatDate(value: string | null): string {
  if (!value) return "Never";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function PermissionManagementClient() {
  const [query, setQuery] = useState("");
  const [employees, setEmployees] = useState<EmployeePermissionRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [details, setDetails] = useState<EmployeeDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [grants, setGrants] = useState<PermissionGrantState>(() => emptyEmployeePermissions());
  const [savedGrants, setSavedGrants] = useState<PermissionGrantState>(() => emptyEmployeePermissions());
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [confirmRevocations, setConfirmRevocations] = useState<PermissionKey[] | null>(null);

  const dirty = useMemo(
    () => EMPLOYEE_PERMISSIONS.some((permission) => grants[permission.key] !== savedGrants[permission.key]),
    [grants, savedGrants],
  );

  const revocations = useMemo(
    () => EMPLOYEE_PERMISSIONS.map((p) => p.key).filter((key) => savedGrants[key] && !grants[key]),
    [grants, savedGrants],
  );

  useEffect(() => {
    const handle = window.setTimeout(async () => {
      setListLoading(true);
      setListError(null);
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set("search", query.trim());
        const response = await fetch(`/api/admin/permissions/employees?${params.toString()}`, { cache: "no-store" });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Failed to load employees.");
        setEmployees(data.employees ?? []);
      } catch (reason) {
        setListError(reason instanceof Error ? reason.message : "Failed to load employees.");
      } finally {
        setListLoading(false);
      }
    }, query ? 250 : 0);
    return () => window.clearTimeout(handle);
  }, [query]);

  async function selectEmployee(employeeId: string) {
    setSelectedId(employeeId);
    setDetails(null);
    setDetailsLoading(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/permissions/${encodeURIComponent(employeeId)}`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Failed to load permissions.");
      setDetails(data);
      setGrants(data.permissions);
      setSavedGrants(data.permissions);
    } catch (reason) {
      setNotice({ type: "error", text: reason instanceof Error ? reason.message : "Failed to load permissions." });
    } finally {
      setDetailsLoading(false);
    }
  }

  function togglePermission(key: PermissionKey) {
    setGrants((current) => ({ ...current, [key]: !current[key] }));
  }

  function setCategory(categoryName: string, value: boolean) {
    const category = PERMISSION_CATEGORIES.find((item) => item.name === categoryName);
    if (!category) return;
    setGrants((current) => {
      const next = { ...current };
      for (const permission of category.permissions) next[permission.key] = value;
      return next;
    });
  }

  function resetToSaved() {
    setGrants(savedGrants);
    setNotice(null);
  }

  async function submitPermissions() {
    if (!selectedId || !dirty) return;
    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/permissions/${encodeURIComponent(selectedId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: grants }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Failed to save permissions.");
      setSavedGrants(data.permissions);
      setGrants(data.permissions);
      setDetails((current) =>
        current
          ? {
              ...current,
              permissions: data.permissions,
              lastUpdatedAt: data.lastUpdatedAt,
              updatedBy: data.updatedBy,
              grantedCount: data.grantedCount,
              permissionStatus: data.permissionStatus,
            }
          : current,
      );
      setEmployees((current) =>
        current.map((employee) =>
          employee.employeeId === selectedId
            ? {
                ...employee,
                grantedPermissions: data.grantedCount,
                permissionStatus: data.permissionStatus,
                lastPermissionUpdate: data.lastUpdatedAt,
              }
            : employee,
        ),
      );
      setNotice({ type: "success", text: data.changedCount === 0 ? "Permissions are already up to date." : `Saved ${data.changedCount} permission change${data.changedCount === 1 ? "" : "s"}.` });
      setConfirmRevocations(null);
    } catch (reason) {
      setNotice({ type: "error", text: reason instanceof Error ? reason.message : "Failed to save permissions." });
    } finally {
      setSaving(false);
    }
  }

  function requestSave() {
    if (!dirty) return;
    if (revocations.length) {
      setConfirmRevocations(revocations);
      return;
    }
    void submitPermissions();
  }

  const selectedStatus = details?.permissionStatus ?? "";

  return (
    <div>
      <PageHeader
        title="Permission Management"
        description="Search employees and grant exactly the access they need. Admin access remains controlled by the admin email configuration."
        eyebrow="Administration"
      />

      {notice && (
        <div
          role={notice.type === "error" ? "alert" : "status"}
          className={`mb-5 rounded-2xl border p-4 text-sm ${
            notice.type === "error"
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {notice.text}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(340px,0.9fr)_minmax(0,1.6fr)]">
        {/* Employee directory */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40">
          <div className="border-b border-slate-100 p-5">
            <label htmlFor="employee-search" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Find employee
            </label>
            <input
              id="employee-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, email, ID, or department..."
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
            />
            <p className="mt-2 text-xs text-slate-500">{employees.length} {employees.length === 1 ? "employee" : "employees"}</p>
          </div>
          {listError && <div role="alert" className="border-b border-rose-100 bg-rose-50 px-5 py-3 text-sm text-rose-700">{listError}</div>}
          <div className="max-h-[72vh] overflow-y-auto">
            {listLoading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-20 animate-pulse rounded-xl bg-slate-100" />)}
              </div>
            ) : employees.length ? (
              employees.map((employee) => {
                const selected = employee.employeeId === selectedId;
                return (
                  <button
                    key={employee.employeeId}
                    type="button"
                    onClick={() => selectEmployee(employee.employeeId)}
                    aria-pressed={selected}
                    className={`block w-full border-b border-slate-100 p-4 text-left transition ${
                      selected ? "bg-indigo-50/70 ring-1 ring-inset ring-indigo-200" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{employee.fullName || "Unnamed employee"}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">{employee.email || "No email"}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ring-1 ring-inset ${permissionStatusTone(employee.permissionStatus)}`}>
                        {employee.permissionStatus}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                      <span className="rounded-lg bg-slate-50 px-2 py-1">{employee.employeeId}</span>
                      <span className="truncate rounded-lg bg-slate-50 px-2 py-1">{employee.departmentId || "No department"}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <StatusBadge value={employee.accountStatus} />
                      <span className="text-[11px] font-medium text-slate-500">
                        {employee.grantedPermissions}/{employee.totalPermissions} granted
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="px-5 py-12 text-center">
                <p className="text-sm font-semibold text-slate-800">No employees found</p>
                <p className="mt-1 text-sm text-slate-500">Try a different name, email, ID, or department.</p>
              </div>
            )}
          </div>
        </section>

        {/* Permission editor */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40">
          {!selectedId ? (
            <div className="flex min-h-96 flex-col items-center justify-center p-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-sm font-bold text-indigo-600">PM</div>
              <h2 className="mt-4 text-lg font-semibold text-slate-900">Select an employee</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                Choose someone from the directory to review and update the features they can access. No employee permissions are granted by default.
              </p>
            </div>
          ) : detailsLoading ? (
            <div className="space-y-4 p-6">
              <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
              {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-40 animate-pulse rounded-2xl bg-slate-100" />)}
            </div>
          ) : !details ? (
            <div className="p-6"><div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Unable to load this employee&apos;s permissions.</div></div>
          ) : (
            <>
              {/* Employee header */}
              <div className="border-b border-slate-100 p-5 sm:p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-base font-bold text-white">
                      {String(details.employee.fullName || "TF").trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-xl font-semibold tracking-tight text-slate-950">{details.employee.fullName || "Unnamed employee"}</h2>
                      <p className="mt-1 truncate text-sm text-slate-500">{details.employee.email || "No email"}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-400">{details.employee.employeeId} · {details.employee.departmentId || "No department"} · {details.employee.designation || "No designation"}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <StatusBadge value={details.employee.accountStatus} />
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${permissionStatusTone(selectedStatus)}`}>
                          {selectedStatus}
                        </span>
                        <span className="text-xs font-medium text-slate-500">{details.grantedCount}/{details.totalPermissions} granted</span>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 rounded-2xl bg-slate-50 p-4 text-xs text-slate-500">
                    <p className="font-semibold uppercase tracking-[0.12em] text-slate-400">Last updated</p>
                    <p className="mt-1.5 font-medium text-slate-800">{formatDate(details.lastUpdatedAt)}</p>
                    <p className="mt-1 max-w-44 truncate" title={details.updatedBy ?? undefined}>{details.updatedBy ? `By ${details.updatedBy}` : "No updates recorded"}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="text-xs text-slate-500">
                  {dirty ? "Unsaved changes" : "All changes saved"}
                  <span aria-hidden="true"> · </span>
                  {revocations.length ? `${revocations.length} revocation${revocations.length === 1 ? "" : "s"} pending` : "No revocations"}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={resetToSaved}
                    disabled={!dirty || saving}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Reset to saved
                  </button>
                  <button
                    type="button"
                    onClick={requestSave}
                    disabled={!dirty || saving}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save permissions"}
                  </button>
                </div>
              </div>

              {/* Categories */}
              <div className="max-h-[62vh] space-y-4 overflow-y-auto p-5 sm:p-6">
                {PERMISSION_CATEGORIES.map((category) => {
                  const keys = category.permissions.map((permission) => permission.key);
                  const enabledCount = keys.filter((key) => grants[key]).length;
                  const allEnabled = enabledCount === keys.length;
                  return (
                    <fieldset key={category.name} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <legend className="text-sm font-semibold text-slate-900">{category.name}</legend>
                          <p className="mt-0.5 text-xs text-slate-500">{enabledCount}/{keys.length} granted</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => setCategory(category.name, true)} className="rounded-lg px-2 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50">
                            Select all
                          </button>
                          <button type="button" onClick={() => setCategory(category.name, false)} className="rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100">
                            Deselect all
                          </button>
                          <span className={`ml-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase ${allEnabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                            {allEnabled ? "All" : "Custom"}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {category.permissions.map((permission) => {
                          const checked = grants[permission.key];
                          return (
                            <label
                              key={permission.key}
                              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                                checked ? "border-indigo-200 bg-indigo-50/50" : "border-slate-200 bg-white hover:border-slate-300"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => togglePermission(permission.key)}
                                className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span>
                                <span className="block text-sm font-medium leading-5 text-slate-800">{permission.label}</span>
                                <span className="mt-1 block text-xs leading-5 text-slate-500">{permission.description}</span>
                                <span className="mt-2 block font-mono text-[10px] uppercase tracking-wide text-slate-400">{permission.key}</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>

      {/* Revocation confirmation */}
      {confirmRevocations && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onMouseDown={() => setConfirmRevocations(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="revoke-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <h2 id="revoke-title" className="text-lg font-semibold text-slate-950">Revoke {confirmRevocations.length} permission{confirmRevocations.length === 1 ? "" : "s"}?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              This employee will immediately lose access to the following features:
            </p>
            <ul className="mt-4 max-h-48 list-disc space-y-1.5 overflow-y-auto rounded-xl bg-rose-50 p-4 pl-8 text-sm text-rose-800">
              {confirmRevocations.map((key) => <li key={key}>{permissionLabel.get(key) ?? key}</li>)}
            </ul>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmRevocations(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Keep permissions
              </button>
              <button type="button" onClick={() => void submitPermissions()} disabled={saving} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60">
                {saving ? "Revoking..." : "Revoke access"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
