type StatusBadgeProps = {
  value: string | null | undefined;
};

export default function StatusBadge({ value }: StatusBadgeProps) {
  const label = value?.trim() || "Not set";
  const status = label.toLowerCase();
  const tone = /active|completed|complete|on track|excellent/.test(status)
    ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
    : /overdue|inactive|blocked|poor|high/.test(status)
      ? "bg-rose-50 text-rose-700 ring-rose-600/20"
      : /progress|medium|average/.test(status)
        ? "bg-amber-50 text-amber-700 ring-amber-600/20"
        : "bg-slate-100 text-slate-600 ring-slate-500/10";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${tone}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  );
}
