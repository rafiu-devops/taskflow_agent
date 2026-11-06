"use client";

import PageHeader from "@/components/layout/PageHeader";

export default function AssistantPage() {
  const prompts = [
    "Summarize what needs attention this week",
    "Show me how my team is progressing",
    "Help me organize upcoming work",
  ];

  return (
    <div>
      <PageHeader
        title="AI assistant"
        description="A future home for thoughtful, data-aware help with your day-to-day work."
        eyebrow="TaskFlow AI"
      />
      <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40">
        <div className="bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 px-6 py-8 text-white sm:px-9 sm:py-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-indigo-50 ring-1 ring-inset ring-white/20">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
            In development
          </span>
          <h2 className="mt-5 max-w-xl text-2xl font-semibold tracking-tight sm:text-3xl">A little more clarity, right when you need it.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-indigo-100">
            The assistant is not available yet. We are shaping it to help teams understand progress and find the next best step.
          </p>
        </div>
        <div className="p-6 sm:p-9">
          <h3 className="text-sm font-semibold text-slate-900">Ideas for getting started</h3>
          <p className="mt-1 text-sm text-slate-500">Example questions for a future assistant experience.</p>
          <ul className="mt-4 grid gap-3 md:grid-cols-3">
            {prompts.map((prompt) => (
              <li key={prompt} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-5 text-slate-600">
                “{prompt}”
              </li>
            ))}
          </ul>
          <div className="mt-6 flex items-center gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white font-semibold">i</span>
            <p>This preview is informational; chat and AI responses are not enabled yet.</p>
          </div>
        </div>
      </section>
    </div>
  );
}