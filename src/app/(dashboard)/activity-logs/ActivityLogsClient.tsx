"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";

type ActivityLogRow = {
  logId: string;
  userId: string | null;
  userName: string | null;
  userRole: string | null;
  actionType: string | null;
  targetEntity: string | null;
  targetId: string | null;
  actionDescription: string | null;
  previousValue: string | null;
  newValue: string | null;
  timestamp: string | null;
  status: string | null;
};

type LogScope = "organization" | "own";

export default function ActivityLogsClient({ scope }: { scope: LogScope }) {
  const [logs, setLogs] = useState<ActivityLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/activity-logs", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to load activity logs.");
        if (!cancelled) setLogs(data.logs ?? []);
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Failed to load activity logs.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const title = scope === "own" ? "My Activity" : "Activity Logs";

  return (
    <div>
      <PageHeader
        title={title}
        description={scope === "own" ? "Review your own recorded actions." : "Review workspace actions, permission changes, and important events."}
        eyebrow={scope === "own" ? "My history" : "Audit trail"}
      />
      {loading ? (
        <div className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      ) : error ? (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">{error}</div>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="font-semibold text-slate-900">Recent activity</h2>
              <p className="mt-1 text-xs text-slate-500">{logs.length} {logs.length === 1 ? "entry" : "entries"}</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[960px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Time</th>
                  <th className="px-5 py-3.5">User</th>
                  <th className="px-5 py-3.5">Action</th>
                  <th className="px-5 py-3.5">Target</th>
                  <th className="px-5 py-3.5">Description</th>
                  <th className="px-5 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.logId} className="align-top transition hover:bg-slate-50/80">
                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">{log.timestamp ? new Date(log.timestamp).toLocaleString() : "—"}</td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-900">{log.userName || log.userId || "Unknown"}</p>
                      <p className="mt-0.5 text-xs capitalize text-slate-500">{log.userRole || "Unknown role"}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-700">{log.actionType || "—"}</td>
                    <td className="px-5 py-4 text-slate-600">
                      <p>{log.targetEntity || "—"}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{log.targetId || ""}</p>
                    </td>
                    <td className="max-w-md px-5 py-4 text-slate-600">
                      <p>{log.actionDescription || "—"}</p>
                      {(log.previousValue || log.newValue) && (
                        <p className="mt-1 text-xs text-slate-400">{String(log.previousValue ?? "—")} → {String(log.newValue ?? "—")}</p>
                      )}
                    </td>
                    <td className="px-5 py-4"><StatusBadge value={log.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!logs.length && (
            <div className="px-5 py-14 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-sm font-bold text-slate-500">AL</div>
              <h3 className="mt-3 text-sm font-semibold text-slate-900">No activity yet</h3>
              <p className="mt-1 text-sm text-slate-500">Recorded workspace actions will appear here.</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
