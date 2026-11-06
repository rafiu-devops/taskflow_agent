"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Not authorised");
      return;
    }
    router.push("/");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-10 sm:px-6">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-violet-200/40 blur-3xl" />
      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/60 md:grid-cols-[0.95fr_1.05fr]">
        <section className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 p-10 text-white md:flex lg:p-12">
          <div className="absolute -right-16 top-20 h-56 w-56 rounded-full border border-white/10" />
          <div className="absolute -right-5 top-32 h-36 w-36 rounded-full border border-white/10" />
          <div className="relative flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-sm font-bold ring-1 ring-inset ring-white/20">TF</span>
            <span className="text-lg font-semibold tracking-tight">TaskFlow AI</span>
          </div>
          <div className="relative max-w-sm py-12">
            <p className="text-sm font-medium text-indigo-100">WORKFORCE MANAGEMENT</p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight">People and priorities, in sync.</h1>
            <p className="mt-4 text-sm leading-6 text-indigo-100">
              A clearer way to bring your workforce, teams, and day-to-day work together.
            </p>
          </div>
          <p className="relative text-xs text-indigo-200">A calmer workspace for getting good work done.</p>
        </section>
        <section className="p-6 sm:p-10 md:p-12 lg:p-16">
          <div className="mb-8 flex items-center gap-3 md:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white">TF</span>
            <span className="text-lg font-semibold tracking-tight text-slate-950">TaskFlow AI</span>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">Welcome back</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Sign in to your workspace</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Use your authorized work email to continue.
          </p>
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">Work email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                required
              />
            </div>
            {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Continue with email"}
            </button>
          </form>
          <p className="mt-6 text-center text-xs leading-5 text-slate-400">
            Access is limited to authorized members of your organization.
          </p>
        </section>
      </div>
    </div>
  );
}