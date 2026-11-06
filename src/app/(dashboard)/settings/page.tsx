"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";

type UserProfile = {
  name: string | null;
  email: string;
  role: string | null;
  employeeId: string | null;
};

export default function SettingsPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load account details.");
        const data = await response.json();
        setUser(data.user);
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "Unable to load account details.");
      })
      .finally(() => setLoading(false));
  }, []);

  const details = [
    { label: "Full name", value: user?.name || "Not provided" },
    { label: "Work email", value: user?.email || "Not available" },
    { label: "Role", value: user?.role || "Not available" },
    { label: "Employee ID", value: user?.employeeId || "Not linked" },
  ];

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Review your account information and access details."
        eyebrow="Your account"
      />
      {error ? (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">{error}</div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40">
            <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-lg font-semibold text-indigo-700">
                  {user?.name ? String(user.name).trim().split(/\s+/).slice(0, 2).map((part: string) => part[0]).join("").toUpperCase() : "TF"}
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">{loading ? "Loading account..." : user?.name || "Your account"}</h2>
                  <p className="mt-1 text-sm text-slate-500">{user?.email || "Account profile"}</p>
                </div>
              </div>
            </div>
            <div className="divide-y divide-slate-100 px-5 sm:px-6">
              {details.map((detail) => (
                <div key={detail.label} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                  <p className="text-sm text-slate-500">{detail.label}</p>
                  <p className="text-sm font-medium text-slate-800">{loading ? "Loading..." : detail.value}</p>
                </div>
              ))}
            </div>
          </section>
          <aside className="h-fit rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/40 sm:p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-sm font-bold text-emerald-700">✓</div>
            <h2 className="mt-4 font-semibold text-slate-900">Account access</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Your profile and permissions are managed by your TaskFlow workspace. Contact your administrator if these details need to change.
            </p>
            {user?.role && (
              <div className="mt-5 flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-3">
                <span className="text-xs font-medium text-slate-500">Current role</span>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold capitalize text-slate-700 shadow-sm">{user.role}</span>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}