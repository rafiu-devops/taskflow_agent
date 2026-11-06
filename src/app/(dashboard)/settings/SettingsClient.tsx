import PageHeader from "@/components/layout/PageHeader";
import SignOutButton from "@/components/auth/SignOutButton";

type SettingsUser = {
  name: string;
  email: string;
  role: "admin" | "employee";
  employeeId: string | null;
  departmentId: string | null;
};

export default function SettingsClient({ user }: { user: SettingsUser }) {
  const isAdmin = user.role === "admin";
  const details = [
    { label: "Full name", value: user.name || "Not provided" },
    { label: "Work email", value: user.email },
    { label: "Role", value: user.role },
    { label: "Employee ID", value: user.employeeId || "Not linked" },
    { label: "Department ID", value: user.departmentId || "Not linked" },
  ];

  return (
    <div>
      <PageHeader
        title={isAdmin ? "Settings" : "Personal Settings"}
        description="Review your account information and access details."
        eyebrow="Your account"
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40">
          <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-lg font-semibold text-indigo-700">
                {String(user.name || "TF").trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">{user.name || "Your account"}</h2>
                <p className="mt-1 text-sm text-slate-500">{user.email}</p>
              </div>
            </div>
          </div>
          <div className="divide-y divide-slate-100 px-5 sm:px-6">
            {details.map((detail) => (
              <div key={detail.label} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                <p className="text-sm text-slate-500">{detail.label}</p>
                <p className="text-sm font-medium capitalize text-slate-800">{detail.value}</p>
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
          <div className="mt-5 flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-3">
            <span className="text-xs font-medium text-slate-500">Current role</span>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold capitalize text-slate-700 shadow-sm">{user.role}</span>
          </div>
          <SignOutButton className="mt-4" label="Sign out" />
        </aside>
      </div>
    </div>
  );
}
