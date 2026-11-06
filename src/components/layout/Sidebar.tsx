"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import SignOutButton from "@/components/auth/SignOutButton";
import {
  type PermissionGrantState,
  type PermissionKey,
} from "@/lib/auth/permissions";

type NavItem = {
  href: string;
  label: string;
  marker: string;
};

type CurrentUser = {
  email: string;
  name: string;
  role: "admin" | "employee";
  employeeId: string | null;
  permissions: PermissionGrantState;
};

function has(permissions: PermissionGrantState | undefined, key: PermissionKey): boolean {
  return Boolean(permissions?.[key]);
}

function hasAny(permissions: PermissionGrantState | undefined, keys: readonly PermissionKey[]): boolean {
  return keys.some((key) => has(permissions, key));
}

function employeeNav(user: CurrentUser): NavItem[] {
  const p = user.permissions;
  const items: NavItem[] = [];
  if (has(p, "DASHBOARD_VIEW_PERSONAL")) {
    items.push({ href: "/", label: "My Dashboard", marker: "O" });
  }
  if (has(p, "EMPLOYEES_VIEW_DIRECTORY")) {
    items.push({ href: "/employees", label: "Employees", marker: "E" });
  }
  if (has(p, "DEPARTMENTS_VIEW")) {
    items.push({ href: "/departments", label: "Departments", marker: "D" });
  }
  if (hasAny(p, ["TASKS_VIEW_ALL", "TASKS_VIEW_DEPARTMENT", "TASKS_VIEW_MY"])) {
    const label = has(p, "TASKS_VIEW_ALL")
      ? "All Tasks"
      : has(p, "TASKS_VIEW_DEPARTMENT")
        ? "Department Tasks"
        : "My Tasks";
    items.push({ href: "/tasks", label, marker: "T" });
  }
  if (hasAny(p, ["PERFORMANCE_VIEW_ALL", "PERFORMANCE_VIEW_DEPARTMENT", "PERFORMANCE_VIEW_MY"])) {
    const label = has(p, "PERFORMANCE_VIEW_ALL")
      ? "Performance"
      : has(p, "PERFORMANCE_VIEW_DEPARTMENT")
        ? "Department Performance"
        : "My Performance";
    items.push({ href: "/performance", label, marker: "P" });
  }
  if (hasAny(p, ["REPORTS_VIEW_DASHBOARD", "REPORTS_VIEW_DEPARTMENT", "REPORTS_VIEW_ALL", "REPORTS_EXPORT"])) {
    items.push({ href: "/reports", label: "Reports", marker: "R" });
  }
  if (hasAny(p, ["ACTIVITY_LOGS_VIEW", "ACTIVITY_LOGS_VIEW_MY"])) {
    items.push({
      href: "/activity-logs",
      label: has(p, "ACTIVITY_LOGS_VIEW") ? "Activity Logs" : "My Activity",
      marker: "AL",
    });
  }
  if (has(p, "ASSISTANT_EMPLOYEE_ACCESS")) {
    items.push({ href: "/assistant", label: "Employee AI Agent", marker: "AI" });
  }
  items.push({ href: "/settings", label: "Settings", marker: "S" });
  return items;
}

const adminNav: NavItem[] = [
  { href: "/", label: "Dashboard", marker: "O" },
  { href: "/employees", label: "Employees", marker: "E" },
  { href: "/departments", label: "Departments", marker: "D" },
  { href: "/tasks", label: "Tasks", marker: "T" },
  { href: "/performance", label: "Performance", marker: "P" },
  { href: "/reports", label: "Reports", marker: "R" },
  { href: "/activity-logs", label: "Activity Logs", marker: "AL" },
  { href: "/permissions", label: "Permission Management", marker: "PM" },
  { href: "/assistant", label: "Admin AI Agent", marker: "AI" },
  { href: "/settings", label: "Settings", marker: "S" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadUser() {
      try {
        const response = await fetch("/api/me", { cache: "no-store" });
        if (response.status === 401) {
          router.replace("/login");
          return;
        }
        if (!response.ok) throw new Error("Unable to load account");
        const data = await response.json();
        if (!cancelled) setUser(data.user ?? null);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }
    loadUser();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const items = useMemo(() => {
    if (!user) return [{ href: "/settings", label: "Settings", marker: "S" }];
    return user.role === "admin" ? adminNav : employeeNav(user);
  }, [user]);

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-slate-200 bg-white px-4 py-4 lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:border-b-0 lg:border-r lg:px-5 lg:py-7">
      <Link href="/" className="flex items-center gap-3 self-start rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold tracking-tight text-white shadow-sm shadow-indigo-200">
          TF
        </span>
        <span>
          <span className="block text-base font-semibold tracking-tight text-slate-950">TaskFlow</span>
          <span className="mt-0.5 block text-xs text-slate-500">People &amp; work, in sync</span>
        </span>
      </Link>
      <div className="mt-6 hidden border-t border-slate-100 pt-5 lg:block">
        <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Workspace
        </p>
      </div>
      <nav aria-label="Main navigation" className="mt-4 grid grid-cols-2 gap-1 sm:grid-cols-4 lg:mt-2 lg:flex lg:flex-1 lg:flex-col">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-w-0 items-center gap-2 rounded-xl px-2 py-2.5 text-sm font-medium transition-colors sm:gap-3 sm:px-3 lg:w-full ${
                active
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
              }`}
            >
              <span className={`flex h-7 min-w-7 items-center justify-center rounded-lg px-1 text-[10px] font-bold ${
                active ? "bg-white text-indigo-700 shadow-sm" : "bg-slate-100 text-slate-500"
              }`}>
                {item.marker}
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
        {!loaded && (
          <div className="hidden rounded-xl px-3 py-2.5 text-sm text-slate-400 lg:block">Loading access...</div>
        )}
      </nav>
      <div className="mt-5 hidden rounded-2xl bg-slate-50 p-4 lg:block">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Signed in as</p>
        <p className="mt-2 truncate text-sm font-semibold text-slate-800">{user?.name ?? "Account"}</p>
        <p className="mt-0.5 truncate text-xs text-slate-500">{user?.email ?? "Loading..."}</p>
        {user && (
          <span className="mt-3 inline-flex rounded-full bg-white px-2.5 py-1 text-xs font-semibold capitalize text-slate-600 shadow-sm">
            {user.role}
          </span>
        )}
        <SignOutButton className="mt-3" label="Sign out" />
      </div>
    </aside>
  );
}
