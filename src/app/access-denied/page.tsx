import Link from "next/link";

export default function AccessDeniedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-xl font-bold text-rose-600">
          !
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-950">Access denied</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Your account does not have permission to view this page. If you believe this is a mistake, ask your TaskFlow administrator to update your permissions.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/" className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
            Go to my workspace
          </Link>
          <Link href="/settings" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            View my account
          </Link>
        </div>
      </div>
    </div>
  );
}
