"use client";

import PageHeader from "@/components/layout/PageHeader";

export default function ReportsClient() {
  const reportIdeas = [
    { marker: "01", title: "Workforce overview", description: "A high-level view of headcount and department distribution." },
    { marker: "02", title: "Task progress", description: "A snapshot of completed, pending, and overdue work." },
    { marker: "03", title: "Team performance", description: "Completion trends and progress summaries for your team." },
  ];

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Bring workforce activity together in clear, shareable summaries."
        eyebrow="Insights"
      />
      <section className="mb-6 overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-100">Coming soon</span>
            <h2 className="mt-4 text-xl font-semibold tracking-tight text-slate-950">Useful answers, without the spreadsheet hunt.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Reporting and export tools are planned for a future release. These are the views we are preparing.
            </p>
          </div>
          <div className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white text-xl font-bold text-indigo-600 shadow-sm sm:flex">R</div>
        </div>
      </section>
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900">Planned reports</h2>
        <p className="mt-1 text-sm text-slate-500">A preview of the insights this area is designed to support.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {reportIdeas.map((report) => (
          <article key={report.marker} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/40">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-xs font-bold text-indigo-700">{report.marker}</div>
            <h3 className="mt-4 font-semibold text-slate-900">{report.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">{report.description}</p>
            <p className="mt-5 border-t border-slate-100 pt-4 text-xs font-medium text-slate-400">Planned</p>
          </article>
        ))}
      </div>
    </div>
  );
}