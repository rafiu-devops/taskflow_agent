import SettingsClient from "./SettingsClient";
import { requirePageUser } from "@/lib/auth/pageGuards";

export default async function SettingsPage() {
  const user = await requirePageUser();
  return (
    <SettingsClient
      user={{
        name: user.name,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId ?? null,
        departmentId: user.employee?.departmentId ?? null,
      }}
    />
  );
}
