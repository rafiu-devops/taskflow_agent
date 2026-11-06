"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Overview", marker: "O" },
  { href: "/employees", label: "Employees", marker: "E" },
  { href: "/departments", label: "Departments", marker: "D" },
  { href: "/tasks", label: "Tasks", marker: "T" },
  { href: "/performance", label: "Performance", marker: "P" },
  { href: "/reports", label: "Reports", marker: "R" },
  { href: "/assistant", label: "AI assistant", marker: "AI" },
  { href: "/settings", label: "Settings", marker: "S" },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-slate-200 bg-white px-4 py-4 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:border-b-0 lg:border-r lg:px-5 lg:py-7">
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
              key={item.href}
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
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-5 hidden rounded-2xl bg-slate-50 p-4 lg:block">
        <p className="text-sm font-semibold text-slate-800">A clearer workday</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Keep people, teams, and tasks moving together.
        </p>
      </div>
    </aside>
  );
}