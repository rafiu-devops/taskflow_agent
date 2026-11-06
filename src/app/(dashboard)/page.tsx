import DashboardClient from "./DashboardClient";
import { requirePageUser } from "@/lib/auth/pageGuards";

export default async function DashboardPage() {
  const user = await requirePageUser();
  return (
    <DashboardClient
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
