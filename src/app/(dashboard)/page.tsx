import AdminDashboardClient from "./AdminDashboardClient";
import EmployeeDashboardClient from "./EmployeeDashboardClient";
import { requirePageUser } from "@/lib/auth/pageGuards";

export default async function DashboardPage() {
  const user = await requirePageUser();

  if (user.role === "admin") {
    return <AdminDashboardClient user={{ name: user.name, email: user.email }} />;
  }

  return (
    <EmployeeDashboardClient
      user={{
        email: user.email,
        name: user.name,
        role: user.role,
        employeeId: user.employeeId ?? null,
        departmentId: user.employee?.departmentId ?? null,
        permissions: user.permissions,
      }}
    />
  );
}
