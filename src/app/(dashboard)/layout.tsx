import Sidebar from "@/components/layout/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-7 sm:py-9 lg:px-10 lg:py-10">
          {children}
          <footer className="mt-12 border-t border-slate-200 pt-5 text-xs text-slate-400">
            TaskFlow AI <span className="mx-1.5">·</span> Workforce management
          </footer>
        </div>
      </main>
    </div>
  );
}