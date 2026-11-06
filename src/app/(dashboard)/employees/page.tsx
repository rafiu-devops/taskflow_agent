import EmployeesClient from "./EmployeesClient";
import { requirePagePermission } from "@/lib/auth/pageGuards";

export default async function EmployeesPage() {
  await requirePagePermission("EMPLOYEES_VIEW_DIRECTORY");
  return <EmployeesClient />;
}
